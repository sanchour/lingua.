import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookmarkCheck, BookmarkPlus, Copy, LocateFixed, Play } from 'lucide-react';
import { useApp } from '@/app/context';
import { cueIndexAt, wordStarts } from '@/core/audio/cues';
import { linesToCues } from '@/core/cantus/lyrics';
import type { Chapter, Song, Text, WordState } from '@/data/types';
import { getReaderFont, readerFontStack } from '@/design/fonts';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { spring } from '@/design/motion';
import { motionIsReduced } from '@/design/motionPref';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { CLICK_SLOP_PX, wordAt } from '@/features/codex/reader/hit';
import { HoverGloss } from '@/features/codex/reader/HoverGloss';
import { modelFromChapter, updateCachedState } from '@/features/codex/reader/model';
import type { ChapterModel } from '@/features/codex/reader/model';
import { TapGloss } from '@/features/codex/reader/TapGloss';
import { WordDrawer } from '@/features/codex/reader/WordDrawer';
import type { DrawerWord } from '@/features/codex/reader/WordDrawer';
import type { PlayheadClock } from '@/features/sonus/player/KaraokeTranscript';
import { SongEngine } from './SongEngine';

const LONG_PRESS_MS = 430;
/** After the learner scrolls, the sheet stops following the song for this long. */
const FOLLOW_PAUSE_MS = 4000;

interface LyricSheetProps {
  song: Song;
  /** The playhead, already moved by the song's timing nudge; none for lyrics without timings. */
  clock: PlayheadClock | null;
  translationMode: 'show' | 'blur' | 'hide';
  savedLines: ReadonlySet<number>;
  onSaveLine: (index: number) => void;
  /** Phones: "Back to the song" sits above the docked controls. */
  dockedHeight?: number;
  /**
   * Music playing elsewhere (the Music app, a speaker): the next tap on a line starts the lyrics
   * from that line, then `onSynced`.
   */
  syncByTap?: boolean;
  onSynced?: () => void;
}

/**
 * A song's lyrics as a sheet to sing along with: the current line large and clear, its words
 * lighting up as they're sung, the English underneath. Every word taps, hovers and saves as in
 * Codex; tapping between words picks the line (play from it, save it, copy it). Time-driven changes
 * go straight to the DOM, so following the song never re-renders the sheet.
 */
