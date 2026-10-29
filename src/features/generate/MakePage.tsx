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
import type { DialogueBody, GeneratedKind, SentencesBody, StoryBody, WordlistBody } from '@/core/generate/generate';
import { CEFR_LEVELS } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { textToChapters } from '@/core/parsers/text';
import { wordsFromText } from '@/core/srs/deckFrom';
import type { Draft } from '@/core/srs/deckFrom';
import { deckFromDrafts, knownNorms } from '@/data/deckTools';
import { addText } from '@/data/library';
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
  { kind: 'wordlist', title: 'A word list', detail: 'Twelve useful words, each with a sentence, for a deck.', cost: 'about 350 words in all' },
];

export default function MakePage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const [kind, setKind] = useState<GeneratedKind>('story');
  const [topic, setTopic] = useState('');
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
      setRow((await generateMaterial({ lang, kind, level, topic: topic.trim() || undefined })).row);
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
            <Made row={row} lang={lang} translated={translated} onTranslated={setTranslated} onReported={() => setRow(null)} keepStory={keepStory} deckOf={deckOf} />
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
}: {
  row: GeneratedRow;
  lang: string;
  translated: boolean;
  onTranslated: (on: boolean) => void;
  onReported: () => void;
  keepStory: (b: StoryBody) => Promise<string>;
  deckOf: (name: string, drafts: Draft[]) => Promise<void>;
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

      {row.kind === 'story' && (
        <>
          <h2 lang={lang} className="font-serif text-2xl font-semibold">
            {(body as StoryBody).title}
          </h2>
          <div lang={lang} className="mt-3 space-y-3 font-serif text-[17px] leading-relaxed">
            {(body as StoryBody).text.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
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
