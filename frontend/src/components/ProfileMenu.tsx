import React, { useContext, useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { AccountContext } from './accountContext';

/** The user's badge: their picture, or their initials on the brand red. */
const Avatar: React.FC<{ initials: string; avatarUrl?: string; size: 'sm' | 'md' }> = ({ initials, avatarUrl, size }) => {
  const box = size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-9 h-9 text-xs';
  return avatarUrl
    ? <img src={avatarUrl} alt="" className={`${box} rounded-lg object-cover shrink-0`} />
    : <span aria-hidden className={`${box} rounded-lg bg-[var(--accent)] text-[var(--on-accent)] font-bold flex items-center justify-center shrink-0`}>{initials}</span>;
};

/**
 * The profile button in the top-right corner of every screen: opens to the
 * user's name and role, Profile (Settings → Profile) and Log out.
 * Reads the signed-in user from AccountContext; renders nothing without one.
 */
export const ProfileMenu: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const account = useContext(AccountContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!account) return null;
  const { user } = account;
  const firstName = user.name.split(' ')[0];
  const role = [user.designation, user.department].filter(Boolean).join(' · ');
  const item = 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] hover:bg-[var(--panel-alt)] focus-visible:bg-[var(--panel-alt)]';

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Profile menu for ${user.name}`} onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--text-faint)] ${compact ? 'p-0.5' : 'h-10 pl-1 pr-2.5'}`}>
        <Avatar initials={user.initials} avatarUrl={user.avatarUrl} size="sm" />
        {!compact && <>
          <span className="text-[13px] font-semibold">{firstName}</span>
          <ChevronDown aria-hidden className="w-3.5 h-3.5 text-[var(--text-dim)]" />
        </>}
      </button>
      {open && (
        <div role="menu" aria-label="Profile" className="absolute right-0 top-full mt-2 z-50 w-64 p-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] text-left">
          <div className="flex items-center gap-2.5 px-2.5 pt-2 pb-3 mb-1 border-b border-[var(--border-soft)]">
            <Avatar initials={user.initials} avatarUrl={user.avatarUrl} size="md" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[var(--text)] truncate">{user.name}</div>
              {role && <div className="text-[11px] text-[var(--text-dim)] truncate">{role}</div>}
            </div>
          </div>
          <button type="button" role="menuitem" className={`${item} text-[var(--text)]`} onClick={() => { setOpen(false); account.openProfile(); }}>
            <User aria-hidden className="w-4 h-4" /> Profile
          </button>
          <button type="button" role="menuitem" className={`${item} text-[var(--accent-text)] font-semibold`} onClick={() => { setOpen(false); account.logout(); }}>
            <LogOut aria-hidden className="w-4 h-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
};
