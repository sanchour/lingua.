import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { useApp } from '@/app/context';
import { checkAnswer } from '@/core/srs/answer';
import { SIGHTING_KINDS } from '@/data/memory';
import { buildGapRound } from '@/data/sentences';
import type { GapLevel, GapSentence } from '@/data/sentences';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Button, IconButton, Kbd, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { GlossText } from '@/features/codex/reader/GlossText';
import { SpeakButton } from '@/features/speech/SpeakButton';

type Phase = 'answer' | 'right' | 'close' | 'wrong';
const LEVELS: GapLevel[] = ['choose', 'type', 'hard'];
const asLevel = (v: string | null): GapLevel => (LEVELS.includes(v as GapLevel) ? (v as GapLevel) : 'choose');

/** Thesaurus › Sentences: real sentences with one word missing, many in a row (after Clozemaster). */
export default function SentencesPage() {
  const { language } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const level = asLevel(params.get('level'));
  const [roundNo, setRoundNo] = useState(0);
  const [items, setItems] = useState<GapSentence[] | null>(null);
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [firstTry, setFirstTry] = useState<Map<string, boolean>>(new Map());
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setItems(null);
    void buildGapRound(lang, language.level, level).then((round) => {
      if (!live) return;
      setItems(round);
      setAt(0);
      setPhase('answer');
      setPicked(null);
      setTyped('');
      setFirstTry(new Map());
    });
    return () => {
      live = false;
    };
  }, [lang, language.level, level, roundNo]);

  const item = items?.[at];
  const finished = items !== null && at >= items.length;
  const baseId = (id: string) => id.replace(/:again$/, '');

  useEffect(() => {
    if (item && level !== 'choose' && phase === 'answer') input.current?.focus();
  }, [item, level, phase]);

  const settle = (verdict: Phase) => {
    if (!item) return;
    setPhase(verdict);
    const id = baseId(item.id);
    if (!firstTry.has(id)) setFirstTry(new Map(firstTry).set(id, verdict !== 'wrong'));
    // A miss comes back once, at the end of the round.
    if (verdict === 'wrong' && !item.id.endsWith(':again')) setItems((list) => [...list!, { ...item, id: `${item.id}:again` }]);
  };

  const choose = (i: number) => {
    if (!item?.options || phase !== 'answer') return;
    setPicked(i);
    settle(item.options[i] === item.answer ? 'right' : 'wrong');
  };

  const check = () => {
    if (!item || phase !== 'answer' || !typed.trim()) return;
    const verdict = checkAnswer(typed, item.answer, lang).verdict;
    settle(verdict === 'exact' ? 'right' : verdict === 'close' ? 'close' : 'wrong');
  };

  const next = () => {
    setAt((n) => n + 1);
    setPhase('answer');
    setPicked(null);
    setTyped('');
  };

  useHotkeys(
    {
      '1': () => choose(0),
      '2': () => choose(1),
      '3': () => choose(2),
      '4': () => choose(3),
      enter: () => (phase === 'answer' ? check() : next()),
      escape: () => navigate('/thesaurus'),
    },
    !finished,
  );

  const right = [...firstTry.values()].filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-bg" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <header className="mx-auto flex max-w-4xl items-center gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <IconButton icon={X} label="Close" onClick={() => navigate('/thesaurus')} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.14em] text-sage-text uppercase">Ludus</p>
          <h1 className="font-serif text-[20px] leading-tight font-semibold">Sentences</h1>
        </div>
        <Segmented<GapLevel>
          label="Difficulty"
          value={level}
          onChange={(next) => setParams({ level: next }, { replace: true })}
          options={[
            { value: 'choose', label: 'Choose' },
            { value: 'type', label: 'Type' },
            { value: 'hard', label: 'Harder' },
          ]}
        />
      </header>

      <div className="mx-auto mt-5 max-w-4xl px-4 sm:px-8">
        <div className="h-1 overflow-hidden rounded-full bg-sunken">
          <motion.div className="h-full origin-left rounded-full bg-accent" initial={false} animate={{ scaleX: items?.length ? Math.min(1, at / items.length) : 0 }} transition={spring.soft} />
        </div>
      </div>

      <main className="mx-auto flex max-w-2xl flex-col px-5 pt-[min(12vh,96px)] pb-16 sm:px-8">
        {items === null && <p className="text-center text-ink-soft">Finding sentences…</p>}
        {items && items.length === 0 && (
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold">No sentences yet</p>
            <p className="mt-2 text-ink-soft">This language’s pack has no example sentences on this device. Open Codex once so the pack is downloaded, then try again.</p>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {item && (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring.snappy}>
              <p className="mb-6 text-center text-[12.5px] font-semibold text-ink-faint">
                {at + 1} of {items!.length}
                {' · '}
                {item.from === 'learning'
                  ? 'a word you’re learning'
                  : item.from === 'memory'
                    ? item.metIn
                      ? `met in ${item.metIn.title}`
                      : 'one of your words'
                    : 'around your level'}
                {item.from !== 'level' && item.metIn && item.from === 'learning' && ` · ${SIGHTING_KINDS[item.metIn.kind].label.toLowerCase()}`}
              </p>

              <p lang={lang} className="text-center font-serif text-[clamp(1.5rem,3.6vw,2.15rem)] leading-relaxed">
                <GlossText text={item.before} lang={lang} />
                {level === 'choose' || phase !== 'answer' ? (
                  <span
                    className={cx(
                      'mx-0.5 inline-block rounded-lg border-b-2 px-2 text-center transition-colors',
                      phase === 'right' ? 'border-sage bg-sage-soft' : phase === 'close' ? 'border-sage bg-sage-soft/60' : phase === 'wrong' ? 'border-accent bg-accent-soft' : 'border-line-strong',
                    )}
                    style={{ minWidth: `${Math.max(3, item.answer.length) + 1}ch` }}
                  >
                    {phase === 'answer' ? ' ' : item.answer}
                  </span>
                ) : (
                  <input
                    ref={input}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), check())}
                    aria-label="The missing word"
                    placeholder={level === 'type' ? `${item.answer[0]}${'·'.repeat(Math.max(0, item.answer.length - 1))}` : ''}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    lang={lang}
                    className="mx-0.5 inline-block rounded-lg border-b-2 border-ink bg-surface px-2 text-center font-serif outline-none placeholder:text-ink-faint/60 focus:border-accent"
                    style={{ width: `${Math.max(4, item.answer.length) + 2}ch` }}
                  />
                )}
                <GlossText text={item.after} lang={lang} />
              </p>
              {item.translation && (level !== 'hard' || phase !== 'answer') && <p className="mt-4 text-center text-[16px] text-ink-soft italic">{item.translation}</p>}

              {phase === 'answer' && level === 'choose' && item.options && (
                <div className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-2.5">
                  {item.options.map((option, i) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => choose(i)}
                      className="flex h-14 items-center gap-3 rounded-2xl border border-line bg-raised px-4 text-left text-[17px] font-semibold shadow-elev-1 transition-[transform,background-color,border-color] hover:border-line-strong hover:bg-surface active:scale-[0.98]"
                    >
                      <span className="pointer-coarse:hidden">
                        <Kbd>{i + 1}</Kbd>
                      </span>
                      <span lang={lang}>{option}</span>
                    </button>
                  ))}
                </div>
              )}
              {phase === 'answer' && level !== 'choose' && (
                <div className="mt-10 flex justify-center">
                  <Button icon={Check} onClick={check} disabled={!typed.trim()}>
                    Check
                  </Button>
                </div>
              )}

              {phase !== 'answer' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="mt-10 flex flex-col items-center gap-4 text-center">
                  <p className={cx('text-[15px] font-semibold', phase === 'wrong' ? 'text-accent-text' : 'text-sage-text')}>
                    {phase === 'right' ? `Right: “${item.answer}”.` : phase === 'close' ? `Almost: it’s spelt “${item.answer}”.` : picked !== null && item.options ? `Not “${item.options[picked]}”: it’s “${item.answer}”.` : `It’s “${item.answer}”.`}
                    {item.gloss && <span className="font-normal text-ink-soft"> · {item.gloss}</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <SpeakButton lang={lang} text={`${item.before}${item.answer}${item.after}`} label="Hear the sentence" className="size-11 bg-surface text-ink-soft hover:text-ink" />
                    <Button iconRight={ArrowRight} onClick={next}>
                      Next
                    </Button>
                  </div>
                  <p className="text-[12px] text-ink-faint pointer-coarse:hidden">Enter for the next sentence</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {finished && items!.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="text-center">
            <p className="text-[12px] font-bold tracking-[0.22em] text-sage-text uppercase">Round done</p>
            <p className="mt-4 font-serif text-[56px] leading-none font-semibold tabular-nums">
              {right}
              <span className="text-ink-faint">/{firstTry.size}</span>
            </p>
            <p className="mt-3 text-ink-soft">right the first time</p>
            <div className="mx-auto mt-10 flex max-w-xs flex-col gap-2">
              <Button icon={RotateCcw} size="lg" block onClick={() => setRoundNo((n) => n + 1)}>
                Another round
              </Button>
              {level !== 'hard' && (
                <Button variant="secondary" block onClick={() => setParams({ level: level === 'choose' ? 'type' : 'hard' }, { replace: true })}>
                  Try it harder
                </Button>
              )}
              <Button variant="ghost" block onClick={() => navigate('/thesaurus')}>
                Back to Thesaurus
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
