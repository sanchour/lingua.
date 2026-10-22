// Speaking into Diarium (Cursus, part 5): what you said, written out by Whisper, on this device or
// on Groq with your key, whichever Settings › Listening chose (the same route as a station's live text).
import type { DeviceProgress } from './device';
import { transcribeClip } from './groq';

/** Languages written without spaces between words. */
const UNSPACED = new Set(['zh', 'ja']);

/** Whisper's pieces as one text. */
export const joinSpoken = (parts: string[], lang: string) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(UNSPACED.has(lang) ? '' : ' ');

/** What was said, added after what is written: on its own line when the text ends one, else after a space. */
export function appendSpoken(text: string, spoken: string, lang: string): string {
  if (!spoken.trim()) return text;
  if (!text.trim()) return spoken.trim();
  if (/\s$/.test(text)) return text + spoken.trim();
  return text + (UNSPACED.has(lang) ? '' : ' ') + spoken.trim();
}

/** A recording written out, in the entry's language. */
export async function dictate(recording: Blob, lang: string, onProgress?: (p: DeviceProgress) => void): Promise<string> {
  const cues = await transcribeClip(new Uint8Array(await recording.arrayBuffer()), lang, onProgress);
  return joinSpoken(
    cues.map((c) => c.text),
    lang,
  );
}
