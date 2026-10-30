// Romaji (Hepburn as Unihan writes it, kun readings with a "." before the okurigana, as "yo.mu") to hiragana. Pure.
const ROWS: Record<string, string> = { '': 'あいうえお', k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', r: 'らりるれろ', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
const VOWELS = 'aiueo';
const SPECIAL: Record<string, string> = { shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', n: 'ん' };
const SMALL: Record<string, string> = { a: 'ゃ', u: 'ゅ', o: 'ょ' };
const YOON = new Set(['ky', 'gy', 'sh', 'ch', 'j', 'ny', 'hy', 'by', 'py', 'my', 'ry']);
const YOON_BASE: Record<string, string> = { ky: 'き', gy: 'ぎ', sh: 'し', ch: 'ち', j: 'じ', ny: 'に', hy: 'ひ', by: 'び', py: 'ぴ', my: 'み', ry: 'り' };

/** The hiragana for a romaji word, or null when it holds anything this doesn't read. */
export function romajiToKana(romaji: string): string | null {
  const s = romaji.toLowerCase().replace(/\./g, '');
  let out = '';
  for (let i = 0; i < s.length; ) {
    const rest = s.slice(i);
    if (rest.length > 1 && rest[0] === rest[1] && /[kstpgzdbh]/.test(rest[0])) { out += 'っ'; i += 1; continue; }
    const three = rest.slice(0, 3);
    if (SPECIAL[three]) { out += SPECIAL[three]; i += 3; continue; }
    const yoon = [...YOON].find((y) => rest.startsWith(y) && rest[y.length] && 'aueo'.includes(rest[y.length]));
    if (yoon) {
      const v = rest[yoon.length];
      out += YOON_BASE[yoon] + (v === 'e' ? 'ぇ' : SMALL[v] ?? '');
      i += yoon.length + 1;
      continue;
    }
    const two = rest.slice(0, 2);
    if (SPECIAL[two] && two !== 'n') { out += SPECIAL[two]; i += 2; continue; }
    const c = rest[0];
    if (VOWELS.includes(c)) { out += ROWS[''][VOWELS.indexOf(c)]; i += 1; continue; }
    if (c === 'n' && !(rest[1] && VOWELS.includes(rest[1]))) { out += 'ん'; i += 1; continue; }
    const row = ROWS[c];
    if (row && rest[1] && VOWELS.includes(rest[1])) { out += row[VOWELS.indexOf(rest[1])]; i += 2; continue; }
    return null;
  }
  return out;
}
