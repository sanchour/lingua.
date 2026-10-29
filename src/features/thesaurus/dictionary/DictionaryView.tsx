import { Link, useSearchParams } from 'react-router';
import { BookA, Brain } from 'lucide-react';
import { hasFullDictionary } from '@/core/dictionary/format';
import { getLanguage } from '@/core/lang/languages';
import { Card } from '@/design/primitives';
import { removeDictionary, useDictionaryState } from '@/services/dictionary/fullDict';
import { toast } from '@/state/ui';
import { DictionarySearch, entryPath } from './DictionarySearch';
import { PersonalDictionaryToolbar } from './DictionaryToolsPanel';
import { EntryView, InstallCard } from './Entry';
import { MemoryList, useWordMemory, WordPlaces } from './WordMemory';
import type { RememberedRow } from './WordMemory';

/**
 * Thesaurus › Dictionary: the full dictionary (core languages) and the word memory in one place.
 * Look any word up above; your own words are listed beside, and either opens on the right.
 */
export function DictionaryView({ lang }: { lang: string }) {
  const [params, setParams] = useSearchParams();
  const word = params.get('word') ?? undefined;
  const full = hasFullDictionary(lang);
  const installed = useDictionaryState(lang);
  const ready = full && (installed?.state === 'ready' || installed?.state === 'old');
  const rows = useWordMemory(lang);
  const name = getLanguage(lang)?.name ?? lang;
  const selected = word ? rows?.find((r) => r.lemma === word || r.key === word || r.forms.includes(word)) : undefined;
  const open = (row: RememberedRow) => setParams({ tab: 'dictionary', word: row.lemma ?? row.key });

  return (
    <div>
      {full && (
        <div className="mb-7 flex items-center gap-5">
          <DictionarySearch lang={lang} size="lg" className="max-w-2xl flex-1" />
          {ready && installed && <p className="shrink-0 text-[13px] text-ink-faint">{installed.words.toLocaleString()} words · works offline</p>}
        </div>
      )}
      {full && installed?.state === 'none' && (
        <div className="mb-7">
          <InstallCard lang={lang} />
        </div>
      )}
      {installed?.state === 'old' && (
        <div className="mb-7">
          <InstallCard lang={lang} update />
        </div>
      )}

      <PersonalDictionaryToolbar lang={lang} onOpenWord={(w) => setParams({ tab: 'dictionary', word: w })} />

      <div className="grid grid-cols-[minmax(300px,380px)_minmax(0,1fr)] items-start gap-8">
        <section aria-label="Your words">
          <h2 className="mb-3 flex items-baseline gap-2 font-serif text-xl font-semibold">
            Your words <span className="font-sans text-sm font-bold text-ink-faint tabular-nums">{rows?.length ?? ''}</span>
          </h2>
          {rows && rows.length > 0 && <MemoryList lang={lang} rows={rows} selected={selected?.key} onSelect={open} />}
          {rows && rows.length === 0 && (
            <Card className="p-5">
              <Brain size={20} aria-hidden className="mb-2 text-sage-text" />
              <p className="text-[14px] leading-relaxed text-ink-soft">Words you look up or mark while reading, listening or watching gather here, with the sentence and the place you met them.</p>
            </Card>
          )}
        </section>

        <div className="sticky top-6 max-h-[calc(100dvh-48px)] min-w-0 overflow-y-auto overscroll-contain rounded-3xl border border-line bg-raised p-7 [scrollbar-width:thin]">
          {word ? (
            <EntryView lang={lang} word={word} />
          ) : selected ? (
            <div>
              <p lang={lang} className="font-serif text-[40px] leading-tight font-semibold">
                {selected.surface}
              </p>
              {selected.gloss && <p className="mt-1 mb-6 text-[16px] text-ink-soft">{selected.gloss}</p>}
              <WordPlaces lang={lang} sightings={selected.sightings} forms={selected.forms} />
            </div>
          ) : (
            <Welcome lang={lang} name={name} ready={ready} words={installed?.words ?? 0} recent={(rows ?? []).slice(0, 16)} />
          )}
        </div>
      </div>
    </div>
  );
}

function Welcome({ lang, name, ready, words, recent }: { lang: string; name: string; ready: boolean; words: number; recent: RememberedRow[] }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <BookA size={26} aria-hidden />
      </span>
      <p className="font-serif text-2xl font-semibold">{ready ? 'Look up any word' : 'Your words'}</p>
      <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
        {ready ? `${words.toLocaleString()} ${name} words, from Wiktionary. Type above, choose one of your words, or right-click a word while reading and choose Open dictionary.` : 'Choose one of your words to see where you met it.'}
      </p>
      {recent.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {recent.map((r) => (
            <Link key={r.key} to={entryPath(r.lemma ?? r.key)} lang={lang} className="rounded-full bg-surface px-3.5 py-1.5 font-serif text-[16px] transition-colors hover:bg-sunken">
              {r.surface}
            </Link>
          ))}
        </div>
      )}
      {ready && (
        <button
          type="button"
          onClick={() => void removeDictionary(lang).then(() => toast('The dictionary was removed from this device.'))}
          className="hit mt-10 text-[12.5px] font-semibold text-ink-faint underline-offset-2 hover:text-ink-soft hover:underline"
        >
          Remove the dictionary from this device
        </button>
      )}
    </div>
  );
}
