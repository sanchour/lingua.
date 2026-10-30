import { UiText } from '@/design/i18n/UiText';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { BookA, Download, Search } from 'lucide-react';
import type { FullDictRow } from '@/core/dictionary/format';
import { getLanguage } from '@/core/lang/languages';
import { cx } from '@/lib/cx';
import { searchFull, useDictionaryState } from '@/services/dictionary/fullDict';
import { fade } from '@/design/motion';

export const entryPath = (word: string) => `/thesaurus?tab=dictionary&word=${encodeURIComponent(word)}`;

/** Look a word up in the full dictionary: suggestions as you type, Enter opens the first. */
export function DictionarySearch({ lang, autoFocus, size = 'md', className }: { lang: string; autoFocus?: boolean; size?: 'md' | 'lg'; className?: string }) {
  const navigate = useNavigate();
  const installed = useDictionaryState(lang);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FullDictRow[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const ready = installed?.state === 'ready' || installed?.state === 'old';

  useEffect(() => {
    let live = true;
    if (!ready || !query.trim()) return setResults([]);
    void searchFull(lang, query, 8).then((found) => {
      if (live) {
        setResults(found);
        setActive(0);
      }
    });
    return () => {
      live = false;
    };
  }, [lang, query, ready]);

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
  return (
    <div ref={box} className={cx('relative', className)}>
      <label className={cx('flex items-center gap-2.5 rounded-xl border border-line bg-raised px-3.5 transition-colors focus-within:border-accent hover:border-line-strong', size === 'lg' ? 'h-14 rounded-2xl' : 'h-11')}>
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
              if (results[active]) go(results[active].word);
              else if (!ready) navigate('/thesaurus?tab=dictionary');
              else if (query.trim()) go(query.trim());
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          autoFocus={autoFocus}
          lang={lang}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-label={`Look up a word in the ${name} dictionary`}
          placeholder={`Look up a word in ${name}`}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={cx('min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-faint', size === 'lg' ? 'text-[18px]' : 'text-[15px]')}
        />
      </label>
      <AnimatePresence>
        {open && query.trim() && (
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
              <li className="px-3 py-2.5 text-[14px] text-ink-soft"><UiText source={'No word starts like that.'} /></li>
            ) : (
              results.map((r, i) => (
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
                    <span className="min-w-0 truncate text-[13.5px] text-ink-soft">{r.entries[0]?.senses[0]?.g[0]}</span>
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
