"""The real SQL against a real Postgres, built by the Alembic migrations.

Skipped unless TEST_DATABASE_URL points at a database this test may wipe:
    TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/devdoc_test uv run pytest -m postgres
"""

import os
from collections.abc import Iterator
from pathlib import Path

import fakeredis
import psycopg
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.db.create_user import UserInputError, create_user
from app.main import create_app
from tests.conftest import test_settings

pytestmark = pytest.mark.postgres

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
BACKEND_DIR = Path(__file__).resolve().parents[1]
ADMIN_PASSWORD = "admin-pass"
AUTHOR_PASSWORD = "author-pass"
ADMIN_EMAIL = "mani.thangavel@sanmina.com"
AUTHOR_EMAIL = "vaishnavi.aasaithambi@sanmina.com"


def alembic_config(url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    os.environ["ALEMBIC_DATABASE_URL"] = url
    return config


def seed_users(url: str) -> None:
    create_user(url, name="Manivannan Thangavel", email=ADMIN_EMAIL, password=ADMIN_PASSWORD, is_admin=True, role=None)
    create_user(
        url,
        name="Vaishnavi Aasaithambi",
        email=AUTHOR_EMAIL,
        password=AUTHOR_PASSWORD,
        is_admin=False,
        role="release-manager",
    )


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set")
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    command.upgrade(alembic_config(DATABASE_URL), "head")
    seed_users(DATABASE_URL)
    app = create_app(test_settings(database_url=DATABASE_URL), redis=fakeredis.FakeAsyncRedis(decode_responses=True))
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def sign_in(client: TestClient, email: str) -> dict[str, str]:
    password = ADMIN_PASSWORD if email == ADMIN_EMAIL else AUTHOR_PASSWORD
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    cookie = {"Cookie": f"devdoc_sid={res.cookies['devdoc_sid']}"}
    client.cookies.clear()
    return cookie


def doc(doc_id: str, **overrides: object) -> dict[str, object]:
    metadata = {
        "id": doc_id,
        "title": "T",
        "docNumber": "FW-1",
        "date": "2026-09-28",
        "version": "1.0",
        "classification": "INTERNAL ONLY",
        "status": "DRAFT",
        "templateType": "technical-analysis",
    }
    return {"metadata": {**metadata, **overrides}, "sections": [{"id": "s1", "n": 1.5}]}


def test_login_me_logout_against_created_users(client: TestClient) -> None:
    res = client.post("/api/auth/login", json={"email": ADMIN_EMAIL.upper(), "password": ADMIN_PASSWORD})
    user = res.json()["user"]
    assert user.pop("id").startswith("usr-")
    assert user == {
        "name": "Manivannan Thangavel",
        "email": ADMIN_EMAIL,
        "title": None,
        "department": None,
        "role": "admin",
        "avatarBg": "from-blue-600 to-indigo-600",
        "initials": "MT",
    }
    assert client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}).status_code == 401
    cookie = {"Cookie": f"devdoc_sid={res.cookies['devdoc_sid']}"}
    client.cookies.clear()
    assert client.get("/api/auth/me", headers=cookie).status_code == 200
    assert client.post("/api/auth/logout", headers=cookie).status_code == 204
    assert client.get("/api/auth/me", headers=cookie).status_code == 401


def test_document_lifecycle(client: TestClient) -> None:
    author = sign_in(client, AUTHOR_EMAIL)
    admin = sign_in(client, ADMIN_EMAIL)

    saved = client.put("/api/documents/pg-1", json=doc("pg-1"), headers=author)
    assert saved.status_code == 200
    assert saved.json()["document"]["metadata"]["author"] == "Vaishnavi Aasaithambi"
    client.put("/api/documents/pg-2", json=doc("pg-2", status="APPROVED"), headers=author)

    listed = client.get("/api/documents", headers=author).json()["documents"]
    assert [d["metadata"]["id"] for d in listed] == ["pg-1"]
    assert len(client.get("/api/documents", headers=admin).json()["documents"]) == 2

    fetched = client.get("/api/documents/pg-1", headers=author).json()["document"]
    assert fetched["sections"] == [{"id": "s1", "n": 1.5}]
    assert fetched["updatedAt"].endswith("Z")

    assert client.delete("/api/documents/pg-1", headers=author).status_code == 204
    assert client.get("/api/documents/pg-1", headers=author).status_code == 404
    assert client.delete("/api/documents/pg-1/purge", headers=author).status_code == 204
    assert client.delete("/api/documents/pg-1/purge", headers=author).status_code == 404


def test_values_are_coerced_like_node_postgres(client: TestClient) -> None:
    author = sign_in(client, AUTHOR_EMAIL)
    res = client.put("/api/documents/pg-3", json=doc("pg-3", title=42, version=2.0, date=""), headers=author)
    assert res.status_code == 200
    with psycopg.connect(DATABASE_URL) as conn:  # type: ignore[arg-type]
        row = conn.execute("SELECT title, version, doc_date FROM documents WHERE id = 'pg-3'").fetchone()
    assert row == ("42", "2", None)


def test_invalid_column_value_is_a_500(client: TestClient) -> None:
    author = sign_in(client, AUTHOR_EMAIL)
    assert client.put("/api/documents/pg-4", json=doc("pg-4", date="not-a-date"), headers=author).status_code == 500


def _tables(url: str) -> set[str]:
    with psycopg.connect(url) as conn:
        rows = conn.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'").fetchall()
    return {r[0] for r in rows}


def _wipe(url: str) -> None:
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")


