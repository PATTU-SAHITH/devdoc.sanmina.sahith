import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_THEME, THEMES, applyTheme, getTheme, initTheme, setTheme } from './themeService';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe('themeService', () => {
  it('offers Light, Dark and Split, in that order', () => {
    expect(THEMES.map((t) => [t.id, t.label])).toEqual([['light', 'Light'], ['dark', 'Dark'], ['split', 'Split']]);
  });

  it('starts on the default theme and applies it to the page', () => {
    expect(getTheme()).toBe(DEFAULT_THEME);
    initTheme();
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
  });

  it('remembers the chosen theme in this browser and applies it at once', () => {
    setTheme('split');
    expect(document.documentElement.dataset.theme).toBe('split');
    expect(getTheme()).toBe('split');
    delete document.documentElement.dataset.theme;
    initTheme(); // the next visit
    expect(document.documentElement.dataset.theme).toBe('split');
  });

  it('ignores an unknown stored value', () => {
    localStorage.setItem('devdoc_studio_theme_v1', 'abyss');
    expect(getTheme()).toBe(DEFAULT_THEME);
  });

  it('still works when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(getTheme()).toBe(DEFAULT_THEME);
    setTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('tells listeners when the theme changes', () => {
    const seen: string[] = [];
    window.addEventListener('devdoc:theme', (e) => seen.push((e as CustomEvent<string>).detail));
    applyTheme('dark');
    setTheme('light');
    expect(seen).toEqual(['light']);
  });
});
