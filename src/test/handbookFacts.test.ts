// The handbook's cheat sheet (docs/handbook/handbook.html, "The cheat sheet") takes its numbers from one JSON block, #facts.
// This test checks that block against the code, so a changed size, spring, colour or shortcut fails here until the book is updated.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fade, spring } from '@/design/motion';

const root = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const read = (path: string) => readFileSync(root(path), 'utf8');

const book = read('docs/handbook/handbook.html');
const block = /<script type="application\/json" id="facts">(.*?)<\/script>/s.exec(book);
const facts = JSON.parse(block?.[1] ?? '{}') as Record<string, string | string[][]>;

/** Tailwind's h-N and the radius names, in px. */
const px = (n: string) => Number(n) * 4;
const RADIUS: Record<string, number> = { lg: 8, xl: 12, '2xl': 16 };

describe('the handbook facts block', () => {
  it('exists and is read by the cheat sheet', () => {
    expect(block).not.toBeNull();
    const used = new Set([...book.matchAll(/data-fact="([^"]+)"/g)].map((m) => m[1]));
    for (const key of used) expect(facts, `the cheat sheet asks for "${key}"`).toHaveProperty(key);
    for (const key of Object.keys(facts)) if (key !== 'shortcuts') expect(used.has(key), `"${key}" is in the block but not on the sheet`).toBe(true);
  });

  it('matches the button sizes and corners', () => {
    const source = read('src/design/primitives/Button.tsx');
    for (const size of ['sm', 'md', 'lg'] as const) {
      const m = new RegExp(`${size}: '(?:[^']*? )?h-(\\d+) [^']*?rounded-(\\w+)`).exec(source);
      expect(m, `Button size ${size}`).not.toBeNull();
      expect(String(px(m![1])), `button.${size}`).toBe(facts[`button.${size}`]);
      expect(String(RADIUS[m![2]]), `radius.${size}`).toBe(facts[`radius.${size}`]);
    }
  });

  it('matches the drawer, dialog, sidebar and column', () => {
    expect(read('src/design/primitives/Drawer.tsx')).toContain(`w-[min(${facts['drawer.w']}px,`);
    expect(read('src/design/primitives/Dialog.tsx')).toContain("maxWidth = 'max-w-md'");
    expect(facts['dialog.w']).toBe(String(28 * 16));
    expect(read('src/app/shells/desktop/Sidebar.tsx')).toContain(`SIDEBAR_WIDTH = { expanded: ${facts['sidebar.w']}, collapsed: ${facts['sidebar.min']} }`);
    expect(read('src/app/shells/desktop/DesktopShell.tsx')).toContain('max-w-6xl');
    expect(facts['column.w']).toBe(String(72 * 16));
  });

  it('matches the springs and the fade', () => {
    for (const name of ['snappy', 'soft', 'sheet', 'gentle', 'fluid'] as const) {
      const s = spring[name] as { stiffness: number; damping: number; mass?: number };
      expect(`${s.stiffness} · ${s.damping}${s.mass !== undefined ? ` · ${s.mass}` : ''}`, `spring.${name}`).toBe(facts[`spring.${name}`]);
    }
    expect(String(fade.duration)).toBe(facts.fade);
  });

  it('matches the colours of Paper and Nocturne', () => {
    const css = read('src/design/tokens.css');
    const token = (name: string, which: 0 | 1) => [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))][which]?.[1].toLowerCase();
    for (const [key, name] of [['bg', 'bg'], ['surface', 'surface'], ['ink', 'ink'], ['accent', 'accent'], ['sage', 'sage']] as const) {
      expect(token(name, 0), `paper.${key}`).toBe(facts[`paper.${key}`]);
      expect(token(name, 1), `night.${key}`).toBe(facts[`night.${key}`]);
    }
  });

  it('lists shortcuts that the shortcut sheet has', () => {
    const source = read('src/app/ShortcutsDialog.tsx');
    for (const [key, label] of facts.shortcuts as string[][]) expect(source, `${key}: ${label}`).toContain(`[['${key}'], '${label}']`);
  });
});
