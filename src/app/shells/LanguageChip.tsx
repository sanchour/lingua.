import { useLocation, useNavigate } from 'react-router';
import { Check, ChevronsUpDown, Plus, Settings2 } from 'lucide-react';
import { useApp } from '@/app/context';
import { switchLanguageSmoothly } from '@/app/languageSwitch';
import { getLanguage } from '@/core/lang/languages';
import { getLevel } from '@/core/lang/levels';
import { startAnotherLanguage, useLanguages } from '@/data/languages';
import { LanguageFlag } from '@/design/flags';
import { MenuItem, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';

/** The language being studied. Opens a switcher with every language you study. */
export function LanguageChip({ compact = false, placement }: { compact?: boolean; placement?: 'bottom-start' | 'right-start' }) {
  const { language } = useApp();
  const languages = useLanguages() ?? [];
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const target = getLanguage(language.id);

  const choose = (id: string, close: () => void) => {
    close();
    if (id === language.id) return;
    // A book or deck belongs to one language: go back to its section's front page.
    const segments = pathname.split('/').filter(Boolean);
    void switchLanguageSmoothly(id, segments.length > 1 ? () => navigate(`/${segments[0]}`) : undefined);
  };

  return (
    <Popover
      label="Switch language"
      placement={placement ?? (compact ? 'right-start' : 'bottom-start')}
      className="w-72"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`Studying ${target?.name ?? language.id}. Switch language`}
          title={compact ? `${target?.endonym ?? language.id} · ${language.level}` : undefined}
          className={cx(
            'no-callout group flex items-center gap-2 rounded-xl border border-line/80 bg-raised text-left transition-[border-color,transform] duration-150 hover:border-line-strong active:scale-[0.98]',
            compact ? 'size-11 justify-center' : 'h-11 w-full px-3',
          )}
        >
          <LanguageFlag lang={language.id} chosen={language.flag} width={24} />
          {!compact && (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{target?.endonym ?? language.id}</span>
              <span className="text-xs font-bold text-ink-faint">{language.level}</span>
              <ChevronsUpDown size={14} className="-mr-0.5 text-ink-faint transition-colors group-hover:text-ink-soft" aria-hidden />
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <p className="px-3 pt-1.5 pb-1 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">Studying</p>
          <div role="radiogroup" aria-label="Language">
            {languages.map((l) => {
              const info = getLanguage(l.id);
              const active = l.id === language.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choose(l.id, close)}
                  className={cx('no-callout flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors', active ? 'bg-surface' : 'hover:bg-surface')}
                >
                  <LanguageFlag lang={l.id} chosen={l.flag} width={30} />
                  <span className="min-w-0 flex-1">
                    <span lang={l.id} className="block truncate font-serif text-[16px] leading-tight font-semibold">
                      {info?.endonym ?? l.id}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-soft">
                      {info?.name} · {l.level} {getLevel(l.level).name}
                    </span>
                  </span>
                  {active && <Check size={16} className="shrink-0 text-accent-text" aria-hidden />}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 space-y-0.5 border-t border-line pt-1.5">
            <MenuItem
              icon={Plus}
              label="Add a language"
              onClick={() => {
                close();
                void startAnotherLanguage();
              }}
            />
            <MenuItem
              icon={Settings2}
              label="Language settings"
              onClick={() => {
                close();
                navigate('/ordo/languages');
              }}
            />
          </div>
        </div>
      )}
    </Popover>
  );
}
