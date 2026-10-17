import { BookCheck, Download, Languages, Plus } from 'lucide-react';
import { ENJOYMENTS } from '@/app/onboarding/EnjoyStep';
import { getLanguage, LANGUAGES } from '@/core/lang/languages';
import { LEVELS } from '@/core/lang/levels';
import type { Level } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { startAnotherLanguage, switchLanguage, updateLanguage, useLanguages } from '@/data/languages';
import { setSetting, useSettings } from '@/data/settings';
import type { LanguageProfile } from '@/data/types';
import { Flag, flagFor, flagName, LanguageFlag } from '@/design/flags';
import { Badge, Button, Select } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { formatBytes } from '@/lib/format';
import { installPack, useInstalledPacks, usePackJobs } from '@/services/packs/packs';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

const GOALS = [5, 10, 15, 20, 30, 45, 60];

export function LanguageSection({ active }: { active: LanguageProfile }) {
  const languages = useLanguages() ?? [];
  const packs = useInstalledPacks() ?? [];
  const jobs = usePackJobs((s) => s.jobs);
  const settings = useSettings();
  const learner = settings?.learner ?? { reasons: [], enjoys: [] };
  const toggleEnjoy = (id: (typeof ENJOYMENTS)[number]['id']) =>
    void setSetting('learner', { ...learner, enjoys: learner.enjoys.includes(id) ? learner.enjoys.filter((e) => e !== id) : [...learner.enjoys, id] });
  const target = getLanguage(active.id);

  return (
    <SettingsSection id="language" icon={Languages} title="Languages" description="Each language keeps its own words, decks and progress.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label={`Level in ${target?.name ?? active.id}`}
          value={active.level}
          onChange={(level: Level) => void updateLanguage(active.id, { level })}
          options={LEVELS.map((l) => ({ value: l.id, label: `${l.id} · ${l.name}` }))}
        />
        <Select
          label="Daily goal"
          value={String(active.dailyGoal.readMinutes)}
          onChange={(v) => void updateLanguage(active.id, { dailyGoal: { ...active.dailyGoal, readMinutes: Number(v) } })}
          options={GOALS.map((m) => ({ value: String(m), label: `${m} minutes` }))}
        />
        <Select
          label="I already speak"
          value={active.native}
          onChange={(native) => void updateLanguage(active.id, { native })}
          options={LANGUAGES.filter((l) => l.code !== active.id).map((l) => ({ value: l.code, label: `${l.name} · ${l.endonym}` }))}
        />
      </div>

      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-raised">
        {languages.map((l) => {
          const info = getLanguage(l.id);
          const pack = packs.find((p) => p.id === packId(l.id));
          const job = jobs[l.id];
          return (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <LanguageFlag lang={l.id} chosen={l.flag} width={36} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{info?.endonym ?? l.id}</span>
                <span className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                  {l.level}
                  <span aria-hidden>·</span>
                  {job ? (
                    'Installing dictionary…'
                  ) : pack ? (
                    <>
                      <BookCheck size={13} className="text-sage-text" aria-hidden /> Offline dictionary · {formatBytes(pack.sizeBytes)}
                    </>
                  ) : (
                    'No offline dictionary yet'
                  )}
                </span>
              </span>
              {!pack && !job && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => void installPack(l.id).catch(() => toast('The dictionary couldn’t be installed. Check your connection.', { tone: 'error' }))}
                >
                  Install
                </Button>
              )}
              {l.isActive === 1 ? (
                <Badge tone="accent">Studying</Badge>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await switchLanguage(l.id);
                    toast(`Now studying ${info?.name ?? l.id}.`);
                  }}
                >
                  Switch
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <Button variant="ghost" icon={Plus} className="mt-3" onClick={() => void startAnotherLanguage()}>
        Learn another language
      </Button>

      {(target?.flags.length ?? 0) > 1 && (
        <div className="mt-6">
          <p className="text-[14px] font-semibold">Flag for {target?.name}</p>
          <p className="mt-0.5 mb-3 text-[13px] text-ink-soft">The flag shown beside {target?.name} throughout Lingua.</p>
          <div role="radiogroup" aria-label={`Flag for ${target?.name}`} className="flex flex-wrap gap-2">
            {target?.flags.map((code) => {
              const chosen = flagFor(active.id, active.flag) === code;
              return (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => void updateLanguage(active.id, { flag: code })}
                  className={cx(
                    'no-callout inline-flex h-11 items-center gap-2.5 rounded-xl border px-3 text-[14px] font-semibold transition-[transform,background-color,border-color] duration-150 active:scale-[0.97]',
                    chosen ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink hover:border-line-strong',
                  )}
                >
                  <Flag code={code} width={27} />
                  {flagName(code)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-[14px] font-semibold">What you enjoy most</p>
        <p className="mt-0.5 mb-3 text-[13px] text-ink-soft">Home suggests these first, in the order you pick them.</p>
        <div role="group" aria-label="What you enjoy most" className="flex flex-wrap gap-2">
          {ENJOYMENTS.map((e) => {
            const rank = learner.enjoys.indexOf(e.id);
            return (
              <button
                key={e.id}
                type="button"
                aria-pressed={rank >= 0}
                onClick={() => toggleEnjoy(e.id)}
                className={cx(
                  'no-callout inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-[transform,background-color,border-color] duration-150 active:scale-[0.97]',
                  rank >= 0 ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink hover:border-line-strong',
                )}
              >
                {rank >= 0 ? (
                  <span className="grid size-5 place-items-center rounded-full bg-accent-fill text-[11px] font-bold text-on-accent tabular-nums">{rank + 1}</span>
                ) : (
                  <e.icon size={16} aria-hidden />
                )}
                {e.name}
              </button>
            );
          })}
        </div>
      </div>
    </SettingsSection>
  );
}
