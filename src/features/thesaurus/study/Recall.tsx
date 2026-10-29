import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EyeOff, Pencil, Type, Undo2 } from 'lucide-react';
import { countQueue, requeue } from '@/core/srs/queue';
import { formatInterval, GRADE_NAMES, GRADES, previewIntervals } from '@/core/srs/scheduler';
import type { Grade4 } from '@/core/srs/scheduler';
import { db } from '@/data/db';
import { answerCard, buryNote, undoAnswer } from '@/data/study';
import { setSuspended } from '@/data/decks';
import { toast } from '@/state/ui';
import type { AnswerUndo, StudySession } from '@/data/study';
import { useSettings } from '@/data/settings';
import type { Card, Note } from '@/data/types';
import { setWordGloss, setWordState } from '@/data/words';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { IconButton, Kbd, Popover } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { normalizeWord } from '@/core/text/normalize';
import { WordDrawer } from '@/features/codex/reader/WordDrawer';
import type { DrawerWord } from '@/features/codex/reader/WordDrawer';
import { cardWidth } from '../common/cardLook';
import { CardLookPanel } from '../common/CardLookPanel';
import { NoteEditor } from '../deck/NoteEditor';
import type { EditorTarget } from '../deck/NoteEditor';
import { FlipCard } from './FlipCard';
import { StudyBar } from './StudyBar';
import type { SummaryStats } from './Summary';

const TONES: Record<Grade4, string> = {
  1: 'text-accent-text hover:bg-accent-soft',
  2: 'text-ink hover:bg-sunken',
  3: 'text-sage-text hover:bg-sage-soft',
  4: 'text-ink hover:bg-sunken',
};

interface RecallProps {
  lang: string;
  title: string;
  session: StudySession;
  onFinish: (stats: SummaryStats) => void;
  onClose: () => void;
  onActive: (ms: number) => void;
  /** Another pass over cards just studied: grading only sends missed cards round again, the schedule stays as it is. */
  practice?: boolean;
}

const LONG_PRESS_MS = 520;

