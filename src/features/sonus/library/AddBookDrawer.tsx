import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { FileAudio, FolderOpen } from 'lucide-react';
import type { BookKind } from '@/data/books';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Drawer, Segmented } from '@/design/primitives';
import { pickFiles, pickFolder } from '@/services/files/files';
import { AUDIO_ACCEPT, importBook, isAudioFile, suggestBookTitle } from '@/services/sonus/files';
import { toast } from '@/state/ui';
import { sonusBase } from '@/features/sonus/paths';

const field = 'h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px]';
const fieldLabel = 'mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase';

/** Several files or a folder become one audiobook or course, its parts in order. */
export function AddBookDrawer({ lang, kind: initialKind = 'audiobook', open, onClose }: { lang: string; kind?: BookKind; open: boolean; onClose: () => void }) {
  const translateUi = useUi();
  const { layout } = useLayout();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [kind, setKind] = useState<BookKind>(initialKind);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  // Each opening starts from the kind it was opened for.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setKind(initialKind);
  }
  const audio = files.filter(isAudioFile);

  const close = () => {
    setFiles([]);
    setTitle('');
    setAuthor('');
    onClose();
  };

  const choose = async (folder: boolean) => {
    const picked = folder ? await pickFolder() : await pickFiles(AUDIO_ACCEPT);
    if (!picked.length) return;
    setFiles(picked);
    setTitle((await suggestBookTitle(picked)) ?? '');
  };

  const add = async () => {
    setBusy(true);
    try {
      const { bookId, ids, skipped } = await importBook(lang, files, { title, author, kind });
      if (skipped.length) toast({ source: '{0} audio this device can play.', values: [skipped.length === 1 ? { source: '“{0}” isn’t', values: [String(skipped[0])] } : { source: '{0} files aren’t', values: [String(skipped.length)] }] }, { tone: 'error' });
      if (!ids.length) return;
      close();
      navigate(`${sonusBase()}/book/${bookId}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The files couldn’t be added.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={translateUi('Add an audiobook or course')}
      description={translateUi('Its parts play in order (by track number, else by name), and chapters inside the files are kept.')}
      footer={
        <Button block size="lg" onClick={() => void add()} loading={busy} disabled={!audio.length}><UiText source={'Add {0}'} values={[kind === 'course' ? <UiText source={'course'} /> : <UiText source={'audiobook'} />]} /></Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FileAudio} onClick={() => void choose(false)}><UiText source={'Choose files'} /></Button>
          {layout === 'wide' && (
            <Button variant="secondary" icon={FolderOpen} onClick={() => void choose(true)}><UiText source={'Choose a folder'} /></Button>
          )}
        </div>
        {files.length > 0 && (
          <>
            <p className="text-[14px] text-ink-soft">
              {audio.length ? `${audio.length} ${audio.length === 1 ? 'audio file' : 'audio files'}` : translateUi('No audio in what you chose.')}
            </p>
            <Segmented<BookKind>
              label={translateUi('Kind')}
              block
              value={kind}
              onChange={setKind}
              options={[
                { value: 'audiobook', label: translateUi('Audiobook') },
                { value: 'course', label: translateUi('Course') },
              ]}
            />
            <label className="block">
              <span className={fieldLabel}><UiText source={'Title'} /></span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={translateUi('Taken from the files')} className={field} />
            </label>
            <label className="block">
              <span className={fieldLabel}><UiText source={'Author'} /></span>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={translateUi('Optional')} className={field} />
            </label>
            {kind === 'course' && <p className="text-[13px] leading-snug text-ink-soft"><UiText source={'A course plays one lesson at a time and marks it done at its end.'} /></p>}
          </>
        )}
      </div>
    </Drawer>
  );
}
