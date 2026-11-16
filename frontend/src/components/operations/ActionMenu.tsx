import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// A button that opens a short menu of grouped actions (Test Management's
// "Run Test ▾", "More ▾" and "Results ▾"). Items can run an action, pick a
// file, or be shown greyed out with the reason on hover.

export interface ActionMenuItem {
  label: string;
  /** A second line under the label. */
  hint?: string;
  onSelect?: () => void;
  /** Makes the item a file picker; the chosen file goes to onFile. */
  accept?: string;
  onFile?: (file: File) => void;
  /** Greys the item out and says why on hover. */
  disabledReason?: string;
  /** A small tag at the end, e.g. "Soon". */
  badge?: string;
}

export interface ActionMenuGroup {
  label?: string;
  items: ActionMenuItem[];
}

export const ActionMenu: React.FC<{
  label: string;
  icon?: React.ReactNode;
  groups: ActionMenuGroup[];
  disabled?: boolean;
  title?: string;
  /** Which side of the button the menu lines up with. */
  align?: 'left' | 'right';
}> = ({ label, icon, groups, disabled, title, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const choose = (item: ActionMenuItem) => {
    if (item.disabledReason) return;
    if (item.onFile) {
      fileInputs.current[item.label]?.click();
      return;
    }
    setOpen(false);
    item.onSelect?.();
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} title={title} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--panel)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--text-faint)] rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        {icon}{label}<ChevronDown aria-hidden className="w-3.5 h-3.5 text-[var(--text-dim)]" />
      </button>
      {open && (
        <div role="menu" aria-label={label}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-40 w-80 max-w-[calc(100vw-2rem)] p-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] text-left`}>
          {groups.map((group, gi) => (
            <div key={group.label ?? gi} role="group" aria-label={group.label} className={gi > 0 ? 'mt-1 pt-1 border-t border-[var(--border-soft)]' : ''}>
              {group.label && <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">{group.label}</div>}
              {group.items.map((item) => (
                <React.Fragment key={item.label}>
                  <button type="button" role="menuitem" disabled={Boolean(item.disabledReason)} title={item.disabledReason} onClick={() => choose(item)}
                    className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left text-[13px] text-[var(--text)] hover:bg-[var(--panel-alt)] focus-visible:bg-[var(--panel-alt)] disabled:text-[var(--text-dim)] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                    <span className="min-w-0">
                      <span className="block">{item.label}</span>
                      {item.hint && <span className="block text-[11px] text-[var(--text-dim)]">{item.hint}</span>}
                    </span>
                    {item.badge && <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--panel-alt)] text-[var(--text-dim)]">{item.badge}</span>}
                  </button>
                  {item.onFile && (
                    <input ref={(el) => { fileInputs.current[item.label] = el; }} type="file" accept={item.accept} className="hidden" aria-label={item.label} tabIndex={-1}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) { setOpen(false); item.onFile!(f); } e.target.value = ''; }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
