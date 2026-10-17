// Whisper on this device: decodes the audio here and hands it to the worker. The model is
// downloaded the first time (tiny ≈ 40 MB, base ≈ 80 MB, small ≈ 250 MB) and then works offline.
import type { WhisperResult } from '@/core/parsers/whisper';
import type { DeviceModel, WhisperWorkerMessage } from '@/workers/whisper.worker';
import WhisperWorker from '@/workers/whisper.worker?worker';

export type { DeviceModel };

export const DEVICE_MODELS: Record<DeviceModel, { label: string; size: string }> = {
  tiny: { label: 'Tiny · quickest, rougher', size: '40 MB' },
  base: { label: 'Base · balanced (recommended)', size: '80 MB' },
  small: { label: 'Small · most accurate, slow on phones', size: '250 MB' },
};

export type DeviceProgress = { phase: 'model' | 'listen'; pct: number };

let worker: Worker | null = null;
let busy: Promise<unknown> = Promise.resolve();

/** Runs Whisper on 16 kHz mono samples. Jobs queue one after another (one model in memory). */
export function whisperOnDevice(samples: Float32Array, lang: string, model: DeviceModel, onProgress?: (p: DeviceProgress) => void): Promise<WhisperResult> {
  const job = busy.then(
    () =>
      new Promise<WhisperResult>((resolve, reject) => {
        worker ??= new WhisperWorker();
        const w = worker;
        w.onmessage = (event: MessageEvent<WhisperWorkerMessage>) => {
          const m = event.data;
          if (m.type === 'loading') onProgress?.({ phase: 'model', pct: m.pct });
          else if (m.type === 'progress') onProgress?.({ phase: 'listen', pct: m.pct });
          else if (m.type === 'done') resolve(m.result);
          else reject(new Error(m.message));
        };
        w.onerror = (event) => {
          event.preventDefault();
          worker?.terminate();
          worker = null;
          reject(new Error(event.message || 'Whisper stopped unexpectedly on this device.'));
        };
        w.postMessage({ type: 'run', model, lang, samples }, [samples.buffer]);
      }),
  );
  busy = job.catch(() => undefined);
  return job;
}
