export class VisibilityPause extends Error {
  constructor() { super('Transcription paused while Lingua is hidden. Return and try again.'); }
}

export function whenVisible(): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return Promise.resolve();
  return new Promise((resolve) => {
    const visible = () => { if (document.visibilityState !== 'hidden') { document.removeEventListener('visibilitychange', visible); resolve(); } };
    document.addEventListener('visibilitychange', visible);
  });
}

/** Abort work when hidden; callers decide whether the local job can safely restart. */
export async function visibleTask<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  await whenVisible();
  const controller = new AbortController();
  const hidden = () => { if (document.visibilityState === 'hidden') controller.abort(new VisibilityPause()); };
  document.addEventListener('visibilitychange', hidden);
  hidden();
  try { return await task(controller.signal); }
  finally { document.removeEventListener('visibilitychange', hidden); }
}
