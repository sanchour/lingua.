import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { HardDrive, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { db } from '@/data/db';
import { formatBytes } from '@/lib/format';
import { Badge, Button, Card } from '@/design/primitives';
import { getStorageInfo, requestPersistence } from '@/services/storage/persist';
import type { StorageInfo } from '@/services/storage/persist';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

export function StorageSection() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const refresh = useCallback(() => void getStorageInfo().then(setInfo), []);
  useEffect(refresh, [refresh]);

  const counts = useLiveQuery(async () => {
    const [packs, dictWords, texts, chapters, notes, decks, blobs, songs] = await Promise.all([
      db.dictPacks.count(),
      db.fullDict.count(),
      db.texts.count(),
      db.chapters.count(),
      db.notes.count(),
      db.decks.count(),
      db.blobs.count(),
      db.songs.count(),
    ]);
    return { packs, dictWords, texts, chapters, notes, decks, blobs, songs };
  });

  const clearBlobsCache = async () => {
    const count = await db.blobs.count();
    await db.blobs.clear();
    toast(`Cleared ${count} cached media items.`, { tone: 'success' });
    refresh();
  };

  const share = info && info.quota ? Math.min(1, info.usage / info.quota) : 0;

  return (
    <SettingsSection id="storage" icon={HardDrive} title="Storage" description="Everything lives on this device. Nothing is uploaded.">
      {info && !info.supported ? (
        <p className="text-sm text-ink-soft">This browser does not report storage usage.</p>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{info ? formatBytes(info.usage) : '…'} used</span>
              <span className="text-ink-soft">{info ? `${formatBytes(info.quota)} available` : ''}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label="Storage used">
              <div className="h-full origin-left rounded-full bg-sage transition-transform duration-500" style={{ transform: `scaleX(${Math.max(share, 0.01)})` }} />
            </div>
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

          {/* Storage breakdown by kind (6-25, F1546) */}
          <div className="mt-6">
            <p className="text-[14px] font-semibold text-ink">Storage by kind</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase">Dictionaries</p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.dictWords.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft">offline words</p>
              </Card>
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase">Books & texts</p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.texts.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft">{counts?.chapters ?? 0} chapters</p>
              </Card>
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase">Flashcards</p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.notes.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft">in {counts?.decks ?? 0} decks</p>
              </Card>
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase">Media & audio</p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.blobs.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft">{counts?.songs ?? 0} songs</p>
              </Card>
            </div>
            {counts && counts.blobs > 0 && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => void clearBlobsCache()}>
                  Clear cached media ({counts.blobs})
                </Button>
              </div>
            )}
          </div>

          {/* Privacy & Destination Disclosures (6-25, F1544) */}
          <div className="mt-6 rounded-2xl border border-line bg-surface p-4.5">
            <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <Lock size={15} className="text-sage-text" aria-hidden />
              Privacy & destinations: what travels where
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              Lingua is offline-first. Your vocabulary, reviews, diary entries, and highlights never leave this computer unless you pair devices or export a backup.
            </p>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-snug text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink">• AI requests:</span>
                <span>Travel directly from your browser to Groq or Gemini using your own API key in headers. Never stored or used to train models.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink">• Translation:</span>
                <span>Sent on demand to your chosen provider (MyMemory / Lingva) only when you look up a word; local pack dictionaries work 100% offline.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink">• Speech & audio:</span>
                <span>Speech synthesis and recognition run on this device or through your Groq key. Recordings are never kept on external servers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink">• Analytics & tracking:</span>
                <span>Zero telemetry, zero third-party analytics, and zero tracking cookies.</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
