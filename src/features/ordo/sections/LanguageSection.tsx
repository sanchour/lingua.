import { BookCheck, Download, Languages, Plus } from 'lucide-react';
import { getLanguage, LANGUAGES } from '@/core/lang/languages';
import { LEVELS } from '@/core/lang/levels';
import type { Level } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { startAnotherLanguage, switchLanguage, updateLanguage, useLanguages } from '@/data/languages';
import type { LanguageProfile } from '@/data/types';
import { Badge, Button, Select } from '@/design/primitives';
import { formatBytes } from '@/lib/format';
import { installPack, useInstalledPacks, usePackJobs } from '@/services/packs/packs';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

const GOALS = [5, 10, 15, 20, 30, 45, 60];

export function LanguageSection({ active }: { active: LanguageProfile }) {
  const languages = useLanguages() ?? [];
  const packs = useInstalledPacks() ?? [];
  const jobs = usePackJobs((s) => s.jobs);
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
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sage-soft text-xs font-bold text-sage-text uppercase">{l.id}</span>
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
    </SettingsSection>
  );
}
