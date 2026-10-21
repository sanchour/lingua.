import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LocateFixed } from 'lucide-react';
import { useApp } from '@/app/context';
import { cueIndexAt, formatClock, wordStarts } from '@/core/audio/cues';
import type { Chapter, Cue, Media, Text, WordState } from '@/data/types';
import { getReaderFont, readerFontStack, useScriptFont } from '@/design/fonts';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { motionIsReduced } from '@/design/motionPref';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { onTime, play, seek, usePlayer } from '@/services/audio/engine';
import { ChapterBody } from '@/features/codex/reader/ChapterBody';
import type { WordEngine } from '@/features/codex/reader/engine';
import { wordAt } from '@/features/codex/reader/hit';
import { HoverGloss } from '@/features/codex/reader/HoverGloss';
import { modelFromChapter, updateCachedState } from '@/features/codex/reader/model';
import type { ChapterModel } from '@/features/codex/reader/model';
import { PhraseBubble } from '@/features/codex/reader/PhraseBubble';
import { usePhraseGesture } from '@/features/codex/reader/usePhraseGesture';
import { TapGloss } from '@/features/codex/reader/TapGloss';
import { WordDrawer } from '@/features/codex/reader/WordDrawer';
import type { DrawerWord } from '@/features/codex/reader/WordDrawer';
import { ClipEngine } from './ClipEngine';

/** After the learner scrolls, the transcript stops following the audio for this long. */
const FOLLOW_PAUSE_MS = 4000;

/** Where the playhead comes from: Lingua's own player, or Spotify's embed. */
export interface PlayheadClock {
  onTime: (fn: (ms: number) => void) => () => void;
  seek: (ms: number) => void;
  /** Starts playback if it isn't running. */
  play: () => void;
}

export const engineClock: PlayheadClock = {
  onTime,
  seek,
  play: () => {
    if (usePlayer.getState().status !== 'playing') void play();
  },
};

interface KaraokeProps {
  media: Media;
  cues: Cue[];
  /** Follow the playhead (false for a transcript of an item that isn't playing here). */
  live: boolean;
  clock?: PlayheadClock;
  /** Time labels in the left margin on wide screens (off in narrow side panels). */
  gutter?: boolean;
  /** Phones: the player's controls are docked at the bottom (Sonus), so "Back to now" sits above them. */
  docked?: boolean;
  /** The box the transcript scrolls in, when the page itself stays put (an open podcast on desktop). */
  scrollRef?: RefObject<HTMLElement | null>;
}

/**
 * The transcript as reading text: every word hoverable, tappable and markable like in Codex, the
 * current sentence lit, and its words brightening as they're spoken. Time-driven changes are
 * written to the DOM directly (no React renders while playing).
 */
