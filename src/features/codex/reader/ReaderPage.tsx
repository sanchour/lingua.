import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react';
import { useApp } from '@/app/context';
import { resolveTheme, syncThemeColor } from '@/app/theme';
import { READING_LANGS } from '@/core/lang/languages';
import { db } from '@/data/db';
import { markOpened, refreshTextStats, saveProgress, updateText, useText } from '@/data/library';
import type { WordState } from '@/data/types';
import { getReaderFont, readerFontStack, useScriptFont } from '@/design/fonts';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { useMediaQuery } from '@/design/hooks/useMediaQuery';
import { Button, buttonClasses } from '@/design/primitives';
import { spring } from '@/design/motion';
import { installPaperStyles } from '@/design/papers';
import { cx } from '@/lib/cx';
import { ChapterBody } from './ChapterBody';
import { ComicView } from './ComicView';
import { ContentsDrawer } from './ContentsDrawer';
import { WordEngine } from './engine';
import { CLICK_SLOP_PX, wordAt } from './hit';
import { HoverGloss } from './HoverGloss';
import { updateCachedState, useChapterModel } from './model';
import { PhraseSelector } from './phrase';
import { PhraseBubble } from './PhraseBubble';
import type { Phrase } from './PhraseBubble';
import { ReaderChrome } from './ReaderChrome';
import { TapGloss } from './TapGloss';
import { usePager } from './usePager';
import { useReadingSession } from './useReadingSession';
import { WordDrawer } from './WordDrawer';
import type { DrawerWord } from './WordDrawer';

const LONG_PRESS_MS = 430;
const CHROME_IDLE_MS = 2600;

type Entry = 'first' | 'last' | number;

