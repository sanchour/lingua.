import { useEffect, useState } from 'react';
import { db } from '@/data/db';

/** What the browser's database says when Lingua asks it directly. */
type Probe = { state: 'open'; version: number; stores: number } | { state: 'blocked' } | { state: 'error'; message: string } | { state: 'silent' };

function probeDatabase(): Promise<Probe> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve({ state: 'silent' }), 4000);
    try {
      const req = indexedDB.open(db.name);
      req.onsuccess = () => {
        window.clearTimeout(timer);
        resolve({ state: 'open', version: req.result.version, stores: req.result.objectStoreNames.length });
        req.result.close();
      };
      req.onblocked = () => {
        window.clearTimeout(timer);
        resolve({ state: 'blocked' });
      };
      req.onerror = () => {
        window.clearTimeout(timer);
        resolve({ state: 'error', message: String(req.error?.message ?? req.error) });
      };
    } catch (error) {
      window.clearTimeout(timer);
      resolve({ state: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  });
}

/**
 * While Lingua reads its settings from the browser's database (a few milliseconds, usually) nothing is drawn. If that
 * takes more than a few seconds, this says so, asks the database what's wrong, and offers what can help, so a stuck
 * start never looks like a blank page.
 */
export function StartingUp({ waitingFor }: { waitingFor: string }) {
  const [slow, setSlow] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [dexie, setDexie] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSlow(true);
      void probeDatabase().then(setProbe);
      db.open().then(
        () => setDexie(`open (version ${db.verno})`),
        (error: unknown) => setDexie(error instanceof Error ? `${error.name}: ${error.message}` : String(error)),
      );
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);

  if (!slow) return null;
  const said =
    !probe ? 'asking…'
    : probe.state === 'open' ? `opens (version ${probe.version / 10}, ${probe.stores} tables)`
    : probe.state === 'blocked' ? 'blocked: another Lingua tab or window holds it'
    : probe.state === 'error' ? `error: ${probe.message}`
    : 'doesn’t answer';

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-ink">
      <div className="max-w-lg">
        <p className="font-serif text-2xl font-semibold">Lingua is waiting for its data</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Your settings and learning are kept in this browser’s database, and it hasn’t answered yet. Close any other Lingua tabs or windows (the installed app too), then reload.
        </p>
        <dl className="mt-4 space-y-1 rounded-xl bg-surface px-4 py-3 font-mono text-[12.5px] text-ink-soft">
          <div>
            <dt className="inline text-ink-faint">Waiting for: </dt>
            <dd className="inline">{waitingFor}</dd>
          </div>
          <div>
            <dt className="inline text-ink-faint">The database: </dt>
            <dd className="inline">{said}</dd>
          </div>
          <div>
            <dt className="inline text-ink-faint">Lingua’s connection: </dt>
            <dd className="inline">{dexie ?? 'opening…'}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => location.reload()} className="mt-5 inline-flex h-11 items-center rounded-xl bg-inverse px-5 text-sm font-semibold text-on-inverse">
          Reload
        </button>
      </div>
    </div>
  );
}
