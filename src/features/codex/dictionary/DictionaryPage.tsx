import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookA, BookMarked, Check, Circle, Download, Volume2 } from 'lucide-react';
import { BackLink } from '@/app/BackLink';
import { useApp } from '@/app/context';
import { hasFullDictionary } from '@/core/dictionary/format';
import type { FullDictRow, FullEntry } from '@/core/dictionary/format';
import { getLanguage } from '@/core/lang/languages';
import { cefrForRank } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import { sightingLink, useSightings } from '@/data/memory';
import type { WordState } from '@/data/types';
import { setWordState, useWord } from '@/data/words';
import { useLayout } from '@/design/hooks/useLayout';
import { Badge, Button, Card, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { installDictionary, removeDictionary, searchFull, useDictionaryState, useDictJobs, useFullEntry, DICT_SIZE_MB } from '@/services/dictionary/fullDict';
import { toast } from '@/state/ui';
import { AddToDeck } from '../reader/AddToDeck';
import { WordForms } from '../reader/WordForms';
import { articleFor } from '@/features/thesaurus/common/words';
import { KIND_ICONS, Marked } from '@/features/thesaurus/library/MemoryView';
import { DictionarySearch, entryPath } from './DictionarySearch';

const GENDER: Record<string, string> = { m: 'masculine', f: 'feminine', n: 'neuter', mf: 'masculine or feminine' };
const POS: Record<string, string> = { adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', det: 'determiner', intj: 'interjection', num: 'numeral', particle: 'particle', phrase: 'phrase', verb: 'verb', noun: 'noun', character: 'character', suffix: 'suffix', prefix: 'prefix' };

/** Codex › Dictionary: the full dictionary of a core language, searched and read offline. */
export default function DictionaryPage() {
  const { language } = useApp();
  const lang = language.id;
  const { word } = useParams();
  const installed = useDictionaryState(lang);
  const name = getLanguage(lang)?.name ?? lang;
  const wide = useLayout().layout === 'wide';

  if (!hasFullDictionary(lang)) {
    return (
      <>
        <BackLink to="/codex">Codex</BackLink>
        <Card className="max-w-2xl p-7">
          <p className="font-serif text-2xl font-semibold">The full dictionary is for the six core languages</p>
          <p className="mt-2 text-ink-soft">Spanish, Russian, Mandarin, French, German and Arabic have one. {name} words still open with their meaning, forms and examples when you right-click or tap them while reading.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <BackLink to="/codex">Codex</BackLink>
      <header className={cx('mb-8 flex gap-4', wide ? 'items-end justify-between' : 'flex-col')}>
        <div>
          <p className="mb-1.5 text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">Dictionary · {name}</p>
          {!word && <h1 className="font-serif text-[34px] leading-tight font-semibold tracking-tight sm:text-[40px]">Look up any word</h1>}
        </div>
        {installed?.state !== 'none' && <DictionarySearch lang={lang} autoFocus={!word && wide} className={wide ? 'w-96' : 'w-full'} />}
      </header>

      {installed?.state === 'none' && <InstallCard lang={lang} />}
      {installed?.state === 'old' && <InstallCard lang={lang} update />}
      {installed && installed.state !== 'none' && (word ? <EntryView lang={lang} word={word} /> : <Landing lang={lang} words={installed.words} />)}
    </>
  );
}

function InstallCard({ lang, update }: { lang: string; update?: boolean }) {
  const job = useDictJobs((s) => s.jobs[lang]);
  const name = getLanguage(lang)?.name ?? lang;
  const install = () =>
    installDictionary(lang)
      .then((n) => toast(`The ${name} dictionary is ready: ${n.toLocaleString()} words, offline.`, { tone: 'success' }))
      .catch((e: unknown) => toast(e instanceof Error ? e.message : 'The dictionary couldn’t be downloaded.', { tone: 'error' }));
  return (
    <Card className={cx('max-w-2xl p-7', update && 'mb-8')}>
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <BookA size={26} aria-hidden />
      </span>
      <p className="font-serif text-2xl font-semibold">{update ? `A better ${name} dictionary is ready` : `The ${name} dictionary`}</p>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        Every meaning with its labels and real examples, the pronunciation with a recording, every form, set phrases, synonyms and antonyms, words easily confused, and where the word comes from. About {DICT_SIZE_MB[lang] ?? 8} MB, downloaded once and kept on this device.
      </p>
      {job ? (
        <div className="mt-6" role="status">
          <p className="mb-2 text-[13px] font-semibold text-ink-soft">{job.phase === 'download' ? 'Downloading…' : 'Putting it on the shelf…'} {Math.round(job.pct * 100)}%</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full origin-left rounded-full bg-sage transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.03, job.pct)})` }} />
          </div>
        </div>
      ) : (
        <Button className="mt-6" icon={Download} onClick={() => void install()}>
          {update ? 'Update the dictionary' : 'Download the dictionary'}
        </Button>
      )}
    </Card>
  );
}

function Landing({ lang, words }: { lang: string; words: number }) {
  const recent = useLiveQuery(async () => {
    const rows = await db.sightings.where('[lang+at]').between([lang, 0], [lang, Infinity]).reverse().limit(60).toArray();
    return [...new Set(rows.filter((r) => !r.deletedAt).map((r) => r.lemma ?? r.norm))].slice(0, 16);
  }, [lang]);
  const name = getLanguage(lang)?.name ?? lang;
  return (
    <div className="max-w-3xl">
      <p className="text-[15px] text-ink-soft">
        {words.toLocaleString()} {name} words on this device, from Wiktionary. Type above, or right-click a word while reading and choose <span className="font-semibold text-ink">Full entry</span>.
      </p>
      {recent && recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Words you met lately</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((w) => (
              <Link key={w} to={entryPath(w)} lang={lang} className="rounded-full bg-surface px-3.5 py-1.5 font-serif text-[16px] transition-colors hover:bg-sunken">
                {w}
              </Link>
            ))}
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => void removeDictionary(lang).then(() => toast('The dictionary was removed from this device.'))}
        className="hit mt-12 text-[13px] font-semibold text-ink-faint underline-offset-2 hover:text-ink-soft hover:underline"
      >
        Remove the dictionary from this device
      </button>
    </div>
  );
}

function EntryView({ lang, word }: { lang: string; word: string }) {
  const row = useFullEntry(lang, word);
  if (row === undefined) return null;
  if (row === null) return <NotFound lang={lang} word={word} />;
  return <Entry lang={lang} row={row} />;
}

function NotFound({ lang, word }: { lang: string; word: string }) {
  const [near, setNear] = useState<FullDictRow[]>([]);
  useEffect(() => {
    void searchFull(lang, [...word].slice(0, 3).join(''), 10).then(setNear);
  }, [lang, word]);
  return (
    <div className="max-w-2xl">
      <p className="font-serif text-2xl font-semibold">
        “<span lang={lang}>{word}</span>” isn’t a headword
      </p>
      <p className="mt-2 text-ink-soft">It may be a form of another word: right-click it while reading to see which. Words that start the same:</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {near.map((r) => (
          <Link key={r.key} to={entryPath(r.word)} lang={lang} className="rounded-full bg-surface px-3.5 py-1.5 font-serif text-[16px] hover:bg-sunken">
            {r.word}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Entry({ lang, row }: { lang: string; row: FullDictRow }) {
  const wide = useLayout().layout === 'wide';
  const saved = useWord(lang, row.key);
  const state: WordState = saved && !saved.deletedAt ? saved.state : 0;
  const sightings = useSightings(lang, row.key, row.key);
  const packExamples = useLiveQuery(async () => (await db.dictExamples.get([packId(lang), row.key]))?.ex ?? [], [lang, row.key]);
  const main = row.entries[0];
  const gloss = main?.senses[0]?.g[0] ?? '';
  const article = articleFor(lang, main?.gender, row.word, main?.pos);
  const sensesHaveExamples = row.entries.some((e) => e.senses.some((s) => s.ex?.length));

  const phrases = row.entries.flatMap((e) => e.phrases ?? []);
  const syn = [...new Set(row.entries.flatMap((e) => [...(e.syn ?? []), ...e.senses.flatMap((s) => s.syn ?? [])]))].filter((w) => !/\s/.test(w) || w.split(' ').length < 4).slice(0, 14);
  const ant = [...new Set(row.entries.flatMap((e) => [...(e.ant ?? []), ...e.senses.flatMap((s) => s.ant ?? [])]))].slice(0, 10);
  const derived = [...new Set(row.entries.flatMap((e) => [...(e.derived ?? []), ...(e.related ?? [])]))].slice(0, 16);
  const ety = row.entries.find((e) => e.ety)?.ety;

  const rail = (
    <>
      {phrases.length > 0 && (
        <Side title="Set phrases">
          <ul className="space-y-1.5">
            {phrases.slice(0, 12).map(([p, g]) => (
              <li key={p} className="text-[14.5px] leading-snug">
                <span lang={lang} className="font-serif font-semibold">
                  {p}
                </span>
                {g && <span className="text-ink-soft"> · {g}</span>}
              </li>
            ))}
          </ul>
        </Side>
      )}
      {(syn.length > 0 || ant.length > 0) && (
        <Side title="Synonyms and antonyms">
          {syn.length > 0 && <WordLinks lang={lang} label="Like" words={syn} />}
          {ant.length > 0 && <WordLinks lang={lang} label="Opposite" words={ant} />}
        </Side>
      )}
      {row.confused && row.confused.length > 0 && (
        <Side title="Easily confused with">
          <WordLinks lang={lang} words={row.confused} />
        </Side>
      )}
      {derived.length > 0 && (
        <Side title="Related words">
          <WordLinks lang={lang} words={derived} />
        </Side>
      )}
      {ety && (
        <Side title="Where it comes from">
          <p className="text-[14px] leading-relaxed text-ink-soft">{ety}</p>
        </Side>
      )}
      {sightings && sightings.length > 0 && (
        <Side title="Where you met it">
          <ul className="space-y-1.5">
            {sightings.slice(0, 5).map((s) => {
              const Icon = KIND_ICONS[s.kind];
              const to = sightingLink(s);
              const body = (
                <>
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-faint">
                    <Icon size={12} aria-hidden /> <span className="truncate">{s.title}</span>
                  </span>
                  {s.sentence && (
                    <span lang={lang} className="mt-0.5 line-clamp-2 block font-serif text-[14.5px] leading-snug">
                      <Marked sentence={s.sentence} word={s.surface ?? s.norm} />
                    </span>
                  )}
                </>
              );
              return <li key={s.id}>{to ? <Link to={to} className="-mx-2 block rounded-xl px-2 py-1.5 hover:bg-surface">{body}</Link> : <div className="py-1.5">{body}</div>}</li>;
            })}
          </ul>
        </Side>
      )}
      <p className="text-[11.5px] leading-relaxed text-ink-faint">From Wiktionary via kaikki.org, CC BY-SA 4.0. Frequency from FrequencyWords. Recordings from Wikimedia Commons.</p>
    </>
  );

  return (
    <div className={wide ? 'grid grid-cols-[minmax(0,1fr)_320px] items-start gap-12' : undefined}>
      <article className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 lang={lang} className="font-serif text-[44px] leading-tight font-semibold tracking-tight sm:text-[52px]">
            {article && <span className="font-normal text-ink-faint">{article} </span>}
            {main?.head ?? row.word}
          </h1>
          {main?.audio && (
            <button
              type="button"
              aria-label="Hear a recording"
              title="Hear a recording (Wikimedia Commons)"
              onClick={() => void new Audio(main.audio).play().catch(() => toast('The recording couldn’t be played.', { tone: 'error' }))}
              className="grid size-10 translate-y-[-4px] place-items-center self-center rounded-full bg-surface text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
            >
              <Volume2 size={18} aria-hidden />
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {main?.ipa?.map((p) => <Badge key={p}>{p}</Badge>)}
          {row.rank && (
            <Badge tone="sage">
              #{row.rank.toLocaleString()} most common · {cefrForRank(row.rank)}
            </Badge>
          )}
          {main?.gender && <Badge>{GENDER[main.gender] ?? main.gender}</Badge>}
          {main?.pair?.map(([label, w]) => (
            <Link key={label} to={entryPath(w.replace(/́/g, ''))} className="rounded-full border border-line px-2.5 py-0.5 text-[12.5px] hover:bg-surface">
              <span className="text-ink-faint">{label} </span>
              <span lang={lang} className="font-semibold">
                {w}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="w-full max-w-sm">
            <Segmented<`${WordState}`>
              label="Word state"
              value={String(state) as `${WordState}`}
              onChange={(v) => void setWordState(lang, row.key, Number(v) as WordState, { surface: row.word, lemma: row.key, gloss })}
              block
              options={[
                { value: '0', label: 'Unseen', icon: Circle },
                { value: '1', label: 'Known', icon: Check },
                { value: '2', label: 'Learning', icon: BookMarked },
              ]}
            />
          </div>
          <AddToDeck lang={lang} note={{ term: row.word, meaning: gloss, lemma: row.key, pos: main?.pos, gender: main?.gender, ipa: main?.ipa?.[0], source: 'codex' }} />
        </div>

        <div className="mt-9 space-y-9">
          {row.entries.map((entry, i) => (
            <EntrySection key={i} lang={lang} entry={entry} />
          ))}
        </div>

        {!sensesHaveExamples && packExamples && packExamples.length > 0 && (
          <section className="mt-9">
            <h2 className="mb-3 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Examples</h2>
            <ul className="space-y-3">
              {packExamples.map(([sentence, translation, start, end]) => (
                <li key={sentence}>
                  <p lang={lang} className="font-serif text-[16px] leading-snug">
                    {sentence.slice(0, start)}
                    <span className="font-semibold">{sentence.slice(start, end)}</span>
                    {sentence.slice(end)}
                  </p>
                  {translation && <p className="text-[14px] text-ink-soft italic">{translation}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <WordForms lang={lang} lemma={row.key} seen={row.key} />
        </section>

        {!wide && <div className="mt-10 space-y-8">{rail}</div>}
      </article>
      {wide && <aside className="sticky top-8 space-y-7">{rail}</aside>}
    </div>
  );
}

function EntrySection({ lang, entry }: { lang: string; entry: FullEntry }) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">
        {POS[entry.pos] ?? entry.pos}
        {entry.head && <span lang={lang} className="font-serif text-[15px] font-semibold tracking-normal text-ink-soft normal-case">{entry.head}</span>}
      </h2>
      <ol className="space-y-4">
        {entry.senses.map((sense, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-5 shrink-0 pt-0.5 text-right text-[13px] font-bold text-ink-faint tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[16.5px] leading-snug">
                {sense.tags?.map((t) => (
                  <span key={t} className="mr-1.5 inline-block rounded-md bg-surface px-1.5 py-px align-[1px] text-[11.5px] font-semibold text-ink-soft">
                    {t}
                  </span>
                ))}
                {sense.g.join('; ')}
              </p>
              {sense.ex && sense.ex.length > 0 && (
                <ul className="mt-1.5 space-y-1.5 border-l-2 border-line pl-3">
                  {sense.ex.map(([text, translation, start, end]) => (
                    <li key={text}>
                      <p lang={lang} className="font-serif text-[15.5px] leading-snug">
                        {start !== undefined && end !== undefined ? (
                          <>
                            {text.slice(0, start)}
                            <span className="font-semibold">{text.slice(start, end)}</span>
                            {text.slice(end)}
                          </>
                        ) : (
                          text
                        )}
                      </p>
                      {translation && <p className="text-[13.5px] text-ink-soft italic">{translation}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {(sense.syn || sense.ant) && (
                <p className="mt-1 text-[13px] text-ink-soft">
                  {sense.syn && (
                    <>
                      <span className="text-ink-faint">like </span>
                      <InlineLinks lang={lang} words={sense.syn} />
                    </>
                  )}
                  {sense.syn && sense.ant && <span className="text-ink-faint"> · </span>}
                  {sense.ant && (
                    <>
                      <span className="text-ink-faint">opposite </span>
                      <InlineLinks lang={lang} words={sense.ant} />
                    </>
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Side({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{title}</h2>
      {children}
    </section>
  );
}

function WordLinks({ lang, words, label }: { lang: string; words: string[]; label?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-1.5">
      {label && <span className="mr-0.5 text-[12.5px] text-ink-faint">{label}</span>}
      {words.map((w) => (
        <Link key={w} to={entryPath(w)} lang={lang} className="rounded-full bg-surface px-2.5 py-0.5 font-serif text-[15px] transition-colors hover:bg-sunken">
          {w}
        </Link>
      ))}
    </div>
  );
}

function InlineLinks({ lang, words }: { lang: string; words: string[] }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={w}>
          {i > 0 && ', '}
          {/\s/.test(w) ? (
            <span lang={lang}>{w}</span>
          ) : (
            <Link to={entryPath(w)} lang={lang} className="font-serif text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
              {w}
            </Link>
          )}
        </span>
      ))}
    </>
  );
}
