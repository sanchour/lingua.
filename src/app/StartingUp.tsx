import { UiText, useUi } from '@/design/i18n/UiText';
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
  const translateUi = useUi();
  const [slow, setSlow] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [dexie, setDexie] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // A failed open is shown at once; a slow one after four seconds.
    db.open().then(
      () => alive && setDexie(`open (version ${db.verno})`),
      (error: unknown) => {
        if (!alive) return;
        setDexie(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        setSlow(true);
      },
    );
    const t = window.setTimeout(() => alive && setSlow(true), 4000);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (slow) void probeDatabase().then(setProbe);
  }, [slow]);

  if (!slow) return null;
  // The browser itself can't open the site's storage ("UnknownError: Internal error"): a stuck lock or damaged files.
  if ((probe?.state === 'error' && /internal|unknown|backing store/i.test(probe.message)) || (dexie && /UnknownError|Internal error|backing store/i.test(dexie))) {
    return <StorageBroken details={[`Waiting for: ${waitingFor}`, `The database: ${probe?.state === 'error' ? probe.message : (probe?.state ?? 'asking…')}`, `Lingua’s connection: ${dexie ?? 'opening…'}`]} />;
  }
  const said =
    !probe ? 'asking…'
    : probe.state === 'open' ? `opens (version ${probe.version / 10}, ${probe.stores} tables)`
    : probe.state === 'blocked' ? 'blocked: another Lingua tab or window holds it'
    : probe.state === 'error' ? `error: ${probe.message}`
    : 'doesn’t answer';

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-ink">
      <div className="max-w-lg">
        <p className="font-serif text-2xl font-semibold"><UiText source={'Lingua is waiting for its data'} /></p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft"><UiText source={'Your settings and learning are kept in this browser’s database, and it hasn’t answered yet. Close any other Lingua tabs or windows (the installed app too), then reload.'} /></p>
        <dl className="mt-4 space-y-1 rounded-xl bg-surface px-4 py-3 font-mono text-[12.5px] text-ink-soft">
          <div>
            <dt className="inline text-ink-faint"><UiText source={'Waiting for: '} /></dt>
            <dd className="inline">{waitingFor}</dd>
          </div>
          <div>
            <dt className="inline text-ink-faint"><UiText source={'The database: '} /></dt>
            <dd className="inline">{said}</dd>
          </div>
          <div>
            <dt className="inline text-ink-faint"><UiText source={'Lingua’s connection: '} /></dt>
            <dd className="inline">{dexie ?? translateUi('opening…')}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => location.reload()} className="mt-5 inline-flex h-11 items-center rounded-xl bg-inverse px-5 text-sm font-semibold text-on-inverse"><UiText source={'Reload'} /></button>
      </div>
    </div>
  );
}

/** Deletes this browser's Lingua database; resolves whether the browser managed to. */
function deleteDatabase(): Promise<boolean> {
  db.close();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), 8000);
    const req = indexedDB.deleteDatabase(db.name);
    req.onsuccess = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    req.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
  });
}

/**
 * The browser reports an internal error opening Lingua's storage. Nothing in Lingua can read past that, so this says
 * what helps, safest first; starting fresh is last, asks twice, and says what it costs.
 */
function StorageBroken({ details }: { details: string[] }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'deleting' | 'failed'>('idle');
  const fresh = async () => {
    setStep('deleting');
    if (await deleteDatabase()) location.reload();
    else setStep('failed');
  };
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 py-10 text-ink">
      <div className="max-w-xl">
        <p className="font-serif text-2xl font-semibold"><UiText source={'The browser can’t open Lingua’s storage'} /></p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft"><UiText source={'Your settings and learning live in this browser’s database for this site, and the browser answers with an internal error when Lingua asks for it. That happens when the browser’s files are locked (often by the browser still running in the background, or by antivirus software) or damaged.'} /></p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed">
          <li><UiText source={'{0} (every window, and its icon by the clock: Brave and Chrome keep running in the background), then open Lingua again.'} values={[<strong><UiText source={'Quit the browser completely'} /></strong>]} /></li>
          <li><UiText source={'If that doesn’t help, {0}, or pause the antivirus for a moment and reload.'} values={[<strong><UiText source={'restart the computer'} /></strong>]} /></li>
          <li><UiText source={'Still not? The browser’s copy is damaged. Your learning may still be in {0} if it was installed from another browser, on a {1}, or in a {2} (Settings › Backup).'} values={[<strong><UiText source={'the installed Lingua app'} /></strong>, <strong><UiText source={'paired device'} /></strong>, <strong><UiText source={'backup file'} /></strong>]} /></li>
          <li><UiText source={'Then start fresh here, and restore that backup in Settings › Backup.{0}'} values={[<div className="mt-2">
              {step === 'idle' && (
                <button type="button" onClick={() => setStep('confirm')} className="text-[14px] font-semibold text-accent-text underline"><UiText source={'Start fresh in this browser…'} /></button>
              )}
              {step === 'confirm' && (
                <span className="inline-flex flex-wrap items-center gap-2 text-[14px]"><UiText source={'This deletes everything Lingua kept in this browser.{0}{1}'} values={[<button type="button" onClick={() => void fresh()} className="rounded-lg bg-accent-fill px-3 py-1.5 font-semibold text-on-accent"><UiText source={'Delete and start fresh'} /></button>, <button type="button" onClick={() => setStep('idle')} className="px-2 py-1.5 font-semibold text-ink-soft"><UiText source={'Keep it'} /></button>]} /></span>
              )}
              {step === 'deleting' && <span className="text-[14px] text-ink-soft"><UiText source={'Deleting…'} /></span>}
              {step === 'failed' && (
                <span className="text-[14px] text-ink-soft"><UiText source={'The browser couldn’t delete it either. In the browser’s settings, open Privacy › Site data, find sanchour.github.io and clear it, then reload.'} /></span>
              )}
            </div>]} /></li>
        </ol>
        <p className="mt-5 font-mono text-[12px] leading-relaxed break-words text-ink-faint">{details.join(' · ')}</p>
        <button type="button" onClick={() => location.reload()} className="mt-5 inline-flex h-11 items-center rounded-xl bg-inverse px-5 text-sm font-semibold text-on-inverse"><UiText source={'Reload'} /></button>
      </div>
    </div>
  );
}