/** Classic Recall: turn the card, grade yourself (Again · Hard · Good · Easy), FSRS does the rest. */
export function Recall({ lang, title, session, onFinish, onClose, onActive, practice = false }: RecallProps) {
  const { pointer } = useLayout();
  const settings = useSettings();
  const [queue, setQueue] = useState<Card[]>(session.queue);
  const [notes, setNotes] = useState<Map<string, Note>>(session.notes);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [styling, setStyling] = useState(false);
  const look = settings?.cards ?? DEFAULT_SETTINGS.cards;
  const [lookup, setLookup] = useState<DrawerWord | null>(null);
  const history = useRef<Array<{ undo?: AnswerUndo; queue: Card[] }>>([]);
  const stats = useRef({ answered: 0, misses: 0, cards: new Set<string>(), ms: 0 });
  const shownAt = useRef(performance.now());
  const [done, setDone] = useState(0);

  const card = queue[0];
  const note = card ? notes.get(card.noteId) : undefined;
  const deck = card ? session.decks.get(card.deckId) : undefined;
  const width = cardWidth(look, deck?.config.cardWidth);
  const counts = countQueue(queue);
  const progress = done / Math.max(1, done + queue.length);

  useEffect(() => {
    shownAt.current = performance.now();
  }, [card?.id, card?.reps]);

  const intervals = useMemo(
    () => (card && flipped && !practice ? previewIntervals(card, Date.now(), deck?.config.desiredRetention ?? 0.9) : null),
    [card, flipped, deck, practice],
  );

  const flip = useCallback(() => setFlipped(true), []);

  const rate = async (grade: Grade4) => {
    if (!card || !flipped || busy) return;
    setBusy(true);
    const ms = Math.min(60_000, performance.now() - shownAt.current);
    let rest: Card[];
    if (practice) {
      history.current.push({ queue });
      rest = grade === 1 ? [...queue.slice(1), card] : queue.slice(1);
    } else {
      const { card: next, undo, leech } = await answerCard(card, grade, { lang, mode: 'classic', durationMs: ms });
      if (leech && note) {
        toast(`“${note.term}” keeps slipping. Try your own sentence or a way to remember it, or put it aside for now.`, {
          action: { label: 'Put aside', onClick: () => void setSuspended(note.id, true) },
          duration: 9000,
        });
      }
      history.current.push({ undo, queue });
      rest = requeue(queue, next, Date.now());
    }
    const s = stats.current;
    s.answered++;
    if (grade === 1) s.misses++;
    s.cards.add(card.id);
    s.ms += ms;
    onActive(ms);
    setQueue(rest);
    setDone((d) => d + 1);
    setFlipped(false);
    setBusy(false);
    if (!rest.length) onFinish({ cards: s.cards.size, accuracy: s.answered ? 1 - s.misses / s.answered : 1, ms: s.ms, cardIds: [...s.cards] });
  };

  /** Puts the word's cards away until tomorrow: it leaves this lesson and comes back in the next day's. */
  const bury = async () => {
    if (!card || busy || practice) return;
    setBusy(true);
    await buryNote(card.noteId);
    const rest = queue.filter((c) => c.noteId !== card.noteId);
    history.current = [];
    setQueue(rest);
    setFlipped(false);
    setBusy(false);
    toast('Put away until tomorrow', { duration: 1800 });
    const s = stats.current;
    if (!rest.length) onFinish({ cards: s.cards.size, accuracy: s.answered ? 1 - s.misses / s.answered : 1, ms: s.ms, cardIds: [...s.cards] });
  };

  const undo = async () => {
    const last = history.current.pop();
    if (!last || busy) return;
    setBusy(true);
    if (last.undo) await undoAnswer(last.undo);
    const s = stats.current;
    s.answered = Math.max(0, s.answered - 1);
    if (last.undo?.counted.againCount) s.misses = Math.max(0, s.misses - 1);
    setQueue(last.queue);
    setDone((d) => Math.max(0, d - 1));
    setFlipped(false);
    setBusy(false);
  };

  // Right-click (or long-press on a phone) a card to look the word up, as in the reader.
  const lookUp = useCallback(() => {
    if (!note) return;
    setLookup({
      norm: normalizeWord(note.term, lang),
      context: {
        surface: note.term,
        sentence: note.context?.sentence,
        gloss: note.meaning,
        lemma: note.lemma,
        source: note.source === 'visio' || note.source === 'sonus' || note.source === 'cantus' ? note.source : undefined,
        textId: note.context?.textId,
        mediaId: note.context?.mediaId,
        songId: note.context?.songId,
      },
    });
  }, [note, lang]);
  const press = useRef<{ timer: number; x: number; y: number; held: boolean } | null>(null);
  const holdHandlers = {
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault();
      if (!press.current?.held) lookUp();
    },
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const p = { timer: 0, x: e.clientX, y: e.clientY, held: false };
      p.timer = window.setTimeout(() => {
        p.held = true;
        navigator.vibrate?.(8);
        lookUp();
      }, LONG_PRESS_MS);
      press.current = p;
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const p = press.current;
      if (p && !p.held && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) window.clearTimeout(p.timer);
    },
    onPointerUp: () => press.current && window.clearTimeout(press.current.timer),
    onPointerCancel: () => press.current && window.clearTimeout(press.current.timer),
    // The tap that ends a long-press must not also turn the card.
    onClickCapture: (e: ReactMouseEvent) => {
      if (press.current?.held) {
        e.stopPropagation();
        e.preventDefault();
      }
      press.current = null;
    },
  };

  const editing = Boolean(editor) || styling || lookup !== null;
  useHotkeys(
    {
      ' ': () => (flipped ? void rate(3) : flip()),
      enter: () => (flipped ? void rate(3) : flip()),
      '1': () => void rate(1),
      '2': () => void rate(2),
      '3': () => void rate(3),
      '4': () => void rate(4),
      z: () => void undo(),
      'mod+z': () => void undo(),
      e: () => card && note && setEditor({ mode: 'edit', note, cards: [card] }),
      escape: onClose,
    },
    !editing,
  );

  // After editing, show the card's new text.
  const closeEditor = async () => {
    setEditor(null);
    if (!note) return;
    const fresh = await db.notes.get(note.id);
    if (fresh) setNotes((m) => new Map(m).set(fresh.id, fresh));
  };

  return (
    <>
      <StudyBar title={title} progress={progress} onClose={onClose}>
        <IconButton icon={Undo2} label="Undo" shortcut="Z" size="sm" disabled={!history.current.length || busy} onClick={() => void undo()} />
        <Popover
          label="Card style"
          placement="bottom-end"
          onOpenChange={setStyling}
          trigger={(props) => (
            <button {...props} type="button" aria-label="Card style" className="grid size-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface hover:text-ink pointer-coarse:size-10">
              <Type size={16} aria-hidden />
            </button>
          )}
        >
          <CardLookPanel look={look} compact />
        </Popover>
        <IconButton icon={EyeOff} label="Put away until tomorrow" size="sm" disabled={!card || busy || practice} onClick={() => void bury()} />
        <IconButton icon={Pencil} label="Edit card" shortcut="E" size="sm" disabled={!note} onClick={() => card && note && setEditor({ mode: 'edit', note, cards: [card] })} />
      </StudyBar>

      <main className="mx-auto flex min-h-dvh w-full flex-col px-4 sm:px-6" style={{ maxWidth: Math.max(768, width + 48), paddingTop: 'calc(env(safe-area-inset-top) + 64px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <p className="mb-4 flex justify-center gap-3 text-[13px] font-bold tabular-nums" aria-label={`${counts.new} new, ${counts.learning} learning, ${counts.review} to review`}>
          <span className="text-sage-text">{counts.new}</span>
          <span className="text-accent-text">{counts.learning}</span>
          <span className="text-ink-soft">{counts.review}</span>
        </p>

        <div className="flex flex-1 items-start justify-center">
          {/* One card at a time: the graded card slips away before the next one comes in, so the two never overlap. */}
          <AnimatePresence mode="wait" initial={false}>
            {card && note && (
              <motion.div
                key={`${card.id}:${card.reps}:${done}`}
                className="w-full"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -28, transition: { duration: 0.12, ease: 'easeIn' } }}
                transition={spring.soft}
                {...holdHandlers}
              >
                <FlipCard look={look} card={card} note={note} lang={lang} flipped={flipped} onFlip={flip} deckName={session.decks.size > 1 ? deck?.name : undefined} front={deck?.config.front} width={width} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-auto mt-4 w-full sm:mt-5" style={{ maxWidth: Math.min(width, 576) }}>
          {flipped && (intervals || practice) ? (
            <motion.div className="grid grid-cols-4 gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy}>
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={busy}
                  onClick={() => void rate(g)}
                  className={cx(
                    'no-callout flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-raised py-3 font-semibold transition-[transform,background-color] duration-150 active:scale-95',
                    TONES[g],
                  )}
                >
                  <span className="text-[15px]">{GRADE_NAMES[g]}</span>
                  {intervals && <span className="text-[12px] font-semibold text-ink-faint tabular-nums">{formatInterval(intervals[g])}</span>}
                  {pointer === 'fine' && <Kbd>{g}</Kbd>}
                </button>
              ))}
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={flip}
              className="no-callout flex h-[76px] w-full items-center justify-center gap-2 rounded-2xl border border-accent/25 bg-accent-soft text-[16px] font-semibold text-accent-text transition-[transform,background-color] duration-150 hover:bg-accent/20 active:scale-[0.98]"
            >
              Show answer {pointer === 'fine' && <Kbd tone="accent">Space</Kbd>}
            </button>
          )}
        </div>
      </main>

      <NoteEditor lang={lang} target={editor} onClose={() => void closeEditor()} />
      <WordDrawer
        lang={lang}
        word={lookup}
        onClose={() => setLookup(null)}
        onState={(norm, state) => void setWordState(lang, norm, state, lookup?.context)}
        onGloss={(norm, gloss) => void setWordGloss(lang, norm, gloss)}
      />
    </>
  );
}
