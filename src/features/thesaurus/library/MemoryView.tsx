import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Brain, Clapperboard, Headphones, Layers, MessagesSquare, Music, NotebookPen, PanelsTopLeft, Radio, TextQuote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getTheme } from '@/core/lang/starter';
import { hasFullDictionary } from '@/core/dictionary/format';
import { db } from '@/data/db';
import { SIGHTING_KINDS, sightingLink, wordMemory } from '@/data/memory';
import type { Remembered } from '@/data/memory';
import type { SightingKind } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { buttonClasses, Card, SearchInput, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { DictionarySearch } from '@/features/codex/dictionary/DictionarySearch';
import { cx } from '@/lib/cx';

export const KIND_ICONS: Record<SightingKind, LucideIcon> = {
  book: BookOpen,
  comic: PanelsTopLeft,
  song: Music,
  listening: Headphones,
  radio: Radio,
  video: Clapperboard,
  chat: MessagesSquare,
  journal: NotebookPen,
  cards: Layers,
};

type Strength = 'all' | 'learning' | 'known' | 'met';
const STRENGTH_LABEL: Record<Exclude<Strength, 'all'>, string> = { learning: 'Learning', known: 'Known', met: 'Looked up' };

interface Row extends Remembered {
  strength: Exclude<Strength, 'all'>;
  gloss?: string;
  theme?: string;
}

const ago = (ms: number) => {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Thesaurus › Word memory: every word met anywhere in Lingua, with where and in which sentence. */
export function MemoryView({ lang }: { lang: string }) {
  const wide = useLayout().layout === 'wide';
  const rows = useLiveQuery(async (): Promise<Row[]> => {
    const words = await wordMemory(lang);
    const ids = words.flatMap((w) => w.forms.map((f) => `${lang}:${f}`));
    const [states, freq, starter] = await Promise.all([db.words.bulkGet(ids), db.frequency.bulkGet(words.map((w) => `${lang}:${w.forms[0]}`)), db.starterLists.get(lang)]);
    const stateOf = new Map(states.filter((w) => w && !w.deletedAt).map((w) => [w!.id, w!]));
    // A word's theme, where a ready-made theme deck has it.
    const themeOf = new Map<string, string>();
    for (const [theme, items] of Object.entries(starter?.themes ?? {})) for (const [term] of items) if (!themeOf.has(term)) themeOf.set(term, theme);
    return words.map((w, i) => {
      const forms = w.forms.map((f) => stateOf.get(`${lang}:${f}`));
      const strength = forms.some((s) => s?.state === 2) ? 'learning' : forms.some((s) => s?.state === 1) ? 'known' : 'met';
      const gloss = forms.find((s) => s?.gloss)?.gloss ?? freq[i]?.gloss;
      return { ...w, strength, gloss, theme: themeOf.get(w.lemma ?? w.key) ?? themeOf.get(w.forms[0]) };
    });
  }, [lang]);

  const [strength, setStrength] = useState<Strength>('all');
  const [kind, setKind] = useState<SightingKind | 'all'>('all');
  const [theme, setTheme] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const kinds = useMemo(() => [...new Set((rows ?? []).flatMap((r) => [...r.kinds]))], [rows]);
  const themes = useMemo(() => [...new Set((rows ?? []).map((r) => r.theme).filter(Boolean) as string[])], [rows]);
  const q = query.trim().toLocaleLowerCase(lang);
  const shown = (rows ?? []).filter(
    (r) =>
      (strength === 'all' || r.strength === strength) &&
      (kind === 'all' || r.kinds.has(kind)) &&
      (theme === 'all' || r.theme === theme) &&
      (!q || r.surface.toLocaleLowerCase(lang).includes(q) || r.forms.some((f) => f.includes(q)) || r.gloss?.toLowerCase().includes(q)),
  );
  const open = shown.find((r) => r.key === openKey) ?? (wide ? shown[0] : undefined);
  const counts = { learning: 0, known: 0, met: 0 };
  for (const r of rows ?? []) counts[r.strength]++;

  if (rows && rows.length === 0) {
    return (
      <Card className="flex flex-col items-center px-6 py-12 text-center">
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-soft text-sage-text">
          <Brain size={26} aria-hidden />
        </span>
        <p className="font-serif text-2xl font-semibold">Your word memory starts here</p>
        <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
          Every word you look up or mark, in a book, a song, a podcast, a film or a conversation, is kept here with the sentence you met it in. The same word met in many places becomes one word with all its sentences.
        </p>
        <Link to="/codex" className={cx(buttonClasses('primary', 'md'), 'mt-6')}>
          Open Codex
        </Link>
      </Card>
    );
  }

  return (
    <div>
      {hasFullDictionary(lang) && <DictionarySearch lang={lang} className="mb-5 max-w-md" />}
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">
        Every word you’ve looked up or marked, wherever you met it. Forms of one word are kept together, sorted by where they came from, how well you know them and their theme.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented<Strength>
          label="How well you know them"
          value={strength}
          onChange={setStrength}
          block={!wide}
          // On a phone the counts go, so the four fit the width.
          options={[
            { value: 'all', label: `All · ${rows?.length ?? 0}`, short: 'All' },
            { value: 'learning', label: `Learning · ${counts.learning}`, short: 'Learning' },
            { value: 'known', label: `Known · ${counts.known}`, short: 'Known' },
            { value: 'met', label: `Looked up · ${counts.met}`, short: 'Looked up' },
          ]}
        />
        <div className="ml-auto w-full sm:w-64">
          <SearchInput value={query} onChange={setQuery} placeholder="Search your words" />
        </div>
      </div>

      {(kinds.length > 1 || themes.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <Chip active={kind === 'all' && theme === 'all'} onClick={() => (setKind('all'), setTheme('all'))}>
            Everywhere
          </Chip>
          {kinds.map((k) => {
            const Icon = KIND_ICONS[k];
            return (
              <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? 'all' : k)}>
                <Icon size={13} aria-hidden /> {SIGHTING_KINDS[k].plural}
              </Chip>
            );
          })}
          {themes.map((t) => (
            <Chip key={t} active={theme === t} onClick={() => setTheme(theme === t ? 'all' : t)}>
              {getTheme(t)?.name ?? t}
            </Chip>
          ))}
        </div>
      )}

      <div className={wide ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-6' : undefined}>
        <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-raised">
          {shown.slice(0, 400).map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => setOpenKey(r.key === openKey && !wide ? null : r.key)}
                aria-expanded={open?.key === r.key}
                className={cx('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface', wide && open?.key === r.key && 'bg-surface')}
              >
                <span className="min-w-0 flex-1">
                  <span lang={lang} className="block truncate font-serif text-[17px] font-semibold">
                    {r.surface}
                  </span>
                  <span className="block truncate text-[13px] text-ink-soft">{r.gloss ?? `${r.forms.length} ${r.forms.length === 1 ? 'form' : 'forms'}`}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-ink-faint">
                  {[...r.kinds].slice(0, 3).map((k) => {
                    const Icon = KIND_ICONS[k];
                    return <Icon key={k} size={14} aria-label={SIGHTING_KINDS[k].label} />;
                  })}
                </span>
                <span className={cx('w-20 shrink-0 text-right text-[12px] font-semibold', r.strength === 'learning' ? 'text-accent-text' : r.strength === 'known' ? 'text-sage-text' : 'text-ink-faint')}>
                  {STRENGTH_LABEL[r.strength]}
                </span>
              </button>
              {!wide && (
                <AnimatePresence initial={false}>
                  {open?.key === r.key && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring.snappy} className="px-4 pb-4">
                      <WordPlaces lang={lang} row={r} />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </li>
          ))}
          {rows && shown.length === 0 && <li className="px-4 py-8 text-center text-[14px] text-ink-soft">No words match.</li>}
        </ul>
        {wide && open && (
          <Card className="sticky top-6 p-5">
            <div className="mb-3 flex items-baseline gap-3">
              <p lang={lang} className="min-w-0 flex-1 truncate font-serif text-[26px] font-semibold">
                {open.surface}
              </p>
              {hasFullDictionary(lang) && (
                <Link to={`/codex/dictionary/${encodeURIComponent(open.lemma ?? open.forms[0])}`} className="shrink-0 text-[13px] font-semibold text-accent-text hover:underline">
                  Full entry
                </Link>
              )}
            </div>
            {open.gloss && <p className="-mt-2 mb-4 text-[15px] text-ink-soft">{open.gloss}</p>}
            <WordPlaces lang={lang} row={open} />
          </Card>
        )}
      </div>
    </div>
  );
}

