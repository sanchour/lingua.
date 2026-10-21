import { useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { AnimatePresence, motion } from 'motion/react';
import { BookUp, ClipboardPaste, Library, Newspaper, PanelsTopLeft, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import type { Cefr } from '@/core/lang/levels';
import { countWords } from '@/core/text/tokenizer';
import { db } from '@/data/db';
import type { CoverDesign, Text } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Card, Segmented } from '@/design/primitives';
import { fade, spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { EpubError } from '@/services/import/epub';
import { COMIC_FILE_ACCEPT, comicSource, importComic } from '@/services/import/comic';
import { BOOK_FILE_ACCEPT, bookFileKind, importBookFile, importGoodreads, importPasted, importSample } from '@/services/import/importers';
import { importPagePhotos, isPicture } from '@/services/import/pagePhotos';
import { pickFile, pickFiles, pickFolder } from '@/services/files/files';
import { toast } from '@/state/ui';
import { BookCover } from './library/BookCover';
import { CLOTHS } from './library/covers';
import { CoverDesigner } from './library/CoverDesigner';
import { KindDrawing } from './library/KindDrawing';
import { LevelPicker } from './library/LevelPicker';
import { NewsPanel } from './library/NewsPanel';

type Way = 'write' | 'book' | 'comic' | 'news' | 'goodreads';
const WAYS: Way[] = ['write', 'book', 'comic', 'news', 'goodreads'];
/** `?way=file` was the one import tab before 4.0-2. */
const asWay = (v: string | null): Way => (v === 'file' ? 'book' : WAYS.includes(v as Way) ? (v as Way) : 'write');

/** Adding to the library, on a page of its own: write or paste, import a book or a comic, news, or Goodreads shelves. */
export default function NewTextPage() {
  const { language } = useApp();
  const compact = useLayout().layout === 'compact';
  const lang = language.id;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [way, setWay] = useState<Way>(() => asWay(params.get('way')));

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
          // On a phone the five ways fit as words alone.
          options={[
            { value: 'write', label: compact ? 'Write' : 'Write or paste', icon: compact ? undefined : ClipboardPaste },
            { value: 'book', label: compact ? 'Book' : 'Import a book', icon: compact ? undefined : BookUp },
            { value: 'comic', label: compact ? 'Comic' : 'Import a comic', icon: compact ? undefined : PanelsTopLeft },
            { value: 'news', label: compact ? 'News' : 'News & links', icon: compact ? undefined : Newspaper },
            { value: 'goodreads', label: 'Goodreads', icon: compact ? undefined : Library },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={way} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={fade}>
          {way === 'write' && <WriteOrPaste lang={lang} onDone={(id) => navigate(`/codex/read/${id}`)} />}
          {(way === 'book' || way === 'comic') && <ImportFile key={way} kind={way} lang={lang} onDone={(id) => navigate(`/codex/book/${id}?new=1`)} onComic={(id) => navigate(`/codex/read/${id}`)} />}
          {way === 'news' && <NewsPanel lang={lang} onDone={(id) => navigate(`/codex/read/${id}`)} onPaste={() => setWay('write')} />}
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
  const [level, setLevel] = useState<Cefr | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // On a phone the keyboard waits for a tap instead of covering the page on arrival.
  const { pointer } = useLayout();
  const words = useMemo(() => (body.trim() ? countWords(body, lang) : 0), [body, lang]);

  const save = async () => {
    setBusy(true);
    try {
      onDone(await importPasted(lang, title.trim(), body, { author: author.trim() || undefined, level, coverDesign: design, coverImage: image ?? undefined }));
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
            autoFocus={pointer === 'fine'}
            placeholder="Paste an article, a chapter or song lyrics, or write your own. Empty lines start new paragraphs; a line starting with # becomes a chapter."
            className="min-h-[34dvh] w-full resize-y rounded-2xl border border-line bg-raised px-5 py-4 font-serif text-[17px] leading-relaxed transition-colors focus:border-accent"
          />
        </Field>
        <div>
          <span className="mb-1.5 block text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">Reading level</span>
          <LevelPicker value={level} onChange={setLevel} />
        </div>
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

type Busy = { name: string; progress: number; note?: string };

/**
 * A book, a comic or photos of a book's pages: a large drop area with a line drawing of the kind and
 * one clear button. Once the file is read its cover shows for a moment before the book opens.
 */
function ImportFile({ kind, lang, onDone, onComic }: { kind: 'book' | 'comic'; lang: string; onDone: (id: string) => void; onComic: (id: string) => void }) {
  const [busy, setBusy] = useState<Busy | null>(null);
  const [shelved, setShelved] = useState<Text | null>(null);
  const [photos, setPhotos] = useState(false);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const { pointer } = useLayout();

  const run = async (name: string, work: (progress: (fraction: number, note?: string) => void) => Promise<string>, then: (id: string) => void, fallback: string) => {
    setBusy({ name, progress: 0 });
    try {
      const id = await work((progress, note) => setBusy({ name, progress, note }));
      const text = await db.texts.get(id);
      if (!text) return then(id);
      setShelved(text);
      setTimeout(() => then(id), 1100);
    } catch (error) {
      toast(error instanceof EpubError || error instanceof Error ? error.message : fallback, { tone: 'error' });
      setBusy(null);
    }
  };

  // A comic: an archive, a PDF of pages, or the pages' pictures (several, or a folder of them).
  const takeComic = (files: File[]) => {
    if (!files.length) return;
    if (!comicSource(files)) return toast('Lingua opens comics as CBZ (or CBR made as zip) files, PDFs, or the pages’ pictures.', { tone: 'error' });
    void run(files.length === 1 ? files[0].name : files[0].webkitRelativePath.split('/')[0] || `${files.length} pages`, (p) => importComic(lang, files, p), onComic, 'That comic couldn’t be added.');
  };

  const take = (file: File) => {
    if (!bookFileKind(file)) return toast('Lingua reads DRM-free EPUB books, PDFs with text, and plain text files.', { tone: 'error' });
    void run(file.name, (p) => importBookFile(lang, file, p), onDone, 'That file couldn’t be imported.');
  };

  // Photos of a printed book's pages, read on this device.
  const takePhotos = (files: File[]) => {
    const pictures = files.filter(isPicture);
    if (!pictures.length) return;
    setPhotos(true);
    void run(pictures[0].webkitRelativePath.split('/')[0] || `${pictures.length} pages`, (p) => importPagePhotos(lang, pictures, p), onDone, 'Those pages couldn’t be read.');
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    if (busy) return;
    const files = [...e.dataTransfer.files];
    // Comic archives go to comics wherever they're dropped; pictures follow the tab (a book's pages,
    // or a comic's); so does a PDF.
    const source = comicSource(files);
    if (kind === 'comic' || source === 'archive') return takeComic(files);
    if (source === 'images') return takePhotos(files);
    if (files[0]) take(files[0]);
  };

  const drawing = photos ? 'photos' : kind;
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
        'flex min-h-[26rem] flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors',
        over ? 'border-accent bg-accent-soft/60' : 'border-line-strong/70 bg-surface',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {shelved ? (
          <motion.div key="shelved" className="flex flex-col items-center" initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={spring.soft}>
            <BookCover text={shelved} size="lg" className="w-36 shadow-elev-2" />
            <p className="mt-5 font-serif text-2xl font-semibold">On your shelf</p>
            <p lang={lang} className="mt-1 max-w-sm truncate text-[14.5px] text-ink-soft">
              {shelved.title}
            </p>
          </motion.div>
        ) : (
          <motion.div key="drop" className="flex w-full flex-col items-center" exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}>
            <KindDrawing kind={drawing} className={cx('mb-5 h-20 w-auto transition-colors', over ? 'text-accent-text' : 'text-sage-text')} />
            <p className="font-serif text-2xl font-semibold">
              {busy ? (photos ? 'Reading the pages…' : `Shelving “${busy.name}”…`) : kind === 'book' ? 'Drop a book here' : 'Drop a comic here'}
            </p>
            {busy ? (
              <div className="mt-5 w-full max-w-xs">
                <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(busy.progress * 100)}>
                  <div className="h-full w-full rounded-full bg-sage transition-transform duration-300" style={{ transform: `translateX(-${100 - Math.round(busy.progress * 100)}%)` }} />
                </div>
                <p className="mt-2 text-[13px] text-ink-faint tabular-nums">{busy.note ?? (busy.progress > 0 ? `${Math.round(busy.progress * 100)}%` : 'Opening the file…')}</p>
              </div>
            ) : (
              <>
                <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
                  {kind === 'book'
                    ? 'An EPUB without DRM, a PDF with real text, or a plain text file. Photos of a printed book’s pages work too.'
                    : 'CBZ (or CBR made as zip) files, PDFs of pages, or the pages’ pictures. Lingua reads the speech bubbles on this device.'}
                </p>
                <Button size="lg" className="mt-6" icon={kind === 'book' ? BookUp : PanelsTopLeft} onClick={() => void (kind === 'book' ? pickFile(BOOK_FILE_ACCEPT).then((f) => f && take(f)) : pickFiles(COMIC_FILE_ACCEPT).then(takeComic))}>
                  {kind === 'book' ? 'Choose a book' : 'Choose a comic'}
                </Button>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-semibold">
                  {kind === 'book' ? (
                    <>
                      <button type="button" onClick={() => void (pointer === 'fine' ? pickFolder() : pickFiles('image/*')).then(takePhotos)} className="hit text-accent-text underline-offset-2 hover:underline">
                        {pointer === 'fine' ? 'A folder of page photos' : 'Photos of the pages'}
                      </button>
                      <button type="button" onClick={() => void run('a short sample', () => importSample(lang), onDone, 'The sample couldn’t be added.')} className="hit text-ink-soft underline-offset-2 hover:text-ink hover:underline">
                        Or start with a short sample
                      </button>
                    </>
                  ) : (
                    pointer === 'fine' && (
                      <button type="button" onClick={() => void pickFolder().then(takeComic)} className="hit text-accent-text underline-offset-2 hover:underline">
                        A folder of pages
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
