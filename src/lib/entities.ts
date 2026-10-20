// HTML entities in text that isn't HTML: tags written through a web form, and archive.org's titles
// and descriptions (LibriVox's 64 kbps files say "F&aacute;bulas").

// Accented letters are a letter and a mark ("&aacute;" is a + ´), so they need no table of their own.
const MARKS: Record<string, string> = { acute: '\u0301', grave: '\u0300', circ: '\u0302', uml: '\u0308', tilde: '\u0303', ring: '\u030a', cedil: '\u0327', caron: '\u030c' };
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', szlig: 'ß', aelig: 'æ', AElig: 'Æ', oelig: 'œ', OElig: 'Œ',
  oslash: 'ø', Oslash: 'Ø', eth: 'ð', ETH: 'Ð', thorn: 'þ', THORN: 'Þ', iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»',
  ordm: 'º', ordf: 'ª', deg: '°', middot: '·', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', sbquo: '‚',
  ldquo: '“', rdquo: '”', bdquo: '„', euro: '€',
};

/** HTML entities to their characters ("El &aacute;guila" → "El águila"); unknown ones are left as they are. */
export function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      // Half a surrogate pair isn't a character on its own.
      return n > 0 && n <= 0x10ffff && (n < 0xd800 || n > 0xdfff) ? String.fromCodePoint(n) : entity;
    }
    const accent = /^([a-z])(acute|grave|circ|uml|tilde|ring|cedil|caron)$/i.exec(code);
    if (accent) return (accent[1] + MARKS[accent[2].toLowerCase()]).normalize('NFC');
    return NAMED[code] ?? entity;
  });
}
