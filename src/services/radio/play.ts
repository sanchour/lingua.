// Playing a station through Sonus's one player, as a live item, and following what's on.
import { markStationPlayed } from '@/data/radio';
import type { Media, RadioStation } from '@/data/types';
import { loadMedia, setNowPlaying, toggle, unlockAudio, usePlayer } from '@/services/audio/engine';
import { countClick, nowPlaying, stationPlace } from './stations';

export const stationMediaId = (id: string) => `radio:${id}`;

function stationMedia(s: RadioStation, lang: string): Media {
  const now = Date.now();
  return { id: stationMediaId(s.id), lang, kind: 'radio', title: s.name, artist: stationPlace(s) ?? 'Radio', coverUrl: s.favicon, remoteUrl: s.url, createdAt: now, updatedAt: now };
}

/** Tunes in, or pauses and resumes the station already on. Call straight from the tap (iOS). */
export function playStation(s: RadioStation, lang: string): void {
  unlockAudio();
  if (usePlayer.getState().media?.id === stationMediaId(s.id)) return toggle();
  void loadMedia(stationMedia(s, lang), { autoplay: true });
  void markStationPlayed(s, lang);
  countClick(s.id);
  followNowPlaying();
}

let following = false;

/** While a station plays, asks it what's on every half minute (when its server says). */
function followNowPlaying() {
  if (following) return;
  following = true;
  let current = '';
  let timer = 0;
  const check = async (id: string, url: string) => setNowPlaying(id, await nowPlaying(url));
  usePlayer.subscribe((state) => {
    const media = state.media;
    const live = media?.kind === 'radio' && media.remoteUrl && state.status === 'playing' ? media : null;
    if ((live?.id ?? '') === current) return;
    current = live?.id ?? '';
    window.clearInterval(timer);
    timer = 0;
    if (!live?.remoteUrl) return;
    const url = live.remoteUrl;
    void check(live.id, url);
    timer = window.setInterval(() => void check(live.id, url), 30_000);
  });
}