export default function ReaderPage() {
  const { textId } = useParams();
  const navigate = useNavigate();
  const { settings } = useApp();
  const text = useText(textId);
  const { pointer, layout } = useLayout();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = resolveTheme(settings.theme, systemDark);
  const reader = settings.reader;
  // A comic has a view of its own: the page, and its bubbles' words beside it.
  const comic = text?.kind === 'comic';
  const paged = reader.mode === 'paged' && !comic;
  const lang = text?.lang ?? 'en';

  // Reading papers: the chosen page colours apply while a book is open (see design/papers.ts).
  useLayoutEffect(() => {
    const root = document.documentElement;
    installPaperStyles();
    root.dataset.paperLight = reader.paperLight;
    root.dataset.paperDark = reader.paperDark;
    syncThemeColor();
    return () => {
      delete root.dataset.paperLight;
      delete root.dataset.paperDark;
      syncThemeColor();
    };
  }, [reader.paperLight, reader.paperDark]);

  // ── Position ────────────────────────────────────────────────────────────
  const [chapterIndex, setChapterIndex] = useState<number | null>(null);
  const [entry, setEntry] = useState<Entry>('first');
  useEffect(() => {
    if (!text || chapterIndex !== null) return;
    void markOpened(text.id);
    void db.readingProgress.get(text.id).then((p) => {
      setEntry(p ? p.blockIndex : 'first');
      setChapterIndex(Math.min(p?.chapterIndex ?? 0, Math.max(0, text.chapterCount - 1)));
    });
  }, [text, chapterIndex]);

  const [version, setVersion] = useState(0);
  const model = useChapterModel(text?.kind === 'shelfItem' ? null : text, chapterIndex ?? 0, version);
  const ready = model && chapterIndex !== null && model.chapter.index === chapterIndex;

  // ── Word engine ─────────────────────────────────────────────────────────
  const flowRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const [engine, setEngine] = useState<WordEngine | null>(null);
  const session = useReadingSession(lang, text?.id);

  const onWordChange = useCallback((norm: string, state: WordState) => {
    updateCachedState(norm, state);
    flowRef.current?.dispatchEvent(new Event('reader:refresh-tip', { bubbles: true }));
  }, []);

  useLayoutEffect(() => {
    if (!ready || !text || !flowRef.current) return;
    const e = new WordEngine(text, model, onWordChange);
    e.attach(flowRef.current);
    setEngine(e);
  }, [ready, model, text, onWordChange]);

  // Comprehension on the library card catches up when the reader closes.
  useEffect(() => () => void (textId && refreshTextStats(textId)), [textId]);

  // ── Progress ────────────────────────────────────────────────────────────
  const saveTimer = useRef(0);
  const persist = useCallback(
    (blockIndex: number, fraction: number) => {
      if (!text || chapterIndex === null) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void saveProgress({ textId: text.id, chapterIndex, blockIndex, percent: Math.min(1, (chapterIndex + fraction) / Math.max(1, text.chapterCount)) });
      }, 350);
    },
    [text, chapterIndex],
  );

  const [ended, setEnded] = useState(false);
  const goChapter = useCallback(
    (index: number, landing: Entry) => {
      if (!text) return;
      if (index >= text.chapterCount) {
        setEnded(true);
        return;
      }
      if (index < 0) return;
      flowRef.current?.dispatchEvent(new Event('reader:hide-tip', { bubbles: true }));
      setTapped(null);
      setEntry(landing);
      setChapterIndex(index);
      if (!paged) window.scrollTo(0, 0);
    },
    [text, paged],
  );

  // ── Pager (page-flip mode) ──────────────────────────────────────────────
  const layoutKey = `${model?.chapter.id ?? 'none'}|${reader.font}|${reader.sizePx}|${reader.lineHeight}|${reader.justify}`;
  const pager = usePager({
    enabled: paged && Boolean(ready),
    viewportRef,
    flowRef,
    layoutKey,
    initialPage: entry,
    onBoundary: (direction) => goChapter((chapterIndex ?? 0) + (direction === 'next' ? 1 : -1), direction === 'next' ? 'first' : 'last'),
    onPageChange: (page, previous) => {
      session.touch();
      flowRef.current?.dispatchEvent(new Event('reader:hide-tip', { bubbles: true }));
      setTapped(null);
      if (page > previous && engine) {
        session.addWords((model?.chapter.wordCount ?? 0) / Math.max(1, pager.pageCount));
        if (reader.autoKnownOnPageTurn) engine.markSeenAsKnown(pager.onPage(previous, '.w'));
      }
    },
  });

  useEffect(() => {
    if (!paged || !ready || !flowRef.current) return;
    const first = pager.onPage(pager.page, '[data-b]')[0];
    persist(Number(first?.dataset.b ?? 0), pager.page / pager.pageCount);
  }, [paged, ready, pager.page, pager.pageCount]);

  // A comic page counts as read when it opens, bubbles or not.
  useEffect(() => {
    if (comic && ready) persist(0, 1);
  }, [comic, ready, chapterIndex]);

  // ── Scroll mode: progress from the top-most visible paragraph ───────────
  useEffect(() => {
    if (paged || !ready || !flowRef.current) return;
    const flow = flowRef.current;
    if (typeof entry === 'number') flow.querySelector(`[data-b="${entry}"]`)?.scrollIntoView({ block: 'start' });
    const seen = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const b = Number((e.target as HTMLElement).dataset.b);
          if (!seen.has(b)) {
            seen.add(b);
            const tokens = model.blocks[b]?.tokens;
            session.addWords(tokens ? tokens.filter((t) => t.isWord).length : 0);
          }
          persist(b, comic ? 1 : b / model.blocks.length);
          session.touch();
        }
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    flow.querySelectorAll('[data-b]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [paged, ready, model]);

  // ── Drawer, tap bubble, chrome ──────────────────────────────────────────
  const [drawer, setDrawer] = useState<DrawerWord | null>(null);
  const [tapped, setTapped] = useState<HTMLElement | null>(null);
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const selector = useRef<PhraseSelector | null>(null);
  const [contents, setContents] = useState(false);
  const [typographyOpen, setTypographyOpen] = useState(false);
  const [chrome, setChrome] = useState(true);
  const chromeHover = useRef(false);
  const chromeTimer = useRef(0);

  const scheduleHide = useCallback(() => {
    window.clearTimeout(chromeTimer.current);
    chromeTimer.current = window.setTimeout(() => !chromeHover.current && setChrome(false), CHROME_IDLE_MS);
  }, []);
  useEffect(() => {
    scheduleHide();
    return () => window.clearTimeout(chromeTimer.current);
  }, [scheduleHide]);

  const openDrawer = useCallback(
    (el: HTMLElement) => {
      if (!engine) return;
      flowRef.current?.dispatchEvent(new Event('reader:hide-tip', { bubbles: true }));
      setTapped(null);
      setDrawer({ norm: el.dataset.n!, context: engine.context(el) });
    },
    [engine],
  );

  // ── Pointer: desktop clicks, touch taps / long-presses / swipes ─────────
  // A phrase: drag across words with the mouse, or long-press a word and slide (touch). A long-press
  // released without sliding opens the word's drawer.
  type Gesture = { x: number; y: number; t: number; word: HTMLElement | null; swiping: boolean; longPressed: boolean; selectReady: boolean; selecting: boolean; timer: number; type: string };
  const gesture = useRef<Gesture | null>(null);
  const swallowNextClick = () => {
    const swallow = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 450);
  };

  const startSelecting = (g: Gesture) => {
    const root = flowRef.current;
    if (!root || !g.word) return;
    g.word.classList.remove('is-active');
    flowRef.current?.dispatchEvent(new Event('reader:hide-tip', { bubbles: true }));
    setTapped(null);
    setPhrase(null);
    selector.current?.clear();
    selector.current = new PhraseSelector(root);
    selector.current.begin(g.word);
    g.selecting = true;
  };
  const closePhrase = useCallback(() => {
    selector.current?.clear();
    selector.current = null;
    setPhrase(null);
  }, []);
  const finishSelecting = () => {
    const sel = selector.current;
    if (!sel || !engine || sel.count < 2 || !sel.first || !sel.last) return closePhrase();
    const ctx = engine.context(sel.first);
    setPhrase({ text: sel.text(), anchor: sel.last, context: { sentence: ctx.sentence, textId: ctx.textId, chapterIndex: ctx.chapterIndex, blockIndex: ctx.blockIndex } });
  };

  // While a touch is choosing words, the page must not scroll.
  useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const hold = (e: TouchEvent) => {
      if (gesture.current?.selectReady) e.preventDefault();
    };
    flow.addEventListener('touchmove', hold, { passive: false });
    return () => flow.removeEventListener('touchmove', hold);
  }, [model]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const word = wordAt(e.target, e.clientX, e.clientY, flowRef.current);
    const g: Gesture = { x: e.clientX, y: e.clientY, t: performance.now(), word, swiping: false, longPressed: false, selectReady: false, selecting: false, timer: 0, type: e.pointerType };
    if (e.pointerType !== 'mouse' && word) {
      g.timer = window.setTimeout(() => {
        g.longPressed = true;
        g.selectReady = true;
        word.classList.add('is-active');
        navigator.vibrate?.(8);
      }, LONG_PRESS_MS);
    }
    gesture.current = g;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.type === 'mouse') {
      if (!(e.buttons & 1) || !g.word) return;
      if (!g.selecting && Math.hypot(dx, dy) > CLICK_SLOP_PX) startSelecting(g);
      if (g.selecting) selector.current?.update(e.clientX, e.clientY);
      return;
    }
    if (g.selectReady) {
      if (!g.selecting && Math.hypot(dx, dy) > 8) startSelecting(g);
      if (g.selecting) selector.current?.update(e.clientX, e.clientY);
      return;
    }
    if (!g.swiping && Math.hypot(dx, dy) > 10) window.clearTimeout(g.timer);
    if (paged && !g.swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      g.swiping = true;
      setTapped(null);
    }
    if (g.swiping) pager.drag(dx);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    session.touch();
    if (g.selecting) return finishSelecting();
    if (g.selectReady && g.word) {
      g.word.classList.remove('is-active');
      // The click that follows the lift would land on the drawer's backdrop and close it.
      swallowNextClick();
      return openDrawer(g.word);
    }
    if (g.type === 'mouse') {
      if (g.word && Math.hypot(e.clientX - g.x, e.clientY - g.y) < CLICK_SLOP_PX && engine) {
        engine.cycle(g.word);
      }
      return;
    }
    if (g.swiping) {
      const dt = Math.max(1, performance.now() - g.t);
      pager.drag(null, (e.clientX - g.x) / dt);
      return;
    }
    if (g.longPressed || Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) return;
    if (g.word) {
      setTapped((current) => (current === g.word ? null : g.word));
    } else if (tapped) {
      setTapped(null);
    } else {
      setChrome((v) => !v);
    }
  };

  // Right-click a word for its details (a left click cycles its state). On touch, long-press does this.
  const onContextMenu = (e: ReactMouseEvent) => {
    const word = wordAt(e.target, e.clientX, e.clientY, flowRef.current);
    if (!word) return;
    e.preventDefault();
    if (pointer === 'fine') openDrawer(word);
  };

  const onPointerCancel = () => {
    const g = gesture.current;
    if (g?.swiping) pager.drag(null);
    if (g) window.clearTimeout(g.timer);
    g?.word?.classList.remove('is-active');
    if (g?.selecting) closePhrase();
    gesture.current = null;
  };

  // ── Keyboard ────────────────────────────────────────────────────────────
  const withHovered = (fn: (el: HTMLElement) => void) => () => {
    const el = hoveredRef.current;
    if (el && el.isConnected) fn(el);
  };
  useHotkeys(
    {
      arrowright: () => (paged ? pager.goTo(pager.page + 1) : comic ? goChapter((chapterIndex ?? 0) + 1, 'first') : undefined),
      arrowleft: () => (paged ? pager.goTo(pager.page - 1) : comic ? goChapter((chapterIndex ?? 0) - 1, 'first') : undefined),
      pagedown: () => paged && pager.goTo(pager.page + 1),
      pageup: () => paged && pager.goTo(pager.page - 1),
      ' ': () => (paged ? pager.goTo(pager.page + 1) : window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' })),
      k: withHovered((el) => engine?.set(el.dataset.n!, 1, el)),
      l: withHovered((el) => engine?.set(el.dataset.n!, 2, el)),
      x: withHovered((el) => engine?.set(el.dataset.n!, 0, el)),
      d: withHovered(openDrawer),
    },
    !drawer && !contents && !typographyOpen,
  );

  // ── Styles ──────────────────────────────────────────────────────────────
  const font = getReaderFont(reader.font);
  const flowStyle = useMemo(
    () =>
      ({
        '--reader-font': readerFontStack(font, lang),
        '--reader-size': `${reader.sizePx}px`,
        '--reader-lh': String(reader.lineHeight),
      }) as CSSProperties,
    [font, lang, reader.sizePx, reader.lineHeight],
  );
  useScriptFont(lang);
  const flowClass = cx(
    'reader-flow',
    paged && 'is-paged',
    comic && 'is-comic',
    reader.justify && 'is-justified',
    reader.highlightUnseen && 'hl-unseen',
    READING_LANGS.has(lang) && reader.readings !== 'off' && `readings-${reader.readings}`,
  );
  const chapterTitle = model?.chapter.title ? `${model.chapter.title}${model.chapter.part ? ` · ${model.chapter.part[0]}/${model.chapter.part[1]}` : ''}` : undefined;
  const wide = layout === 'wide';

  if (text === null || (text && text.kind === 'shelfItem')) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="font-serif text-xl">This book isn’t in your library.</p>
          <button type="button" className={`${buttonClasses('secondary', 'md')} mt-4`} onClick={() => navigate('/codex')}>
            Back to Codex
          </button>
        </div>
      </div>
    );
  }
  if (!text) return null;

  const body = ready ? <ChapterBody model={model} lang={lang} images={!comic} /> : null;

  return (
    <motion.div
      className={cx('bg-bg', paged || comic ? 'fixed inset-0 overflow-hidden' : 'min-h-dvh')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      onMouseMove={() => {
        if (pointer !== 'fine') return;
        setChrome(true);
        scheduleHide();
      }}
    >
      <ReaderChrome
        visible={chrome}
        text={text}
        chapterTitle={chapterTitle}
        reader={reader}
        theme={theme}
        typographyOpen={typographyOpen}
        setTypographyOpen={setTypographyOpen}
        onContents={() => setContents(true)}
        onHoverChange={(h) => {
          chromeHover.current = h;
          if (!h) scheduleHide();
        }}
      />

      {comic ? (
        <ComicView
          text={text}
          model={model}
          ready={Boolean(ready)}
          index={chapterIndex ?? 0}
          wide={wide}
          onTurn={(step) => goChapter((chapterIndex ?? 0) + step, 'first')}
          onPageRead={() => setVersion((v) => v + 1)}
        >
          <div
            ref={flowRef}
            key={model?.chapter.id}
            className={flowClass}
            lang={lang}
            style={flowStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={onContextMenu}
          >
            {body}
          </div>
        </ComicView>
      ) : paged ? (
        <>
          <div
            ref={viewportRef}
            className="absolute overflow-hidden"
            style={{
              top: wide ? 76 : 'calc(env(safe-area-inset-top) + 58px)',
              bottom: wide ? 64 : 'calc(env(safe-area-inset-bottom) + 46px)',
              left: wide ? 'max(72px, calc((100vw - 1260px) / 2))' : 'max(24px, env(safe-area-inset-left))',
              right: wide ? 'max(72px, calc((100vw - 1260px) / 2))' : 'max(24px, env(safe-area-inset-right))',
              touchAction: 'pan-y',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={onContextMenu}
          >
            <motion.div ref={flowRef} key={model?.chapter.id} className={flowClass} lang={lang} style={{ ...flowStyle, x: pager.x }}>
              {body}
            </motion.div>
          </div>
          {pager.spread && (
            // The book's gutter: a soft fold between the two pages.
            <div
              className="pointer-events-none absolute top-[64px] bottom-[52px] left-1/2 w-16 -translate-x-1/2"
              style={{ background: 'linear-gradient(90deg, transparent, color-mix(in oklab, var(--ink) 5%, transparent) 50%, transparent)' }}
              aria-hidden
            />
          )}
          {wide && (
            <>
              <PageArrow side="left" onClick={() => pager.goTo(pager.page - 1)} />
              <PageArrow side="right" onClick={() => pager.goTo(pager.page + 1)} />
            </>
          )}
          <p
            className="pointer-events-none absolute inset-x-0 text-center text-[12px] font-semibold text-ink-faint tabular-nums"
            style={{ bottom: wide ? 24 : 'calc(env(safe-area-inset-bottom) + 14px)' }}
          >
            {ready && `${pager.page + 1} / ${pager.pageCount}`}
            {ready && text.chapterCount > 1 && <span className="opacity-70"> · ch. {(chapterIndex ?? 0) + 1} of {text.chapterCount}</span>}
          </p>
        </>
      ) : (
        <div
          className="mx-auto px-6"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 84px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={onContextMenu}
        >
          <div ref={flowRef} key={model?.chapter.id} className={cx(flowClass, 'mx-auto')} lang={lang} style={{ ...flowStyle, maxWidth: `${reader.maxWidthCh}ch` }}>
            {body}
          </div>
          {ready && (
            <div className="mx-auto mt-14 flex max-w-md justify-between gap-3">
              <Button variant="ghost" icon={ChevronLeft} disabled={chapterIndex === 0} onClick={() => goChapter((chapterIndex ?? 0) - 1, 'first')}>
                Previous
              </Button>
              <Button variant="secondary" iconRight={ChevronRight} onClick={() => goChapter((chapterIndex ?? 0) + 1, 'first')}>
                {(chapterIndex ?? 0) + 1 < text.chapterCount ? 'Next chapter' : 'Finish'}
              </Button>
            </div>
          )}
        </div>
      )}

      {pointer === 'fine' && <HoverGloss rootRef={flowRef} engine={engine} hoveredRef={hoveredRef} />}
      {tapped && engine && tapped.isConnected && <TapGloss el={tapped} engine={engine} onClose={() => setTapped(null)} onOpen={openDrawer} />}
      {phrase && phrase.anchor.isConnected && <PhraseBubble phrase={phrase} lang={lang} onClose={closePhrase} />}

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
      <ContentsDrawer
        open={contents}
        onClose={() => setContents(false)}
        text={text}
        current={chapterIndex ?? 0}
        onChoose={(index) => {
          setContents(false);
          goChapter(index, 'first');
        }}
      />

      <AnimatePresence>
        {ended && (
          <motion.div
            className="fixed inset-0 z-40 grid place-items-center bg-scrim p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEnded(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl border border-line bg-raised p-7 text-center shadow-elev-3"
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={spring.snappy}
              onClick={(e) => e.stopPropagation()}
            >
              <PartyPopper size={28} className="mx-auto text-accent-text" aria-hidden />
              <p className="mt-3 font-serif text-2xl font-semibold">The end</p>
              <p lang={lang} className="mt-1 text-ink-soft">
                You finished “{text.title}”.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={async () => {
                    await updateText(text.id, { finishedAt: Date.now(), shelf: 'read' });
                    navigate('/codex');
                  }}
                >
                  Mark as finished
                </Button>
                <Button variant="ghost" onClick={() => setEnded(false)}>
                  Keep reading
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PageArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous page' : 'Next page'}
      onClick={onClick}
      className={cx(
        'group absolute top-1/2 grid h-40 w-14 -translate-y-1/2 place-items-center text-ink-faint transition-colors hover:text-ink',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <span className="grid size-10 place-items-center rounded-full opacity-0 transition-[opacity,background-color] duration-200 group-hover:bg-surface group-hover:opacity-100">
        <Icon size={22} aria-hidden />
      </span>
    </button>
  );
}
