import { useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { AnimatePresence, motion } from 'motion/react';
import { BookUp, ClipboardPaste, FileText, Library, Sparkles, UploadCloud } from 'lucide-react';
import { useApp } from '@/app/context';
import { countWords } from '@/core/text/tokenizer';
import type { CoverDesign } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Card, Segmented } from '@/design/primitives';
import { fade } from '@/design/motion';
import { cx } from '@/lib/cx';
import { EpubError } from '@/services/import/epub';
import { importEpubFile, importGoodreads, importPasted, importSample, importTxtFile } from '@/services/import/importers';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { CLOTHS } from './library/covers';
import { CoverDesigner } from './library/CoverDesigner';

type Way = 'write' | 'file' | 'goodreads';

/** Adding to the library, on a page of its own: write or paste, import a file, or bring Goodreads shelves. */
export default function NewTextPage() {
  const { language } = useApp();
  const compact = useLayout().layout === 'compact';
  const lang = language.id;
  const navigate = useNavigate();
  const [way, setWay] = useState<Way>('write');

  return (
    <>
      <BackLink to="/codex">Codex</BackLink>
      <header className="mb-7">
        <p className="mb-1.5 text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">New on the shelf</p>
        <h1 className="font-serif text-[34px] leading-tight font-semibold tracking-tight sm:text-[40px]">Add to your library</h1>
      </header>

      <div className="mb-7">
        <Segmented<Way>
          label="How to add"
          value={way}
          onChange={setWay}
          block={compact}
          options={[
            { value: 'write', label: compact ? 'Write' : 'Write or paste', icon: ClipboardPaste },
            { value: 'file', label: compact ? 'File' : 'Import a file', icon: BookUp },
            { value: 'goodreads', label: 'Goodreads', icon: Library },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={way} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={fade}>
          {way === 'write' && <WriteOrPaste lang={lang} onDone={(id) => navigate(`/codex/read/${id}`)} />}
          {way === 'file' && <ImportFile lang={lang} onDone={(id) => navigate(`/codex/book/${id}?new=1`)} />}
          {way === 'goodreads' && <Goodreads lang={lang} onDone={() => navigate('/codex')} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">{label}</span>
    {children}
  </label>
);

function WriteOrPaste({ lang, onDone }: { lang: string; onDone: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [design, setDesign] = useState<CoverDesign>(() => ({ cloth: CLOTHS[Math.floor(Math.random() * CLOTHS.length)].id, ornament: 'rule' }));
  const [image, setImage] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const words = useMemo(() => (body.trim() ? countWords(body, lang) : 0), [body, lang]);

  const save = async () => {
    setBusy(true);
    try {
      onDone(await importPasted(lang, title.trim(), body, { author: author.trim() || undefined, coverDesign: design, coverImage: image ?? undefined }));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The text couldn’t be added.', { tone: 'error' });
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} lang={lang} placeholder="Untitled" className="h-12 w-full rounded-xl border border-line bg-raised px-4 font-serif text-[19px] font-semibold transition-colors focus:border-accent" />
        </Field>
        <Field label="Author">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Optional" className="h-11 w-full rounded-xl border border-line bg-raised px-4 text-[15px] transition-colors focus:border-accent" />
        </Field>
        <Field label="Text">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            lang={lang}
            rows={16}
            autoFocus
            placeholder="Paste an article, a chapter or song lyrics, or write your own. Empty lines start new paragraphs; a line starting with # becomes a chapter."
            className="min-h-[34dvh] w-full resize-y rounded-2xl border border-line bg-raised px-5 py-4 font-serif text-[17px] leading-relaxed transition-colors focus:border-accent"
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button size="lg" icon={Sparkles} onClick={() => void save()} loading={busy} disabled={!body.trim()}>
            Add and read
          </Button>
          <span className="text-[13px] font-semibold text-ink-faint tabular-nums">{words ? `${words.toLocaleString()} words` : ''}</span>
        </div>
      </div>

      <aside>
        <Card className="lg:sticky lg:top-8">
          <p className="mb-4 font-serif text-lg font-semibold">Cover</p>
          <CoverDesigner text={{ id: 'new', title: title || 'Untitled', author: author || undefined, lang }} design={design} onDesign={setDesign} image={image} onImage={setImage} />
        </Card>
      </aside>
    </div>
  );
}

function ImportFile({ lang, onDone }: { lang: string; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const take = async (file: File) => {
    const epub = /\.epub$/i.test(file.name) || file.type === 'application/epub+zip';
    const txt = /\.txt$/i.test(file.name) || file.type.startsWith('text/');
    if (!epub && !txt) return toast('Lingua reads DRM-free EPUB books and plain text files.', { tone: 'error' });
    setBusy(file.name);
    try {
      onDone(epub ? await importEpubFile(lang, file) : await importTxtFile(lang, file));
    } catch (error) {
      toast(error instanceof EpubError || error instanceof Error ? error.message : 'That file couldn’t be imported.', { tone: 'error' });
      setBusy(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void take(file);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        if (--depth.current <= 0) setOver(false);
      }}
      onDrop={onDrop}
      className={cx(
        'flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors',
        over ? 'border-accent bg-accent-soft/60' : 'border-line-strong/70 bg-surface',
      )}
    >
      <span className="mb-4 grid size-16 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <UploadCloud size={28} aria-hidden />
      </span>
      <p className="font-serif text-2xl font-semibold">{busy ? `Shelving “${busy}”…` : 'Drop a book here'}</p>
      <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
        DRM-free EPUB books and plain text files. On iPhone, choose a file from Files or iCloud Drive. Books bought in Apple Books are locked to that app.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button icon={BookUp} loading={busy !== null} onClick={() => void pickFile('.epub,application/epub+zip').then((f) => f && take(f))}>
          Choose an EPUB
        </Button>
        <Button variant="secondary" icon={FileText} disabled={busy !== null} onClick={() => void pickFile('.txt,text/plain').then((f) => f && take(f))}>
          Choose a text file
        </Button>
      </div>
      <button
        type="button"
        onClick={async () => {
          setBusy('a short sample');
          onDone(await importSample(lang));
        }}
        className="mt-6 text-[13px] font-semibold text-accent-text underline-offset-2 hover:underline"
      >
        Or start with a short sample text
      </button>
    </div>
  );
}

function Goodreads({ lang, onDone }: { lang: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className="max-w-2xl p-6">
      <p className="font-serif text-xl font-semibold">Bring your Goodreads shelves</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink-soft">
        <li>On goodreads.com, open My Books → Import and export.</li>
        <li>Choose “Export Library” and download the CSV file.</li>
        <li>Choose it below. Your shelves, ratings and dates come along; add an EPUB to any book to read it here.</li>
      </ol>
      <Button
        className="mt-5"
        icon={Library}
        loading={busy}
        onClick={async () => {
          const file = await pickFile('.csv,text/csv');
          if (!file) return;
          setBusy(true);
          try {
            const added = await importGoodreads(lang, file);
            toast(added ? `Added ${added} books to your shelves.` : 'Those books are already on your shelves.', { tone: 'success' });
            onDone();
          } catch (error) {
            toast(error instanceof Error ? error.message : 'That file couldn’t be read.', { tone: 'error' });
            setBusy(false);
          }
        }}
      >
        Choose the Goodreads CSV
      </Button>
    </Card>
  );
}