export function LyricSheet({ song, clock, translationMode, savedLines, onSaveLine, dockedHeight = 0, syncByTap = false, onSynced }: LyricSheetProps) {
  const { settings } = useApp();
  const { pointer, layout } = useLayout();
  const lang = song.lang;
  const lines = song.lines;
  const timed = clock !== null && lines.some((l) => l.startMs !== undefined);
  const cues = useMemo(() => linesToCues(lines, song.durationMs), [lines, song.durationMs]);

  // ── Model: one block per line ───────────────────────────────────────────
  const [model, setModel] = useState<ChapterModel | null>(null);
  const text = useMemo(
    () => ({ id: `cantus:${song.id}`, lang, kind: 'article', source: 'cantus', title: song.title, chapterCount: 1, wordCount: 0, createdAt: 0, updatedAt: 0 }) as Text,
    [song.id, song.title, lang],
  );
  useEffect(() => {
    let alive = true;
    const chapter: Chapter = { id: `cantus:${song.id}`, textId: text.id, index: 0, title: song.title, wordCount: 0, blocks: lines.map((l) => ({ t: 'p', text: l.text })) };
    void modelFromChapter({ lang }, chapter).then((m) => alive && setModel(m));
    return () => {
      alive = false;
    };
  }, [lines, song.id, song.title, lang, text.id]);

  const flowRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const [engine, setEngine] = useState<SongEngine | null>(null);
  const onWordChange = useCallback((norm: string, state: WordState) => {
    updateCachedState(norm, state);
    flowRef.current?.dispatchEvent(new Event('reader:refresh-tip', { bubbles: true }));
  }, []);
  useLayoutEffect(() => {
    const flow = flowRef.current;
    if (!model || !flow) return;
    const e = new SongEngine(text, model, song, lines, onWordChange);
    e.attach(flow);
    setEngine(e);
    return e.follow();
  }, [model, text, song, lines, onWordChange]);

  // ── Following the song ──────────────────────────────────────────────────
  const [lost, setLost] = useState(false);
  const userScrolledAt = useRef(-Infinity);
  const followRef = useRef<() => void>(() => {});
  useEffect(() => {
    const flow = flowRef.current;
    if (!timed || !clock || !model || !flow) return;
    let current = -1;
    let row: HTMLElement | null = null;
    let words: HTMLElement[] = [];
    let starts: number[] = [];
    let sung = 0;

    const follow = (force = false) => {
      if (!row) return;
      if (!force && performance.now() - userScrolledAt.current < FOLLOW_PAUSE_MS) {
        const r = row.getBoundingClientRect();
        setLost(r.bottom < 80 || r.top > window.innerHeight - 120 - dockedHeight);
        return;
      }
      setLost(false);
      // The current line sits a little above the middle, with what comes next in view below.
      const r = row.getBoundingClientRect();
      const target = window.scrollY + r.top - (window.innerHeight - dockedHeight) * 0.36;
      window.scrollTo({ top: Math.max(0, target), behavior: motionIsReduced() ? 'auto' : 'smooth' });
    };
    followRef.current = () => {
      userScrolledAt.current = -Infinity;
      follow(true);
    };

    const unsubscribe = clock.onTime((ms) => {
      const i = cueIndexAt(cues, ms);
      if (i !== current) {
        row?.classList.remove('is-current');
        for (const w of words) delete w.dataset.k;
        current = i;
        row = i >= 0 ? flow.querySelector<HTMLElement>(`[data-line="${i}"]`) : null;
        words = row ? [...row.querySelectorAll<HTMLElement>('.w')] : [];
        // Words are sung at about this pace; a long gap after a line is music, not slow singing.
        const cue = cues[i];
        const sungFor = cue ? Math.min(cue.endMs - cue.startMs, Math.max(1400, cue.text.length * 95)) : 0;
        starts = cue ? wordStarts({ ...cue, endMs: cue.startMs + sungFor }, words.map((w) => ({ offset: Number(w.dataset.o ?? 0), text: w.textContent ?? '' }))) : [];
        sung = 0;
        row?.classList.add('is-current');
        flow.classList.toggle('has-current', i >= 0);
        follow();
      }
      let n = 0;
      while (n < starts.length && starts[n] <= ms + 80) n++;
      if (n !== sung) {
        for (let k = Math.min(n, sung); k < Math.max(n, sung); k++) {
          if (k < n) words[k].dataset.k = '1';
          else delete words[k].dataset.k;
        }
        sung = n;
      }
    });
    const markScroll = () => (userScrolledAt.current = performance.now());
    window.addEventListener('wheel', markScroll, { passive: true });
    window.addEventListener('touchmove', markScroll, { passive: true });
    return () => {
      unsubscribe();
      flow.classList.remove('has-current');
      row?.classList.remove('is-current');
      for (const w of words) delete w.dataset.k;
      window.removeEventListener('wheel', markScroll);
      window.removeEventListener('touchmove', markScroll);
    };
  }, [timed, clock, model, cues, dockedHeight]);

  // ── Words and lines ─────────────────────────────────────────────────────
  const [drawer, setDrawer] = useState<DrawerWord | null>(null);
  const [tapped, setTapped] = useState<HTMLElement | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => setRevealed(new Set()), [translationMode, song.id]);

  const openDrawer = useCallback(
    (el: HTMLElement) => {
      if (!engine) return;
      flowRef.current?.dispatchEvent(new Event('reader:hide-tip', { bubbles: true }));
      setTapped(null);
      setDrawer({ norm: el.dataset.n!, context: engine.context(el) });
    },
    [engine],
  );

  const gesture = useRef<{ x: number; y: number; word: HTMLElement | null; line: number; tr: boolean; timer: number; long: boolean; type: string } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest('[data-line-actions]')) return;
    const word = wordAt(target, e.clientX, e.clientY, flowRef.current);
    const row = target.closest<HTMLElement>('[data-line]');
    const g = { x: e.clientX, y: e.clientY, word, line: row ? Number(row.dataset.line) : -1, tr: Boolean(target.closest('.lyric-tr')), timer: 0, long: false, type: e.pointerType };
    if (e.pointerType !== 'mouse' && word) {
      g.timer = window.setTimeout(() => {
        g.long = true;
        openDrawer(word);
      }, LONG_PRESS_MS);
    }
    gesture.current = g;
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (g && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) window.clearTimeout(g.timer);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    if (g.long || Math.hypot(e.clientX - g.x, e.clientY - g.y) > CLICK_SLOP_PX) return;
    // Finding the place: any tap on a line, word or not, starts the lyrics there.
    if (syncByTap && g.line >= 0 && lines[g.line]?.startMs !== undefined) {
      playFrom(g.line);
      onSynced?.();
      return;
    }
    if (g.word && engine) {
      setPicked(null);
      if (g.type === 'mouse') engine.cycle(g.word);
      else setTapped((t) => (t === g.word ? null : g.word));
      return;
    }
    if (tapped) return setTapped(null);
    if (g.tr && translationMode === 'blur' && g.line >= 0 && !revealed.has(g.line)) {
      setRevealed((r) => new Set(r).add(g.line));
      return;
    }
    if (g.line >= 0 && lines[g.line]?.text) setPicked((p) => (p === g.line ? null : g.line));
    else setPicked(null);
  };
  const onContextMenu = (e: ReactMouseEvent) => {
    const word = wordAt(e.target, e.clientX, e.clientY, flowRef.current);
    if (!word) return;
    e.preventDefault();
    if (pointer === 'fine') openDrawer(word);
  };

  const withHovered = (fn: (el: HTMLElement) => void) => () => {
    const el = hoveredRef.current;
    if (el && el.isConnected) fn(el);
  };
  useHotkeys(
    {
      k: withHovered((el) => engine?.set(el.dataset.n!, 1, el)),
      l: withHovered((el) => engine?.set(el.dataset.n!, 2, el)),
      x: withHovered((el) => engine?.set(el.dataset.n!, 0, el)),
      d: withHovered(openDrawer),
      escape: () => setPicked(null),
    },
    !drawer,
  );

  const playFrom = (i: number) => {
    const start = lines[i]?.startMs;
    if (!clock || start === undefined) return;
    clock.seek(start);
    clock.play();
    userScrolledAt.current = -Infinity;
    setPicked(null);
  };
  const copyLine = async (i: number) => {
    const tr = song.translation?.lines[i];
    try {
      await navigator.clipboard.writeText(tr ? `${lines[i].text}\n${tr}` : lines[i].text);
      toast('Line copied.', { tone: 'success' });
    } catch {
      toast('Copying isn’t allowed here.');
    }
    setPicked(null);
  };

  const reader = settings.reader;
  const style = {
    '--reader-font': readerFontStack(getReaderFont(reader.font)),
    '--lyric-size': `${Math.round(Math.min(34, Math.max(22, reader.sizePx * 1.25)))}px`,
  } as CSSProperties;

  return (
    <>
      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => (gesture.current = null)} onContextMenu={onContextMenu}>
        {syncByTap && timed && (
          <p role="status" className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+3.75rem)] left-1/2 z-30 -translate-x-1/2 rounded-full bg-[var(--song-ink)] px-4 py-2 text-[13.5px] font-semibold whitespace-nowrap text-bg shadow-elev-3 lg:top-6">
            Tap the line you’re hearing
          </p>
        )}
        <div ref={flowRef} lang={lang} style={style} className={cx('reader-flow lyric-sheet', reader.highlightUnseen && 'hl-unseen', timed ? 'is-live' : 'is-still', syncByTap && timed && 'is-syncing')}>
          {model && (
            <LyricBody
              model={model}
              lang={lang}
              translation={translationMode === 'hide' ? undefined : song.translation?.lines}
              blurred={translationMode === 'blur'}
              revealed={revealed}
              saved={savedLines}
            />
          )}
        </div>
      </div>

      {picked !== null && lines[picked] && (
        <LineActions
          key={picked}
          anchor={() => flowRef.current?.querySelector<HTMLElement>(`[data-line="${picked}"]`) ?? null}
          canPlay={timed && lines[picked].startMs !== undefined}
          saved={savedLines.has(picked)}
          onPlay={() => playFrom(picked)}
          onSave={() => {
            onSaveLine(picked);
            setPicked(null);
          }}
          onCopy={() => void copyLine(picked)}
          onClose={() => setPicked(null)}
        />
      )}

      <AnimatePresence>
        {timed && lost && (
          <motion.button
            type="button"
            onClick={() => followRef.current()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={spring.snappy}
            className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-inverse px-4 py-2.5 text-sm font-semibold text-on-inverse shadow-elev-3"
            style={{ bottom: layout === 'wide' ? 'calc(env(safe-area-inset-bottom) + 28px)' : `calc(env(safe-area-inset-bottom) + ${dockedHeight + 16}px)` }}
          >
            <LocateFixed size={16} aria-hidden /> Back to the song
          </motion.button>
        )}
      </AnimatePresence>

      {pointer === 'fine' && <HoverGloss rootRef={flowRef} engine={engine} hoveredRef={hoveredRef} />}
      {tapped && engine && tapped.isConnected && <TapGloss el={tapped} engine={engine} onClose={() => setTapped(null)} onOpen={openDrawer} />}
      <WordDrawer
        lang={lang}
        word={drawer}
        onClose={() => setDrawer(null)}
        onState={(norm, state) => {
          const el = flowRef.current?.querySelector<HTMLElement>(`.w[data-n="${CSS.escape(norm)}"]`) ?? undefined;
          engine?.set(norm, state, el);
        }}
        onGloss={(norm, gloss) => engine?.setGloss(norm, gloss)}
      />
    </>
  );
}

