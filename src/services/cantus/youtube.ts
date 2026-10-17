// YouTube's embedded player (free, no key): plays a whole song and tells the page where it is, so
// the lyrics can follow. Only the video's id is needed; it comes from a link the learner pastes.

/** youtu.be/ID, youtube.com/watch?v=ID, music.youtube.com, /shorts/, /embed/, or a bare id. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m =
    /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/i.exec(s) ?? /youtu\.be\/([A-Za-z0-9_-]{11})/i.exec(s);
  return m ? m[1] : null;
}

export interface YTPlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: { target: YTPlayer }) => void; onStateChange?: (e: { data: number; target: YTPlayer }) => void; onError?: () => void };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTNamespace> | null = null;

/** Loads YouTube's player API once, when a song with a video is opened. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  api ??= new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      api = null;
      reject(new Error('YouTube’s player couldn’t be loaded.'));
    };
    document.head.append(script);
  });
  return api;
}

/** YT.PlayerState.PLAYING */
export const YT_PLAYING = 1;
