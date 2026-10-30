import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { BookCheck, Download, Languages, Plus, Trash2 } from 'lucide-react';
import { ENJOYMENTS } from '@/app/onboarding/EnjoyStep';
import { AVAILABLE_LANGUAGES, BETA_INCLUDES, getLanguage } from '@/core/lang/languages';
import { LEVELS } from '@/core/lang/levels';
import type { Level } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { startAnotherLanguage, switchLanguage, updateLanguage, useLanguages } from '@/data/languages';
import { removeLanguage } from '@/data/removeLanguage';
import { setSetting, useSettings } from '@/data/settings';
import type { LanguageProfile } from '@/data/types';
import { Flag, flagFor, flagName, LanguageFlag } from '@/design/flags';
import { Badge, Button, Dialog, IconButton, Select } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { formatBytes } from '@/lib/format';
import { installPack, useInstalledPacks, usePackJobs } from '@/services/packs/packs';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';
import { VoicePanel } from './VoicePanel';
import { codexGoal } from '@/features/codex/reader/readingGoal';

const GOALS = [5, 10, 15, 20, 30, 45, 60];

export function LanguageSection({ active }: { active: LanguageProfile }) {
  const translateUi = useUi();
  const languages = useLanguages() ?? [];
  const packs = useInstalledPacks() ?? [];
  const jobs = usePackJobs((s) => s.jobs);
  const settings = useSettings();
  const learner = settings?.learner ?? { reasons: [], enjoys: [] };
  const toggleEnjoy = (id: (typeof ENJOYMENTS)[number]['id']) =>
    void setSetting('learner', { ...learner, enjoys: learner.enjoys.includes(id) ? learner.enjoys.filter((e) => e !== id) : [...learner.enjoys, id] });
  const target = getLanguage(active.id);
  const [removing, setRemoving] = useState<LanguageProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const remove = async (l: LanguageProfile) => {
    setBusy(true);
    try {
      await removeLanguage(l.id);
      toast({ source: '{0} removed, with everything learnt in it.', values: [String(getLanguage(l.id)?.name ?? l.id)] });
      setRemoving(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The language couldn’t be removed.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection id="language" icon={Languages} title={translateUi('Languages')} description={translateUi('Each language keeps its own words, decks and progress.')}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label={translateUi('Level in {0}', [target?.name ?? active.id])}
          value={active.level}
          onChange={(level: Level) => void updateLanguage(active.id, { level })}
          options={LEVELS.map((l) => ({ value: l.id, label: `${l.id} · ${l.name}` }))}
        />
        <Select
          label={translateUi('Daily goal')}
          value={String(active.dailyGoal.readMinutes)}
          onChange={(v) => void updateLanguage(active.id, { dailyGoal: { ...active.dailyGoal, readMinutes: Number(v) } })}
          options={GOALS.map((m) => ({ value: String(m), label: `${m} minutes` }))}
        />
        <Select
          label={translateUi('Reading goal in Codex')}
          value={String(codexGoal(active))}
          onChange={(v) => void updateLanguage(active.id, { dailyGoal: { ...active.dailyGoal, codexMinutes: Number(v) } })}
          options={GOALS.map((m) => ({ value: String(m), label: `${m} minutes` }))}
        />
        <Select
          label={translateUi('I already speak')}
          value={active.native}
          onChange={(native) => void updateLanguage(active.id, { native })}
          options={AVAILABLE_LANGUAGES.filter((l) => l.code !== active.id).map((l) => ({ value: l.code, label: `${l.name} · ${l.endonym}` }))}
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
                <span className="flex items-center gap-2 font-semibold">
                  {info?.endonym ?? l.id}
                  {info?.tier === 3 && (
                    <span title={BETA_INCLUDES}>
                      <Badge><UiText source={'Beta'} /></Badge>
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                  {l.level}
                  <span aria-hidden>·</span>
                  {job ? (
                    translateUi('Installing dictionary…')
                  ) : pack ? (
                    <><UiText source={'{0} Offline dictionary · {1}'} values={[<BookCheck size={13} className="text-sage-text" aria-hidden />, formatBytes(pack.sizeBytes)]} /></>
                  ) : (
                    translateUi('No offline dictionary yet')
                  )}
                </span>
              </span>
              {!pack && !job && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => void installPack(l.id).catch(() => toast('The dictionary couldn’t be installed. Check your connection.', { tone: 'error' }))}
                ><UiText source={'Install'} /></Button>
              )}
              {l.isActive === 1 ? (
                <Badge tone="accent"><UiText source={'Studying'} /></Badge>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await switchLanguage(l.id);
                    toast({ source: 'Now studying {0}.', values: [{ source: info?.name ?? l.id }] });
                  }}
                ><UiText source={'Switch'} /></Button>
              )}
              {languages.length > 1 && <IconButton icon={Trash2} label={translateUi('Remove {0}', [info?.name ?? l.id])} onClick={() => setRemoving(l)} />}
            </li>
          );
        })}
      </ul>
      {languages.some((l) => getLanguage(l.id)?.tier === 3) && <p data-hint="" className="mt-2 px-1 text-[13px] leading-snug text-ink-soft">{BETA_INCLUDES}</p>}
      <Button variant="ghost" icon={Plus} className="mt-3" onClick={() => void startAnotherLanguage()}><UiText source={'Learn another language'} /></Button>
      <Dialog
        open={removing !== null}
        onClose={() => !busy && setRemoving(null)}
        title={translateUi('Remove {0}?', [getLanguage(removing?.id ?? '')?.name ?? ''])}
        actions={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setRemoving(null)}><UiText source={'Keep it'} /></Button>
            <Button variant="danger" icon={Trash2} disabled={busy} onClick={() => removing && void remove(removing)}>
              {busy ? translateUi('Removing…') : translateUi('Remove')}
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink-soft"><UiText source={'Its texts, words, decks and cards, audio and audiobooks, songs, journal, progress and offline dictionary are deleted from this device, and the room they took is freed. Your other languages stay. This can’t be undone; add the language again any time to start afresh.'} /></p>
      </Dialog>

      {(target?.flags.length ?? 0) > 1 && (
        <div className="mt-6">
          <p className="text-[14px] font-semibold"><UiText source={'Flag for {0}'} values={[target?.name]} /></p>
          <p data-hint="" className="mt-0.5 mb-3 text-[13px] text-ink-soft"><UiText source={'The flag shown beside {0} throughout Lingua.'} values={[target?.name]} /></p>
          <div role="radiogroup" aria-label={translateUi('Flag for {0}', [target?.name])} className="flex flex-wrap gap-2">
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

      <VoicePanel active={active} />

      <div className="mt-6">
        <p className="text-[14px] font-semibold"><UiText source={'What you enjoy most'} /></p>
        <p data-hint="" className="mt-0.5 mb-3 text-[13px] text-ink-soft"><UiText source={'Home suggests these first, in the order you pick them.'} /></p>
        <div role="group" aria-label={translateUi('What you enjoy most')} className="flex flex-wrap gap-2">
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
