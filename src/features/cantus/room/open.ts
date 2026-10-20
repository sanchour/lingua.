// Opening songs from the room's shelves, and Apple's 30-second previews on their tiles.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { openSong } from '@/data/songs';
import { pause as pauseSonus, usePlayer } from '@/services/audio/engine';
import type { SongHit } from '@/services/cantus/catalog';
import { toast } from '@/state/ui';
import { songPath } from './nav';

/** Opens a song in the player once it is kept; `opening` names the tile that is busy. */
export function useOpenSong(lang: string) {
  const navigate = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);
  const open = async (key: string, get: () => Promise<string>) => {
    setOpening(key);
    try {
      navigate(songPath(await get()));
    } catch {
      toast('That song couldn’t be opened. Try again in a moment.', { tone: 'error' });
    } finally {
      setOpening(null);
    }
  };
  return { opening, open, openHit: (hit: SongHit) => open(String(hit.itunesId), () => openSong(lang, hit)) };
}

let previewAudio: HTMLAudioElement | null = null;
let stopPreview: (() => void) | null = null;

/** Apple's 30-second preview, one at a time across the room; Sonus pauses while it plays. */
export function usePreview(preview?: string) {
  const [playing, setPlaying] = useState(false);
  // Gone or stopped: pause, unless another preview has taken the player since.
  useEffect(() => () => void (playing && previewAudio?.src === preview && previewAudio?.pause()), [playing, preview]);
  const toggle = () => {
    if (!preview) return;
    if (playing) {
      previewAudio?.pause();
      setPlaying(false);
      return;
    }
    stopPreview?.();
    previewAudio ??= new Audio();
    previewAudio.src = preview;
    previewAudio.onended = () => setPlaying(false);
    if (usePlayer.getState().status === 'playing') pauseSonus();
    void previewAudio
      .play()
      .then(() => {
        setPlaying(true);
        stopPreview = () => setPlaying(false);
      })
      .catch(() => toast('The preview couldn’t play. Try again in a moment.', { tone: 'error' }));
  };
  return { playing, toggle };
}
