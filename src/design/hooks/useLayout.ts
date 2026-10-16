import { useMediaQuery } from './useMediaQuery';

export const WIDE_QUERY = '(min-width: 1024px)';
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export type LayoutMode = 'wide' | 'compact';
export type PointerKind = 'fine' | 'coarse';

/**
 * Two independent axes: layout picks the shell (sidebar vs tab bar),
 * pointer picks the interaction model (hover vs tap / long-press).
 */
export function useLayout(): { layout: LayoutMode; pointer: PointerKind } {
  const wide = useMediaQuery(WIDE_QUERY);
  const fine = useMediaQuery(FINE_POINTER_QUERY);
  return { layout: wide ? 'wide' : 'compact', pointer: fine ? 'fine' : 'coarse' };
}
