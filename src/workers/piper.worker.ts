/// <reference lib="webworker" />
// Piper on this device (5.1-3c): espeak-ng turns the text into phonemes (Mandarin: pinyin-pro's
// readings), onnxruntime-web runs the voice on them. One voice is loaded at a time; the model
// comes from the page (which keeps it in the browser's cache), so nothing is fetched here but
// the engines, which are Lingua's own files.
import createPiperPhonemize from '@diffusionstudio/piper-wasm/build/piper_phonemize.js';
import phonemizeData from '@diffusionstudio/piper-wasm/build/piper_phonemize.data?url';
import phonemizeWasm from '@diffusionstudio/piper-wasm/build/piper_phonemize.wasm?url';
import * as ort from 'onnxruntime-web/wasm';
import { pinyinPhonemeIds, pinyinPhonemes } from '@/core/audio/piper';
import type { PiperConfig } from '@/core/audio/piper';

export type PiperWorkerRequest =
  | { type: 'load'; voice: string; model: ArrayBuffer; config: PiperConfig }
  | { type: 'speak'; id: number; text: string };
export type PiperWorkerMessage =
  | { type: 'loaded'; voice: string; ms: number }
  | { type: 'audio'; id: number; samples: Float32Array; sampleRate: number; ms: number }
  | { type: 'error'; id?: number; message: string };

const post = (message: PiperWorkerMessage, transfer: Transferable[] = []) => (self as DedicatedWorkerGlobalScope).postMessage(message, transfer);

// GitHub Pages can't isolate the page, so there are no shared threads: one is plenty for a sentence.
ort.env.wasm.numThreads = 1;

let voice: { id: string; config: PiperConfig; session: ort.InferenceSession } | null = null;

// espeak-ng's module is made once (its 18 MB of language data takes about 300 ms to unpack) and its
// main run again for each text; what it prints goes to the text waiting for it.
let waiting: ((line: string) => void) | null = null;
let phonemizer: ReturnType<typeof createPiperPhonemize> | null = null;
const makePhonemizer = () =>
  createPiperPhonemize({
    print: (line: string) => waiting?.(line),
    printErr: (message: string) => console.warn('espeak-ng:', message),
    locateFile: (file: string) => (file.endsWith('.wasm') ? phonemizeWasm : file.endsWith('.data') ? phonemizeData : file),
  });

/** espeak-ng's phoneme ids for one text; a fresh module if the kept one fails. */
async function espeakIds(text: string, lang: string, retry = true): Promise<number[]> {
  phonemizer ??= makePhonemizer();
  const module = await phonemizer;
  try {
    const line = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('espeak-ng gave no phonemes.')), 3000);
      waiting = (l) => {
        clearTimeout(timer);
        resolve(l);
      };
      module.callMain(['-l', lang, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
    });
    return (JSON.parse(line) as { phoneme_ids: number[] }).phoneme_ids;
  } catch (e) {
    phonemizer = null;
    if (retry) return espeakIds(text, lang, false);
    throw e instanceof Error ? e : new Error(String(e));
  } finally {
    waiting = null;
  }
}

async function pinyinIds(text: string, map: Record<string, number[]>): Promise<number[]> {
  const { pinyin } = await import('pinyin-pro');
  const chars = pinyin(text, { toneType: 'num', type: 'all' }).map((c) => ({ char: c.origin, pinyin: c.isZh ? c.pinyin : '' }));
  return pinyinPhonemeIds(pinyinPhonemes(chars, map), map);
}

async function speak(id: number, text: string) {
  if (!voice) throw new Error('No voice is loaded.');
  const started = performance.now();
  const { config, session } = voice;
  const ids = config.phoneme_type === 'pinyin' ? await pinyinIds(text, config.phoneme_id_map) : await espeakIds(text, config.espeak.voice);
  const { noise_scale, length_scale, noise_w } = config.inference;
  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    // A touch slower than the voice's own pace, for learners.
    scales: new ort.Tensor('float32', Float32Array.from([noise_scale, length_scale * 1.08, noise_w]), [3]),
  };
  if (Object.keys(config.speaker_id_map ?? {}).length) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const { output } = await session.run(feeds);
  const samples = new Float32Array(output.data as Float32Array);
  post({ type: 'audio', id, samples, sampleRate: config.audio.sample_rate, ms: Math.round(performance.now() - started) }, [samples.buffer]);
}

self.onmessage = async (e: MessageEvent<PiperWorkerRequest>) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') {
      const started = performance.now();
      if (voice?.id !== msg.voice) {
        await voice?.session.release();
        voice = null;
        voice = { id: msg.voice, config: msg.config, session: await ort.InferenceSession.create(new Uint8Array(msg.model), { executionProviders: ['wasm'] }) };
      }
      post({ type: 'loaded', voice: msg.voice, ms: Math.round(performance.now() - started) });
    } else await speak(msg.id, msg.text);
  } catch (err) {
    post({ type: 'error', id: msg.type === 'speak' ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
