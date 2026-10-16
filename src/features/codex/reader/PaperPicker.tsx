import { patchSetting } from '@/data/settings';
import type { Settings, Theme } from '@/data/settings';
import { DARK_PAPERS, LIGHT_PAPERS } from '@/design/papers';
import type { Paper } from '@/design/papers';
import { cx } from '@/lib/cx';

interface PaperPickerProps {
  reader: Settings['reader'];
  /** Which set to show: day papers (Paper) or night papers (Nocturne). */
  theme: Theme;
  /** Names under the swatches (settings page); the reader's panel shows them on hover only. */
  labelled?: boolean;
}

/** Reading paper swatches: little pages in their own colours. */
export function PaperPicker({ reader, theme, labelled = false }: PaperPickerProps) {
  const day = theme === 'paper';
  const papers: Paper[] = day ? LIGHT_PAPERS : DARK_PAPERS;
  const selected = day ? reader.paperLight : reader.paperDark;
  return (
    <div role="radiogroup" aria-label={day ? 'Day paper' : 'Night paper'} className={cx('grid grid-cols-7', labelled ? 'gap-2' : 'gap-1.5')}>
      {papers.map((p) => {
        const on = p.id === selected;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={p.label}
            title={p.label}
            onClick={() => void patchSetting('reader', day ? { paperLight: p.id as Settings['reader']['paperLight'] } : { paperDark: p.id as Settings['reader']['paperDark'] })}
            className="no-callout group flex min-w-0 flex-col items-center gap-1"
          >
            <span
              className={cx(
                'grid aspect-[4/5] w-full place-items-center rounded-lg border font-serif text-[13px] font-semibold transition-[transform,box-shadow] duration-150 group-active:scale-90',
                on ? 'shadow-elev-1 ring-2 ring-accent ring-offset-2 ring-offset-raised' : 'group-hover:-translate-y-0.5',
              )}
              style={{ background: p.vars.bg, color: p.vars.ink, borderColor: p.vars['line-strong'] }}
            >
              Aa
            </span>
            {labelled && <span className={cx('w-full truncate text-center text-[11px] font-semibold', on ? 'text-ink' : 'text-ink-faint')}>{p.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
