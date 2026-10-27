// Settings › Device lab (7-0d): what the Lab turns on for this session only, never saved: the layout overlays and a
// replay of the first start. The light chosen in a replay is the real setting, so it is put back when the replay ends.
import { create } from 'zustand';
import { getSettings, setSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';

interface DevLabState {
  /** A 4 px grid with an 8 px beat, and the 720 px reading measure. */
  grid: boolean;
  /** An outline on every box. */
  outlines: boolean;
  /** The first start, replayed from this page (an index into FIRST_PAGES), with the light to put back. */
  replay: { from: number; light: Pick<Settings, 'theme' | 'palette'> } | null;
  setGrid: (on: boolean) => void;
  setOutlines: (on: boolean) => void;
  startReplay: (from: number) => Promise<void>;
  endReplay: () => Promise<void>;
}

export const useDevLab = create<DevLabState>((set, get) => ({
  grid: false,
  outlines: false,
  replay: null,
  setGrid: (grid) => set({ grid }),
  setOutlines: (outlines) => set({ outlines }),
  startReplay: async (from) => {
    const { theme, palette } = await getSettings();
    window.scrollTo({ top: 0 });
    set({ replay: { from, light: { theme, palette } } });
  },
  endReplay: async () => {
    const replay = get().replay;
    if (!replay) return;
    set({ replay: null });
    await setSetting('theme', replay.light.theme);
    await setSetting('palette', replay.light.palette);
  },
}));
