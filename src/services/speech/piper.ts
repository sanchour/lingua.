// A natural voice on this device (5.1-3c): a Piper voice downloaded once (63 MB, asked first, its
// size shown) into the browser's cache, then run in a worker. What it says is kept in db.speech
// like Gemini's, so a word is made once.
import { floatToPcm16, piperModelUrl, piperVoice, piperVoicesFor } from '@/core/audio/piper';
import type { PiperConfig, PiperVoice } from '@/core/audio/piper';
import { db } from '@/data/db';
import type { PiperWorkerMessage } from '@/workers/piper.worker';
import PiperWorker from '@/workers/piper.worker?worker';
import { pcmToWav } from './gemini';

const CACHE = 'lingua-piper-voices';

const openCache = () => (typeof caches === 'undefined' ? Promise.resolve(null) : caches.open(CACHE).catch(() => null));

/** The Piper voices downloaded on this device. */
export async function installedPiperVoices(): Promise<Set<string>> {
  const cache = await openCache();
  if (!cache) return new Set();
  const keys = await cache.keys();
  return new Set(keys.map((r) => /\/([^/]+)\.onnx$/.exec(r.url)?.[1]).filter((id): id is string => Boolean(id)));
}

/** The downloaded voice for this accent: the learner's pick among them, else the first. */
export async function installedPiperFor(locale: string, chosen?: string): Promise<PiperVoice | undefined> {
  const have = await installedPiperVoices();
  const voices = piperVoicesFor(locale).filter((v) => have.has(v.id));
  return voices.find((v) => v.id === chosen) ?? voices[0];
}

/** Downloads a voice into the browser's cache, saying how far it has got (0–1). */
export async function downloadPiperVoice(id: string, onProgress?: (pct: number) => void): Promise<void> {
  const cache = await openCache();
  if (!cache) throw new Error('This browser can’t keep a voice.');
  const configUrl = piperModelUrl(id, 'onnx.json');
  const modelUrl = piperModelUrl(id, 'onnx');
  const config = await fetch(configUrl);
  if (!config.ok) throw new Error(`The voice couldn’t be downloaded (HTTP ${config.status}).`);
  const res = await fetch(modelUrl);
  if (!res.ok || !res.body) throw new Error(`The voice couldn’t be downloaded (HTTP ${res.status}).`);
  const total = Number(res.headers.get('content-length')) || piperVoice(id)?.size || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress?.(Math.min(1, received / total));
  }
  await cache.put(configUrl, new Response(await config.blob(), { headers: { 'content-type': 'application/json' } }));
  // The model last: a voice counts as downloaded once its model is in the cache.
  await cache.put(modelUrl, new Response(new Blob(chunks as BlobPart[]), { headers: { 'content-type': 'application/octet-stream' } }));
}

export async function removePiperVoice(id: string): Promise<void> {
  const cache = await openCache();
  await cache?.delete(piperModelUrl(id, 'onnx'));
  await cache?.delete(piperModelUrl(id, 'onnx.json'));
  if (loadedVoice === id) {
    worker?.terminate();
    worker = null;
    loadedVoice = null;
  }
}

let worker: Worker | null = null;
let loadedVoice: string | null = null;
let busy: Promise<unknown> = Promise.resolve();
let nextId = 1;

/** One message back from the worker, or its failure. */
function answer<T extends PiperWorkerMessage['type']>(w: Worker, type: T, id?: number): Promise<Extract<PiperWorkerMessage, { type: T }>> {
  return new Promise((resolve, reject) => {
    w.onmessage = (event: MessageEvent<PiperWorkerMessage>) => {
      const m = event.data;
      if (m.type === 'error') reject(new Error(m.message));
      else if (m.type === type && (id === undefined || !('id' in m) || m.id === id)) resolve(m as Extract<PiperWorkerMessage, { type: T }>);
    };
    w.onerror = (event) => {
      event.preventDefault();
      worker?.terminate();
      worker = null;
      loadedVoice = null;
      reject(new Error(event.message || 'The voice stopped unexpectedly.'));
    };
  });
}

async function load(id: string): Promise<Worker> {
  worker ??= new PiperWorker();
  const w = worker;
  if (loadedVoice === id) return w;
  const cache = await openCache();
  const [model, config] = await Promise.all([cache?.match(piperModelUrl(id, 'onnx')), cache?.match(piperModelUrl(id, 'onnx.json'))]);
  if (!model || !config) throw new Error('This voice isn’t on this device any more.');
  const buffer = await model.arrayBuffer();
  const loaded = answer(w, 'loaded');
  w.postMessage({ type: 'load', voice: id, model: buffer, config: (await config.json()) as PiperConfig }, [buffer]);
  await loaded;
  loadedVoice = id;
  return w;
}

/** `text` said by a Piper voice, as WAV: kept from before, or made now (one at a time) and kept. */
export function piperSpeech(voice: string, lang: string, text: string): Promise<Blob> {
  const key = `piper:${voice}|${text}`;
  const job = busy.then(async () => {
    const kept = await db.speech.get(key).catch(() => undefined);
    if (kept) return kept.blob;
    const w = await load(voice);
    const id = nextId++;
    const audio = answer(w, 'audio', id);
    w.postMessage({ type: 'speak', id, text });
    const { samples, sampleRate } = await audio;
    const blob = new Blob([pcmToWav(floatToPcm16(samples), sampleRate) as Uint8Array<ArrayBuffer>], { type: 'audio/wav' });
    await db.speech.put({ id: key, lang, text, voice: `piper:${voice}`, blob, createdAt: Date.now() }).catch(() => undefined);
    return blob;
  });
  busy = job.catch(() => undefined);
  return job;
}

/** Loads a voice in the background once the page is idle, so the first sentence needn't wait for it. */
export function warmPiper(id: string) {
  if (loadedVoice === id || typeof window === 'undefined') return;
  const go = () => {
    busy = busy.then(() => load(id)).catch(() => undefined);
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 5000 });
  else setTimeout(go, 1500);
}

/** How long the voice takes for `text` on this device, without keeping it (for checking speed). */
export async function timePiper(voice: string, text: string): Promise<{ load: number; speak: number }> {
  const t0 = performance.now();
  const w = await load(voice);
  const t1 = performance.now();
  const id = nextId++;
  const audio = answer(w, 'audio', id);
  w.postMessage({ type: 'speak', id, text });
  await audio;
  return { load: Math.round(t1 - t0), speak: Math.round(performance.now() - t1) };
}
