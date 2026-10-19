// Reading a comic page's speech bubbles on this device with Tesseract (tesseract.js), loaded only
// when a comic is open. Its engine and worker are served by Lingua itself; the reading data for the
// language (1–15 MB) comes from tesseract.js's own data on jsDelivr the first time and is kept on
// the device after that.
import Dexie from 'dexie';
import type { Worker } from 'tesseract.js';
import { bubblesFrom } from '@/core/comics/bubbles';
import { db } from '@/data/db';
import type { Bubble, OcrParagraph } from '@/core/comics/bubbles';

/** Tesseract's names for Lingua's languages. Manga is often set vertically: both are read. */
const TESSERACT: Record<string, string[]> = {
  en: ['eng'], es: ['spa'], fr: ['fra'], de: ['deu'], it: ['ita'], pt: ['por'], ru: ['rus'], el: ['ell'], sv: ['swe'], hu: ['hun'], nl: ['nld'], nb: ['nor'], tr: ['tur'],
  id: ['ind'], sw: ['swa'], la: ['lat'], ar: ['ara'], zh: ['chi_sim', 'chi_tra'], ja: ['jpn', 'jpn_vert'], ko: ['kor'], hi: ['hin'], pl: ['pol'], vi: ['vie'], tl: ['tgl'],
  th: ['tha'], fa: ['fas'], yue: ['chi_tra'], cs: ['ces'], ro: ['ron'], sh: ['hrv', 'srp_latn'], ms: ['msa'], ta: ['tam'], ka: ['kat'], uz: ['uzb'], mn: ['mon'],
};

export const ocrLanguages = (lang: string): string[] => TESSERACT[lang] ?? ['eng'];

/** WebAssembly SIMD (most browsers since 2021): the faster engine. The same test wasm-feature-detect uses. */
const simd = () => {
  try {
    return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  } catch {
    return false;
  }
};

export type OcrProgress = (status: 'loading' | 'reading', fraction: number) => void;

let current: { key: string; worker: Promise<Worker> } | null = null;
let listener: OcrProgress | null = null;

async function start(langs: string[]): Promise<Worker> {
  const [mod, worker, fast, plain] = await Promise.all([
    import('tesseract.js'),
    import('tesseract.js/dist/worker.min.js?url'),
    import('tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'),
    import('tesseract.js-core/tesseract-core-lstm.wasm.js?url'),
  ]);
  // tesseract.js is CommonJS: its functions sit on the module or on its default export.
  const tesseract = ('createWorker' in mod ? mod : (mod as unknown as { default: typeof mod }).default) as typeof mod;
  const absolute = (path: string) => new URL(path, window.location.href).href;
  const reader = await tesseract.createWorker(langs, tesseract.OEM.LSTM_ONLY, {
    workerPath: absolute(worker.default),
    corePath: absolute(simd() ? fast.default : plain.default),
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') listener?.('reading', m.progress);
      else if (/loading|initializ/.test(m.status)) listener?.('loading', m.progress);
    },
  });
  // A comic page is scattered text, not a column: every line is found on its own, and
  // core/comics/bubbles.ts puts the lines of each bubble back together.
  await reader.setParameters({ tessedit_pageseg_mode: tesseract.PSM.SPARSE_TEXT });
  return reader;
}

/** One reader at a time, for the language of the comic that is open. */
function workerFor(lang: string): Promise<Worker> {
  const langs = ocrLanguages(lang);
  const key = langs.join('+');
  if (current?.key === key) return current.worker;
  if (current) void current.worker.then((w) => w.terminate()).catch(() => undefined);
  const worker = start(langs);
  current = { key, worker };
  worker.catch(() => {
    if (current?.worker === worker) current = null;
  });
  return worker;
}

/** Lets go of the reader (and its memory) when the comic closes. */
export function stopOcr(): void {
  const done = current;
  current = null;
  if (done) void done.worker.then((w) => w.terminate()).catch(() => undefined);
}

/** The page at a size Tesseract reads well: lettering about 30 px high, so small pages are enlarged. */
async function prepare(image: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(image);
  const scale = Math.min(2.5, Math.max(1, 2000 / bitmap.width));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const g = canvas.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** The language's dictionary on this device, to tell names from words in lettering; none when it isn't installed. */
async function dictionaryCheck(lang: string, texts: string[]): Promise<((lower: string) => boolean) | undefined> {
  try {
    const any = await db.dictForms.where('[pack+form]').between([`${lang}-`, Dexie.minKey], [`${lang}-￿`, Dexie.maxKey]).first();
    if (!any) return undefined;
    const words = [...new Set(texts.flatMap((t) => t.toLocaleLowerCase(lang).match(/\p{L}[\p{L}\p{M}]+/gu) ?? []))];
    const found = await db.dictForms.bulkGet(words.map((w): [string, string] => [any.pack, w]));
    const known = new Set(words.filter((_, i) => found[i]));
    return (w) => known.has(w);
  } catch {
    return undefined;
  }
}

// Reads go one after another: the reader is one worker.
let queue: Promise<unknown> = Promise.resolve();

/** A page's speech bubbles, in reading order. */
export function readBubbles(image: Blob, lang: string, onProgress?: OcrProgress): Promise<Bubble[]> {
  const job = queue.then(async () => {
    listener = onProgress ?? null;
    try {
      const worker = await workerFor(lang);
      const canvas = await prepare(image);
      const { data } = await worker.recognize(canvas, {}, { blocks: true, text: false });
      // Each line on its own, with its own certainty; the bubbles are made from them.
      const paragraphs: OcrParagraph[] = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.map((l) => ({ text: l.text, confidence: l.confidence, bbox: l.bbox, lines: [{ text: l.text, bbox: l.bbox }] }))));
      return bubblesFrom(paragraphs, canvas.width, canvas.height, lang, await dictionaryCheck(lang, paragraphs.map((p) => p.text)));
    } finally {
      listener = null;
    }
  });
  queue = job.catch(() => undefined);
  return job;
}
