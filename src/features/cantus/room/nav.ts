// Sonus+'s own navigation (the room began as Cantus, and keeps its addresses): its tabs, the
// addresses of a song and its games, and the tab the learner was on last, so leaving and coming
// back (or closing the player) returns to it.
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { create } from 'zustand';

export type RoomTab = 'today' | 'music' | 'podcasts' | 'search';

export const ROOM_TABS: ReadonlyArray<{ id: RoomTab; name: string; path: string }> = [
  { id: 'today', name: 'Today', path: '/cantus' },
  { id: 'music', name: 'Music', path: '/cantus/music' },
  { id: 'podcasts', name: 'Podcasts', path: '/cantus/podcasts' },
  { id: 'search', name: 'Search', path: '/cantus/search' },
];

/** Where Sonus+ is left for: Sonus, your library, which then says the room is closed. */
export const CLOSED_PATH = '/sonus';

/** Marks the trip out of the room, so Sonus › Music can say "Back in Lingua". */
export interface LeftCantusState {
  leftCantus: true;
}

export const songPath = (songId: string) => `/cantus/song/${encodeURIComponent(songId)}`;
export const gamesPath = (songId: string) => `${songPath(songId)}/games`;
export const tabPath = (tab: RoomTab) => ROOM_TABS.find((t) => t.id === tab)!.path;

/** The tab an address shows, or null for a song, its games, or anything outside the room. */
export function roomTabOf(pathname: string): RoomTab | null {
  const path = pathname.replace(/\/+$/, '');
  if (path === '/cantus') return 'today';
  // The first room's Explore and Library: both are Music now (your songs are on it too).
  if (path === '/cantus/explore' || path === '/cantus/library') return 'music';
  return ROOM_TABS.find((t) => t.id !== 'today' && t.path === path)?.id ?? null;
}

/** The song an address opens (the player, or its games), if any. */
export function roomSongOf(pathname: string): string | undefined {
  const match = /^\/cantus\/song\/([^/]+)/.exec(pathname);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

const KEY = 'lingua.cantus.tab';
const isTab = (value: unknown): value is RoomTab => ROOM_TABS.some((t) => t.id === value);

function readTab(): RoomTab {
  try {
    const kept = localStorage.getItem(KEY);
    return isTab(kept) ? kept : 'today';
  } catch {
    return 'today';
  }
}

interface RoomNav {
  /** The last tab shown: Open Cantus and the player's close button return to it. */
  tab: RoomTab;
  setTab: (tab: RoomTab) => void;
}

export const useRoomNav = create<RoomNav>((set) => ({
  tab: typeof window === 'undefined' ? 'today' : readTab(),
  setTab: (tab) => {
    set({ tab });
    try {
      localStorage.setItem(KEY, tab);
    } catch {
      // Private mode or full: the room opens on Today next time.
    }
  },
}));

/** The address of the tab the learner was on last (Today the first time). */
export const lastRoomPath = () => tabPath(useRoomNav.getState().tab);

/** Leaves Cantus for Sonus › Music. The song pauses and keeps its place (the room's player sees to that). */
export function useLeaveCantus(): () => void {
  const navigate = useNavigate();
  return useCallback(() => navigate(CLOSED_PATH, { state: { leftCantus: true } satisfies LeftCantusState }), [navigate]);
}
