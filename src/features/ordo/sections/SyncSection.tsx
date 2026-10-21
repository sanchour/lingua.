import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, MonitorSmartphone, QrCode, RefreshCw, ScanLine, Smartphone, Trash2 } from 'lucide-react';
import { renderSVG } from 'uqr';
import { patchSetting } from '@/data/settings';
import type { PairedDevice, Settings } from '@/data/settings';
import { Button, Dialog, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { formatDateTime } from '@/lib/format';
import { cancelPairing, forgetDevice, joinCode, showCode, syncAll, syncWith, useSyncStore } from '@/services/sync/engine';
import { qrText, readCode, showCode as groupCode } from '@/services/sync/protocol';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

/** Settings › Your data › Your devices: pair the desktop app and the phone once; they sync when both are open. */
export function SyncSection({ sync }: { sync: Settings['sync'] }) {
  const pairs = useSyncStore((s) => s.pairs);
  const [pairing, setPairing] = useState(false);
  const [busy, setBusy] = useState(false);

  const syncNow = async () => {
    setBusy(true);
    const reached = await syncAll();
    setBusy(false);
    toast(reached ? `Synced with ${reached === 1 ? 'your other device' : `${reached} devices`}.` : 'Your other device isn’t open right now. Open Lingua on it and try again.', { tone: reached ? 'success' : 'default' });
  };

  return (
    <SettingsSection
      id="sync"
      icon={MonitorSmartphone}
      title="Your devices"
      description="Keep the desktop app and your phone in step: pair them once, and they sync whenever both are open. No account: your words, cards and progress go straight from one device to the other."
    >
      {sync.devices.length > 0 && (
        <ul className="mb-4 divide-y divide-line rounded-2xl border border-line bg-raised">
          {sync.devices.map((d) => (
            <DeviceRow key={d.secret} device={d} state={pairs[d.secret]} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {sync.devices.length > 0 && (
          <Button icon={RefreshCw} loading={busy} onClick={() => void syncNow()}>
            Sync now
          </Button>
        )}
        <Button variant={sync.devices.length ? 'secondary' : 'primary'} icon={QrCode} onClick={() => setPairing(true)}>
          Pair a device
        </Button>
      </div>
      <div className="mt-4">
        <ToggleRow
          title="Send API keys too"
          description="Off by default: your Groq and Gemini keys stay on the device you typed them on."
          checked={sync.includeApiKeys}
          onChange={(on: boolean) => void patchSetting('sync', { includeApiKeys: on })}
        />
      </div>
      <PairDialog
        open={pairing}
        onClose={() => {
          setPairing(false);
          cancelPairing();
        }}
      />
    </SettingsSection>
  );
}

/** "just now", "12 min ago", "3 h ago", else the date: short enough for a phone's row. */
function syncedAgo(at: number): string {
  const min = Math.round((Date.now() - at) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`;
  return formatDateTime(at);
}

function DeviceRow({ device, state }: { device: PairedDevice; state?: { status: string; message?: string } }) {
  const [asking, setAsking] = useState(false);
  const line =
    state?.status === 'syncing'
      ? 'Syncing…'
      : state?.status === 'error'
        ? (state.message ?? 'The last sync failed.')
        : device.lastSyncAt
          ? `Synced ${syncedAgo(device.lastSyncAt)}`
          : 'Not synced yet';
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-ink-soft">
        <Smartphone size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{device.name}</span>
        <span className={cx('block truncate text-[13px]', state?.status === 'error' ? 'text-accent-text' : 'text-ink-soft')}>{line}</span>
      </span>
      <button
        type="button"
        aria-label={`Sync with ${device.name}`}
        disabled={state?.status === 'syncing'}
        onClick={() => void syncWith(device).then((r) => !r && toast(`${device.name} isn’t open right now.`))}
        className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink disabled:opacity-50"
      >
        {state?.status === 'syncing' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <RefreshCw size={18} aria-hidden />}
      </button>
      <button type="button" aria-label={`Forget ${device.name}`} onClick={() => setAsking(true)} className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink">
        <Trash2 size={18} aria-hidden />
      </button>
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        title={`Forget ${device.name}?`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Keep it
            </Button>
            <Button
              onClick={() => {
                void forgetDevice(device.secret);
                setAsking(false);
              }}
            >
              Forget
            </Button>
          </>
        }
      >
        <p className="text-ink-soft">They stop syncing. Nothing is deleted on either device; pair them again any time.</p>
      </Dialog>
    </li>
  );
}

function PairDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'choose' | 'show' | 'join'>('choose');
  useEffect(() => {
    if (open) setMode('choose');
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title="Pair a device">
      {mode === 'choose' && (
        <div className="space-y-2">
          <p className="mb-3 text-[14px] text-ink-soft">Open Lingua on both devices. One shows a code; the other scans it or types it in.</p>
          <ChoiceButton icon={QrCode} title="Show a code here" text="Then scan it with the other device." onClick={() => setMode('show')} />
          <ChoiceButton icon={ScanLine} title="Scan or type a code" text="The other device is showing one." onClick={() => setMode('join')} />
        </div>
      )}
      {mode === 'show' && <ShowCode onClose={onClose} />}
      {mode === 'join' && <JoinCode onClose={onClose} />}
    </Dialog>
  );
}

function ChoiceButton({ icon: Icon, title, text, onClick }: { icon: typeof QrCode; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-raised p-4 text-left transition-colors hover:border-line-strong">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
        <Icon size={20} aria-hidden />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-[13px] text-ink-soft">{text}</span>
      </span>
    </button>
  );
}

function ShowCode({ onClose }: { onClose: () => void }) {
  const showing = useSyncStore((s) => s.showing);
  useEffect(() => {
    void showCode();
  }, []);
  const svg = useMemo(() => (showing ? renderSVG(qrText(showing.secret), { pixelSize: 6, border: 2, blackColor: '#1d1a17', whiteColor: '#ffffff' }) : ''), [showing?.secret]);
  if (!showing) return null;
  if (showing.status === 'done') return <Done partner={showing.partner} onClose={onClose} />;
  return (
    <div className="text-center">
      <div className="mx-auto w-56 overflow-hidden rounded-2xl bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" aria-label="Pairing QR code" role="img" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-4 font-mono text-[20px] font-semibold tracking-wider select-all">{groupCode(showing.secret)}</p>
      <p className={cx('mt-3 flex items-center justify-center gap-2 text-[14px]', showing.status === 'error' ? 'text-accent-text' : 'text-ink-soft')}>
        {showing.status !== 'error' && <Loader2 size={15} className="animate-spin" aria-hidden />}
        {showing.status === 'starting' ? 'Getting ready…' : showing.status === 'syncing' ? 'Pairing and syncing…' : showing.status === 'error' ? showing.message : 'Waiting for the other device. Keep this open.'}
      </p>
      {showing.status === 'error' && (
        <Button variant="secondary" className="mt-3" onClick={() => void showCode()}>
          Try again
        </Button>
      )}
    </div>
  );
}

function JoinCode({ onClose }: { onClose: () => void }) {
  const joining = useSyncStore((s) => s.joining);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [Scanner, setScanner] = useState<typeof import('./QrScanner').QrScanner | null>(null);
  const accept = useCallback((text: string) => readCode(text) !== null, []);
  const found = useCallback((text: string) => {
    setScanning(false);
    setCode(groupCode(readCode(text)!));
    void joinCode(text);
  }, []);
  useEffect(() => {
    if (scanning && !Scanner) void import('./QrScanner').then((m) => setScanner(() => m.QrScanner));
  }, [scanning, Scanner]);

  if (joining?.status === 'done') return <Done partner={joining.partner} onClose={onClose} />;
  const working = joining?.status === 'connecting' || joining?.status === 'syncing';
  return (
    <div>
      {scanning ? (
        Scanner ? <Scanner accept={accept} onResult={found} /> : <p className="py-10 text-center text-ink-soft">Starting the camera…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void joinCode(code);
          }}
        >
          <label htmlFor="pair-code" className="text-[14px] font-semibold">
            The code on the other device
          </label>
          <input
            id="pair-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCD-EFGH-JKMN-PQRS"
            className="mt-2 h-12 w-full rounded-xl border border-line bg-raised px-3.5 font-mono text-[17px] tracking-wider uppercase transition-colors hover:border-line-strong"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="submit" loading={working} disabled={!readCode(code)}>
              Pair
            </Button>
            <Button type="button" variant="secondary" icon={ScanLine} onClick={() => setScanning(true)}>
              Scan the code
            </Button>
          </div>
        </form>
      )}
      {joining && (
        <p className={cx('mt-3 text-[14px]', joining.status === 'error' ? 'text-accent-text' : 'text-ink-soft')}>
          {joining.status === 'connecting' ? 'Finding the other device…' : joining.status === 'syncing' ? 'Pairing and syncing…' : joining.message}
        </p>
      )}
      {scanning && (
        <Button variant="ghost" className="mt-3" onClick={() => setScanning(false)}>
          Type it instead
        </Button>
      )}
    </div>
  );
}

function Done({ partner, onClose }: { partner?: string; onClose: () => void }) {
  return (
    <div className="py-4 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-sage-soft text-sage-text">
        <Check size={24} aria-hidden />
      </span>
      <p className="mt-3 font-semibold">Paired with {partner ?? 'your device'}</p>
      <p className="mt-1 text-[14px] text-ink-soft">The two are synced, and sync again whenever both are open.</p>
      <Button className="mt-4" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
