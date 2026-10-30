import { UiText, useUi } from '@/design/i18n/UiText';
// Places in an item to come back to (6-9): bookmarks, and the parts that were hard to hear, each a tap away from playing again.
import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, EarOff, Repeat1, X } from 'lucide-react';
import { formatClock } from '@/core/audio/cues';
import { db } from '@/data/db';
import { addBookmark, removeBookmark } from '@/data/media';
import { currentMs, replayHardPart, seek } from '@/services/audio/engine';
import { cx } from '@/lib/cx';

export function Bookmarks({ mediaId }: { mediaId: string }) {
  const translateUi = useUi();
  const marks = useLiveQuery(async () => (await db.media.get(mediaId))?.bookmarks ?? [], [mediaId]) ?? [];
  return (
    <section aria-label={translateUi('Bookmarks')} className="mt-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" title={translateUi('Bookmark this place (key: B)')} onClick={() => void addBookmark(mediaId, currentMs())} className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-[13px] font-bold hover:border-line-strong"><UiText source={'{0} Bookmark'} values={[<Bookmark size={14} aria-hidden />]} /></button>
        <button type="button" title={translateUi('Mark this place as hard to hear: it comes back for another go')} onClick={() => void addBookmark(mediaId, currentMs(), { hard: true })} className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-[13px] font-bold hover:border-line-strong"><UiText source={'{0} Hard to hear'} values={[<EarOff size={14} aria-hidden />]} /></button>
        {marks.some((m) => m.hard) && (
          <button type="button" title={translateUi('Play the places marked hard to hear again, one after another, each on a loop')} onClick={() => void replayHardPart()} className="flex h-9 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 text-[13px] font-bold text-accent-text"><UiText source={'{0} Replay the hard parts'} values={[<Repeat1 size={14} aria-hidden />]} /></button>
        )}
      </div>
      {marks.length > 0 && (
        <ul className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {marks.map((m) => (
            <li key={m.at} className={cx('flex items-center rounded-full border text-[12.5px] font-semibold tabular-nums', m.hard ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-surface')}>
              <button type="button" onClick={() => seek(Math.max(0, m.at - 1500))} className="flex items-center gap-1 py-1 pr-1.5 pl-2.5" title={m.hard ? translateUi('Hard to hear: play from just before') : translateUi('Play from just before')}>
                {m.hard ? <EarOff size={12} aria-hidden /> : <Bookmark size={12} aria-hidden />}
                {formatClock(m.at)}
              </button>
              <button type="button" aria-label={translateUi('Remove the bookmark at {0}', [formatClock(m.at)])} onClick={() => void removeBookmark(mediaId, m.at)} className="grid size-6 place-items-center rounded-full text-ink-faint hover:text-ink">
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
