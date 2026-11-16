import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ActionMenu } from './ActionMenu';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(onRun = vi.fn(), onFile = vi.fn()) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(
    <ActionMenu label="More" groups={[
      { label: 'Library', items: [{ label: 'Save this suite to library', onSelect: onRun }] },
      { label: 'Import', items: [
        { label: 'Test cases from CSV, JSON or XML…', accept: '.csv,.json,.xml', onFile },
        { label: 'Test cases from Excel (.xlsx)', disabledReason: 'Coming soon: Excel import is not built yet', badge: 'Soon' },
      ] },
    ]} />,
  ));
  return { onRun, onFile };
}

const trigger = () => host!.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
const menu = () => host!.querySelector('[role="menu"]');
const item = (text: string) => [...host!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent?.includes(text))!;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

describe('ActionMenu', () => {
  it('opens on click, runs an item and closes', () => {
    const { onRun } = render();
    expect(menu()).toBeNull();
    act(() => trigger().click());
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(menu()!.textContent).toContain('Library');
    act(() => item('Save this suite').click());
    expect(onRun).toHaveBeenCalledOnce();
    expect(menu()).toBeNull();
  });

  it('shows a disabled item greyed out with the reason on hover, and it does nothing', () => {
    render();
    act(() => trigger().click());
    const soon = item('Excel (.xlsx)');
    expect(soon.disabled).toBe(true);
    expect(soon.getAttribute('title')).toBe('Coming soon: Excel import is not built yet');
    expect(soon.textContent).toContain('Soon');
  });

  it('a file item opens the file picker and hands over the chosen file', () => {
    const { onFile } = render();
    act(() => trigger().click());
    const input = host!.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.accept).toBe('.csv,.json,.xml');
    const clicked = vi.spyOn(input, 'click');
    act(() => item('CSV, JSON or XML').click());
    expect(clicked).toHaveBeenCalled();
    const file = new File(['a'], 'cases.csv');
    Object.defineProperty(input, 'files', { value: [file] });
    act(() => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(onFile).toHaveBeenCalledWith(file);
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

  it('can be disabled as a whole', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<ActionMenu label="Run Test" disabled groups={[{ items: [{ label: 'Run Test now', onSelect: vi.fn() }] }]} />));
    expect(trigger().disabled).toBe(true);
  });
});
