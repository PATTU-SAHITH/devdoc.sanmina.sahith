"""Create a user from the command line.

    uv run python -m app.db.create_user

Asks for name, email, password, whether the user is an admin and, if not,
their role (free text). Every question can also be given as a flag (--name, --email,
--password, --admin / --no-admin, --role) for scripts.

DEV-ONLY: the password is stored as typed (see migration 0002). This is the
stand-in until the real user directory is connected; do not use it for real
people.

An admin gets the role `admin`. For anyone else the role is whatever you type:
it is not checked against a list.
The email is stored lower-cased (login lower-cases what is typed) and must not
already belong to another user. This only ever inserts: it never changes or
replaces an existing user.
"""

import argparse
import getpass
import os
import secrets
import sys

import psycopg

from app.core.config import Settings

ADMIN_ROLE = "admin"


class UserInputError(ValueError):
    """The details given cannot make a user; the message says why."""


def initials(name: str) -> str:
    words = name.split()
    letters = words[0][0] + words[-1][0] if len(words) > 1 else words[0][:2]
    return letters.upper()


def create_user(database_url: str, *, name: str, email: str, password: str, is_admin: bool, role: str | None) -> str:
    """Inserts the user and returns its id."""
    name = name.strip()
    email = email.strip().lower()
    if not name:
        raise UserInputError("Name is required.")
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise UserInputError("Enter a valid email address.")
    if not password:
        raise UserInputError("Password is required.")
    if is_admin:
        role = ADMIN_ROLE
    else:
        role = (role or "").strip()
        if not role:
            raise UserInputError("Role is required for a user who is not an admin.")

    user_id = f"usr-{secrets.token_hex(4)}"
    with psycopg.connect(database_url, autocommit=True) as conn:
        # The table's UNIQUE(email) is case-sensitive, but login matches on lower(email).
        if conn.execute("SELECT 1 FROM users WHERE lower(email) = %s", (email,)).fetchone():
            raise UserInputError(f"A user with the email {email} already exists.")
        conn.execute(
            "INSERT INTO users (id, name, email, password, role, initials) VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, name, email, password, role, initials(name)),
        )
    return user_id


def _ask(prompt: str, given: str | None) -> str:
    return given if given is not None else input(prompt)


def _ask_admin(given: bool | None) -> bool:
    if given is not None:
        return given
    while True:
        answer = input("Admin? [y/n]: ").strip().lower()
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        print("Please answer y or n.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Create a DevDoc Studio user (dev-only, plain-text password).")
    parser.add_argument("--name")
    parser.add_argument("--email")
    parser.add_argument("--password")
    parser.add_argument("--admin", dest="admin", action="store_true", default=None)
    parser.add_argument("--no-admin", dest="admin", action="store_false")
    parser.add_argument("--role", help="Free text. Ignored for an admin.")
    args = parser.parse_args(argv)

    url = os.environ.get("ALEMBIC_DATABASE_URL") or Settings().database_url
    if not url:
        sys.exit("DATABASE_URL is not set.")

    name = _ask("Name: ", args.name)
    email = _ask("Email: ", args.email)
    password = args.password if args.password is not None else getpass.getpass("Password: ")
    is_admin = _ask_admin(args.admin)
    role = args.role
    if not is_admin and role is None:
        role = input("Role: ")

    try:
        user_id = create_user(url, name=name, email=email, password=password, is_admin=is_admin, role=role)
    except UserInputError as error:
        sys.exit(f"Not created: {error}")
    print(f"Created {email.strip().lower()} ({ADMIN_ROLE if is_admin else role}), id {user_id}.")


if __name__ == "__main__":
    main()
