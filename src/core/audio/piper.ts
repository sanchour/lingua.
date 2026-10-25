// A natural voice on the device (5.1-3c): Piper's voices, run in the browser. The voices whose
// licence allows a paid app (DECISIONS 2026-10-25), one per accent, and Mandarin's pinyin
// phonemes, which piper's Chinese voices take instead of espeak-ng's.
import { sameLocale } from '../lang/voiceLocale';

export interface PiperVoice {
  /** Piper's name for it: fr_FR-siwis-medium */
  id: string;
  locale: string;
  /** The speaker's name, shown in Settings. */
  name: string;
  /** Bytes of the model, said before it downloads. */
  size: number;
  licence: string;
  /** Who to thank (CC BY asks for it). */
  credit: string;
  phonemes: 'espeak' | 'pinyin';
}

export const PIPER_VOICES: PiperVoice[] = [
  { id: 'fr_FR-siwis-medium', locale: 'fr-FR', name: 'Siwis', size: 63_201_294, licence: 'CC BY 4.0', credit: 'SIWIS French speech synthesis database, University of Edinburgh', phonemes: 'espeak' },
  { id: 'es_ES-davefx-medium', locale: 'es-ES', name: 'Davefx', size: 63_201_294, licence: 'CC0', credit: 'davefx, Open Home Foundation voice datasets', phonemes: 'espeak' },
  { id: 'es_MX-ald-medium', locale: 'es-MX', name: 'Ald', size: 63_201_294, licence: 'Unlicense', credit: 'Ald Mexican Spanish speech dataset', phonemes: 'espeak' },
  { id: 'de_DE-thorsten-medium', locale: 'de-DE', name: 'Thorsten', size: 63_201_294, licence: 'CC0', credit: 'Thorsten Müller, Thorsten-Voice', phonemes: 'espeak' },
  { id: 'ru_RU-denis-medium', locale: 'ru-RU', name: 'Denis', size: 63_201_294, licence: 'CC0', credit: 'Open Home Foundation voice datasets', phonemes: 'espeak' },
  { id: 'ru_RU-dmitri-medium', locale: 'ru-RU', name: 'Dmitri', size: 63_201_294, licence: 'CC0', credit: 'Open Home Foundation voice datasets', phonemes: 'espeak' },
  { id: 'zh_CN-chaowen-medium', locale: 'zh-CN', name: 'Chaowen (超文)', size: 63_221_984, licence: 'CC0', credit: 'Open Home Foundation voice datasets', phonemes: 'pinyin' },
];

/** Piper's voices for exactly this accent (never another's: es-MX's isn't Argentina's). */
export const piperVoicesFor = (locale: string) => PIPER_VOICES.filter((v) => sameLocale(v.locale, locale));
export const piperVoice = (id: string) => PIPER_VOICES.find((v) => v.id === id);

/** Where Hugging Face keeps a voice: fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx */
export function piperModelUrl(id: string, file: 'onnx' | 'onnx.json'): string {
  const [code, name, quality] = id.split('-');
  return `https://huggingface.co/rhasspy/piper-voices/resolve/main/${code.split('_')[0]}/${code}/${name}/${quality}/${id}.${file}`;
}

/** The config next to each model (the parts used here). */
export interface PiperConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  phoneme_type?: string;
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  phoneme_id_map: Record<string, number[]>;
  speaker_id_map?: Record<string, number>;
}

// Piper's Chinese phonemizer (piper1-gpl, phonemize_chinese.py, Apache 2.0): each syllable is its
// initial (Ø for none), its final and its tone; a pause id follows each tone and punctuation.
const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
const GROUP_END = new Set(['1', '2', '3', '4', '5', '。', '？', '！', '.', '?', '!', '—', '…', '、', '，', '：', '；', ',', ':', ';', ' ']);

/** One syllable as pinyin-pro writes it with tone numbers ("lü4", "men0") → [initial, final, tone], or null. */
export function splitSyllable(syllable: string): [string, string, string] | null {
  const m = /^([a-zü]+?)([0-5])$/.exec(syllable.toLowerCase());
  if (!m) return null;
  const base = m[1].replace(/ü/g, 'v');
  const tone = m[2] === '0' ? '5' : m[2];
  const initial = INITIALS.find((i) => base.startsWith(i)) ?? '';
  const final = base.slice(initial.length);
  return final ? [initial || 'Ø', final, tone] : null;
}

/** Characters with their readings ("" for punctuation and the rest) → Piper's phoneme symbols. */
export function pinyinPhonemes(chars: ReadonlyArray<{ char: string; pinyin: string }>, map: Record<string, number[]>): string[] {
  const out: string[] = [];
  for (const { char, pinyin } of chars) {
    const parts = pinyin ? splitSyllable(pinyin) : null;
    if (parts) out.push(...parts);
    else if (map[char]) out.push(char);
  }
  return out;
}

/** Symbols → the model's ids: start, each symbol, a pause after each group, end. */
export function pinyinPhonemeIds(symbols: readonly string[], map: Record<string, number[]>): number[] {
  const ids = [...(map['^'] ?? [1])];
  for (const s of symbols) {
    const id = map[s];
    if (!id) continue;
    ids.push(...id);
    if (GROUP_END.has(s)) ids.push(...(map._ ?? [0]));
  }
  ids.push(...(map.$ ?? [2]));
  return ids;
}

/** Piper's float samples → 16-bit PCM for a WAV file. */
export function floatToPcm16(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return out;
}

/**
 * Text cut into parts to say one after another, so the first can play while the next is made:
 * at the ends of sentences, and at commas and semicolons once a part is long enough to be worth it.
 */
export function speechParts(text: string, min = 24): string[] {
  const pieces = text.replace(/\s+/g, ' ').trim().match(/[^.!?;:,。！？；：，…]+[.!?;:,。！？；：，…]*["'»”」』)]*\s*/gu) ?? [];
  const parts: string[] = [];
  let current = '';
  for (const piece of pieces) {
    current += piece;
    const sentenceEnd = /[.!?。！？…]["'»”」』)]*\s*$/u.test(current);
    if (sentenceEnd || current.trim().length >= min) {
      parts.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) {
    // A short tail joins the part before it rather than being said on its own.
    if (parts.length && current.trim().length < min / 2) parts[parts.length - 1] += ` ${current.trim()}`;
    else parts.push(current.trim());
  }
  return parts;
}
