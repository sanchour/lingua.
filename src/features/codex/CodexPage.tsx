import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, BookOpenText, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { SAMPLES } from '@/core/lang/samples';
import { refreshTextStats, useAllProgress, useLibrary } from '@/data/library';
import type { ReadingProgress, Text } from '@/data/types';
import { Button, buttonClasses, Card, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { attachEpub } from '@/services/import/importers';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { BookCard } from './library/BookCard';
import { BookCover } from './library/BookCover';
import { ImportMenu } from './library/ImportMenu';
import { useImporter } from './library/useImporter';

type Shelf = 'all' | 'reading' | 'to-read' | 'read';
const shelfOf = (t: Text): Exclude<Shelf, 'all'> => (t.finishedAt ? 'read' : (t.shelf ?? 'reading'));

export default function CodexPage() {
  const { language } = useApp();
  const lang = language.id;
  const texts = useLibrary(lang);
  const progress = useAllProgress();
  const { busy, run } = useImporter(lang);
  const navigate = useNavigate();
  const [shelf, setShelf] = useState<Shelf>('all');

  // Comprehension drifts as words become known; refresh quietly, one book at a time.
  useEffect(() => {
    if (!texts) return;
    let cancelled = false;
    const stale = texts.filter((t) => t.kind !== 'shelfItem' && (!t.stats || Date.now() - t.stats.computedAt > 120_000));
    void (async () => {
      for (const t of stale) {
        if (cancelled) return;
        await refreshTextStats(t.id);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on the number of books, not on every stats update (which would loop).
  }, [texts?.length, lang]);

  const current = useMemo(
    () => texts?.find((t) => t.kind !== 'shelfItem' && !t.finishedAt && progress?.has(t.id)),
    [texts, progress],
  );
  const shelvesInUse = useMemo(() => new Set(texts?.map(shelfOf)), [texts]);
  const visible = (texts ?? []).filter((t) => shelf === 'all' || shelfOf(t) === shelf);

  const attach = async (item: Text) => {
    const file = await pickFile('.epub,application/epub+zip');
    if (!file) return;
    try {
      const id = await attachEpub(item, file);
      navigate(`/codex/read/${id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That EPUB couldn’t be opened.', { tone: 'error' });
    }
  };

  return (
    <>
      <PageHeader title="Codex" actions={<ImportMenu lang={lang} busy={busy !== null} onImport={(kind) => void run(kind)} />} />

      {texts && texts.length === 0 && <EmptyLibrary lang={lang} busy={busy === 'sample'} onSample={() => void run('sample')} />}

      {current && progress && <ContinueCard text={current} progress={progress.get(current.id)!} />}

      {texts && texts.length > 0 && (
        <>
          {shelvesInUse.size > 1 && (
            <div className="mt-8 mb-5">
              <Segmented<Shelf>
                label="Shelf"
                value={shelf}
                onChange={setShelf}
                options={[
                  { value: 'all', label: 'All' },
                  ...(shelvesInUse.has('reading') ? [{ value: 'reading' as const, label: 'Reading' }] : []),
                  ...(shelvesInUse.has('to-read') ? [{ value: 'to-read' as const, label: 'To read' }] : []),
                  ...(shelvesInUse.has('read') ? [{ value: 'read' as const, label: 'Finished' }] : []),
                ]}
              />
            </div>
          )}
          <div className={shelvesInUse.size > 1 ? '' : 'mt-8'}>
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {visible.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: Math.min(i, 10) * 0.03 }}>
                  <BookCard text={t} progress={progress?.get(t.id)} onAttach={(item) => void attach(item)} />
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ContinueCard({ text, progress }: { text: Text; progress: ReadingProgress }) {
  const pct = Math.round(progress.percent * 100);
  return (
    <Card className="relative flex items-center gap-5 p-4 sm:p-5">
      <Link to={`/codex/read/${text.id}`} className="w-20 shrink-0 sm:w-24" aria-label={`Continue reading ${text.title}`}>
        <BookCover text={text} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">Continue reading</p>
        <p lang={text.lang} className="mt-1 line-clamp-2 font-serif text-xl leading-tight font-semibold">
          {text.title}
        </p>
        {text.author && <p className="truncate text-sm text-ink-soft">{text.author}</p>}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.02, progress.percent)})` }} />
          </div>
          <span className="text-xs font-semibold text-ink-faint tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="hidden shrink-0 sm:block">
        <Link to={`/codex/read/${text.id}`} className={buttonClasses('primary', 'md')}>
          Continue <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

function EmptyLibrary({ lang, busy, onSample }: { lang: string; busy: boolean; onSample: () => void }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <BookOpenText size={28} aria-hidden />
      </div>
      <h2 className="font-serif text-2xl font-semibold">Your shelves are waiting</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        Add a book, a text file or something you pasted. Or start with a short page, written for you.
      </p>
      <Button className="mt-6" icon={Sparkles} onClick={onSample} loading={busy}>
        Read “{SAMPLES[lang]?.title ?? SAMPLES.en.title}”
      </Button>
    </Card>
  );
}
