import type { UiMessage } from '@/core/i18n/types';
import { create } from 'zustand';
import type { Feature } from '@/data/plan';

export type ToastMessage = string | UiMessage;
export type ToastTone = 'default' | 'success' | 'error';

export interface ToastItem {
  id: number;
  message: ToastMessage;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
  /** ms; 0 keeps the toast until dismissed. */
  duration: number;
}

interface UIState {
  toasts: ToastItem[];
  /** True once the current page's large title has scrolled out of view (touch header shows it). */
  pageTitleHidden: boolean;
  pageTitle: string;
  /** Measured height of the touch header (incl. safe area), used for title-collapse detection. */
  topBarHeight: number;
  reference: string | null;
  openReference: (text?: string) => void;
  closeReference: () => void;
  shortcutsOpen: boolean;
  globalSearchOpen: boolean;
  /** The plans sheet: open for a locked feature, for all plans, or closed. */
  plansFor: Feature | 'all' | null;
  openPlans: (feature?: Feature) => void;
  closePlans: () => void;
  setPageTitle: (title: string) => void;
  setTopBarHeight: (height: number) => void;
  setPageTitleHidden: (hidden: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  pushToast: (toast: Omit<ToastItem, 'id'>) => number;
  dismissToast: (id: number) => void;
}

let nextToastId = 1;

export const useUI = create<UIState>((set) => ({
  toasts: [],
  pageTitleHidden: false,
  pageTitle: '',
  topBarHeight: 56,
  reference: null,
  openReference: (text = '') => set({ reference: text.slice(0, 3000) }),
  closeReference: () => set({ reference: null }),
  shortcutsOpen: false,
  globalSearchOpen: false,
  plansFor: null,
  openPlans: (feature) => set({ plansFor: feature ?? 'all' }),
  closePlans: () => set({ plansFor: null }),
  setPageTitle: (pageTitle) => set({ pageTitle, pageTitleHidden: false }),
  setTopBarHeight: (topBarHeight) => set({ topBarHeight }),
  setPageTitleHidden: (pageTitleHidden) => set({ pageTitleHidden }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setGlobalSearchOpen: (globalSearchOpen) => set({ globalSearchOpen }),
  pushToast: (toast) => {
    const id = nextToastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(
  message: ToastMessage,
  options: { tone?: ToastTone; action?: ToastItem['action']; duration?: number } = {},
): number {
  return useUI.getState().pushToast({
    message,
    tone: options.tone ?? 'default',
    action: options.action,
    duration: options.duration ?? (options.action ? 6000 : 3200),
  });
}
