import { useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { BackLink } from '@/app/BackLink';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { Button } from '@/design/primitives';
import { toast } from '@/state/ui';
import { AudioTest } from './AudioTest';
import { FlagsCard } from './FlagsCard';
import { EnvironmentCard, LongPressCard, ShareCard, SheetCard, StorageCard, WordsCard } from './LabTests';
import { useLabReport } from './report';
import { SmoothnessTest } from './SmoothnessTest';

export default function LabPage() {
  const { settings, language } = useApp();
  const results = useLabReport((s) => s.results);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  const copyReport = async () => {
    const report = JSON.stringify({ app: 'lingua', version: __APP_VERSION__, at: new Date().toISOString(), ...results }, null, 2);
    try {
      await navigator.clipboard.writeText(report);
      toast('Report copied. Paste it into the chat.', { tone: 'success' });
    } catch {
      setFallbackText(report);
    }
  };

  return (
    <>
      <BackLink to="/ordo/about">About and more</BackLink>
      <PageHeader
        title="Device lab"
        eyebrow="Ordo"
        actions={
          <Button variant="secondary" icon={ClipboardCopy} onClick={() => void copyReport()}>
            Copy report
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <EnvironmentCard />
        <AudioTest />
        <SmoothnessTest perfHud={settings.ui.perfHud} />
        <WordsCard lang={language.id} />
        <LongPressCard />
        <SheetCard />
        <StorageCard />
        <ShareCard />
        <FlagsCard />
      </div>
      {fallbackText && (
        <textarea
          readOnly
          value={fallbackText}
          rows={10}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-4 w-full rounded-xl border border-line bg-raised p-3 font-mono text-xs"
          aria-label="Device report"
        />
      )}
    </>
  );
}
