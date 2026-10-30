import { UiText, useUi } from '@/design/i18n/UiText';
import { useCallback, useEffect, useState } from 'react';
import { HardDrive, ShieldCheck } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { Badge, Button } from '@/design/primitives';
import { getStorageInfo, requestPersistence } from '@/services/storage/persist';
import type { StorageInfo } from '@/services/storage/persist';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

export function StorageSection() {
  const translateUi = useUi();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const refresh = useCallback(() => void getStorageInfo().then(setInfo), []);
  useEffect(refresh, [refresh]);

  const share = info && info.quota ? Math.min(1, info.usage / info.quota) : 0;

  return (
    <SettingsSection id="storage" icon={HardDrive} title={translateUi('Storage')} description={translateUi('Everything lives on this device. Nothing is uploaded.')}>
      {info && !info.supported ? (
        <p className="text-sm text-ink-soft"><UiText source={'This browser does not report storage usage.'} /></p>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold"><UiText source={'{0} used'} values={[info ? formatBytes(info.usage) : '…']} /></span>
              <span className="text-ink-soft">{info ? translateUi('{0} available', [formatBytes(info.quota)]) : ''}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label={translateUi('Storage used')}>
              <div className="h-full origin-left rounded-full bg-sage transition-transform duration-500" style={{ transform: `scaleX(${Math.max(share, 0.01)})` }} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {info?.persisted ? (
              <Badge tone="sage"><UiText source={'{0} Protected from automatic clean-up'} values={[<ShieldCheck size={13} aria-hidden />]} /></Badge>
            ) : (
              <>
                <Badge><UiText source={'Not yet protected'} /></Badge>
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
                ><UiText source={'Protect my data'} /></Button>
              </>
            )}
          </div>
        </>
      )}
    </SettingsSection>
  );
}
