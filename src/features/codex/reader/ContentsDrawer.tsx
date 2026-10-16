import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { Text } from '@/data/types';
import { Drawer } from '@/design/primitives';
import { cx } from '@/lib/cx';

interface ContentsDrawerProps {
  open: boolean;
  onClose: () => void;
  text: Text;
  current: number;
  onChoose: (index: number) => void;
}

/** Table of contents. Parts of a long chapter are grouped under one entry. */
export function ContentsDrawer({ open, onClose, text, current, onChoose }: ContentsDrawerProps) {
  const chapters = useLiveQuery(
    async () =>
      open
        ? (await db.chapters.where('[textId+index]').between([text.id, 0], [text.id, Infinity]).toArray()).map((c) => ({ index: c.index, title: c.title, part: c.part }))
        : [],
    [open, text.id],
  );

  const entries = (chapters ?? []).filter((c) => !c.part || c.part[0] === 1);

  return (
    <Drawer open={open} onClose={onClose} title="Contents" description={text.title}>
      <ol className="-mx-2">
        {entries.map((c, i) => {
          const parts = c.part?.[1] ?? 1;
          const active = current >= c.index && current < c.index + parts;
          return (
            <li key={c.index}>
              <button
                type="button"
                onClick={() => onChoose(c.index)}
                aria-current={active ? 'true' : undefined}
                className={cx(
                  'flex w-full items-baseline gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  active ? 'bg-accent-soft text-ink' : 'text-ink-soft hover:bg-surface hover:text-ink',
                )}
              >
                <span className="w-6 shrink-0 text-right text-xs font-bold text-ink-faint tabular-nums">{i + 1}</span>
                <span lang={text.lang} className="min-w-0 flex-1 truncate font-serif text-[16px]">
                  {c.title || `Chapter ${i + 1}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Drawer>
  );
}
