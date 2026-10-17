import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Languages, LoaderCircle } from 'lucide-react';
import { useApp } from '@/app/context';
import type { Chapter, Cue, Media, Text, WordState } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { CLICK_SLOP_PX, wordAt } from '@/features/codex/reader/hit';
import { HoverGloss } from '@/features/codex/reader/HoverGloss';
import { modelFromChapter, updateCachedState } from '@/features/codex/reader/model';
import type { ChapterModel } from '@/features/codex/reader/model';
import { TapGloss } from '@/features/codex/reader/TapGloss';
import { WordDrawer } from '@/features/codex/reader/WordDrawer';
import type { DrawerWord } from '@/features/codex/reader/WordDrawer';
import { ClipEngine } from '@/features/sonus/player/ClipEngine';
import { translateLine } from '@/services/translate/gloss';
import type { VideoClock } from './clock';
import { lineAt } from './lines';

const LONG_PRESS_MS = 430;
interface OverlayProps {
  media: Media;
  target: Cue[] | null;
  native: Cue[] | null;
  clock: VideoClock;
  /** Pause while the pointer rests on the subtitles (desktop) or a word is open (touch). */
  onHold: (holding: boolean) => void;
}

/**
 * Two subtitle lines over the picture: the target line with every word hoverable, tappable and
 * markable like in Codex, and your own line under it (shown, blurred until revealed, or hidden).
 */
