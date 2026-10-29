// Global search modal (`Ctrl+K` / `⌘K` palette, 6-22):
// Searches across personal vocabulary, decks, flashcards/notes, saved Codex texts & chapters,
// Diarium journal entries, and Grammatica topics.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookA, BookOpen, GraduationCap, Layers, NotebookPen, Search, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/app/context';
import { loadGrammar } from '@/core/grammar/load';
import { topicsOf } from '@/core/grammar/types';
import { rankGlobalSearch } from '@/core/search/globalSearch';
import type { GlobalSearchHit, GlobalSearchKind } from '@/core/search/globalSearch';
import { db } from '@/data/db';
import { Dialog, Kbd } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { useUI } from '@/state/ui';

const KIND_ICONS: Record<GlobalSearchKind, LucideIcon> = {
  word: BookA,
  deck: Layers,
  card: Sparkles,
  text: BookOpen,
  journal: NotebookPen,
  grammar: GraduationCap,
};

const KIND_LABELS: Record<GlobalSearchKind, string> = {
  word: 'Word',
  deck: 'Deck',
  card: 'Flashcard',
  text: 'Codex Text',
  journal: 'Journal',
  grammar: 'Grammar',
};

export function GlobalSearchModal() {
  const open = useUI((s) => s.globalSearchOpen);
  const setOpen = useUI((s) => s.setGlobalSearchOpen);
  const { language } = useApp();
  const lang = language.id;
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHits([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    let live = true;
    const q = query.trim();
    if (!open || !q) {
      setHits([]);
      return;
    }

    void (async () => {
      const [words, decks, notes, texts, journalEntries, grammar] = await Promise.all([
        db.words.where('[lang+state]').between([lang, 0], [lang, 2]).limit(1500).toArray(),
        db.decks.where('lang').equals(lang).toArray(),
        db.notes.where('lang').equals(lang).limit(1500).toArray(),
        db.texts.where('lang').equals(lang).toArray(),
        db.journalEntries.where('lang').equals(lang).toArray(),
        loadGrammar(lang),
      ]);
      const textIds = texts.map((t) => t.id);
      const chapters = textIds.length > 0 ? await db.chapters.where('textId').anyOf(textIds).limit(300).toArray() : [];
      const grammarTopics = (grammar ? topicsOf(grammar) : []).map((t) => ({
        id: t.id,
        title: t.title,
        level: t.level,
        summary: t.summary,
      }));

      const ranked = rankGlobalSearch(
        { words, decks, notes, texts, chapters, journalEntries, grammarTopics },
        q,
        20,
      );
      if (live) {
        setHits(ranked);
        setActive(0);
      }
    })();

    return () => {
      live = false;
    };
  }, [open, query, lang]);

  const pick = (hit: GlobalSearchHit) => {
    setOpen(false);
    navigate(hit.href);
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Search across Lingua">
      <div>
        <label className="flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-bg px-3.5 focus-within:border-accent">
          <Search size={18} aria-hidden className="shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(Math.max(0, hits.length - 1), i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && hits[active]) {
                e.preventDefault();
                pick(hits[active]);
              }
            }}
            data-autofocus
            placeholder="Search words, flashcards, decks, saved texts, notes, and grammar…"
            className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-ink-faint"
          />
          <Kbd>Esc</Kbd>
        </label>

        <div className="mt-3 max-h-[55dvh] overflow-y-auto">
          {!query.trim() ? (
            <p className="py-6 text-center text-[13.5px] text-ink-soft">
              Type a word, phrase, book title, flashcard meaning, or grammar topic to jump straight there.
            </p>
          ) : hits.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-ink-soft">Nothing matches “{query.trim()}”.</p>
          ) : (
            <ul role="listbox" className="space-y-1">
              {hits.map((hit, idx) => {
                const Icon = KIND_ICONS[hit.kind];
                return (
                  <li key={hit.id} role="option" aria-selected={idx === active}>
                    <button
                      type="button"
                      onPointerEnter={() => setActive(idx)}
                      onClick={() => pick(hit)}
                      className={cx(
                        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        idx === active ? 'bg-surface text-ink' : 'text-ink-soft hover:bg-surface/60',
                      )}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-sage-soft text-sage-text">
                        <Icon size={15} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-serif text-[15.5px] font-semibold text-ink">{hit.title}</span>
                          <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">
                            {KIND_LABELS[hit.kind]}
                          </span>
                        </span>
                        {hit.subtitle && <span className="block truncate text-[12.5px] text-ink-soft">{hit.subtitle}</span>}
                        {hit.snippet && <span className="mt-0.5 block truncate text-[12px] text-ink-faint">{hit.snippet}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