export function KaraokeTranscript({ media, cues, live, clock = engineClock, gutter = true, docked = true, scrollRef }: KaraokeProps) {
  const { settings } = useApp();
  const { pointer, layout } = useLayout();
  const lang = media.lang;
  useScriptFont(lang);
  const reader = settings.reader;

  // ── Model: one paragraph per cue, words with their states and glosses ──
  const [model, setModel] = useState<ChapterModel | null>(null);
  const text = useMemo(
    () => ({ id: media.textId ?? `sonus:${media.id}`, lang, kind: 'transcript', source: media.kind === 'video' ? 'visio' : 'sonus', title: media.title, chapterCount: 1, wordCount: 0, createdAt: 0, updatedAt: 0 }) as Text,
    [media.id, media.textId, media.title, lang],
  );
  useEffect(() => {
    let alive = true;
    const chapter: Chapter = { id: `sonus:${media.id}`, textId: text.id, index: 0, title: media.title, wordCount: 0, blocks: cues.map((c, i) => ({ t: 'p', text: c.text, cue: i })) };
    void modelFromChapter({ lang }, chapter).then((m) => alive && setModel(m));
    return () => {
      alive = false;
    };
  }, [cues, media.id, media.title, lang, text.id]);

  const flowRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const [engine, setEngine] = useState<WordEngine | null>(null);
  const onWordChange = useCallback((norm: string, state: WordState) => {
    updateCachedState(norm, state);
    flowRef.current?.dispatchEvent(new Event('reader:refresh-tip', { bubbles: true }));
  }, []);

  useLayoutEffect(() => {
    const flow = flowRef.current;
    if (!model || !flow) return;
    flow.querySelectorAll<HTMLElement>('[data-b]').forEach((p) => {
      const cue = cues[Number(p.dataset.b)];
      if (cue) p.dataset.time = formatClock(cue.startMs);
    });
    const e = new ClipEngine(text, model, cues, media, onWordChange);
    e.attach(flow);
    setEngine(e);
    return e.follow();
  }, [model, cues, text, media, onWordChange]);

  // ── Following the audio ─────────────────────────────────────────────────
  const [lost, setLost] = useState(false); // the current sentence is off screen after a manual scroll
  const userScrolledAt = useRef(-Infinity);
  const followRef = useRef<() => void>(() => {});

  useEffect(() => {
    const flow = flowRef.current;
    if (!live || !model || !flow) return;
    let current = -1;
    let block: HTMLElement | null = null;
    let words: HTMLElement[] = [];
    let starts: number[] = [];
    let spoken = 0;

    const follow = (force = false) => {
      if (!block) return;
      if (!force && performance.now() - userScrolledAt.current < FOLLOW_PAUSE_MS) {
        const r = block.getBoundingClientRect();
        const v = scrollRef?.current?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
        setLost(r.bottom < v.top + 80 || r.top > v.bottom - 160);
        return;
      }
      setLost(false);
      block.scrollIntoView({ block: 'center', behavior: motionIsReduced() ? 'auto' : 'smooth' });
    };
    followRef.current = () => {
      userScrolledAt.current = -Infinity;
      follow(true);
    };

    const unsubscribe = clock.onTime((ms) => {
      const i = cueIndexAt(cues, ms);
      if (i !== current) {
        block?.classList.remove('is-current');
        for (const w of words) delete w.dataset.k;
        current = i;
        block = i >= 0 ? flow.querySelector<HTMLElement>(`[data-b="${i}"]`) : null;
        words = block ? [...block.querySelectorAll<HTMLElement>('.w')] : [];
        starts = block ? wordStarts(cues[i], words.map((w) => ({ offset: Number(w.dataset.o ?? 0), text: w.textContent ?? '' }))) : [];
        spoken = 0;
        block?.classList.add('is-current');
        follow();
      }
      // Brighten words up to the playhead (only the ones that changed).
      let n = 0;
      while (n < starts.length && starts[n] <= ms + 60) n++;
      if (n !== spoken) {
        for (let k = Math.min(n, spoken); k < Math.max(n, spoken); k++) {
          if (k < n) words[k].dataset.k = '1';
          else delete words[k].dataset.k;
        }
        spoken = n;
      }
    });
    const markScroll = () => (userScrolledAt.current = performance.now());
    window.addEventListener('wheel', markScroll, { passive: true });
    window.addEventListener('touchmove', markScroll, { passive: true });
    return () => {
      unsubscribe();
      block?.classList.remove('is-current');
      for (const w of words) delete w.dataset.k;
      window.removeEventListener('wheel', markScroll);
      window.removeEventListener('touchmove', markScroll);
    };
  }, [live, model, cues, clock, scrollRef]);

  // ── Words: the reader's gestures; a tap between words jumps to that sentence ──
  const [drawer, setDrawer] = useState<DrawerWord | null>(null);
  const [tapped, setTapped] = useState<HTMLElement | null>(null);
  const openDrawer = useCallback(
    (el: HTMLElement) => {
      if (!engine) return;
      flowRef.current?.dispatchEvent(new Event('reader:hide-tip', { bubbles: true }));
      setTapped(null);
      setDrawer({ norm: el.dataset.n!, context: engine.context(el) });
    },
    [engine],
  );

  const jumpTo = (block: HTMLElement) => {
    const cue = cues[Number(block.dataset.b)];
    if (!cue || !live) return;
    clock.seek(cue.startMs);
    clock.play();
  };

  // As in the reader: tap a word, hold it for its drawer, drag across words (or hold and slide) to
  // translate a phrase. A tap between words jumps to that sentence.
  const { handlers, phrase, closePhrase } = usePhraseGesture(
    flowRef,
    engine,
    {
      onHold: openDrawer,
      onSelecting: (on) => on && setTapped(null),
      onTap: ({ word, target, type }) => {
        if (word && engine) {
          if (type === 'mouse') engine.click(word);
          else setTapped((t) => (t === word ? null : word));
          return;
        }
        if (tapped) return setTapped(null);
        const block = target.closest<HTMLElement>('[data-b]');
        if (block) jumpTo(block);
      },
    },
    [model],
  );
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
    },
    !drawer,
  );

  const font = getReaderFont(reader.font);
  const style = {
    '--reader-font': readerFontStack(font, lang),
    '--reader-size': `${Math.round(reader.sizePx * 0.95)}px`,
    '--reader-lh': String(Math.max(1.5, reader.lineHeight - 0.05)),
  } as CSSProperties;

  return (
    <>
      <div {...handlers} onContextMenu={onContextMenu}>
        <div ref={flowRef} lang={lang} style={style} className={cx('reader-flow karaoke', reader.highlightUnseen && 'hl-unseen', layout === 'wide' && gutter && 'has-gutter', !live && 'is-still')}>
          {model && <ChapterBody model={model} lang={lang} />}
        </div>
      </div>

      <AnimatePresence>
        {live && lost && (
          <motion.button
            type="button"
            onClick={() => followRef.current()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={spring.snappy}
            className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-inverse px-4 py-2.5 text-sm font-semibold text-on-inverse shadow-elev-3"
            style={{ bottom: layout === 'wide' || !docked ? 'calc(env(safe-area-inset-bottom) + 28px)' : 'calc(env(safe-area-inset-bottom) + 210px)' }}
          >
            <LocateFixed size={16} aria-hidden /> Back to now
          </motion.button>
        )}
      </AnimatePresence>

      {pointer === 'fine' && <HoverGloss rootRef={flowRef} engine={engine} hoveredRef={hoveredRef} />}
      {phrase && phrase.anchor.isConnected && <PhraseBubble phrase={phrase} lang={lang} onClose={closePhrase} />}
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
