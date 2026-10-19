import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { Ellipsis, ExternalLink, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import { formatDuration } from '@/core/audio/cues';
import { db } from '@/data/db';
import { episodeMedia, unsubscribe, useFeed, useFeedMedia, usePlaybackMap, useTranscribedIds } from '@/data/media';
import type { Feed, FeedEpisode } from '@/data/types';
import { Button, Dialog, MenuItem, Popover } from '@/design/primitives';
import { loadMedia, unlockAudio, usePlayer } from '@/services/audio/engine';
import { refreshFeed } from '@/services/sonus/podcasts';
import { toast } from '@/state/ui';
import { Artwork } from './library/Artwork';
import { MediaRow } from './library/MediaRow';

const PAGE = 40;
const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

/** A followed podcast: its details and every episode, ready to stream, save or transcribe. */
export default function FeedPage() {
  const { feedId } = useParams();
  const navigate = useNavigate();
  const feed = useFeed(feedId);
  const inLibrary = useFeedMedia(feedId);
  const playback = usePlaybackMap();
  const transcribed = useTranscribedIds();
  const [shown, setShown] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const episodes = useMemo(() => feed?.episodes.slice(0, shown) ?? [], [feed, shown]);

  if (feed === null) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-xl">This podcast isn’t followed any more.</p>
        <Link to="/sonus?tab=podcasts" className="mt-4 inline-block font-semibold text-accent-text">
          Back to Sonus
        </Link>
      </div>
    );
  }
  if (!feed) return null;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshFeed(feed);
      toast('Up to date.', { tone: 'success' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The feed couldn’t be refreshed.', { tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <BackLink to="/sonus?tab=podcasts">Sonus</BackLink>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Artwork title={feed.title} coverUrl={feed.imageUrl} className="w-36 sm:w-44" rounded="rounded-3xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[30px] leading-tight font-semibold tracking-tight sm:text-[38px]">{feed.title}</h1>
          {feed.author && <p className="mt-1 text-ink-soft">{feed.author}</p>}
          <p className="mt-1 text-[13px] font-semibold text-ink-faint">{feed.episodes.length} episodes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => void refresh()}>
            Refresh
          </Button>
          <Popover
            label="Podcast options"
            placement="bottom-end"
            className="w-60"
            trigger={(props) => (
              <button {...props} type="button" aria-label="Podcast options" className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface hover:text-ink">
                <Ellipsis size={18} aria-hidden />
              </button>
            )}
          >
            {(close) => (
              <div className="space-y-0.5">
                {feed.link && <MenuItem icon={ExternalLink} label="Podcast website" onClick={() => (close(), window.open(feed.link, '_blank', 'noopener'))} />}
                <MenuItem icon={Trash2} label="Unfollow" danger onClick={() => (close(), setConfirm(true))} />
              </div>
            )}
          </Popover>
        </div>
      </header>

      {feed.description && <p className="mt-6 line-clamp-4 max-w-3xl text-[14.5px] leading-relaxed whitespace-pre-line text-ink-soft">{feed.description}</p>}

      <h2 className="mt-10 mb-3 border-b border-line pb-2 font-serif text-xl font-semibold">Episodes</h2>
      <div className="-mx-2 flex flex-col">
        {episodes.map((ep) => {
          const media = inLibrary?.get(ep.guid);
          return media ? (
            <MediaRow key={ep.guid} media={media} progress={playback?.get(media.id)} hasTranscript={Boolean(transcribed?.has(media.id))} inFeed />
          ) : (
            <EpisodeRow key={ep.guid} feed={feed} episode={ep} onOpen={async () => navigate(`/sonus/play/${await episodeMedia(feed, ep)}`)} />
          );
        })}
      </div>
      {feed.episodes.length > shown && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
            Show more episodes
          </Button>
        </div>
      )}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Unfollow this podcast?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setConfirm(false);
                await unsubscribe(feed.id);
                navigate('/sonus?tab=podcasts');
              }}
            >
              Unfollow
            </Button>
          </>
        }
      >
        Episodes you’ve played or saved stay in your library.
      </Dialog>
    </>
  );
}

/** An episode not yet in the library: playing or opening it adds it. */
export function EpisodeRow({ feed, episode, onOpen }: { feed: Feed; episode: FeedEpisode; onOpen: () => void }) {
  const playing = usePlayer((s) => s.media?.guid === episode.guid && s.status === 'playing');
  const details = [episode.publishedAt && dateFmt.format(episode.publishedAt), episode.durationMs && formatDuration(episode.durationMs)].filter(Boolean);
  return (
    <div className="group flex items-center gap-3.5 rounded-2xl px-2 py-2 transition-colors hover:bg-surface/70">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
        <Artwork title={episode.title} coverUrl={episode.imageUrl ?? feed.imageUrl} className="w-14" />
        <span className="min-w-0 flex-1">
          <span lang={feed.lang} className="line-clamp-2 text-[15px] leading-snug font-semibold">
            {episode.title}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">{details.join(' · ')}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Play ${episode.title}`}
        onClick={async () => {
          unlockAudio();
          const media = await db.media.get(await episodeMedia(feed, episode));
          if (media) await loadMedia(media, { autoplay: true });
        }}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink transition-[transform,background-color] duration-150 hover:bg-sunken active:scale-90"
      >
        {playing ? <Pause size={17} className="fill-current" aria-hidden /> : <Play size={17} className="translate-x-px fill-current" aria-hidden />}
      </button>
    </div>
  );
}
