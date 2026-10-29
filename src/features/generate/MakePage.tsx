// What Max makes for the learner (6-6b): a story, example sentences, a dialogue or a word list, at their level and on a topic,
// checked before it is shown (core/generate), labelled "Generated" with Report, and turned into something they keep: a text in
// Codex, or a deck. It needs Lingua+ Max and the learner's own key; without them the page says so.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BookOpen, Layers, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { BackLink } from '@/app/BackLink';
import { PageHeader } from '@/app/PageHeader';
import type { GeneratedRow } from '@/core/contracts/db';
import { labelFor } from '@/core/generate/generate';
import type { DialogueBody, GeneratedKind, QuizBody, SentencesBody, StoryBody, WordlistBody } from '@/core/generate/generate';
import { CEFR_LEVELS } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { textToChapters } from '@/core/parsers/text';
import { wordsFromText } from '@/core/srs/deckFrom';
import type { Draft } from '@/core/srs/deckFrom';
import { deckFromDrafts, knownNorms } from '@/data/deckTools';
import { addText, textChapters, useLibrary } from '@/data/library';
import { mistakesText } from '@/data/mistakesText';
import { blocksToText } from '@/core/parsers/text';
import { aiBlock } from '@/data/plan';
import { Button, Select } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { MaxLink } from '@/features/plans/Locked';
import { GeneratedLabel } from '@/features/generated/GeneratedLabel';
import { LlmError } from '@/services/llm/client';
import { generateMaterial } from '@/services/llm/generate';
import { toast } from '@/state/ui';

const KINDS: Array<{ kind: GeneratedKind; title: string; detail: string; cost: string }> = [
  { kind: 'story', title: 'A story', detail: 'A short graded reader, with its translation.', cost: 'about 600 words in all' },
  { kind: 'sentences', title: 'Example sentences', detail: 'Eight short sentences on the topic.', cost: 'about 250 words in all' },
  { kind: 'dialogue', title: 'A dialogue', detail: 'Two people talking, line by line.', cost: 'about 300 words in all' },
  { kind: 'quiz', title: 'A quiz', detail: 'Five questions to answer, with the reason for each.', cost: 'about 250 words in all' },
  { kind: 'simplified', title: 'Simplify a text', detail: 'Paste a text; get it back in easier words, beside the original.', cost: 'about as long as your text, twice' },
  { kind: 'wordlist', title: 'A word list', detail: 'Twelve useful words, each with a sentence, for a deck.', cost: 'about 350 words in all' },
];

