import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookA, BookMarked, Check, Circle, Layers, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { hasFullDictionary } from '@/core/dictionary/format';
import { plainGloss } from '@/core/lang/context';
import { cefrForRank } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import type { WordState } from '@/data/types';
import { recordSighting } from '@/data/memory';
import { setWordGloss, useWord } from '@/data/words';
import type { WordContext } from '@/data/words';
import { Badge, Button, Drawer, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { explainWord } from '@/services/llm/explain';
import { findBaseForms } from '@/services/translate/gloss';
import type { WordExplanation } from '@/services/llm/explain';
import { LlmError } from '@/services/llm/client';
import { AddToDeck } from './AddToDeck';
import { WordForms } from './WordForms';
import { entryPath } from '@/features/thesaurus/dictionary/DictionarySearch';
import { WhyThisForm } from '@/features/grammatica/links';
import { SpeakButton } from '@/features/speech/SpeakButton';

export interface DrawerWord {
  norm: string;
  context: WordContext;
}

interface WordDrawerProps {
  lang: string;
  word: DrawerWord | null;
  onClose: () => void;
  onState: (norm: string, state: WordState) => void;
  onGloss: (norm: string, gloss: string) => void;
}

const GENDER: Record<string, string> = { m: 'masculine', f: 'feminine', n: 'neuter', c: 'common' };

/** Tier 2: everything about one word, tucked into a drawer (slide-over on desktop, sheet on iPhone). */
export function WordDrawer({ lang, word, onClose, onState, onGloss }: WordDrawerProps) {
  return (
    <Drawer open={word !== null} onClose={onClose} title={word?.context.surface ?? ''} description={undefined}>
      {word && <WordDetails key={word.norm} lang={lang} word={word} onState={onState} onGloss={onGloss} />}
    </Drawer>
  );
}

function WordDetails({ lang, word, onState, onGloss }: { lang: string; word: DrawerWord; onState: WordDrawerProps['onState']; onGloss: WordDrawerProps['onGloss'] }) {
  const { norm, context } = word;
  const saved = useWord(lang, norm);
  const state: WordState = saved && !saved.deletedAt ? saved.state : 0;

  const dict = useLiveQuery(async () => {
    const pack = packId(lang);
    const listed = await db.dictForms.get([pack, norm]);
    // Not listed as written: the entry of a likely base form, said as such.
    const base = listed ? undefined : (await findBaseForms(lang, [norm])).get(norm);
    const form = listed ?? base?.form;
    const lemmas = form?.lemmas ?? [];
    const entries = (await db.dictEntries.bulkGet(lemmas.map((l) => [pack, l] as [string, string]))).filter(Boolean);
    const rank = (await db.frequency.get(`${lang}:${norm}`))?.rank;
    const examples = (await db.dictExamples.bulkGet(lemmas.map((l) => [pack, l] as [string, string]))).flatMap((e) => e?.ex ?? []).slice(0, 2);
    const hasParadigm = entries[0] ? Boolean(await db.dictParadigms.get([pack, entries[0].lemma])) : false;
    const note = saved?.noteId ? await db.notes.get(saved.noteId) : undefined;
    return { form, base, entries, rank, examples, hasParadigm, noteDeckId: note && !note.deletedAt ? note.deckId : undefined };
  }, [lang, norm, saved?.noteId]);

  const [tab, setTab] = useState<'meaning' | 'forms'>('meaning');
  // Looking a word up is meeting it: kept in the word memory with where and the sentence.
  useEffect(() => {
    void recordSighting(lang, norm, context).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, norm]);
  const [gloss, setGloss] = useState('');
  useEffect(() => setGloss(saved?.gloss ?? context.gloss ?? ''), [saved?.gloss, context.gloss]);

  const commitGloss = () => {
    const trimmed = gloss.trim();
    if (trimmed === (saved?.gloss ?? context.gloss ?? '')) return;
    void setWordGloss(lang, norm, trimmed);
    onGloss(norm, trimmed);
  };

  const main = dict?.entries[0];
  const subtitle = [main?.head ?? (main && main.lemma !== norm ? main.lemma : null), main?.senses[0]?.pos, main?.gender ? GENDER[main.gender] : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-6">
      <div>
        {subtitle && <p className="-mt-2 mb-3 font-serif text-[15px] text-ink-soft">{subtitle}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          <SpeakButton lang={lang} text={context.surface ?? norm} size={16} label="Hear the word" className="size-8 bg-sunken text-ink-soft hover:text-ink" />
          {main?.ipa && <Badge>{main.ipa}</Badge>}
          {dict?.rank && (
            <Badge tone="sage">
              #{dict.rank.toLocaleString()} most common · {cefrForRank(dict.rank)}
            </Badge>
          )}
          {state === 2 && saved?.noteId && (
            <Badge tone="accent">
              <Layers size={12} aria-hidden /> In “From my reading”
            </Badge>
          )}
          {hasFullDictionary(lang) && (
            <Link to={entryPath(main?.lemma ?? norm)} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-accent-text transition-colors hover:bg-accent-soft">
              <BookA size={14} aria-hidden /> Open dictionary
            </Link>
          )}
        </div>
      </div>

      <Segmented<`${WordState}`>
        label="Word state"
        value={String(state) as `${WordState}`}
        onChange={(v) => onState(norm, Number(v) as WordState)}
        block
        options={[
          { value: '0', label: 'Unseen', icon: Circle },
          { value: '1', label: 'Known', icon: Check },
          { value: '2', label: 'Learning', icon: BookMarked },
        ]}
      />

      {dict?.hasParadigm && (
        <Segmented
          label="Show"
          value={tab}
          onChange={setTab}
          block
          options={[
            { value: 'meaning', label: 'Meaning' },
            { value: 'forms', label: 'Forms' },
          ]}
        />
      )}

      {dict?.form?.d && <WhyThisForm lang={lang} description={dict.form.d} />}

      {tab === 'forms' && dict?.hasParadigm && main ? (
        <>
          {dict.form?.d && <p className="text-[14px] text-ink-soft">{dict.form.d}</p>}
          <WordForms lang={lang} lemma={main.lemma} seen={norm} heading={false} />
        </>
      ) : (
        <>
          <section>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="flex-1 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Meaning</h3>
              <AddToDeck
                lang={lang}
                note={{
                  term: main?.head ?? main?.lemma ?? context.surface ?? norm,
                  meaning: gloss.trim() || plainGloss(main?.senses[0]?.glosses[0] ?? ''),
                  lemma: main?.lemma,
                  pos: main?.senses[0]?.pos,
                  gender: main?.gender,
                  ipa: main?.ipa,
                  source: 'codex',
                  context: context.sentence ? { sentence: context.sentence, textId: context.textId, chapterIndex: context.chapterIndex, blockIndex: context.blockIndex } : undefined,
                }}
                move={state === 2 && saved?.noteId && dict?.noteDeckId ? { noteId: saved.noteId, deckId: dict.noteDeckId } : undefined}
              />
            </div>
            <input
              value={gloss}
              onChange={(e) => setGloss(e.target.value)}
              onBlur={commitGloss}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
              placeholder="Add your own translation"
              aria-label="Your translation"
              className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[16px] font-semibold transition-colors hover:border-line-strong focus:border-accent"
            />
            {context.usualGloss && !saved?.gloss && gloss === context.gloss && (
              <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-sage-text">
                <Sparkles size={13} aria-hidden className="mt-0.5 shrink-0" />
                <span>
                  The meaning in this sentence. Usually “{context.usualGloss}”.
                </span>
              </p>
            )}
            {dict?.base && (
              <p className="mt-2 text-[13px] text-ink-soft">
                Not in the dictionary as written.{' '}
                {dict.base.part ? (
                  <>
                    Its last part, <span lang={lang} className="font-semibold">…{dict.base.via}</span>, is below.
                  </>
                ) : (
                  <>
                    Read as <span lang={lang} className="font-semibold">{dict.base.via}</span>.
                  </>
                )}
              </p>
            )}
            {dict?.form?.d && !dict.hasParadigm && !dict.base && <p className="mt-2 text-[13px] text-ink-soft">{dict.form.d}</p>}
          </section>

          {dict && dict.entries.length > 0 && (
            <section>
              <h3 className="mb-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Dictionary</h3>
              <div className="space-y-4">
                {dict.entries.map((entry) => (
                  <div key={entry!.lemma}>
                    <p lang={lang} className="font-serif text-lg font-semibold">
                      {entry!.head ?? entry!.lemma}
                    </p>
                    <ol className="mt-1 space-y-1.5">
                      {entry!.senses.map((sense, i) => (
                        <li key={i} className="flex gap-2 text-[14.5px] leading-snug">
                          <span className="mt-0.5 shrink-0 text-[11px] font-bold tracking-wide text-ink-faint uppercase">{sense.pos}</span>
                          <span>{sense.glosses.join('; ')}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
              {dict.examples.length > 0 && (
                <ul className="mt-4 space-y-2.5 border-t border-line/70 pt-3">
                  {dict.examples.map(([sentence, translation, start, end]) => (
                    <li key={sentence}>
                      <p lang={lang} className="font-serif text-[15px] leading-snug">
                        {sentence.slice(0, start)}
                        <span className="font-semibold">{sentence.slice(start, end)}</span>
                        {sentence.slice(end)}
                      </p>
                      {translation && <p className="text-[13px] text-ink-soft italic">{translation}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11.5px] text-ink-faint">Wiktionary via kaikki.org · CC BY-SA</p>
            </section>
          )}

          {context.sentence && (
            <section>
              <h3 className="mb-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">In context</h3>
              <p lang={lang} className="rounded-2xl bg-surface px-4 py-3 font-serif text-[16px] leading-relaxed">
                <Highlighted sentence={context.sentence} word={context.surface ?? norm} />
              </p>
            </section>
          )}

          <Explain lang={lang} word={context.surface ?? norm} sentence={context.sentence ?? context.surface ?? norm} />
        </>
      )}
    </div>
  );
}

function Highlighted({ sentence, word }: { sentence: string; word: string }) {
  const at = sentence.indexOf(word);
  if (at < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, at)}
      <mark className="rounded-[3px] bg-accent-soft px-0.5 text-ink">{word}</mark>
      {sentence.slice(at + word.length)}
    </>
  );
}

function Explain({ lang, word, sentence }: { lang: string; word: string; sentence: string }) {
  const [result, setResult] = useState<WordExplanation | null>(null);
  const [error, setError] = useState<LlmError | Error | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await explainWord(lang, word, sentence));
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  if (!result) {
    return (
      <section>
        <Button variant="secondary" icon={Sparkles} onClick={() => void run()} loading={busy} block>
          Explain in context
        </Button>
        {error && (
          <p className="mt-2 text-[13px] text-accent-text">
            {error.message}{' '}
            {error instanceof LlmError && error.kind === 'no-key' && (
              <Link to="/settings/ai" className="font-semibold underline">
                Open settings
              </Link>
            )}
          </p>
        )}
      </section>
    );
  }

  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">
        <Sparkles size={13} aria-hidden /> Explanation
      </h3>
      <p className="text-[17px] font-semibold">{result.translation}</p>
      {(result.lemma || result.form) && (
        <p className="mt-0.5 text-[13px] text-ink-soft">
          <span lang={lang} className="font-serif">
            {result.lemma}
          </span>
          {result.form && ` · ${result.form}`}
        </p>
      )}
      {result.explanation && <p className="mt-3 text-[14.5px] leading-relaxed">{result.explanation}</p>}
      {result.notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] leading-snug text-ink-soft">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {result.examples.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {result.examples.map((ex) => (
            <div key={ex.text}>
              <p lang={lang} className="font-serif text-[15px]">
                {ex.text}
              </p>
              <p className="text-[13px] text-ink-soft">{ex.translation}</p>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