/**
 * The lines as static DOM: one span per word (data-n form, data-o offset, data-s state), like the
 * Codex reader, with the translation under each line. Rebuilt only when the lyrics, the translation
 * or what's saved change; the word engine updates spans in place after that.
 */
const LyricBody = memo(function LyricBody({
  model,
  lang,
  translation,
  blurred,
  revealed,
  saved,
}: {
  model: ChapterModel;
  lang: string;
  translation?: string[];
  blurred: boolean;
  revealed: ReadonlySet<number>;
  saved: ReadonlySet<number>;
}) {
  return (
    <>
      {model.blocks.map(({ block, tokens }, b) => {
        if (block.t === 'img' || !tokens?.some((t) => t.isWord)) {
          return block.t !== 'img' && block.text ? (
            <div key={b} data-line={b} className="lyric-line is-sound">
              <p data-b={b} className="lyric-text">
                {block.text}
              </p>
            </div>
          ) : (
            <div key={b} className="lyric-break" aria-hidden />
          );
        }
        const tr = translation?.[b];
        return (
          <div key={b} data-line={b} className={cx('lyric-line', saved.has(b) && 'is-saved')}>
            <p data-b={b} className="lyric-text" lang={lang}>
              {tokens.map((t, i) =>
                t.isWord ? (
                  <span key={i} className="w" data-n={t.norm} data-o={t.start} data-s={model.states.get(t.norm!) ?? 0}>
                    {t.text}
                  </span>
                ) : (
                  t.text
                ),
              )}
            </p>
            {tr && (
              <p lang="en" className={cx('lyric-tr', blurred && !revealed.has(b) && 'is-blurred')}>
                {tr}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
});

/** Floats under a picked line: play from it, save it as a card, copy it. */
function LineActions({
  anchor,
  canPlay,
  saved,
  onPlay,
  onSave,
  onCopy,
  onClose,
}: {
  anchor: () => HTMLElement | null;
  canPlay: boolean;
  saved: boolean;
  onPlay: () => void;
  onSave: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const el = anchor();
      if (!el) return onClose();
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: Math.min(Math.max(12, r.left), window.innerWidth - 300) });
    };
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [anchor, onClose]);
  if (!pos) return null;
  const item = 'flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold transition-colors hover:bg-white/10 active:scale-[0.97]';
  return (
    <motion.div
      data-line-actions
      role="toolbar"
      aria-label="This line"
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring.snappy}
      className="fixed z-40 flex items-center gap-0.5 rounded-2xl bg-inverse p-1 text-on-inverse shadow-elev-3"
      style={{ top: pos.top, left: pos.left }}
    >
      {canPlay && (
        <button type="button" className={item} onClick={onPlay}>
          <Play size={15} aria-hidden /> From here
        </button>
      )}
      <button type="button" className={item} onClick={onSave} disabled={saved}>
        {saved ? <BookmarkCheck size={16} aria-hidden /> : <BookmarkPlus size={16} aria-hidden />} {saved ? 'Saved' : 'Save line'}
      </button>
      <button type="button" className={item} onClick={onCopy} aria-label="Copy line">
        <Copy size={15} aria-hidden />
      </button>
    </motion.div>
  );
}
