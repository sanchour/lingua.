import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RotateCcw, X } from 'lucide-react';
import { planSongRounds, seeded } from '@/core/cantus/games';
import type { SongRound } from '@/core/cantus/games';
import { recordSession } from '@/data/activity';
import { useSong } from '@/data/songs';
import type { Song } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Button } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { SongArt } from './SongArt';

const PRAISE = ['Lovely', 'Exactly', 'Spot on', 'Well sung', 'Perfect'];

/** Ludus for a song: fill in the lyric, and put the lines of a verse back in order. */
export default function SongGames() {
  const { songId } = useParams();
  const song = useSong(songId);
  if (song === null) {
    return (
      <p className="py-20 text-center text-ink-soft">
        This song isn’t in Cantus any more. <Link to="/cantus" className="font-semibold text-accent-text">Back to Cantus</Link>
      </p>
    );
  }
  if (!song) return null;
  return <Games key={song.id} song={song} />;
}

function Games({ song }: { song: Song }) {
  const [round, setRound] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const rounds = useMemo(() => planSongRounds(song.lines, song.lang, seeded(seed)), [song.lines, song.lang, seed]);
  const [right, setRight] = useState(0);
  const startedAt = useRef(Date.now());
  const done = round >= rounds.length;

  // The time counts as Ludus, with this song as what was practised.
  useEffect(() => {
    if (!done) return;
    void recordSession({ lang: song.lang, type: 'ludus', refId: song.id, startedAt: startedAt.current, endedAt: Date.now(), activeMs: Date.now() - startedAt.current, cards: rounds.length, correct: right });
  }, [done, song.id, song.lang, rounds.length, right]);

  const tint = song.palette ? ({ '--song': song.palette.base, '--song-deep': song.palette.deep, '--song-soft': song.palette.soft } as CSSProperties) : undefined;
  const again = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    setRound(0);
    setRight(0);
    startedAt.current = Date.now();
  };

  return (
    <div className="song-page relative mx-auto max-w-2xl" style={tint}>
      <BackLink to={`/cantus/song/${encodeURIComponent(song.id)}`}>{song.title}</BackLink>
      <div className="mb-6 flex items-center gap-3">
        <SongArt url={song.artworkUrl} title={song.title} className="song-art w-14" rounded="rounded-xl" size={200} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold tracking-[0.14em] text-[var(--song-ink)] uppercase">Song games</p>
          <h1 className="truncate font-serif text-[22px] leading-tight font-semibold">{song.title}</h1>
        </div>
      </div>
      {!rounds.length ? (
        <p className="rounded-3xl border border-line/70 bg-surface p-6 text-center text-ink-soft">This song is too short for games. Try one with a few more lines.</p>
      ) : done ? (
        <div className="rounded-3xl border border-line/70 bg-surface p-8 text-center">
          <p className="font-serif text-[28px] font-semibold">
            {right} of {rounds.length}
          </p>
          <p className="mt-1 text-ink-soft">{right === rounds.length ? 'Every line. You know this song.' : right >= rounds.length * 0.7 ? 'Nearly all of it. Sing it once more?' : 'A few more listens and it’s yours.'}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" icon={RotateCcw} onClick={again}>
              Play again
            </Button>
            <Link to={`/cantus/song/${encodeURIComponent(song.id)}`} className="inline-flex h-11 items-center rounded-2xl bg-inverse px-5 font-semibold text-on-inverse">
              Back to the song
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={rounds.length} aria-valuenow={round}>
            <div className="h-full rounded-full bg-[var(--song-ink)] transition-[width] duration-500" style={{ width: `${(round / rounds.length) * 100}%` }} />
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={round} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring.soft}>
              <RoundView
                song={song}
                round={rounds[round]}
                onDone={(ok) => {
                  if (ok) setRight((r) => r + 1);
                  setRound((r) => r + 1);
                }}
              />
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function RoundView({ song, round, onDone }: { song: Song; round: SongRound; onDone: (ok: boolean) => void }) {
  return round.kind === 'fill' ? <FillRound song={song} round={round} onDone={onDone} /> : <OrderRound song={song} round={round} onDone={onDone} />;
}

function Feedback({ ok, onNext, solution }: { ok: boolean; onNext: () => void; solution?: string }) {
  useHotkeys({ enter: onNext });
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy} className={cx('mt-5 flex items-center gap-3 rounded-2xl p-4', ok ? 'bg-sage-soft text-sage-text' : 'bg-accent-soft text-accent-text')}>
      {ok ? <Check size={20} aria-hidden /> : <X size={20} aria-hidden />}
      <p className="min-w-0 flex-1 font-semibold">{ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : solution ? `It’s “${solution}”.` : 'Not quite.'}</p>
      <Button onClick={onNext} data-autofocus>
        Next
      </Button>
    </motion.div>
  );
}

function FillRound({ song, round, onDone }: { song: Song; round: Extract<SongRound, { kind: 'fill' }>; onDone: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const ok = picked === round.answer;
  const tr = song.translation?.lines[round.line];
  useHotkeys(Object.fromEntries(round.options.map((_, i) => [String(i + 1), () => !answered && setPicked(i)])));
  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold text-ink-soft">Fill in the lyric</p>
      <p lang={song.lang} className="font-serif text-[24px] leading-snug font-semibold">
        {round.before}
        <span className={cx('mx-0.5 inline-block min-w-[3.5em] rounded-lg border-b-2 px-1 text-center', answered ? (ok ? 'border-sage text-sage-text' : 'border-accent text-accent-text') : 'border-[var(--song-ink)] text-transparent')}>
          {answered ? round.gap : '·'}
        </span>
        {round.after}
      </p>
      {tr && <p className="mt-2 text-[14px] text-ink-soft">{tr}</p>}
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
      {answered && <Feedback ok={ok} solution={round.gap} onNext={() => onDone(ok)} />}
    </div>
  );
}

function OrderRound({ song, round, onDone }: { song: Song; round: Extract<SongRound, { kind: 'order' }>; onDone: (ok: boolean) => void }) {
  const [order, setOrder] = useState<number[]>([]);
  const finished = order.length === round.lines.length;
  const ok = finished && order.every((x, i) => x === round.lines[i]);
  const tap = (line: number) => {
    if (finished) return;
    setOrder((o) => (o.includes(line) ? o.filter((x) => x !== line) : [...o, line]));
  };
  return (
    <div>
      <p className="mb-3 text-[13px] font-semibold text-ink-soft">Put the lines in the order they’re sung</p>
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
        {!order.length && <li className="px-2 py-8 text-center text-[14px] text-ink-faint">Tap the lines below, first line first.</li>}
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
