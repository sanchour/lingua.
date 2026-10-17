/// <reference lib="webworker" />
// Whisper on this device (transformers.js): the model downloads once and stays in the browser's
// cache, then audio never leaves the device. WebGPU when there is one, otherwise WebAssembly.
// Long audio is cut at pauses into parts of two minutes, so progress can be shown as parts finish.
import { env, pipeline } from '@huggingface/transformers';
import type { AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import type { WhisperResult } from '@/core/parsers/whisper';
import { splitAtPauses, WHISPER_RATE } from '@/services/transcribe/audio';

export type DeviceModel = 'tiny' | 'base' | 'small';
export type WhisperWorkerRequest = { type: 'run'; model: DeviceModel; lang: string; samples: Float32Array };
export type WhisperWorkerMessage =
  | { type: 'loading'; pct: number }
  | { type: 'progress'; pct: number }
  | { type: 'done'; result: WhisperResult; device: 'webgpu' | 'wasm' }
  | { type: 'error'; message: string };

const post = (message: WhisperWorkerMessage) => (self as DedicatedWorkerGlobalScope).postMessage(message);

env.allowLocalModels = false;
env.useBrowserCache = true;

interface Loaded {
  model: DeviceModel;
  device: 'webgpu' | 'wasm';
  asr: AutomaticSpeechRecognitionPipeline;
}
let loaded: Loaded | null = null;

async function webgpu(): Promise<{ f16: boolean } | null> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
  if (!gpu) return null;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? { f16: adapter.features.has('shader-f16') } : null;
  } catch {
    return null;
  }
}

async function load(model: DeviceModel): Promise<Loaded> {
  if (loaded?.model === model) return loaded;
  // Only the weights count (the small config files would make the bar jump), and it never goes back.
  const files = new Map<string, { loaded: number; total: number }>();
  let shown = 0;
  const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== 'progress' || !p.file || !p.total || p.total < 1_000_000) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
    let done = 0;
    let total = 0;
    for (const f of files.values()) {
      done += f.loaded;
      total += f.total;
    }
    const pct = total ? done / total : 0;
    if (pct > shown + 0.01 || pct === 1) post({ type: 'loading', pct: (shown = Math.max(shown, pct)) });
  };
  const id = `onnx-community/whisper-${model}_timestamped`;
  const gpu = await webgpu();
  if (gpu) {
    try {
      const asr = (await pipeline('automatic-speech-recognition', id, {
        device: 'webgpu',
        dtype: gpu.f16 ? { encoder_model: 'fp16', decoder_model_merged: 'q4f16' } : { encoder_model: 'fp32', decoder_model_merged: 'q4' },
        progress_callback,
      })) as AutomaticSpeechRecognitionPipeline;
      loaded = { model, device: 'webgpu', asr };
      return loaded;
    } catch {
      // Some GPUs can't run every operator; WebAssembly always works.
    }
  }
  const asr = (await pipeline('automatic-speech-recognition', id, {
    device: 'wasm',
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    progress_callback,
  })) as AutomaticSpeechRecognitionPipeline;
  loaded = { model, device: 'wasm', asr };
  return loaded;
}

type Chunk = { text: string; timestamp: [number, number | null] };

/** Groups words into segments at pauses longer than 0.8 s (cues are cut into sentences later). */
function segmentsOf(words: Array<{ word: string; start: number; end: number }>): NonNullable<WhisperResult['segments']> {
  const out: NonNullable<WhisperResult['segments']> = [];
  let current: typeof words = [];
  const flush = () => {
    if (!current.length) return;
    out.push({ start: current[0].start, end: current.at(-1)!.end, text: current.map((w) => w.word).join('').trim() });
    current = [];
  };
  for (const w of words) {
    const last = current.at(-1);
    if (last && (w.start - last.end > 0.8 || w.end - current[0].start > 30)) flush();
    current.push(w);
  }
  flush();
  return out;
}

async function run({ model, lang, samples }: WhisperWorkerRequest) {
  const { asr, device } = await load(model);
  post({ type: 'progress', pct: 0 });
  const parts = splitAtPauses(samples, 120);
  const words: Array<{ word: string; start: number; end: number }> = [];
  for (let i = 0; i < parts.length; i++) {
    const { samples: part, offsetMs } = parts[i];
    const offset = offsetMs / 1000;
    const output = (await asr(part, {
      language: lang,
      task: 'transcribe',
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    })) as { text: string; chunks?: Chunk[] };
    for (const c of output.chunks ?? []) {
      const start = c.timestamp[0] + offset;
      const end = (c.timestamp[1] ?? c.timestamp[0] + 0.3) + offset;
      if (c.text.trim()) words.push({ word: c.text, start, end });
    }
    post({ type: 'progress', pct: (i + 1) / parts.length });
  }
  const result: WhisperResult = {
    duration: samples.length / WHISPER_RATE,
    segments: segmentsOf(words),
    words: words.map((w) => ({ ...w, word: w.word.trim() })),
  };
  post({ type: 'done', result, device });
}

self.onmessage = (event: MessageEvent<WhisperWorkerRequest>) => {
  if (event.data.type !== 'run') return;
  run(event.data).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    post({ type: 'error', message: /memory|allocation|OOM/i.test(message) ? 'This device ran out of memory. Try the smaller model in Ordo › Listening.' : message });
  });
};
