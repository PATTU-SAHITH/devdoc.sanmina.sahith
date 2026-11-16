// The colour theme (Settings → Appearance). Three themes in the company
// colours - white, black and a little red:
//
//   Light  white surfaces, near-black text, red accent        (designed as "Paper")
//   Dark   black surfaces, light text, red accent             (designed as "Ink")
//   Split  Light, with the main sidebar in Dark               (designed as "Split")
//
// The choice is a per-browser preference: it lives in localStorage and sets
// `data-theme` on <html>, which index.css reads. Nothing else is stored.
import { useEffect, useState } from 'react';

export type ThemeId = 'light' | 'dark' | 'split';

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  { id: 'light', label: 'Light', description: 'White surfaces with a red accent.' },
  { id: 'dark', label: 'Dark', description: 'Black surfaces with a red accent.' },
  { id: 'split', label: 'Split', description: 'A black sidebar beside white content.' },
];

/** Closest to the app's look before themes existed. */
export const DEFAULT_THEME: ThemeId = 'dark';

const STORAGE_KEY = 'devdoc_studio_theme_v1';
export const THEME_EVENT = 'devdoc:theme';

const isTheme = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value);

export function getTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Puts the theme on the page without remembering it. */
export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
}

/** Applies the theme, remembers it and tells open screens. */
export function setTheme(theme: ThemeId): void {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

/** Called once at start-up, before the first render, so the page never flashes the wrong theme. */
export function initTheme(): void {
  applyTheme(getTheme());
}

/** The current theme, kept up to date when it changes. */
export function useTheme(): ThemeId {
  const [theme, set] = useState<ThemeId>(getTheme);
  useEffect(() => {
    const onChange = (e: Event) => set((e as CustomEvent<ThemeId>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);
  return theme;
}
