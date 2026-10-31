import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { songPath } from './room/nav';
import { useApp } from '@/app/context';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus, RotateCcw, X } from 'lucide-react';
import { LEVEL_REACH, firstSense, planLesson, seeded, songWords } from '@/core/cantus/games';
import type { LessonRound, SongWord } from '@/core/cantus/games';
import { packId } from '@/core/packs/format';
import { recordSession } from '@/data/activity';
import { db } from '@/data/db';
import { patchSong, useSong } from '@/data/songs';
import type { Song } from '@/data/types';
import { getWordStates, setWordState } from '@/data/words';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Button } from '@/design/primitives';
import { spring } from '@/design/motion';
import { quote } from '@/design/flavours';
import { cx } from '@/lib/cx';
import { translateLyrics } from '@/services/cantus/translate';
import { lookupGlosses } from '@/services/translate/gloss';
import { SongArt } from './SongArt';

const PRAISE = ['Lovely', 'Exactly', 'Spot on', 'Well done', 'Perfect'];

const KIND_LABEL: Record<LessonRound['kind'], string> = {
  meaning: 'Words',
  fill: 'Meaning',
  form: 'Grammar',
  translate: 'The line',
  order: 'Bonus: the song',
};

/** Ludus for a song: its words first (the ones worth learning at your level), the song itself last. */
export default function SongGames({ songId }: { songId: string }) {

  const song = useSong(songId);
  if (song === null) {
    return (
      <p className="py-20 text-center text-ink-soft"><UiText source={'This song isn’t in your music any more. {0}'} values={[<Link to="/sonus?tab=music" className="font-semibold text-accent-text"><UiText source={'Back to Music'} /></Link>]} /></p>
    );
  }
  if (!song) return null;
  return <Lesson key={song.id} song={song} />;
}

/** Every word of the song with its meaning, dictionary form, how common it is, and whether it's known. */
async function loadWords(song: Song): Promise<SongWord[]> {
  const base = songWords(song.lines, song.lang);
  const norms = base.map((w) => w.norm);
  if (!norms.length) return [];
  const [glosses, forms, states] = await Promise.all([
    lookupGlosses(song.lang, norms),
    db.dictForms.bulkGet(norms.map((n) => [packId(song.lang), n] as [string, string])),
    getWordStates(song.lang, norms),
  ]);
  const lemmaOf = (i: number) => glosses.get(norms[i])?.lemma ?? forms[i]?.lemmas[0];
  // A form the frequency list doesn't count (an ending, a conjugation) is as common as its word.
  const keys = [...new Set(norms.flatMap((n, i) => [n, lemmaOf(i)].filter(Boolean) as string[]))];
  const rows = await db.frequency.bulkGet(keys.map((k) => `${song.lang}:${k}`));
  const rank = new Map(keys.map((k, i) => [k, rows[i]?.rank]));
  return base.map((w, i) => {
    const lemma = lemmaOf(i);
    return { ...w, gloss: glosses.get(w.norm)?.text, lemma, lemmas: forms[i]?.lemmas, desc: forms[i]?.d, rank: rank.get(w.norm) ?? (lemma ? rank.get(lemma) : undefined), state: states.get(w.norm) ?? 0 };
  });
}

/** A word as a learner should see it: "Un" opening a line is "un" (German keeps its capital nouns). */
const shown = (w: SongWord, lang: string) => (w.start === 0 && lang !== 'de' ? w.text.toLocaleLowerCase(lang) : w.text);

type Ready = { words: SongWord[]; translation?: readonly string[] };

