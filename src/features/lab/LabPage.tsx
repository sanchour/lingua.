import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Activity, ClipboardCopy, Cpu, LayoutGrid, PenLine, Puzzle, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BackLink } from '@/app/BackLink';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { planOf } from '@/data/plan';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { AudioTest } from './AudioTest';
import { useDevLab } from './devLab';
import { DesignNotesCard } from './DesignNotesCard';
import { useDesignNotes } from './designNotes/notes';
import { FlagsCard } from './FlagsCard';
import { PretendCard } from './PretendCard';
import { EnvironmentCard, LongPressCard, ShareCard, SheetCard, StorageCard, WordsCard } from './LabTests';
import { CachesCard, FirstStepsCard, LayoutCard, LookCard, ReplayCard, ToastsCard } from './LabTools';
import { useLabReport } from './report';
import { SmoothnessTest } from './SmoothnessTest';

type Tab = 'notes' | 'flows' | 'look' | 'layout' | 'pieces' | 'device';

const TABS: Array<{ id: Tab; name: string; icon: LucideIcon; what: string }> = [
  { id: 'notes', name: 'Design notes', icon: PenLine, what: 'Pin notes to the page for Claude' },
  { id: 'flows', name: 'Flows', icon: Workflow, what: 'Replay the first start, pretend a plan' },
  { id: 'look', name: 'Look', icon: Puzzle, what: 'Light, palettes, motion' },
  { id: 'layout', name: 'Layout', icon: LayoutGrid, what: 'Grid, outlines, check sizes' },
  { id: 'pieces', name: 'Pieces', icon: Activity, what: 'Toasts, drawers, words, flags, sound' },
  { id: 'device', name: 'Device and data', icon: Cpu, what: 'This device, storage, caches, smoothness' },
];

/**
 * Settings › Developer › Device lab (restructured in 7-0d): a developer's tool for checking Lingua, in six parts with
 * a rail to move between them and a strip of what is on now. Everything here is for this session only, except the
 * look and the plan pretended, which are the real settings.
 */
export default function LabPage() {
  const translateUi = useUi();
  const { settings, language } = useApp();
  const results = useLabReport((s) => s.results);
  const notes = useDesignNotes((s) => s.notes);
  const { grid, outlines } = useDevLab();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'notes') as Tab;
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  const copyReport = async () => {
    const report = JSON.stringify({ app: 'lingua', version: __APP_VERSION__, at: new Date().toISOString(), status: Object.fromEntries(status), ...results }, null, 2);
    try {
      await navigator.clipboard.writeText(report);
      toast('Report copied. Paste it into the chat.', { tone: 'success' });
    } catch {
      setFallbackText(report);
    }
  };

  const status: Array<[string, string]> = [
    ['Version', __APP_VERSION__],
    ['Build', import.meta.env.DEV ? 'Dev server' : 'Production'],
    ['Studying', getLanguage(language.id)?.name ?? language.id],
    ['Plan', planOf(settings.meta)],
    ['Light', `${settings.theme === 'system' ? 'device' : settings.theme} · ${settings.palette.paper} / ${settings.palette.nocturne}`],
    ['On now', [settings.ui.designNotes && 'notes', grid && 'grid', outlines && 'outlines', settings.ui.perfHud && 'fps'].filter(Boolean).join(', ') || 'nothing'],
  ];

  return (
    <>
      <BackLink to="/settings/developer"><UiText source={'Developer'} /></BackLink>
      <PageHeader
        title={translateUi('Device lab')} englishTitle={'Device lab'}
        eyebrow={translateUi('Developer')} englishEyebrow={'Developer'}
        actions={
          <Button variant="secondary" icon={ClipboardCopy} onClick={() => void copyReport()}><UiText source={'Copy report'} /></Button>
        }
      />
      <dl className="mb-6 flex flex-wrap gap-x-6 gap-y-1 rounded-2xl border border-line bg-sunken/50 px-4 py-2.5 font-mono text-[12px]">
        {status.map(([k, v]) => (
          <div key={k} className="flex gap-1.5">
            <dt className="text-ink-faint">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-8">
        <nav aria-label={translateUi('Lab')} className="sticky top-6 space-y-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => setParams({ tab: t.id }, { replace: true })}
                className={cx('flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors', on ? 'bg-raised shadow-elev-1' : 'hover:bg-surface')}
              >
                <Icon size={17} className={cx('mt-0.5 shrink-0', on ? 'text-accent-text' : 'text-ink-faint')} aria-hidden />
                <span className="min-w-0">
                  <span className={cx('flex items-center gap-1.5 text-[14px] font-semibold', !on && 'text-ink-soft')}>
                    {t.name}
                    {t.id === 'notes' && notes.length > 0 && <span className="rounded-full bg-accent-soft px-1.5 text-[11px] text-accent-text tabular-nums">{notes.length}</span>}
                  </span>
                  <span className="block text-[12px] leading-snug text-ink-faint">{t.what}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {tab === 'notes' && <DesignNotesCard on={settings.ui.designNotes} />}
          {tab === 'flows' && (
            <>
              <ReplayCard />
              <div className="grid content-start gap-4">
                <PretendCard />
                <FirstStepsCard />
              </div>
            </>
          )}
          {tab === 'look' && <LookCard />}
          {tab === 'layout' && <LayoutCard />}
          {tab === 'pieces' && (
            <>
              <ToastsCard />
              <SheetCard />
              <LongPressCard />
              <WordsCard lang={language.id} />
              <AudioTest />
              <FlagsCard />
            </>
          )}
          {tab === 'device' && (
            <>
              <EnvironmentCard />
              <StorageCard />
              <CachesCard />
              <SmoothnessTest perfHud={settings.ui.perfHud} />
              <ShareCard />
            </>
          )}
        </div>
      </div>
      {fallbackText && (
        <textarea
          readOnly
          value={fallbackText}
          rows={10}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-4 w-full rounded-xl border border-line bg-raised p-3 font-mono text-xs"
          aria-label={translateUi('Device report')}
        />
      )}
    </>
  );
}
