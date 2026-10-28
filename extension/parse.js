// Subtitle files, read into lines: YouTube's json3, WebVTT and TTML/DFXP (Netflix, broadcasters). Plain JS with no dependencies,
// shared by the content script and by Lingua's tests. A line is { startMs, endMs, text }.
const LinguaParse = (() => {
  const decode = (s) =>
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&amp;/g, '&');
  const clean = (s) => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

  function parseJson3(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return [];
    }
    const out = [];
    for (const e of data.events || []) {
      if (!e.segs || typeof e.tStartMs !== 'number') continue;
      const line = clean(e.segs.map((s) => s.utf8 || '').join(''));
      if (line) out.push({ startMs: e.tStartMs, endMs: e.tStartMs + (e.dDurationMs || 2000), text: line });
    }
    return out;
  }

  /** "01:02:03.456", "02:03.456" or "02:03,456" in milliseconds. */
  function clock(t) {
    const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(t.trim());
    if (!m) return NaN;
    return ((Number(m[1] || 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + Number((m[4] || '0').padEnd(3, '0'));
  }

  function parseVtt(text) {
    const out = [];
    for (const block of text.replace(/\r/g, '').split(/\n{2,}/)) {
      const lines = block.split('\n');
      const at = lines.findIndex((l) => l.includes('-->'));
      if (at < 0) continue;
      const [a, b] = lines[at].split('-->');
      const startMs = clock(a);
      const endMs = clock(b.trim().split(/\s+/)[0]);
      const line = clean(lines.slice(at + 1).join(' '));
      if (line && Number.isFinite(startMs) && Number.isFinite(endMs)) out.push({ startMs, endMs, text: line });
    }
    return out;
  }

  function parseTtml(text) {
    const tick = Number((/tickRate="(\d+)"/.exec(text) || [])[1]) || 10000000;
    const time = (v) => {
      if (!v) return NaN;
      if (/^\d+(\.\d+)?t$/.test(v)) return (parseFloat(v) / tick) * 1000;
      if (/^\d+(\.\d+)?s$/.test(v)) return parseFloat(v) * 1000;
      if (/^\d+(\.\d+)?ms$/.test(v)) return parseFloat(v);
      return clock(v);
    };
    const out = [];
    const re = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = re.exec(text))) {
      const attr = (n) => (new RegExp(`\\b${n}="([^"]*)"`).exec(m[1]) || [])[1];
      const startMs = time(attr('begin'));
      let endMs = time(attr('end'));
      if (!Number.isFinite(endMs)) endMs = startMs + time(attr('dur'));
      const line = clean(m[2]);
      if (line && Number.isFinite(startMs) && Number.isFinite(endMs)) out.push({ startMs, endMs, text: line });
    }
    return out;
  }

  /** What a response body is, or null when it isn't a subtitle file. */
  function detect(body) {
    const head = body.slice(0, 400).trimStart();
    if (head.startsWith('WEBVTT')) return 'vtt';
    if (head.startsWith('{') && /"events"\s*:/.test(body.slice(0, 4000))) return 'json3';
    if (/<tt[\s>]/.test(head) || (/<\?xml/.test(head) && /<p\b[^>]*\bbegin=/.test(body.slice(0, 6000)))) return 'ttml';
    return null;
  }

  function parseAny(body) {
    const kind = detect(body);
    const lines = kind === 'vtt' ? parseVtt(body) : kind === 'json3' ? parseJson3(body) : kind === 'ttml' ? parseTtml(body) : [];
    return lines.sort((a, b) => a.startMs - b.startMs);
  }

  /** The line showing at `ms` (the latest one started and not over), or -1. */
  function lineAt(cues, ms) {
    let found = -1;
    for (let i = 0; i < cues.length && cues[i].startMs <= ms; i++) if (ms < cues[i].endMs) found = i;
    return found;
  }

  /** Where a step to the next (+1) or previous (-1) line lands, or null at the ends. */
  function stepTo(cues, ms, dir) {
    if (dir > 0) {
      const next = cues.find((c) => c.startMs > ms + 50);
      return next ? next.startMs : null;
    }
    const here = lineAt(cues, ms);
    const before = cues.filter((c, i) => c.startMs < ms - 1200 || (i < here && c.startMs < ms - 50));
    return before.length ? before[before.length - 1].startMs : null;
  }

  return { parseJson3, parseVtt, parseTtml, parseAny, detect, lineAt, stepTo };
})();

if (typeof module !== 'undefined') module.exports = LinguaParse;
