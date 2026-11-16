import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeUser } from '../test/fixtures';
import { AccountContext } from './accountContext';
import { ProfileMenu } from './ProfileMenu';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(compact = false) {
  const openProfile = vi.fn();
  const logout = vi.fn();
  const user = makeUser({ name: 'Judia Lumina', designation: 'Firmware lead', department: 'Platform', initials: 'JL' });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(
    <AccountContext.Provider value={{ user, openProfile, logout }}>
      <ProfileMenu compact={compact} />
    </AccountContext.Provider>,
  ));
  return { openProfile, logout };
}

const trigger = () => host!.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
const menu = () => host!.querySelector('[role="menu"]');
const item = (text: string) => [...host!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent?.includes(text))!;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

describe('ProfileMenu', () => {
  it('shows the initials and first name, and opens to name, designation and department', () => {
    render();
    expect(trigger().getAttribute('aria-label')).toBe('Profile menu for Judia Lumina');
    expect(trigger().textContent).toContain('JL');
    expect(trigger().textContent).toContain('Judia');
    expect(menu()).toBeNull();
    act(() => trigger().click());
    expect(menu()!.textContent).toContain('Judia Lumina');
    expect(menu()!.textContent).toContain('Firmware lead · Platform');
  });

  it('Profile opens Settings → Profile and closes the menu', () => {
    const { openProfile } = render();
    act(() => trigger().click());
    act(() => item('Profile').click());
    expect(openProfile).toHaveBeenCalledOnce();
    expect(menu()).toBeNull();
  });

  it('Log out signs out', () => {
    const { logout } = render();
    act(() => trigger().click());
    act(() => item('Log out').click());
    expect(logout).toHaveBeenCalledOnce();
  });

  it('closes on Escape and on a click outside', () => {
    render();
    act(() => trigger().click());
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(menu()).toBeNull();
    act(() => trigger().click());
    act(() => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
    expect(menu()).toBeNull();
  });

  it('compact shows the badge only', () => {
    render(true);
    expect(trigger().textContent).toBe('JL');
  });

  it('renders nothing outside a signed-in screen', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<ProfileMenu />));
    expect(host.innerHTML).toBe('');
  });
});