function Lesson({ song }: { song: Song }) {
  const translateUi = useUi();
  const { language } = useApp();
  const [ready, setReady] = useState<Ready | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const skip = useRef<(() => void) | null>(null);

  // The words, and the song's English (translated now if it hasn't been yet: the line rounds need it).
  useEffect(() => {
    let live = true;
    void (async () => {
      const words = await loadWords(song).catch(() => [] as SongWord[]);
      let translation = song.translation?.lines;
      if (!translation && song.lines.some((l) => /\p{L}/u.test(l.text))) {
        setProgress(0);
        const skipped = new Promise<undefined>((resolve) => (skip.current = () => resolve(undefined)));
        translation = await Promise.race([
          translateLyrics(song, (f) => live && setProgress(f))
            .then(async (t) => {
              await patchSong(song.id, { translation: t });
              return t.lines;
            })
            .catch(() => undefined),
          skipped,
        ]);
      }
      if (live) setReady({ words, translation });
    })();
    return () => {
      live = false;
    };
    // Once per song: a translation saved while playing doesn't reshuffle the lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id]);

  const tint = song.palette ? ({ '--song': song.palette.base, '--song-deep': song.palette.deep, '--song-soft': song.palette.soft } as CSSProperties) : undefined;

  return (
    <div className="song-page relative mx-auto max-w-2xl" style={tint}>
      <BackLink to={songPath(song.id)}>{song.title}</BackLink>
      <div className="mb-5 flex items-center gap-3">
        <SongArt url={song.artworkUrl} title={song.title} className="song-art w-14" rounded="rounded-xl" size={200} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold tracking-[0.14em] text-[var(--song-ink)] uppercase"><UiText source={'Learn it'} /></p>
          <h1 className="truncate font-serif text-[22px] leading-tight font-semibold">{song.title}</h1>
        </div>
      </div>
      {ready ? (
        <Rounds song={song} ready={ready} reach={LEVEL_REACH[language.level]} />
      ) : (
        <div className="rounded-3xl border border-line/70 bg-surface p-8 text-center">
          <p className="font-semibold">{progress === null ? translateUi('Looking up the song’s words…') : translateUi('Translating the song for the lesson…')}</p>
          {progress !== null && (
            <>
              <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-sunken">
                <div className="h-full w-full rounded-full bg-[var(--song-ink)] transition-transform duration-300" style={{ transform: `translateX(-${100 - Math.round(progress * 100)}%)` }} />
              </div>
              <button type="button" onClick={() => skip.current?.()} className="mt-4 text-[14px] font-semibold text-ink-soft underline-offset-2 hover:underline"><UiText source={'Start without the translation'} /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Rounds({ song, ready, reach }: { song: Song; ready: Ready; reach: number }) {

  const [round, setRound] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const { rounds, focus } = useMemo(
    () => planLesson({ lines: song.lines, lang: song.lang, words: ready.words, translation: ready.translation, reach, random: seeded(seed) }),
    [song.lines, song.lang, ready, reach, seed],
  );
  const [right, setRight] = useState(0);
  const startedAt = useRef(Date.now());
  const done = round >= rounds.length;

  // The time counts as Ludus, with this song as what was practised.
  useEffect(() => {
    if (!done || !rounds.length) return;
    void recordSession({ lang: song.lang, type: 'ludus', refId: song.id, startedAt: startedAt.current, endedAt: Date.now(), activeMs: Date.now() - startedAt.current, cards: rounds.length, correct: right });
  }, [done, song.id, song.lang, rounds.length, right]);

  const again = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    setRound(0);
    setRight(0);
    startedAt.current = Date.now();
  };

  if (!rounds.length) return <p className="rounded-3xl border border-line/70 bg-surface p-6 text-center text-ink-soft"><UiText source={'This song is too short for a lesson. Try one with a few more lines.'} /></p>;
  if (done) return <Finished song={song} right={right} total={rounds.length} focus={focus} onAgain={again} />;

  const current = rounds[round];
  return (
    <>
      {round === 0 && (
        <p className="mb-4 text-[14px] leading-relaxed text-ink-soft"><UiText source={'{0} The song itself comes last, as the bonus.'} values={[focus.length ? `${focus.length} word${focus.length === 1 ? '' : 's'} from this song worth learning at your level first, then its grammar and lines.` : <UiText source={'Its words and lines first.'} />]} /></p>
      )}
      <div className="mb-5 flex items-center gap-3">
        <span className="shrink-0 rounded-full bg-[var(--song-soft,var(--color-sunken))] px-3 py-1 text-[12px] font-bold text-[var(--song-ink)]">{KIND_LABEL[current.kind]}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={round}>
          <div className="h-full w-full rounded-full bg-[var(--song-ink)] transition-transform duration-500" style={{ transform: `translateX(-${100 - (round / rounds.length) * 100}%)` }} />
        </div>
        <span className="shrink-0 text-[12px] text-ink-faint tabular-nums">
          {round + 1}/{rounds.length}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${seed}-${round}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring.soft}>
          <RoundView
            song={song}
            round={current}
            translation={ready.translation}
            onDone={(ok) => {
              if (ok) setRight((r) => r + 1);
              setRound((r) => r + 1);
            }}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function Finished({ song, right, total, focus, onAgain }: { song: Song; right: number; total: number; focus: SongWord[]; onAgain: () => void }) {
  const translateUi = useUi();
  const addable = focus.filter((w) => w.state === 0);
  const [added, setAdded] = useState(false);
  const add = async () => {
    for (const w of addable) {
      const line = song.lines[w.line];
      await setWordState(song.lang, w.norm, 2, { surface: w.text, sentence: line?.text, gloss: w.gloss ? firstSense(w.gloss) : undefined, lemma: w.lemma, songId: song.id, startMs: line?.startMs, source: 'cantus' });
    }
    setAdded(true);
  };
  return (
    <div className="rounded-3xl border border-line/70 bg-surface p-6 sm:p-8">
      <div className="text-center">
        <p className="font-serif text-[28px] font-semibold"><UiText source={'{0} of {1}'} values={[right, total]} /></p>
        <p className="mt-1 text-ink-soft">{right === total ? translateUi('Every round. You know this song.') : right >= total * 0.7 ? translateUi('Nearly all of it. Once more?') : translateUi('A few more listens and it’s yours.')}</p>
      </div>
      {focus.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase"><UiText source={'Words from this song'} /></p>
          <ul className="divide-y divide-line/60 rounded-2xl border border-line/70">
            {focus.map((w) => (
              <li key={w.norm} className="flex items-baseline gap-3 px-4 py-2.5">
                <span lang={song.lang} className="font-semibold">
                  {shown(w, song.lang)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-soft">{w.gloss ? firstSense(w.gloss) : ''}</span>
                {w.state === 2 && <span className="shrink-0 text-[12px] font-semibold text-ink-faint"><UiText source={'Learning'} /></span>}
              </li>
            ))}
          </ul>
          {addable.length > 0 && (
            <div className="mt-3 flex justify-center">
              {added ? (
                <p className="flex items-center gap-1.5 text-[14px] font-semibold text-sage-text"><UiText source={'{0} Added to your cards, with the line they’re sung in'} values={[<Check size={16} aria-hidden />]} /></p>
              ) : (
                <Button variant="secondary" icon={Plus} onClick={() => void add()}><UiText source={'Add {0} word{1} to your cards'} values={[addable.length, addable.length === 1 ? '' : 's']} /></Button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" icon={RotateCcw} onClick={onAgain}><UiText source={'Play again'} /></Button>
        <Link to={songPath(song.id)} className="inline-flex h-11 items-center rounded-2xl bg-inverse px-5 font-semibold text-on-inverse"><UiText source={'Back to the song'} /></Link>
      </div>
    </div>
  );
}

function RoundView({ song, round, translation, onDone }: { song: Song; round: LessonRound; translation?: readonly string[]; onDone: (ok: boolean) => void }) {
  switch (round.kind) {
    case 'meaning':
      return (
        <Choice prompt="What does it mean?" options={round.options} answer={round.answer} onDone={onDone} note={`From ${quote(song.lang, song.lines[round.word.line]?.text ?? '')}`} noteLang={song.lang}>
          <p lang={song.lang} className="font-serif text-[40px] leading-tight font-semibold">
            {shown(round.word, song.lang)}
          </p>
        </Choice>
      );
    case 'fill': {
      const tr = translation?.[round.word.line];
      const hint = round.word.gloss ? `The missing word means “${firstSense(round.word.gloss)}”.` : tr ? `In English: ${tr}` : undefined;
      return <FillRound song={song} round={round} hint={hint} onDone={onDone} />;
    }
    case 'form':
      return (
        <Choice prompt="Which word is it a form of?" options={round.options} answer={round.answer} optionLang={song.lang} onDone={onDone} explain={round.word.desc}>
          <p lang={song.lang} className="font-serif text-[40px] leading-tight font-semibold">
            {shown(round.word, song.lang)}
          </p>
          <p lang={song.lang} className="mt-1 text-[14px] text-ink-soft">
            {song.lines[round.word.line]?.text}
          </p>
        </Choice>
      );
    case 'translate':
      return (
        <Choice prompt="Which is the line in English?" options={round.options} answer={round.answer} onDone={onDone} column>
          <p lang={song.lang} className="font-serif text-[24px] leading-snug font-semibold">
            {song.lines[round.line]?.text}
          </p>
        </Choice>
      );
    case 'order':
      return <OrderRound song={song} round={round} onDone={onDone} />;
  }
}

function Feedback({ ok, onNext, solution, explain }: { ok: boolean; onNext: () => void; solution?: string; explain?: string }) {
  const translateUi = useUi();
  useHotkeys({ enter: onNext });
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy} className={cx('mt-5 flex items-center gap-3 rounded-2xl p-4', ok ? 'bg-sage-soft text-sage-text' : 'bg-accent-soft text-accent-text')}>
      {ok ? <Check size={20} className="shrink-0" aria-hidden /> : <X size={20} className="shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : solution ? translateUi('It’s “{0}”.', [solution]) : translateUi('Not quite.')}</p>
        {explain && <p className="mt-0.5 text-[14px] opacity-80">{explain[0].toLocaleUpperCase() + explain.slice(1)}.</p>}
      </div>
      <Button onClick={onNext} data-autofocus><UiText source={'Next'} /></Button>
    </motion.div>
  );
}

/** A question with three or four answers to tap (or press 1–4). */
function Choice(props: {
  prompt: string;
  options: string[];
  answer: number;
  onDone: (ok: boolean) => void;
  children: ReactNode;
  optionLang?: string;
  /** Shown under the question: where the word comes from. */
  note?: string;
  noteLang?: string;
  /** Shown with the answer: the grammar of it. */
  explain?: string;
  /** Long answers (whole lines): one per row. */
  column?: boolean;
}) {
  const { prompt, options, answer, onDone, children, optionLang, note, noteLang, explain, column } = props;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const ok = picked === answer;
  useHotkeys(Object.fromEntries(options.map((_, i) => [String(i + 1), () => !answered && setPicked(i)])));
  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold text-ink-soft">{prompt}</p>
      {children}
      {note && (
        <p lang={noteLang} className="mt-2 text-[14px] text-ink-soft">
          {note}
        </p>
      )}
      <div className={cx('mt-6 grid gap-2', column ? 'grid-cols-1' : 'grid-cols-2')}>
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={answered}
            onClick={() => setPicked(i)}
            lang={optionLang}
            className={cx(
              'min-h-14 rounded-2xl border px-3 font-semibold transition-[transform,background-color,border-color] active:scale-[0.98]',
              column ? 'py-3 text-left text-[15px]' : 'py-2 text-[16px]',
              !answered && 'border-line bg-surface hover:bg-raised',
              answered && i === answer && 'border-sage bg-sage-soft text-sage-text',
              answered && i === picked && i !== answer && 'border-accent bg-accent-soft text-accent-text',
              answered && i !== answer && i !== picked && 'border-line bg-surface opacity-50',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {answered && <Feedback ok={ok} solution={options[answer]} explain={explain} onNext={() => onDone(ok)} />}
    </div>
  );
}

function FillRound({ song, round, hint, onDone }: { song: Song; round: Extract<LessonRound, { kind: 'fill' }>; hint?: string; onDone: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const ok = picked === round.answer;
  useHotkeys(Object.fromEntries(round.options.map((_, i) => [String(i + 1), () => !answered && setPicked(i)])));
  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'Which word fits the line?'} /></p>
      <p lang={song.lang} className="font-serif text-[24px] leading-snug font-semibold">
        {round.before}
        <span className={cx('mx-0.5 inline-block min-w-[3.5em] rounded-lg border-b-2 px-1 text-center', answered ? (ok ? 'border-sage text-sage-text' : 'border-accent text-accent-text') : 'border-[var(--song-ink)] text-transparent')}>
          {answered ? round.word.text : '·'}
        </span>
        {round.after}
      </p>
      {hint && <p className="mt-2 text-[14px] text-ink-soft">{hint}</p>}
      <div className="mt-6 grid grid-cols-2 gap-2">
        {round.options.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={answered}
            onClick={() => setPicked(i)}
            lang={song.lang}
            className={cx(
              'h-14 rounded-2xl border px-3 text-[17px] font-semibold transition-[transform,background-color,border-color] active:scale-[0.98]',
              !answered && 'border-line bg-surface hover:bg-raised',
              answered && i === round.answer && 'border-sage bg-sage-soft text-sage-text',
              answered && i === picked && i !== round.answer && 'border-accent bg-accent-soft text-accent-text',
              answered && i !== round.answer && i !== picked && 'border-line bg-surface opacity-50',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {answered && <Feedback ok={ok} solution={round.word.text} onNext={() => onDone(ok)} />}
    </div>
  );
}

function OrderRound({ song, round, onDone }: { song: Song; round: Extract<LessonRound, { kind: 'order' }>; onDone: (ok: boolean) => void }) {
  const [order, setOrder] = useState<number[]>([]);
  const finished = order.length === round.lines.length;
  const ok = finished && order.every((x, i) => x === round.lines[i]);
  const tap = (line: number) => {
    if (finished) return;
    setOrder((o) => (o.includes(line) ? o.filter((x) => x !== line) : [...o, line]));
  };
  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'Put the lines in the order they’re sung'} /></p>
      <ol className="mb-4 min-h-[9rem] space-y-1.5 rounded-2xl border border-dashed border-line-strong p-3">
        {order.map((line, i) => (
          <li key={line}>
            <button
              type="button"
              onClick={() => tap(line)}
              lang={song.lang}
              className={cx(
                'flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-[16px] font-semibold',
                finished ? (line === round.lines[i] ? 'bg-sage-soft text-sage-text' : 'bg-accent-soft text-accent-text') : 'bg-surface',
              )}
            >
              <span className="w-4 shrink-0 text-ink-faint tabular-nums">{i + 1}</span>
              {song.lines[line].text}
            </button>
          </li>
        ))}
        {!order.length && <li className="px-2 py-8 text-center text-[14px] text-ink-faint"><UiText source={'Tap the lines below, first line first.'} /></li>}
      </ol>
      <ul className="space-y-1.5">
        {round.shuffled
          .filter((l) => !order.includes(l))
          .map((line) => (
            <li key={line}>
              <button type="button" onClick={() => tap(line)} lang={song.lang} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-[16px] font-semibold transition-[transform,background-color] hover:bg-raised active:scale-[0.99]">
                {song.lines[line].text}
              </button>
            </li>
          ))}
      </ul>
      {finished && <Feedback ok={ok} onNext={() => onDone(ok)} />}
    </div>
  );
}
