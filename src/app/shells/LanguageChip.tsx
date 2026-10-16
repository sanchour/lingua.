import { useNavigate } from 'react-router';
import { ChevronRight, Languages } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { getLevel } from '@/core/lang/levels';
import { Badge, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';

/** Shows the language being studied; its details are tucked in a popover. */
export function LanguageChip({ compact = false }: { compact?: boolean }) {
  const { language } = useApp();
  const navigate = useNavigate();
  const target = getLanguage(language.id);
  const native = getLanguage(language.native);

  return (
    <Popover
      label="Current language"
      placement={compact ? 'right-start' : 'bottom-start'}
      trigger={(props) => (
        <button
          {...props}
          type="button"
          title={compact ? `${target?.endonym ?? language.id} · ${language.level}` : undefined}
          className={cx(
            'no-callout flex items-center gap-2 rounded-xl border border-line/80 bg-raised text-left transition-colors hover:border-line-strong',
            compact ? 'size-11 justify-center' : 'h-11 w-full px-3',
          )}
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sage-soft text-[11px] font-bold text-sage-text uppercase">
            {language.id}
          </span>
          {!compact && (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{target?.endonym ?? language.id}</span>
              <span className="text-xs font-bold text-ink-faint">{language.level}</span>
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="w-64 p-2">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sage-soft text-sage-text">
              <Languages size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="font-serif text-lg leading-tight font-semibold">{target?.endonym}</div>
              <div className="text-[13px] text-ink-soft">
                {target?.name} from {native?.name ?? language.native}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="accent">
              {language.level} · {getLevel(language.level).name}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => {
              close();
              navigate('/ordo#language');
            }}
            className="mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
          >
            Language settings
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </Popover>
  );
}
