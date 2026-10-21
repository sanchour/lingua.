import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Captions, Film, Link2, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Drawer, Popover } from '@/design/primitives';
import { pickFiles } from '@/services/files/files';
import { addVideoLink, importSubtitlesOnly, importVideoFiles, SUBTITLE_ACCEPT, VIDEO_ACCEPT } from '@/services/visio/files';
import { toast } from '@/state/ui';

type Choice = 'files' | 'link' | 'subtitles';

const OPTIONS: Array<{ id: Choice; icon: LucideIcon; title: string; detail: string }> = [
  { id: 'files', icon: Film, title: 'Video files', detail: 'MP4, MOV, WebM; pick their .srt files too' },
  { id: 'link', icon: Link2, title: 'Video link', detail: 'A direct link to a video file' },
  { id: 'subtitles', icon: Captions, title: 'Subtitles only', detail: 'For a show you watch elsewhere' },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Adds videos (with any subtitles picked alongside), runs a file picker, and reports what was skipped. */
export async function addVideoFiles(lang: string, onOpen: (id: string) => void): Promise<void> {
  const files = await pickFiles(`${VIDEO_ACCEPT},${SUBTITLE_ACCEPT}`);
  if (!files.length) return;
  const { ids, skipped, subtitles } = await importVideoFiles(lang, files);
  if (skipped.length) toast(`${skipped.length === 1 ? `“${skipped[0]}” wasn’t` : `${plural(skipped.length, 'file')} weren’t`} added: not a video this device can play, or subtitles without a matching video.`, { tone: 'error', duration: 8000 });
  if (ids.length === 1) onOpen(ids[0]);
  else if (ids.length) toast(`${plural(ids.length, 'video')} added${subtitles ? `, with ${plural(subtitles, 'subtitle file')}` : ''}.`, { tone: 'success' });
}

/** "Add" in the Visio header: video files, a link, or subtitles on their own. */
export function AddVideoMenu({ lang, label = 'Add' }: { lang: string; label?: string }) {
  const { layout } = useLayout();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(false);
  const [link, setLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = (id: string) => navigate(`/visio/watch/${id}`);

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    try {
      await job();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That couldn’t be added.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const choose = (choice: Choice, close: () => void) => {
    close();
    if (choice === 'files') void run(() => addVideoFiles(lang, open));
    else if (choice === 'link') setLink(true);
    else
      void run(async () => {
        const files = await pickFiles(SUBTITLE_ACCEPT);
        if (!files.length) return;
        const { ids, skipped } = await importSubtitlesOnly(lang, files);
        if (skipped.length) toast(`${plural(skipped.length, 'file')} couldn’t be read as subtitles.`, { tone: 'error' });
        if (ids.length === 1) open(ids[0]);
        else if (ids.length) toast(`${plural(ids.length, 'item')} added.`, { tone: 'success' });
      });
  };

  const list = (close: () => void) => (
    <ul className="space-y-0.5">
      {OPTIONS.map(({ id, icon: Icon, title, detail }) => (
        <li key={id}>
          <button type="button" onClick={() => choose(id, close)} className="no-callout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface active:bg-surface">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text">
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
          label="Add something to watch"
          placement="bottom-end"
          className="w-80"
          trigger={(props) => (
            <Button {...props} icon={Plus} loading={busy}>
              {label}
            </Button>
          )}
        >
          {(close) => list(close)}
        </Popover>
      ) : (
        <>
          <Button icon={Plus} loading={busy} onClick={() => setSheet(true)}>
            {label}
          </Button>
          <Drawer open={sheet} onClose={() => setSheet(false)} title="Add something to watch">
            {list(() => setSheet(false))}
          </Drawer>
        </>
      )}
      <LinkDrawer lang={lang} open={link} onClose={() => setLink(false)} onAdded={open} />
    </>
  );
}

function LinkDrawer({ lang, open, onClose, onAdded }: { lang: string; open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const id = await addVideoLink(lang, url, title);
      setUrl('');
      setTitle('');
      onClose();
      onAdded(id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That link couldn’t be added.', { tone: 'error', duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  const field = 'h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px]';
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a video link"
      description="A direct link to a video file (.mp4, .webm) streams here with your subtitles. Streaming services can’t be played inside Lingua; add their subtitles instead."
      footer={
        <Button block size="lg" onClick={() => void save()} loading={busy} disabled={!url.trim()}>
          Add
        </Button>
      }
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">Link</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && url.trim() && void save()}
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://…/episode.mp4"
          data-autofocus
          className={field}
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">Title (optional)</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
      </label>
    </Drawer>
  );
}