export default function MakePage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const [kind, setKind] = useState<GeneratedKind>('story');
  const [topic, setTopic] = useState('');
  const [source, setSource] = useState('');
  // What a quiz is about: a topic, one of the learner's texts, pasted notes, or their own mistakes.
  const [from, setFrom] = useState<'topic' | 'library' | 'notes' | 'mistakes'>('topic');
  const [textId, setTextId] = useState('');
  const library = useLibrary(lang);
  const [level, setLevel] = useState<Cefr>((language.level === 'A0' ? 'A1' : language.level) as Cefr);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [row, setRow] = useState<GeneratedRow | null>(null);
  const [translated, setTranslated] = useState(false);
  const block = aiBlock(settings, settings.llm.provider);
  const chosen = KINDS.find((k) => k.kind === kind)!;

  const make = async () => {
    setBusy(true);
    setError(null);
    setRow(null);
    try {
      let basis: string | undefined;
      if (kind === 'simplified') basis = source.trim();
      if (kind === 'quiz' && from === 'notes') basis = source.trim();
      if (kind === 'quiz' && from === 'library') basis = blocksToText((await textChapters(textId)).flatMap((c) => c.blocks)).slice(0, 4000);
      if (kind === 'quiz' && from === 'mistakes') basis = await mistakesText(lang);
      if (kind === 'quiz' && from === 'mistakes' && !basis) throw new Error('Nothing to practise yet: your mistakes appear here once you have made some in a lesson or in Practice.');
      if (basis !== undefined && basis.length < 40 && from !== 'mistakes') throw new Error(from === 'library' ? 'Choose a text first.' : 'Paste a longer text first.');
      setRow((await generateMaterial({ lang, kind, level, topic: kind === 'quiz' && from === 'mistakes' ? 'my mistakes' : kind === 'simplified' || basis ? undefined : topic.trim() || undefined, source: basis?.slice(0, 4000) })).row);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const keepStory = async (body: StoryBody) => {
    const id = await addText({ lang, title: body.title, kind: 'article', source: 'paste', chapters: textToChapters(body.text, body.title), level });
    toast('Added to your library in Codex', { tone: 'success' });
    return id;
  };
  const deckOf = async (name: string, drafts: Draft[]) => {
    navigate(`/thesaurus/deck/${await deckFromDrafts(lang, name, drafts)}`);
  };

  return (
    <>
      <BackLink to="/thesaurus">Thesaurus</BackLink>
      <PageHeader title="Made by Max" />
      <p className="mb-6 max-w-2xl text-[15px] text-ink-soft">
        Max writes it at your level, in short, common words; every word is looked up in the dictionary and the level is measured before you see it. It says so on the page, and you can report what is wrong.
      </p>

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-label="What to make" className="space-y-5">
          <div className="space-y-2" role="radiogroup" aria-label="Kind">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                role="radio"
                aria-checked={kind === k.kind}
                onClick={() => setKind(k.kind)}
                className={cx('block w-full rounded-2xl border p-3.5 text-left transition-colors', kind === k.kind ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface')}
              >
                <span className="block text-[15px] font-semibold">{k.title}</span>
                <span className="block text-[13px] text-ink-soft">{k.detail}</span>
              </button>
            ))}
          </div>
          {kind === 'quiz' && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What the quiz is about">
              {([['topic', 'A topic'], ['library', 'A text of mine'], ['notes', 'My notes'], ['mistakes', 'My mistakes']] as const).map(([v, label]) => (
                <button key={v} type="button" role="radio" aria-checked={from === v} onClick={() => setFrom(v)} className={cx('rounded-full border px-3 py-1 text-[13px] font-semibold', from === v ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-soft hover:bg-surface')}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {kind === 'quiz' && from === 'library' && (
            <Select label="Text" value={textId} onChange={setTextId} options={[{ value: '', label: library?.length ? 'Choose a text…' : 'Your library is empty', disabled: true }, ...(library ?? []).map((t) => ({ value: t.id, label: t.title }))]} />
          )}
          {kind === 'quiz' && from === 'mistakes' && <p className="text-[13px] text-ink-soft">Questions on the words and grammar you keep getting wrong, taken from your record.</p>}
          {kind === 'simplified' || (kind === 'quiz' && from === 'notes') ? (
            <label className="block text-[13px] font-bold tracking-wide text-ink-soft uppercase">
              The text
              <textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                lang={lang}
                rows={7}
                maxLength={4000}
                placeholder="An article, a page of a book…"
                className="mt-1.5 w-full resize-y rounded-xl border border-line bg-raised p-3 text-[15px] font-normal tracking-normal text-ink normal-case outline-none focus:border-accent"
              />
            </label>
          ) : kind === 'quiz' && from !== 'topic' ? null : (
            <label className="block text-[13px] font-bold tracking-wide text-ink-soft uppercase">
              About
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={80}
                placeholder="a trip to the market, my first job…"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-raised px-3.5 text-[15px] font-medium tracking-normal text-ink normal-case outline-none focus:border-accent"
              />
            </label>
          )}
          <Select<Cefr> label="Level" value={level} onChange={setLevel} options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))} />
          <div>
            <Button block size="lg" icon={Sparkles} loading={busy} disabled={block !== null} onClick={() => void make()}>
              Make it
            </Button>
            <p className="mt-2 text-[12.5px] text-ink-faint">One request to your own AI key, {chosen.cost}. The same request is never paid for twice: what was made is kept on this device.</p>
            {block === 'max' && (
              <p className="mt-2 text-[13px] text-accent-text">
                This needs Lingua+ Max. <MaxLink className="underline" />
              </p>
            )}
            {block === 'key' && (
              <p className="mt-2 text-[13px] text-accent-text">
                Add your AI key first:{' '}
                <Link to="/settings/ai" className="font-semibold underline">
                  Settings › AI
                </Link>
              </p>
            )}
            {error && (
              <p className="mt-2 text-[13px] text-accent-text">
                {error.message} {error instanceof LlmError && error.kind === 'no-plan' && <MaxLink className="underline" />}
              </p>
            )}
          </div>
        </section>

        <section aria-label="What was made" aria-live="polite">
          {row ? (
            <Made row={row} lang={lang} translated={translated} onTranslated={setTranslated} onReported={() => setRow(null)} keepStory={keepStory} deckOf={deckOf} original={kind === 'simplified' ? source.trim() : undefined} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-[14px] text-ink-faint">{busy ? 'Max is writing…' : 'What Max makes appears here.'}</p>
          )}
        </section>
      </div>
    </>
  );
}

function Made({
  row,
  lang,
  translated,
  onTranslated,
  onReported,
  keepStory,
  deckOf,
  original,
}: {
  row: GeneratedRow;
  lang: string;
  translated: boolean;
  onTranslated: (on: boolean) => void;
  onReported: () => void;
  keepStory: (b: StoryBody) => Promise<string>;
  deckOf: (name: string, drafts: Draft[]) => Promise<void>;
  /** For a simplified text: what it was made from, shown beside it. */
  original?: string;
}) {
  const [busy, setBusy] = useState(false);
  const label = labelFor(row);
  const body = row.content;
  const run = async (job: () => Promise<unknown>) => {
    setBusy(true);
    await job().catch((e) => toast(e instanceof Error ? e.message : 'That did not work.'));
    setBusy(false);
  };
  const toggle = (
    <Button variant="ghost" size="sm" onClick={() => onTranslated(!translated)}>
      {translated ? 'Hide translation' : 'Show translation'}
    </Button>
  );

  return (
    <article className="rounded-3xl border border-line bg-raised p-6 shadow-elev-1">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <GeneratedLabel row={row} onReported={onReported} />
        <span className="text-[12px] text-ink-faint">{label.detail}</span>
      </div>

      {row.kind === 'quiz' && <Quiz body={body as QuizBody} lang={lang} />}

      {(row.kind === 'story' || row.kind === 'simplified') && (
        <>
          <h2 lang={lang} className="font-serif text-2xl font-semibold">
            {(body as StoryBody).title}
          </h2>
          <div className={cx('mt-3 grid gap-6', original && 'md:grid-cols-2')}>
            {original && (
              <div lang={lang} className="space-y-3 border-line/60 text-[15px] leading-relaxed text-ink-soft md:border-r md:pr-6">
                <p className="text-[12px] font-bold tracking-wide text-ink-faint uppercase">Original</p>
                {original.split(/\n\s*\n|\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
            <div lang={lang} className="space-y-3 font-serif text-[17px] leading-relaxed">
              {original && <p className="font-sans text-[12px] font-bold tracking-wide text-ink-faint uppercase">Simpler</p>}
              {(body as StoryBody).text.split(/\n\s*\n/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          {translated && (
            <div className="mt-4 space-y-3 border-t border-line/60 pt-4 text-[15px] text-ink-soft">
              {(body as StoryBody).translation.split(/\n\s*\n/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {toggle}
            <Button variant="secondary" icon={BookOpen} loading={busy} onClick={() => void run(() => keepStory(body as StoryBody))}>
              Keep in Codex
            </Button>
            <Button
              variant="secondary"
              icon={Layers}
              loading={busy}
              onClick={() =>
                void run(async () => {
                  const drafts = wordsFromText((body as StoryBody).text, lang, await knownNorms(lang), 30);
                  if (!drafts.length) throw new Error('You know every word in it already.');
                  await deckOf((body as StoryBody).title, drafts);
                })
              }
            >
              A deck of its new words
            </Button>
          </div>
        </>
      )}

      {row.kind === 'sentences' && (
        <>
          <ul className="space-y-3">
            {(body as SentencesBody).sentences.map((s) => (
              <li key={s.text}>
                <p lang={lang} className="font-serif text-[17px] leading-snug">
                  {s.text}
                </p>
                {translated && <p className="text-[14px] text-ink-soft">{s.translation}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-5">{toggle}</div>
        </>
      )}

      {row.kind === 'dialogue' && (
        <>
          <h2 className="font-serif text-2xl font-semibold">{(body as DialogueBody).title}</h2>
          <ul className="mt-3 space-y-2.5">
            {(body as DialogueBody).lines.map((l, i) => (
              <li key={i}>
                <p lang={lang} className="font-serif text-[17px] leading-snug">
                  <b className="font-sans text-[13px] font-bold text-ink-faint">{l.speaker} </b>
                  {l.text}
                </p>
                {translated && l.translation && <p className="text-[14px] text-ink-soft">{l.translation}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {toggle}
            <Link to="/thesaurus/practice/dialogue" className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface">
              Practise it: complete the dialogue
            </Link>
          </div>
        </>
      )}

      {row.kind === 'wordlist' && (
        <>
          <ul className="divide-y divide-line/60">
            {(body as WordlistBody).words.map((w) => (
              <li key={w.term} className="py-2.5">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span lang={lang} className="font-serif text-[18px] font-semibold">
                    {w.term}
                  </span>
                  <span className="text-[14.5px] text-ink-soft">{w.meaning}</span>
                </p>
                {w.example && (
                  <p lang={lang} className="text-[14px] text-ink-faint">
                    {w.example}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Button icon={Layers} loading={busy} onClick={() => void run(() => deckOf('Made by Max', (body as WordlistBody).words))}>
              Make a deck of these
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

/** A quiz to answer: pick an option, see whether it was right and why, and a score at the end. */
function Quiz({ body, lang }: { body: QuizBody; lang: string }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const done = Object.keys(picked).length === body.questions.length;
  const right = body.questions.filter((q, i) => picked[i] === q.answer).length;
  return (
    <>
      <h2 className="font-serif text-2xl font-semibold">{body.title}</h2>
      <ol className="mt-4 space-y-6">
        {body.questions.map((q, i) => {
          const chosen = picked[i];
          return (
            <li key={i}>
              <p lang={lang} className="font-serif text-[18px] leading-snug font-semibold">
                {i + 1}. {q.question}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Question ${i + 1}`}>
                {q.options.map((o, j) => {
                  const shown = chosen !== undefined;
                  return (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={chosen === j}
                      disabled={shown}
                      onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
                      lang={lang}
                      className={cx(
                        'rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition-colors',
                        !shown && 'border-line hover:bg-surface',
                        shown && j === q.answer && 'border-sage bg-sage-soft text-sage-text',
                        shown && chosen === j && j !== q.answer && 'border-accent bg-accent-soft text-accent-text',
                        shown && chosen !== j && j !== q.answer && 'border-line text-ink-faint',
                      )}
                    >
                      {o}
                      {shown && j === q.answer && <span className="sr-only"> (right)</span>}
                    </button>
                  );
                })}
              </div>
              {chosen !== undefined && q.why && <p className="mt-2 text-[14px] text-ink-soft">{q.why}</p>}
            </li>
          );
        })}
      </ol>
      {done && (
        <p className="mt-6 font-serif text-xl font-semibold" role="status">
          {right} of {body.questions.length} right
        </p>
      )}
    </>
  );
}
