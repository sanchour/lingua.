import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { BookA, BookMarked, Check, Circle, Download, Sparkles, Volume2 } from 'lucide-react';
import type { FullDictRow, FullEntry } from '@/core/dictionary/format';
import { getLanguage } from '@/core/lang/languages';
import { cefrForRank } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import { useSightings } from '@/data/memory';
import type { WordState } from '@/data/types';
import { setWordState, useWord } from '@/data/words';
import { Badge, Button, Card, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { installDictionary, searchFull, useDictJobs, useFullEntry, DICT_SIZE_MB } from '@/services/dictionary/fullDict';
import { LlmError } from '@/services/llm/client';
import { tidyEntry } from '@/services/llm/tidyEntry';
import type { TidiedEntry } from '@/services/llm/tidyEntry';
import { toast } from '@/state/ui';
import { AddToDeck } from '@/features/codex/reader/AddToDeck';
import { WordForms } from '@/features/codex/reader/WordForms';
import { articleFor } from '../common/words';
import { entryPath } from './DictionarySearch';
import { WordPlaces } from './WordMemory';

const GENDER: Record<string, string> = { m: 'masculine', f: 'feminine', n: 'neuter', mf: 'masculine or feminine' };
const POS: Record<string, string> = { adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', det: 'determiner', intj: 'interjection', num: 'numeral', particle: 'particle', phrase: 'phrase', verb: 'verb', noun: 'noun', character: 'character', suffix: 'suffix', prefix: 'prefix' };

/** Offers a language's dictionary for download (or a newer build of it). */
export function InstallCard({ lang, update }: { lang: string; update?: boolean }) {
  const job = useDictJobs((s) => s.jobs[lang]);
  const name = getLanguage(lang)?.name ?? lang;
  const install = () =>
    installDictionary(lang)
      .then((n) => toast(`The ${name} dictionary is ready: ${n.toLocaleString()} words, offline.`, { tone: 'success' }))
      .catch((e: unknown) => toast(e instanceof Error ? e.message : 'The dictionary couldn’t be downloaded.', { tone: 'error' }));
  return (
    <Card className="flex items-center gap-5 p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <BookA size={24} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-xl font-semibold">{update ? `A better ${name} dictionary is ready` : `The ${name} dictionary`}</p>
        <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">
          {update
            ? 'Definitions in the language itself and many more example sentences.'
            : 'Every meaning with real examples, pronunciation, forms, phrases, synonyms and where the word comes from.'}{' '}
          About {DICT_SIZE_MB[lang] ?? 8} MB, kept on this device.
        </p>
        {job && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken" role="status" aria-label={job.phase === 'download' ? 'Downloading' : 'Storing'}>
            <div className="h-full origin-left rounded-full bg-sage transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.03, job.pct)})` }} />
          </div>
        )}
      </div>
      {!job && (
        <Button icon={Download} onClick={() => void install()}>
          {update ? 'Update' : 'Download'}
        </Button>
      )}
    </Card>
  );
}

/** A headword's full entry, or words that start the same when it isn't one. */
export function EntryView({ lang, word }: { lang: string; word: string }) {
  const row = useFullEntry(lang, word);
  if (row === undefined) return null;
  if (row === null) return <NotFound lang={lang} word={word} />;
  return <Entry key={row.key} lang={lang} row={row} />;
}

function NotFound({ lang, word }: { lang: string; word: string }) {
  const [near, setNear] = useState<FullDictRow[]>([]);
  useEffect(() => {
    void searchFull(lang, [...word].slice(0, 3).join(''), 10).then(setNear);
  }, [lang, word]);
  return (
    <div>
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
  const saved = useWord(lang, row.key);
  const state: WordState = saved && !saved.deletedAt ? saved.state : 0;
  const sightings = useSightings(lang, row.key, row.key);
  const packExamples = useLiveQuery(async () => (await db.dictExamples.get([packId(lang), row.key]))?.ex ?? [], [lang, row.key]);
  const main = row.entries[0];
  const gloss = main?.senses[0]?.g[0] ?? '';
  const article = articleFor(lang, main?.gender, row.word, main?.pos);
  const name = getLanguage(lang)?.name ?? lang;
  const sensesHaveExamples = row.entries.some((e) => e.senses.some((s) => s.ex?.length));

  const phrases = row.entries.flatMap((e) => e.phrases ?? []);
  const syn = [...new Set(row.entries.flatMap((e) => [...(e.syn ?? []), ...e.senses.flatMap((s) => s.syn ?? [])]))].filter((w) => w.split(' ').length < 4).slice(0, 14);
  const ant = [...new Set(row.entries.flatMap((e) => [...(e.ant ?? []), ...e.senses.flatMap((s) => s.ant ?? [])]))].slice(0, 10);
  const derived = [...new Set(row.entries.flatMap((e) => [...(e.derived ?? []), ...(e.related ?? [])]))].slice(0, 16);
  const ety = row.entries.find((e) => e.ety)?.ety;

  return (
    <article className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 lang={lang} className="font-serif text-[44px] leading-tight font-semibold tracking-tight">
          {article && <span className="font-normal text-ink-faint">{article} </span>}
          {main?.head ?? row.word}
        </h2>
        {main?.audio && (
          <button
            type="button"
            aria-label="Hear a recording"
            title="Hear a recording (Wikimedia Commons)"
            onClick={() => void new Audio(main.audio).play().catch(() => toast('The recording couldn’t be played.', { tone: 'error' }))}
            className="grid size-10 place-items-center rounded-full bg-surface text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
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

      <Tidy lang={lang} row={row} />

      <div className="mt-8 space-y-8">
        {row.entries.map((entry, i) => (
          <EntrySection key={i} lang={lang} entry={entry} />
        ))}
      </div>

      {row.mono && row.mono.length > 0 && (
        <Section title={`In ${name}`} note={`From the ${name} Wiktionary`}>
          <div className="space-y-4">
            {row.mono.map((m, i) => (
              <div key={i}>
                <p lang={lang} className="mb-1 text-[12.5px] font-semibold text-ink-faint">
                  {m.pos}
                </p>
                <ol className="list-decimal space-y-1 pl-5 marker:text-[13px] marker:text-ink-faint">
                  {m.defs.map((d) => (
                    <li key={d} lang={lang} className="font-serif text-[16px] leading-snug">
                      {d}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      )}

      {((row.tatoeba?.length ?? 0) > 0 || (!sensesHaveExamples && (packExamples?.length ?? 0) > 0)) && (
        <Section title="Sentences" note={row.tatoeba?.length ? 'From Tatoeba' : undefined}>
          <ul className="space-y-3">
            {[...(row.tatoeba ?? []), ...(sensesHaveExamples ? [] : (packExamples ?? []))].slice(0, 6).map(([sentence, translation, start, end]) => (
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
        </Section>
      )}

      <section className="mt-10">
        <WordForms lang={lang} lemma={row.key} seen={row.key} />
      </section>

      <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-7">
        {phrases.length > 0 && (
          <Side title="Set phrases" wide>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
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
          <Side title="Where you met it" wide>
            <WordPlaces lang={lang} sightings={sightings.slice(0, 6)} />
          </Side>
        )}
      </div>
      <p className="mt-10 text-[11.5px] leading-relaxed text-ink-faint">
        From Wiktionary via kaikki.org (CC BY-SA 4.0){row.tatoeba?.length ? ', sentences from Tatoeba (CC BY 2.0 FR)' : ''}. Frequency from FrequencyWords. Recordings from Wikimedia Commons.
      </p>
    </article>
  );
}

/** "At a glance": the entry put in order by AI, with the learner's own key. */
function Tidy({ lang, row }: { lang: string; row: FullDictRow }) {
  const [result, setResult] = useState<TidiedEntry | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await tidyEntry(lang, row));
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  if (!result) {
    return (
      <div className="mt-5">
        <Button variant="ghost" size="sm" icon={Sparkles} loading={busy} onClick={() => void run()}>
          At a glance, tidied by AI
        </Button>
        {error && (
          <p className="mt-1.5 text-[13px] text-accent-text">
            {error.message}{' '}
            {error instanceof LlmError && error.kind === 'no-key' && (
              <Link to="/ordo/ai" className="font-semibold underline">
                Open settings
              </Link>
            )}
          </p>
        )}
      </div>
    );
  }
  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="mt-6 rounded-2xl border border-line bg-surface p-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">
        <Sparkles size={13} aria-hidden /> At a glance
      </h3>
      {result.summary && <p className="text-[15px] leading-snug">{result.summary}</p>}
      <ol className="mt-3 space-y-2.5">
        {result.senses.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-4 shrink-0 text-right text-[13px] font-bold text-ink-faint tabular-nums">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[15.5px] font-semibold">
                {s.meaning}
                {s.register && <span className="ml-2 rounded-md bg-raised px-1.5 py-px text-[11.5px] font-semibold text-ink-soft">{s.register}</span>}
              </p>
              {s.example?.text && (
                <p className="mt-0.5 text-[14px] leading-snug">
                  <span lang={lang} className="font-serif">
                    {s.example.text}
                  </span>{' '}
                  <span className="text-ink-soft italic">{s.example.translation}</span>
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {result.tip && <p className="mt-3 border-t border-line pt-3 text-[14px] text-ink-soft">{result.tip}</p>}
    </motion.section>
  );
}

function EntrySection({ lang, entry }: { lang: string; entry: FullEntry }) {
  return (
    <section>
      <h3 className="mb-3 flex items-baseline gap-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">
        {POS[entry.pos] ?? entry.pos}
        {entry.head && (
          <span lang={lang} className="font-serif text-[15px] font-semibold tracking-normal text-ink-soft normal-case">
            {entry.head}
          </span>
        )}
      </h3>
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

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h3 className="mb-3 flex items-baseline gap-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">
        {title}
        {note && <span className="text-[11.5px] font-semibold tracking-normal normal-case">{note}</span>}
      </h3>
      {children}
    </section>
  );
}

function Side({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={cx(wide && 'col-span-2')}>
      <h3 className="mb-2.5 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{title}</h3>
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