function WordPlaces({ lang, row }: { lang: string; row: Row }) {
  return (
    <div>
      {row.forms.length > 1 && (
        <p className="mb-3 text-[13px] text-ink-soft">
          Met as{' '}
          <span lang={lang} className="font-semibold text-ink">
            {row.forms.join(', ')}
          </span>
        </p>
      )}
      <ul className="space-y-2">
        {row.sightings.map((s) => {
          const Icon = KIND_ICONS[s.kind];
          const to = sightingLink(s);
          const body = (
            <>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-faint">
                <Icon size={13} aria-hidden /> <span className="truncate">{s.title}</span>
                <span className="ml-auto shrink-0 font-normal">{ago(s.at)}</span>
              </p>
              {s.sentence ? (
                <p lang={lang} className="mt-1 line-clamp-3 font-serif text-[15px] leading-snug">
                  <Marked sentence={s.sentence} word={s.surface ?? s.norm} />
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft">
                  <TextQuote size={13} aria-hidden /> No sentence kept
                </p>
              )}
            </>
          );
          return (
            <li key={s.id}>
              {to ? (
                <Link to={to} className="block rounded-xl bg-surface px-3.5 py-2.5 transition-colors hover:bg-sunken">
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl bg-surface px-3.5 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The sentence with the word in it marked (as met, any case). */
export function Marked({ sentence, word }: { sentence: string; word: string }) {
  const at = sentence.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  if (at < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, at)}
      <mark className="rounded-[3px] bg-accent-soft px-0.5 text-ink">{sentence.slice(at, at + word.length)}</mark>
      {sentence.slice(at + word.length)}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx('flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors', active ? 'bg-ink text-bg' : 'bg-surface text-ink-soft hover:bg-sunken hover:text-ink')}
    >
      {children}
    </button>
  );
}
