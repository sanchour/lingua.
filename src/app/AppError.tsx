import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect } from 'react';
import { useRouteError } from 'react-router';

const RELOADED = 'lingua-reloaded-for-update';

/** A part of the app that couldn't be fetched: after an update, the open page asks for files the new version replaced. */
export const isStaleChunk = (error: unknown) => /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch|ChunkLoadError/i.test(String((error as Error)?.message ?? error));

/** Reloads once to pick up the new version; a second failure in the same tab shows the error instead. */
export function reloadForUpdate(): boolean {
  try {
    if (sessionStorage.getItem(RELOADED)) return false;
    sessionStorage.setItem(RELOADED, String(Date.now()));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

/** Forgets the reload once the app has run a while, so a later update can reload again. */
export function settleReload() {
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOADED);
    } catch {
      // Storage may be blocked; nothing to forget then.
    }
  }, 10_000);
}

/**
 * What shows when something in the app breaks, instead of a blank page: a stale update reloads itself once,
 * anything else says what happened, with Reload.
 */
export function AppError() {
  const translateUi = useUi();
  const error = useRouteError();
  const stale = isStaleChunk(error);
  useEffect(() => {
    if (stale) reloadForUpdate();
  }, [stale]);
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-ink">
      <div className="max-w-md text-center">
        <p className="font-serif text-2xl font-semibold">{stale ? translateUi('Lingua was updated') : translateUi('Something went wrong')}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {stale ? translateUi('This page still had the old version. Reload to open the new one; your learning is kept.') : translateUi('This page stopped working. Reload to try again; your learning is kept on this device.')}
        </p>
        {!stale && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-left font-mono text-[12px] break-words text-ink-faint">{message}</p>}
        <button type="button" onClick={() => location.reload()} className="mt-5 inline-flex h-11 items-center rounded-xl bg-inverse px-5 text-sm font-semibold text-on-inverse"><UiText source={'Reload'} /></button>
      </div>
    </div>
  );
}
