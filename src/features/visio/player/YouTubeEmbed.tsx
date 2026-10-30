import { UiText } from '@/design/i18n/UiText';
import { useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { YouTubeVideo } from '@/core/visio/youtubeVideo';
import type { VideoLike } from '@/core/visio/videoLike';
import { loadYouTubeApi } from '@/services/cantus/youtube';

/**
 * YouTube's official embed, without its controls (Visio draws its own), handed to the page as a `YouTubeVideo`
 * once it is ready. Clicks go to Visio's stage, so the picture is for looking at.
 */
export function YouTubeEmbed({ id, onPlayer }: { id: string; onPlayer: (player: VideoLike | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const report = useRef(onPlayer);
  report.current = onPlayer;

  useEffect(() => {
    let alive = true;
    let video: YouTubeVideo | undefined;
    setFailed(false);
    void loadYouTubeApi()
      .then((yt) => {
        const box = host.current;
        if (!alive || !box) return;
        const mount = document.createElement('div');
        box.replaceChildren(mount);
        const player = new yt.Player(mount, {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, iv_load_policy: 3, cc_load_policy: 0, origin: window.location.origin },
          events: {
            onReady: () => {
              if (!alive) return;
              video = new YouTubeVideo(player);
              report.current(video);
            },
            onStateChange: (e) => video?.handleState(e.data),
            onPlaybackRateChange: () => video?.handleRate(),
            onError: () => alive && setFailed(true),
          },
        });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      report.current(null);
      video?.dispose();
    };
  }, [id]);

  return (
    <>
      <div ref={host} className="pointer-events-none absolute inset-0 [&>iframe]:size-full" />
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-[#1d1a17] p-6 text-center text-white/85">
          <div>
            <TriangleAlert size={28} className="mx-auto mb-3 opacity-70" aria-hidden />
            <p className="font-serif text-lg font-semibold text-white"><UiText source={'YouTube didn’t play this one'} /></p>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-white/70"><UiText source={'The video may not allow playing outside YouTube, or the player couldn’t load. Check your connection, or watch it on YouTube and add its subtitles as a file.'} /></p>
          </div>
        </div>
      )}
    </>
  );
}
