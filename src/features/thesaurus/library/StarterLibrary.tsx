import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Download } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { STARTER_THEMES } from '@/core/lang/starter';
import { starterKey, useStarterDecks, useStarterList } from '@/data/starter';
import type { StarterSpec } from '@/data/starter';
import { Button, Card } from '@/design/primitives';
import { spring } from '@/design/motion';
import { installPack, usePackJobs } from '@/services/packs/packs';
import { THEME_HUES, THEME_ICONS } from '../common/DeckIcon';

/** A few words from across the set, as a taste of it. */
const samples = (rows: Array<[string, string, string, string]>) => [0, Math.floor(rows.length / 3), Math.floor((rows.length * 2) / 3)].map((i) => rows[i]?.[0]).filter((w, i, all) => w && all.indexOf(w) === i);

/** The ready-made library: a shelf of themed sets (the frequency path is under My decks). */
export function StarterLibrary({ lang, onOpen }: { lang: string; onOpen: (spec: StarterSpec) => void }) {
  const list = useStarterList(lang);
  const added = useStarterDecks(lang);
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Themes</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {STARTER_THEMES.filter((t) => list.themes[t.id]?.length).map((t, i) => {
            const Icon = THEME_ICONS[t.id];
            const deck = added?.get(starterKey({ kind: 'theme', id: t.id }));
            const rows = list.themes[t.id];
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => onOpen({ kind: 'theme', id: t.id })}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: Math.min(i, 10) * 0.03 }}
                style={{ '--hue': THEME_HUES[t.id] ?? 'var(--sage)' } as CSSProperties}
                className="no-callout group relative flex min-w-0 flex-col items-start gap-3 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--hue)_24%,var(--line))] bg-[color-mix(in_oklab,var(--hue)_10%,var(--surface))] p-3.5 sm:p-4 text-left transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--hue)_42%,var(--line))] hover:shadow-elev-2 active:translate-y-0 active:scale-[0.98]"
              >
                {/* The theme's glyph again, large and faint, tucked into the corner. */}
                <Icon
                  aria-hidden
                  size={96}
                  strokeWidth={1.4}
                  className="pointer-events-none absolute -right-5 -bottom-6 rotate-[-12deg] text-[var(--hue)] opacity-[0.13] transition-transform duration-300 group-hover:rotate-[-4deg] group-hover:scale-105"
                />
                <span className="flex w-full items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--hue)_20%,transparent)] text-[color-mix(in_oklab,var(--hue)_68%,var(--ink))] transition-transform duration-200 group-hover:-rotate-6">
                    <Icon size={19} aria-hidden />
                  </span>
                  {deck && (
                    <span className="flex items-center gap-1 rounded-full bg-sage px-2 py-0.5 text-[11.5px] font-bold text-bg">
                      <Check size={12} strokeWidth={3} aria-hidden /> Added
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-serif text-[17px] leading-tight font-semibold">{t.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-soft">{t.blurb}</span>
                </span>
                <span className="flex max-w-full flex-wrap gap-1" lang={lang}>
                  {samples(rows).map((w) => (
                    <span key={w} className="max-w-full truncate rounded-full bg-raised/70 px-2 py-0.5 font-serif text-[12.5px] text-ink-soft">
                      {w}
                    </span>
                  ))}
                </span>
                <span className="mt-auto flex w-full items-center justify-between text-[12px] font-bold text-ink-faint">
                  {rows.length} words
                  <ArrowRight size={14} aria-hidden className="text-[color-mix(in_oklab,var(--hue)_68%,var(--ink))] opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
