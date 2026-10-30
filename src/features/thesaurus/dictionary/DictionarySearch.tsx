import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { BookA, Download, Search, SlidersHorizontal } from 'lucide-react';
import type { DictSearchMode, ScoredDictRow } from '@/core/dictionary/searchTools';
import { getLanguage } from '@/core/lang/languages';
import { cx } from '@/lib/cx';
import { searchFullAdvanced, useDictionaryState } from '@/services/dictionary/fullDict';
import { fade } from '@/design/motion';

export const entryPath = (word: string) => `/thesaurus?tab=dictionary&word=${encodeURIComponent(word)}`;

const SEARCH_MODES: Array<{ id: DictSearchMode; label: string; hint: string }> = [
  { id: 'word', label: 'Headword', hint: 'Words and phrases' },
  { id: 'meaning', label: 'By meaning', hint: 'Reverse dictionary: search by concept or definition' },
  { id: 'fuzzy', label: 'Spelling tolerant', hint: 'Finds words even with typos or missing accents' },
  { id: 'prefix', label: 'Prefix…', hint: 'Words starting with a prefix' },
  { id: 'suffix', label: '…Suffix', hint: 'Words ending with a suffix' },
  { id: 'rhyme', label: 'Rhymes', hint: 'Words that rhyme with your query' },
  { id: 'sound', label: 'Similar sound', hint: 'Homophones and words that sound alike' },
];

const POS_FILTERS = [
  { id: 'all', label: 'All POS' },
  { id: 'noun', label: 'Nouns' },
  { id: 'verb', label: 'Verbs' },
  { id: 'adj', label: 'Adjectives' },
  { id: 'adv', label: 'Adverbs' },
  { id: 'phrase', label: 'Phrases' },
];

/** Look a word up in the full dictionary: supports headword, reverse/meaning, fuzzy, prefix/suffix, rhymes, similar sounds, and POS filter (6-22). */
export function DictionarySearch({ lang, autoFocus, size = 'md', className }: { lang: string; autoFocus?: boolean; size?: 'md' | 'lg'; className?: string }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const installed = useDictionaryState(lang);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<DictSearchMode>('word');
  const [pos, setPos] = useState<string>('all');
  const [showTools, setShowTools] = useState(false);
  const [results, setResults] = useState<ScoredDictRow[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const ready = installed?.state === 'ready' || installed?.state === 'old';

  useEffect(() => {
    let live = true;
    if (!ready || (!query.trim() && pos === 'all')) return setResults([]);
    void searchFullAdvanced(lang, query, { mode, pos, limit: 10 }).then((found) => {
      if (live) {
        setResults(found);
        setActive(0);
      }
    });
    return () => {
      live = false;
    };
  }, [lang, query, mode, pos, ready]);

  useEffect(() => {
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  const go = (word: string) => {
    setOpen(false);
    setQuery('');
    navigate(entryPath(word));
  };

  const name = getLanguage(lang)?.name ?? lang;
  const activeModeMeta = SEARCH_MODES.find((m) => m.id === mode) ?? SEARCH_MODES[0];

  return (
    <div ref={box} className={cx('relative', className)}>
      <div className="flex items-center gap-2">
        <label className={cx('flex flex-1 items-center gap-2.5 rounded-xl border border-line bg-raised px-3.5 transition-colors focus-within:border-accent hover:border-line-strong', size === 'lg' ? 'h-14 rounded-2xl' : 'h-11')}>
          <Search size={size === 'lg' ? 20 : 17} aria-hidden className="shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setActive((i) => Math.min(results.length - 1, i + 1)));
              if (e.key === 'ArrowUp') (e.preventDefault(), setActive((i) => Math.max(0, i - 1)));
              if (e.key === 'Enter') {
                if (results[active]) go(results[active].row.word);
                else if (!ready) navigate('/thesaurus?tab=dictionary');
                else if (query.trim()) go(query.trim());
              }
              if (e.key === 'Escape') setOpen(false);
            }}
            autoFocus={autoFocus}
            lang={mode === 'meaning' ? 'en' : lang}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-label={`Look up a word in the ${name} dictionary`}
            placeholder={mode === 'meaning' ? `Describe a concept or meaning in English…` : `Look up in ${name} (${activeModeMeta.label.toLowerCase()})`}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={cx('min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-faint', size === 'lg' ? 'text-[18px]' : 'text-[15px]')}
          />
          {size === 'lg' && (
            <button
              type="button"
              onClick={() => setShowTools((v) => !v)}
              aria-label={translateUi('Dictionary search tools')}
              aria-expanded={showTools}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                showTools || mode !== 'word' || pos !== 'all' ? 'bg-sage-soft text-sage-text' : 'text-ink-soft hover:bg-surface hover:text-ink',
              )}
            >
              <SlidersHorizontal size={14} aria-hidden />
              <span>{mode !== 'word' ? activeModeMeta.label : pos !== 'all' ? pos : translateUi('Search tools')}</span>
            </button>
          )}
        </label>
      </div>

      {size === 'lg' && showTools && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-2xl border border-line/70 bg-surface/65 p-2.5">
          <div role="group" aria-label={translateUi('Search mode')} className="flex flex-wrap gap-1">
            {SEARCH_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.hint}
                onClick={() => {
                  setMode(m.id);
                  setOpen(true);
                }}
                className={cx(
                  'rounded-full px-2.5 py-1 text-[12.5px] font-semibold transition-colors',
                  mode === m.id ? 'bg-ink text-bg' : 'bg-raised text-ink-soft hover:text-ink',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <span className="mx-1 h-4 w-px bg-line" aria-hidden />
          <select
            aria-label={translateUi('Filter by grammatical category')}
            value={pos}
            onChange={(e) => {
              setPos(e.target.value);
              setOpen(true);
            }}
            className="h-7 rounded-full border border-line bg-raised px-2.5 text-[12.5px] font-semibold text-ink-soft outline-none focus:border-ink"
          >
            {POS_FILTERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <AnimatePresence>
        {open && (query.trim() || pos !== 'all') && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-line bg-raised p-1.5 shadow-elev-3"
          >
            {!ready ? (
              <li>
                <button type="button" onClick={() => navigate('/thesaurus?tab=dictionary')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] hover:bg-surface">
                  <Download size={16} aria-hidden className="text-accent-text" />
                  <span>
                    <span className="font-semibold"><UiText source={'Get the {0} dictionary'} values={[name]} /></span>
                    <span className="block text-[12.5px] text-ink-soft"><UiText source={'Downloaded once, then it works offline.'} /></span>
                  </span>
                </button>
              </li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2.5 text-[14px] text-ink-soft"><UiText source={'No matching dictionary entries found.'} /></li>
            ) : (
              results.map(({ row: r, reason }, i) => (
                <li key={r.key} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onPointerEnter={() => setActive(i)}
                    onClick={() => go(r.word)}
                    className={cx('flex w-full items-baseline gap-3 rounded-xl px-3 py-2 text-left', i === active && 'bg-surface')}
                  >
                    <BookA size={14} aria-hidden className="shrink-0 translate-y-0.5 text-ink-faint" />
                    <span lang={lang} className="shrink-0 font-serif text-[16px] font-semibold">
                      {r.word}
                    </span>
                    {r.entries[0]?.pos && <span className="shrink-0 text-[11.5px] font-semibold text-ink-faint uppercase">{r.entries[0].pos}</span>}
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-soft">{r.entries[0]?.senses[0]?.g[0]}</span>
                    {reason && mode !== 'word' && <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-soft">{reason}</span>}
                  </button>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
