import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AudioLines, ListOrdered } from 'lucide-react';
import { formatClock } from '@/core/audio/cues';
import { chapterAt } from '@/core/audio/sleep';
import type { AudioChapter, Media } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Drawer, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { currentMs, loadMedia, onTime, play, seekChapter, unlockAudio } from '@/services/audio/engine';

const chapterTitle = (chapters: readonly AudioChapter[], i: number) => chapters[i].title.trim() || `Chapter ${i + 1}`;

/**
 * The chapter playing now: its index, or -1 before the first one or when the item isn't the one
 * playing. It follows the playhead but only renders again when the chapter changes.
 */
export function useChapterNow(chapters: readonly AudioChapter[] | undefined, live: boolean): number {
  const [index, setIndex] = useState(() => (live ? chapterAt(chapters, currentMs()) : -1));
  useEffect(() => {
    if (!live || !chapters?.length) return;
    let last = NaN;
    return onTime((ms) => {
      const i = chapterAt(chapters, ms);
      if (i !== last) setIndex((last = i));
    });
  }, [chapters, live]);
  return live && chapters?.length ? index : -1;
}

/** Under the title: the chapter playing now, or how many chapters there are. */
export function ChapterNow({ media, live, className }: { media: Media; live: boolean; className?: string }) {
  const chapters = media.chapters ?? [];
  const index = useChapterNow(media.chapters, live);
  return (
    <p className={cx('flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-ink-soft', className)}>
      <ListOrdered size={14} className="shrink-0" aria-hidden />
      {index >= 0 ? (
        <span lang={media.lang} className="truncate">
          <span className="sr-only">Chapter now: </span>
          {chapterTitle(chapters, index)}
        </span>
      ) : (
        <span className="truncate"><UiText source={'{0} chapters'} values={[chapters.length]} /></span>
      )}
    </p>
  );
}

/** Centres a row in the box that scrolls it (the popover's list, or the sheet's content). */
function centre(row: HTMLElement) {
  for (let box = row.parentElement; box; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - (box.clientHeight - row.offsetHeight) / 2;
    return;
  }
}

function ChapterList({ media, live, onPick }: { media: Media; live: boolean; onPick: () => void }) {
  const chapters = media.chapters ?? [];
  const current = useChapterNow(media.chapters, live);
  const listRef = useRef<HTMLOListElement>(null);

  // Opens with the chapter playing now in view.
  useLayoutEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[aria-current]');
    if (row) centre(row);
  }, []);

  // Plays from the chapter's start (play() also ends a pause between sentence repeats); an item
  // that isn't open in the player yet takes it over.
  const jump = (i: number) => {
    onPick();
    unlockAudio();
    if (live) {
      seekChapter(i);
      void play();
    } else void loadMedia(media, { autoplay: true, startMs: chapters[i].startMs });
  };

  return (
    <ol ref={listRef} className="space-y-0.5">
      {chapters.map((chapter, i) => {
        const now = i === current;
        return (
          <li key={i}>
            <button
              type="button"
              aria-current={now ? 'true' : undefined}
              onClick={() => jump(i)}
              className={cx('no-callout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface active:bg-surface', now && 'bg-surface')}
            >
              <span className={cx('grid w-6 shrink-0 place-items-start text-[12.5px] font-bold tabular-nums', now ? 'text-accent-text' : 'text-ink-faint')}>
                {now ? <AudioLines size={15} aria-hidden /> : i + 1}
              </span>
              <span lang={media.lang} className={cx('min-w-0 flex-1 text-[14.5px] leading-snug font-semibold', now && 'text-accent-text')}>
                {chapterTitle(chapters, i)}
              </span>
              <span className="shrink-0 text-[12.5px] font-semibold text-ink-faint tabular-nums">{formatClock(chapter.startMs)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** "Chapters": each chapter with its start time, the one playing marked; tapping one plays from there. */
export function ChaptersButton({ media, live, className }: { media: Media; live: boolean; className?: string }) {
  const translateUi = useUi();
  const { layout } = useLayout();
  const [sheet, setSheet] = useState(false);
  const label = (
    <><UiText source={'{0} Chapters'} values={[<ListOrdered size={15} aria-hidden />]} /></>
  );

  if (layout === 'wide') {
    return (
      <Popover
        label={translateUi('Chapters')}
        placement="top-start"
        className="w-80"
        trigger={(props) => (
          <button {...props} type="button" className={className}>
            {label}
          </button>
        )}
      >
        {(close) => (
          <div className="max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain">
            <ChapterList media={media} live={live} onPick={close} />
          </div>
        )}
      </Popover>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setSheet(true)} className={className}>
        {label}
      </button>
      <Drawer open={sheet} onClose={() => setSheet(false)} title={translateUi('Chapters')} description={media.title}>
        <ChapterList media={media} live={live} onPick={() => setSheet(false)} />
      </Drawer>
    </>
  );
}