export function SubtitleOverlay({ media, target, native, clock, onHold }: OverlayProps) {
  const { settings } = useApp();
  const { pointer } = useLayout();
  const { native: nativeMode, subtitleScale } = settings.visio;
  const lang = media.lang;

  const [model, setModel] = useState<ChapterModel | null>(null);
  const text = useMemo(
    () => ({ id: `visio:${media.id}`, lang, kind: 'transcript', source: 'visio', title: media.title, chapterCount: 1, wordCount: 0, createdAt: 0, updatedAt: 0 }) as Text,
    [media.id, media.title, lang],
  );
  useEffect(() => {
    if (!target?.length) return setModel(null);
    let alive = true;
    const chapter: Chapter = { id: `visio:${media.id}`, textId: text.id, index: 0, title: media.title, wordCount: 0, blocks: target.map((c, i) => ({ t: 'p', text: c.text, cue: i })) };
    void modelFromChapter({ lang }, chapter).then((m) => alive && setModel(m));
    return () => {
      alive = false;
    };
  }, [target, media.id, media.title, lang, text.id]);

  const onWordChange = useCallback((norm: string, state: WordState) => {
    updateCachedState(norm, state);
    document.dispatchEvent(new Event('reader:refresh-tip'));
  }, []);
  const mediaId = media.id;
  const engine = useMemo(() => (model && target ? new ClipEngine(text, model, target, { id: mediaId, kind: 'video' }, onWordChange) : null), [model, target, text, mediaId, onWordChange]);
  useEffect(() => engine?.follow(), [engine]);

  // ── Which lines are up ──
  const [line, setLine] = useState(-1);
  const [nativeLine, setNativeLine] = useState(-1);
  useEffect(
    () =>
      clock.onTime((ms) => {
        setLine(target ? lineAt(target, ms) : -1);
        setNativeLine(native ? lineAt(native, ms) : -1);
      }),
    [clock, target, native],
  );

  const lineRef = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    if (engine && lineRef.current) engine.attach(lineRef.current);
  }, [engine, line]);

  // ── Your own line: a track, or a translation on request ──
  const [revealed, setRevealed] = useState(-1);
  const [machine, setMachine] = useState<{ line: number; text: string | null } | null>(null);
  const targetCue = target?.[line];
  const nativeText = native ? native[nativeLine]?.text : machine && machine.line === line ? machine.text : undefined;
  const translate = () => {
    if (!targetCue) return;
    const at = line;
    setMachine({ line: at, text: null });
    void translateLine(lang, targetCue.text).then((t) => setMachine((m) => (m?.line === at ? { line: at, text: t ?? '—' } : m)));
  };

  // ── Gestures (as in the reader) ──
  const [drawer, setDrawer] = useState<DrawerWord | null>(null);
  const [tapped, setTapped] = useState<HTMLElement | null>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const holding = Boolean(drawer || tapped);
  useEffect(() => {
    if (holding) onHold(true);
  }, [holding, onHold]);

  const openDrawer = useCallback(
    (el: HTMLElement) => {
      if (!engine) return;
      document.dispatchEvent(new Event('reader:hide-tip'));
      setTapped(null);
      setDrawer({ norm: el.dataset.n!, context: engine.context(el) });
    },
    [engine],
  );

  const gesture = useRef<{ x: number; y: number; word: HTMLElement | null; timer: number; long: boolean; type: string } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    const word = wordAt(e.target, e.clientX, e.clientY, lineRef.current);
    const g = { x: e.clientX, y: e.clientY, word, timer: 0, long: false, type: e.pointerType };
    if (e.pointerType !== 'mouse' && word) {
      g.timer = window.setTimeout(() => {
        g.long = true;
        openDrawer(word);
      }, LONG_PRESS_MS);
    }
    gesture.current = g;
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    e.stopPropagation();
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    if (g.long || Math.hypot(e.clientX - g.x, e.clientY - g.y) > CLICK_SLOP_PX || !g.word || !engine) return;
    if (g.type === 'mouse') engine.cycle(g.word);
    else {
      onHold(true);
      setTapped((t) => (t === g.word ? null : g.word));
    }
  };
  const onContextMenu = (e: ReactMouseEvent) => {
    const word = wordAt(e.target, e.clientX, e.clientY, lineRef.current);
    if (!word) return;
    e.preventDefault();
    openDrawer(word);
  };

  const block = model && line >= 0 ? model.blocks[line] : null;
  const showNative = nativeMode !== 'hide' && (nativeText !== undefined || (!native && targetCue));
  const blurred = nativeMode === 'blur' && revealed !== line && nativeText !== undefined;

  return (
    <>
      <div
        ref={rootRef}
        className="visio-subs pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-[0.35em] px-[4%] pb-[5%] text-center"
        style={{ fontSize: `calc(clamp(15px, 3.1cqw, 46px) * ${subtitleScale})` }}
      >
        {block?.tokens && (
          <p
            ref={lineRef}
            key={line}
            data-b={line}
            lang={lang}
            className="visio-line pointer-events-auto"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (gesture.current = null)}
            onContextMenu={onContextMenu}
            onClick={(e) => e.stopPropagation()}
            onPointerEnter={(e) => e.pointerType === 'mouse' && onHold(true)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && !drawer && onHold(false)}
          >
            <span className="visio-line-box">
              {block.tokens.map((t, i) =>
                t.isWord ? (
                  <span key={i} className="w" data-n={t.norm} data-o={t.start} data-s={engine?.state(t.norm!) ?? 0}>
                    {t.text}
                  </span>
                ) : (
                  t.text
                ),
              )}
            </span>
          </p>
        )}
        {!block && targetCue && <p className="visio-line"><span className="visio-line-box">{targetCue.text}</span></p>}
        {showNative && line >= 0 && (
          <p lang="en" className="visio-native pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {nativeText === undefined ? (
              <button type="button" onClick={translate} className="visio-native-box inline-flex items-center gap-1.5 opacity-80 hover:opacity-100">
                <Languages className="size-[0.95em]" aria-hidden /> Translate this line
              </button>
            ) : nativeText === null ? (
              <span className="visio-native-box inline-flex items-center gap-1.5">
                <LoaderCircle className="size-[0.95em] animate-spin" aria-hidden /> Translating…
              </span>
            ) : (
              <button
                type="button"
                aria-label={blurred ? 'Show your subtitle' : undefined}
                onClick={() => setRevealed((r) => (r === line ? -1 : line))}
                className={cx('visio-native-box transition-[filter] duration-200', blurred && 'blur-[0.32em] hover:blur-none')}
              >
                {nativeText}
              </button>
            )}
          </p>
        )}
      </div>

      {pointer === 'fine' && <HoverGloss rootRef={rootRef} engine={engine} hoveredRef={hoveredRef} />}
      {tapped && engine && tapped.isConnected && (
        <TapGloss
          el={tapped}
          engine={engine}
          onClose={() => {
            setTapped(null);
            onHold(false);
          }}
          onOpen={openDrawer}
        />
      )}
      <WordDrawer
        lang={lang}
        word={drawer}
        onClose={() => {
          setDrawer(null);
          onHold(false);
        }}
        onState={(norm, state) => {
          const el = lineRef.current?.querySelector<HTMLElement>(`.w[data-n="${CSS.escape(norm)}"]`) ?? undefined;
          engine?.set(norm, state, el);
        }}
        onGloss={(norm, gloss) => engine?.setGloss(norm, gloss)}
      />
    </>
  );
}
