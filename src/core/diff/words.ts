// Word-level diff for Diarium corrections: what was struck out, what was added, what stayed.
// Tokens keep their trailing spaces so both texts can be rebuilt exactly; they are compared without them.

export type DiffPart =
  | { type: 'same'; text: string }
  | { type: 'change'; from: string; to: string }
  | { type: 'del'; text: string }
  | { type: 'ins'; text: string };

const TOKEN = /[\p{L}\p{M}\p{N}'’-]+\s*|[^\s\p{L}\p{M}\p{N}]\s*|\s+/gu;
/** Above this many tokens on both sides the diff runs per paragraph, to stay fast. */
const MAX_CELLS = 4_000_000;

export function wordTokens(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

const key = (token: string) => token.trimEnd();

/** Longest-common-subsequence diff of two token lists. */
function diffTokens(a: string[], b: string[]): Array<{ op: '=' | '-' | '+'; token: string }> {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] = key(a[i]) === key(b[j]) ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const out: Array<{ op: '=' | '-' | '+'; token: string }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) {
      out.push({ op: '=', token: b[j] });
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) out.push({ op: '-', token: a[i++] });
    else out.push({ op: '+', token: b[j++] });
  }
  while (i < n) out.push({ op: '-', token: a[i++] });
  while (j < m) out.push({ op: '+', token: b[j++] });
  return out;
}

function group(ops: Array<{ op: '=' | '-' | '+'; token: string }>): DiffPart[] {
  const parts: DiffPart[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === '=') {
      let text = '';
      while (k < ops.length && ops[k].op === '=') text += ops[k++].token;
      parts.push({ type: 'same', text });
      continue;
    }
    let from = '';
    let to = '';
    while (k < ops.length && ops[k].op !== '=') {
      if (ops[k].op === '-') from += ops[k].token;
      else to += ops[k].token;
      k++;
    }
    if (from && to) parts.push({ type: 'change', from, to });
    else if (from) parts.push({ type: 'del', text: from });
    else parts.push({ type: 'ins', text: to });
  }
  return parts;
}

/** The changes from `before` to `after`, grouped into runs (a removed run next to an added one is a change). */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = wordTokens(before);
  const b = wordTokens(after);
  if ((a.length + 1) * (b.length + 1) <= MAX_CELLS) return group(diffTokens(a, b));
  // Very long entries: compare paragraph by paragraph.
  const pa = before.split(/(?<=\n)/);
  const pb = after.split(/(?<=\n)/);
  const parts: DiffPart[] = [];
  for (let p = 0; p < Math.max(pa.length, pb.length); p++) parts.push(...group(diffTokens(wordTokens(pa[p] ?? ''), wordTokens(pb[p] ?? ''))));
  return parts;
}

/** How many words changed (for "3 corrections" style summaries). */
export const changeCount = (parts: DiffPart[]) => parts.filter((p) => p.type !== 'same').length;
