// Fetching podcast feeds and audio from the web. Most podcast hosts let apps read feeds and many
// let them download audio; for hosts that don't (no CORS), an optional relay can be set in Ordo.
import { getSettings } from '@/data/settings';

export class NetError extends Error {
  constructor(
    message: string,
    readonly kind: 'blocked' | 'http' | 'offline' | 'aborted',
  ) {
    super(message);
  }
}

/** The relay address for a URL: `{url}` is replaced, or the URL is appended. */
export function viaProxy(template: string, url: string): string {
  const encoded = encodeURIComponent(url);
  return template.includes('{url}') ? template.replace('{url}', encoded) : `${template}${encoded}`;
}

/** Fetches directly, then through the relay (if one is set) when the host blocks apps. */
async function fetchWithFallback(url: string, init: RequestInit = {}): Promise<Response> {
  if (!navigator.onLine) throw new NetError('You’re offline.', 'offline');
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new NetError('Cancelled.', 'aborted');
    const { audio } = await getSettings();
    if (!audio.downloadProxy) throw new NetError('This host doesn’t let apps download from it.', 'blocked');
    try {
      return await fetch(viaProxy(audio.downloadProxy, url), init);
    } catch {
      throw new NetError('Neither the host nor your relay could be reached.', 'blocked');
    }
  }
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetchWithFallback(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new NetError(`The server answered ${res.status}.`, 'http');
  return res.text();
}

/** Downloads a file, reporting progress (0–1) when the size is known. */
export async function downloadBlob(url: string, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<Blob> {
  const res = await fetchWithFallback(url, { signal });
  if (!res.ok) throw new NetError(`The server answered ${res.status}.`, 'http');
  const total = Number(res.headers.get('content-length')) || 0;
  const type = res.headers.get('content-type') ?? 'audio/mpeg';
  if (!res.body || !onProgress) return res.blob();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastReport = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total && performance.now() - lastReport > 150) {
      lastReport = performance.now();
      onProgress(Math.min(1, received / total));
    }
  }
  onProgress(1);
  return new Blob(chunks as BlobPart[], { type: type.startsWith('audio') || type.startsWith('video') ? type : 'audio/mpeg' });
}
