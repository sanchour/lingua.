import { Check, Download } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { FREQUENCY_MILESTONES, STARTER_THEMES } from '@/core/lang/starter';
import { starterKey, useFrequencyProgress, useStarterDecks, useStarterList } from '@/data/starter';
import type { StarterSpec } from '@/data/starter';
import { Button, Card } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { installPack, usePackJobs } from '@/services/packs/packs';
import { THEME_ICONS } from '../common/DeckIcon';

const short = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** The ready-made library: a path of frequency milestones and a shelf of themed sets. */
export function StarterLibrary({ lang, onOpen }: { lang: string; onOpen: (spec: StarterSpec) => void }) {
  const list = useStarterList(lang);
  const added = useStarterDecks(lang);
  const progress = useFrequencyProgress(lang, FREQUENCY_MILESTONES);
  const job = usePackJobs((s) => s.jobs[lang]);
  const name = getLanguage(lang)?.name ?? lang;

  if (list === undefined) return <div className="h-64" />;
  if (list === null) {
    return (
      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-ink-soft">
          Ready-made {name} decks come with the {name} dictionary{job ? ', which is being installed now.' : '.'}
        </p>
        {!job && (
          <Button variant="secondary" icon={Download} onClick={() => void installPack(lang)}>
            Install dictionary
          </Button>
        )}
      </Card>
    );
  }

  const milestones = FREQUENCY_MILESTONES.filter((_, i) => i === 0 || FREQUENCY_MILESTONES[i - 1] < list.lemmaFreq.length);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Most common words</h3>
        <p className="mb-4 text-sm text-ink-soft">Each step adds the next band, so you never see a word twice. The ring shows how many you already know.</p>
        <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ol className="relative flex min-w-max gap-2 sm:min-w-0 sm:justify-between">
            <span className="absolute top-8 right-8 left-8 h-px bg-line-strong" aria-hidden />
            {milestones.map((m) => {
              const deck = added?.get(starterKey({ kind: 'frequency', milestone: m }));
              const known = progress?.get(m) ?? 0;
              return (
                <li key={m} className="relative">
                  <button
                    type="button"
                    onClick={() => onOpen({ kind: 'frequency', milestone: m })}
                    className="no-callout group flex w-[76px] flex-col items-center gap-2 rounded-2xl pb-1 text-center transition-transform duration-150 active:scale-95"
                    aria-label={`Top ${m.toLocaleString('en')}: ${Math.round(known * 100)}% known${deck ? ', added' : ''}`}
                  >
                    <Medallion label={short(m)} value={known} added={Boolean(deck)} />
                    <span className="text-[12px] leading-tight font-semibold text-ink-soft group-hover:text-ink">Top {m.toLocaleString('en')}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Themes</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {STARTER_THEMES.filter((t) => list.themes[t.id]?.length).map((t) => {
            const Icon = THEME_ICONS[t.id];
            const deck = added?.get(starterKey({ kind: 'theme', id: t.id }));
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpen({ kind: 'theme', id: t.id })}
                className="no-callout group flex flex-col items-start gap-3 rounded-2xl border border-line/70 bg-surface p-4 text-left transition-[transform,border-color,background-color] duration-150 hover:border-line-strong hover:bg-raised active:scale-[0.98]"
              >
                <span className="flex w-full items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-sage-soft text-sage-text">
                    <Icon size={19} aria-hidden />
                  </span>
                  {deck && (
                    <span className="grid size-6 place-items-center rounded-full bg-sage text-bg" title="Added">
                      <Check size={14} strokeWidth={3} aria-label="Added" />
                    </span>
                  )}
                </span>
                <span>
                  <span className="block text-[15px] leading-tight font-semibold">{t.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-soft">{t.blurb}</span>
                </span>
                <span className="text-[12px] font-bold text-ink-faint">{list.themes[t.id].length} words</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A milestone: a soft ring that fills as the band's words become known. */
function Medallion({ label, value, added }: { label: string; value: number; added: boolean }) {
  const r = 27;
  const c = 2 * Math.PI * r;
  return (
    <span className={cx('relative grid size-16 place-items-center rounded-full bg-raised shadow-elev-1 transition-transform duration-200 group-hover:-translate-y-0.5', added && 'ring-2 ring-sage/60')}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        {value > 0 && (
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--sage)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, value)} ${c}`} />
        )}
      </svg>
      <span className="font-serif text-[17px] font-semibold tabular-nums">{label}</span>
      {added && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-sage text-bg">
          <Check size={12} strokeWidth={3} aria-hidden />
        </span>
      )}
    </span>
  );
}
