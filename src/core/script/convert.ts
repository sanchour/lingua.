// Script conversion (6-23): Serbian Cyrillic ⇄ Latin and Chinese Simplified ⇄ Traditional. Pure.
// shortcut: Chinese is character by character from Unicode's variants (a character with several Traditional
// forms takes the first, so 发 is always 發, never 髮), no phrase rules as OpenCC has; upgrade with OpenCC's phrase tables.
// shortcut: Serbian Latin → Cyrillic reads lj, nj and dž as one letter, which a few words (injekcija, nadživeti) break.

const SR: Array<[string, string]> = [
  ['А', 'A'], ['Б', 'B'], ['В', 'V'], ['Г', 'G'], ['Д', 'D'], ['Ђ', 'Đ'], ['Е', 'E'], ['Ж', 'Ž'], ['З', 'Z'], ['И', 'I'], ['Ј', 'J'], ['К', 'K'], ['Л', 'L'], ['Љ', 'Lj'], ['М', 'M'],
  ['Н', 'N'], ['Њ', 'Nj'], ['О', 'O'], ['П', 'P'], ['Р', 'R'], ['С', 'S'], ['Т', 'T'], ['Ћ', 'Ć'], ['У', 'U'], ['Ф', 'F'], ['Х', 'H'], ['Ц', 'C'], ['Ч', 'Č'], ['Џ', 'Dž'], ['Ш', 'Š'],
];
const CYR_TO_LAT = new Map<string, string>();
const LAT_TO_CYR = new Map<string, string>();
for (const [c, l] of SR) {
  CYR_TO_LAT.set(c, l);
  CYR_TO_LAT.set(c.toLowerCase(), l.toLowerCase());
  LAT_TO_CYR.set(l, c);
  LAT_TO_CYR.set(l.toLowerCase(), c.toLowerCase());
  if (l.length === 2) LAT_TO_CYR.set(l.toUpperCase(), c); // LJ, NJ, DŽ
}

export function serbianToLatin(text: string): string {
  let out = '';
  const chars = [...text];
  chars.forEach((ch, i) => {
    const l = CYR_TO_LAT.get(ch);
    // A digraph before a capital reads as capitals (ЉУБАВ → LJUBAV, not LjUBAV).
    if (l && l.length === 2 && ch === ch.toUpperCase() && chars[i + 1] && chars[i + 1] !== chars[i + 1].toLowerCase()) out += l.toUpperCase();
    else out += l ?? ch;
  });
  return out;
}

export function serbianToCyrillic(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; ) {
    const two = text.slice(i, i + 2);
    const hit = LAT_TO_CYR.get(two) && two.length === 2 ? two : text[i];
    out += LAT_TO_CYR.get(hit) ?? hit;
    i += hit.length;
  }
  return out;
}

export type Conversion = 'hans-hant' | 'hant-hans' | 'sr-latin' | 'sr-cyrillic';

export const CONVERSIONS: Array<{ id: Conversion; label: string; lang: string }> = [
  { id: 'hans-hant', label: 'Simplified → Traditional', lang: 'zh' },
  { id: 'hant-hans', label: 'Traditional → Simplified', lang: 'zh' },
  { id: 'sr-latin', label: 'Serbian Cyrillic → Latin', lang: 'sh' },
  { id: 'sr-cyrillic', label: 'Serbian Latin → Cyrillic', lang: 'sh' },
];

const mapChars = (text: string, [from, to]: [string, string]) => {
  const f = [...from];
  const t = [...to];
  const table = new Map(f.map((c, i) => [c, t[i]]));
  return [...text].map((c) => table.get(c) ?? c).join('');
};

/** Converts a text; the Chinese tables load on first use (93 KB). */
export async function convertScript(text: string, how: Conversion): Promise<string> {
  if (how === 'sr-latin') return serbianToLatin(text);
  if (how === 'sr-cyrillic') return serbianToCyrillic(text);
  const data = await import('./variants.data');
  return how === 'hans-hant' ? mapChars(text, data.HANS_TO_HANT) : mapChars(text, data.HANT_TO_HANS);
}
