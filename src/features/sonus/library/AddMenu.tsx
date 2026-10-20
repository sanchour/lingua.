import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookHeadphones, FileAudio, LibraryBig, Plus, Rss, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { addSpotify } from '@/data/media';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Drawer, Popover } from '@/design/primitives';
import { pickFiles } from '@/services/files/files';
import { AUDIO_ACCEPT, importAudioFiles } from '@/services/sonus/files';
import { subscribe } from '@/services/sonus/podcasts';
import { parseSpotifyLink, spotifyInfo } from '@/services/sonus/spotify';
import { toast } from '@/state/ui';
import { AddBookDrawer } from './AddBookDrawer';

type Choice = 'files' | 'book' | 'free' | 'feed' | 'spotify' | 'discover';

const SpotifyGlyph: LucideIcon = (({ size = 18, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.5-.7 5.2-.4 7.3.8M8.6 15.4c2-.5 4-.3 5.6.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)) as unknown as LucideIcon;

const OPTIONS: Array<{ id: Choice; icon: LucideIcon; title: string; detail: string }> = [
  { id: 'discover', icon: Search, title: 'Find a podcast', detail: 'Search shows for learners and natives' },
  { id: 'files', icon: FileAudio, title: 'Audio files', detail: 'MP3, M4A and more, one item each' },
  { id: 'book', icon: BookHeadphones, title: 'Audiobook or course', detail: 'Files or a folder: parts in order, chapters kept' },
  { id: 'free', icon: LibraryBig, title: 'Free audiobooks', detail: 'LibriVox, read by volunteers' },
  { id: 'feed', icon: Rss, title: 'Podcast address', detail: 'Follow any show by its RSS link' },
  { id: 'spotify', icon: SpotifyGlyph, title: 'Spotify link', detail: 'Episodes, shows and playlists' },
];

/** "Add" in the Sonus header: files, a podcast by address, a Spotify link, or the directory. */
export function AddMenu({ lang, onDiscover }: { lang: string; onDiscover: () => void }) {
  const { layout } = useLayout();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(false);
  const [link, setLink] = useState<'feed' | 'spotify' | null>(null);
  const [book, setBook] = useState(false);
  const [busy, setBusy] = useState(false);

  const addFiles = async () => {
    const files = await pickFiles(AUDIO_ACCEPT);
    if (!files.length) return;
    setBusy(true);
    try {
      const { ids, skipped } = await importAudioFiles(lang, files);
      if (skipped.length) toast(`${skipped.length === 1 ? `“${skipped[0]}” isn’t` : `${skipped.length} files aren’t`} audio this device can play.`, { tone: 'error' });
      if (ids.length === 1) navigate(`/sonus/play/${ids[0]}`);
      else if (ids.length) toast(`${ids.length} files added.`, { tone: 'success' });
    } finally {
      setBusy(false);
    }
  };

  const choose = (choice: Choice, close: () => void) => {
    close();
    if (choice === 'files') void addFiles();
    else if (choice === 'discover') onDiscover();
    else if (choice === 'book') setBook(true);
    else if (choice === 'free') navigate('/sonus/audiobooks');
    else setLink(choice);
  };

  const list = (close: () => void) => (
    <ul className="space-y-0.5">
      {OPTIONS.map(({ id, icon: Icon, title, detail }) => (
        <li key={id}>
          <button type="button" onClick={() => choose(id, close)} className="no-callout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface active:bg-surface">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sage-soft text-sage-text">
              <Icon size={18} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{title}</span>
              <span className="block text-[12.5px] text-ink-soft">{detail}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {layout === 'wide' ? (
        <Popover
          label="Add to Sonus"
          placement="bottom-end"
          className="w-80"
          trigger={(props) => (
            <Button {...props} icon={Plus} loading={busy}>
              Add
            </Button>
          )}
        >
          {(close) => list(close)}
        </Popover>
      ) : (
        <>
          <Button icon={Plus} loading={busy} onClick={() => setSheet(true)}>
            Add
          </Button>
          <Drawer open={sheet} onClose={() => setSheet(false)} title="Add to Sonus">
            {list(() => setSheet(false))}
          </Drawer>
        </>
      )}
      <LinkDrawer lang={lang} kind={link} onClose={() => setLink(null)} />
      <AddBookDrawer lang={lang} open={book} onClose={() => setBook(false)} />
    </>
  );
}

function LinkDrawer({ lang, kind, onClose }: { lang: string; kind: 'feed' | 'spotify' | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const spotify = kind === 'spotify';

  const save = async () => {
    setBusy(true);
    try {
      if (spotify) {
        const parsed = parseSpotifyLink(value);
        if (!parsed) throw new Error('That isn’t a Spotify episode, show, playlist or track link.');
        const info = await spotifyInfo(parsed);
        const id = await addSpotify(lang, parsed, info);
        navigate(`/sonus/play/${id}`);
      } else {
        const id = await subscribe(lang, value);
        navigate(`/sonus/podcast/${id}`);
      }
      setValue('');
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That link couldn’t be added.', { tone: 'error', duration: 7000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={kind !== null}
      onClose={onClose}
      title={spotify ? 'Add a Spotify link' : 'Follow a podcast'}
      description={
        spotify
          ? 'Spotify plays in its own player here. Its audio can’t be downloaded or transcribed, but a transcript file you add will follow along.'
          : 'Paste the show’s RSS address. Episodes stream, can be saved offline, and can be transcribed.'
      }
      footer={
        <Button block size="lg" onClick={() => void save()} loading={busy} disabled={!value.trim()}>
          {spotify ? 'Add' : 'Follow'}
        </Button>
      }
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">{spotify ? 'Link' : 'RSS address'}</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && void save()}
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={spotify ? 'https://open.spotify.com/episode/…' : 'https://…/feed.xml'}
          data-autofocus
          className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px]"
        />
      </label>
    </Drawer>
  );
}
