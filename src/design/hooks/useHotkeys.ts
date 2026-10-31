import { useEffect, useLayoutEffect, useRef } from 'react';

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Matches combos like "alt+1", "[", "?", "mod+k" ("mod" = Ctrl on Windows, ⌘ on Mac).
 * Digits match by physical key so Alt+digit works on every keyboard layout.
 */
export function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop()!;
  const mods = new Set(parts);
  const isMac = /mac|iphone|ipad/i.test(navigator.platform);
  const wantCtrl = mods.has('ctrl') || (mods.has('mod') && !isMac);
  const wantMeta = mods.has('meta') || (mods.has('mod') && isMac);
  if (event.ctrlKey !== wantCtrl || event.metaKey !== wantMeta || event.altKey !== mods.has('alt')) return false;
  if (/^[0-9]$/.test(key)) return event.code === `Digit${key}` && event.shiftKey === mods.has('shift');
  // Symbols like "?" already imply Shift on most layouts, so Shift is only checked for letters.
  if (/^[a-z]$/.test(key) && event.shiftKey !== mods.has('shift')) return false;
  return event.key.toLowerCase() === key;
}

export function useHotkeys(map: HotkeyMap, enabled = true): void {
  const mapRef = useRef(map);
  useLayoutEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      for (const [combo, handler] of Object.entries(mapRef.current)) {
        if ((!isEditable(event.target) || combo === 'mod+k') && matchesCombo(event, combo)) {
          event.preventDefault();
          handler(event);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
