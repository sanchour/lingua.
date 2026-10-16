import { useCallback, useEffect, useState } from 'react';
import { HardDrive, ShieldCheck } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { Badge, Button } from '@/design/primitives';
import { getStorageInfo, requestPersistence } from '@/services/storage/persist';
import type { StorageInfo } from '@/services/storage/persist';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

export function StorageSection() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const refresh = useCallback(() => void getStorageInfo().then(setInfo), []);
  useEffect(refresh, [refresh]);

  const share = info && info.quota ? Math.min(1, info.usage / info.quota) : 0;

  return (
    <SettingsSection id="storage" icon={HardDrive} title="Storage" description="Everything lives on this device. Nothing is uploaded.">
      {info && !info.supported ? (
        <p className="text-sm text-ink-soft">This browser does not report storage usage.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">{info ? formatBytes(info.usage) : '…'} used</span>
            <span className="text-ink-soft">{info ? `${formatBytes(info.quota)} available` : ''}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label="Storage used">
            <div className="h-full origin-left rounded-full bg-sage transition-transform duration-500" style={{ transform: `scaleX(${Math.max(share, 0.01)})` }} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {info?.persisted ? (
              <Badge tone="sage">
                <ShieldCheck size={13} aria-hidden /> Protected from automatic clean-up
              </Badge>
            ) : (
              <>
                <Badge>Not yet protected</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ShieldCheck}
                  onClick={async () => {
                    const granted = await requestPersistence();
                    toast(
                      granted
                        ? 'Storage is now protected.'
                        : 'The browser declined for now. Installing Lingua to your home screen or desktop usually grants it.',
                      { tone: granted ? 'success' : 'default' },
                    );
                    refresh();
                  }}
                >
                  Protect my data
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </SettingsSection>
  );
}