def test_migrations_upgrade_and_downgrade_cleanly() -> None:
    if not DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set")
    _wipe(DATABASE_URL)
    config = alembic_config(DATABASE_URL)
    command.upgrade(config, "head")
    assert _tables(DATABASE_URL) == {"users", "sessions", "documents", "session_audit", "alembic_version"}
    command.downgrade(config, "base")
    assert _tables(DATABASE_URL) == {"alembic_version"}
    command.upgrade(config, "head")  # and back up again
    assert {"users", "sessions", "documents", "session_audit"} <= _tables(DATABASE_URL)


def test_a_database_built_by_the_old_init_sql_can_be_stamped() -> None:
    """The adoption path: a volume init.sql already built is marked as being at
    the baseline, and later migrations then apply on top of it."""
    if not DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set")
    _wipe(DATABASE_URL)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        conn.execute((BACKEND_DIR / "sql" / "legacy_init.sql").read_text())
    config = alembic_config(DATABASE_URL)
    command.stamp(config, "0001")
    command.upgrade(config, "head")  # nothing to do, and must not try to recreate tables
    assert {"users", "sessions", "documents", "alembic_version"} <= _tables(DATABASE_URL)


def test_a_database_built_by_the_old_init_sql_upgrades_without_a_stamp() -> None:
    """What `docker compose up` does on an existing volume."""
    if not DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set")
    _wipe(DATABASE_URL)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        conn.execute((BACKEND_DIR / "sql" / "legacy_init.sql").read_text())
        before = conn.execute("SELECT count(*) FROM users").fetchone()
    command.upgrade(alembic_config(DATABASE_URL), "head")
    with psycopg.connect(DATABASE_URL) as conn:
        assert conn.execute("SELECT count(*) FROM users").fetchone() == before  # data untouched
    assert "alembic_version" in _tables(DATABASE_URL)


def test_create_user_rules() -> None:
    if not DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set")
    _wipe(DATABASE_URL)
    command.upgrade(alembic_config(DATABASE_URL), "head")
    make = dict(name="Ada Lovelace", email="Ada@Example.com", password="pw", is_admin=False, role="qa-director")
    user_id = create_user(DATABASE_URL, **make)
    with psycopg.connect(DATABASE_URL) as conn:
        row = conn.execute("SELECT email, role, initials, password FROM users WHERE id = %s", (user_id,)).fetchone()
    assert row == ("ada@example.com", "qa-director", "AL", "pw")  # lower-cased email, stored as typed

    with pytest.raises(UserInputError, match="already exists"):
        create_user(DATABASE_URL, **{**make, "email": "ADA@example.com"})  # any casing of the same email
    with pytest.raises(UserInputError, match="Role is required"):
        create_user(DATABASE_URL, **{**make, "email": "b@example.com", "role": "  "})
    free = create_user(DATABASE_URL, **{**make, "email": "d@example.com", "role": "any-role-at-all"})
    with psycopg.connect(DATABASE_URL) as conn:
        assert conn.execute("SELECT role FROM users WHERE id = %s", (free,)).fetchone() == ("any-role-at-all",)
    with pytest.raises(UserInputError, match="valid email"):
        create_user(DATABASE_URL, **{**make, "email": "nope"})
    with pytest.raises(UserInputError, match="Password is required"):
        create_user(DATABASE_URL, **{**make, "email": "c@example.com", "password": ""})

    admin_id = create_user(DATABASE_URL, **{**make, "email": "root@example.com", "is_admin": True, "role": None})
    with psycopg.connect(DATABASE_URL) as conn:
        assert conn.execute("SELECT role FROM users WHERE id = %s", (admin_id,)).fetchone() == ("admin",)


def test_session_audit_records_sign_ins_and_sign_outs(client: TestClient) -> None:
    author = sign_in(client, AUTHOR_EMAIL)
    sign_in(client, AUTHOR_EMAIL)  # a second, still-open session
    assert client.post("/api/auth/logout", headers=author).status_code == 204
    assert client.post("/api/auth/logout", headers=author).status_code == 204  # again: nothing more is recorded
    admin = sign_in(client, ADMIN_EMAIL)

    sessions = client.get("/api/audit/sessions", headers=admin).json()["sessions"]
    assert [(s["userName"], s["status"]) for s in sessions] == [
        ("Manivannan Thangavel", "active"),
        ("Vaishnavi Aasaithambi", "active"),
        ("Vaishnavi Aasaithambi", "signed-out"),
    ]
    assert sessions[0]["loginTime"].endswith("Z") and sessions[2]["logoutTime"].endswith("Z")
    assert sessions[1]["role"] == "release-manager" and sessions[1]["logoutTime"] is None
    with psycopg.connect(DATABASE_URL) as conn:  # type: ignore[arg-type]
        stored = conn.execute("SELECT session_id_hash FROM session_audit").fetchall()
    assert all(len(h[0]) == 64 for h in stored)  # a sha256, never the session id itself
    assert author["Cookie"].split("=")[1] not in str(stored)


def test_session_audit_is_append_only_in_the_database(client: TestClient) -> None:
    sign_in(client, AUTHOR_EMAIL)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:  # type: ignore[arg-type]
        for sql in (
            "DELETE FROM session_audit",
            "TRUNCATE session_audit",
            "UPDATE session_audit SET role = 'admin'",
            "UPDATE session_audit SET user_name = 'Someone Else'",
            "UPDATE session_audit SET login_at = now() - interval '1 day'",
        ):
            with pytest.raises(psycopg.errors.RaiseException, match="append-only"):
                conn.execute(sql)  # type: ignore[call-overload]
        conn.execute("UPDATE session_audit SET logout_at = now()")  # the one allowed change...
        with pytest.raises(psycopg.errors.RaiseException, match="append-only"):
            conn.execute("UPDATE session_audit SET logout_at = now()")  # ...but only once
        assert conn.execute("SELECT count(*) FROM session_audit").fetchone() == (1,)
