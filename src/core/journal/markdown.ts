// Diarium entries are kept as a small Markdown (5.2-5), so sync, export and word counts keep working: headings,
// bullet and numbered lists, quotes, **bold**, *italic* and <u>underline</u>. These turn it into the editor's
// document (Tiptap's JSON) and back, and into plain text for the AI check.

export type Mark = 'bold' | 'italic' | 'underline';
export interface InlineNode {
  type: 'text' | 'hardBreak';
  text?: string;
  marks?: Array<{ type: Mark }>;
}
export interface BlockNode {
  type: 'doc' | 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'blockquote';
  attrs?: { level?: number; start?: number };
  content?: Array<BlockNode | InlineNode>;
}

const MARKS: Mark[] = ['bold', 'italic', 'underline'];
const OPEN: Record<Mark, string> = { bold: '**', italic: '*', underline: '<u>' };
const CLOSE: Record<Mark, string> = { bold: '**', italic: '*', underline: '</u>' };

const HEADING = /^(#{1,3}) (.*)$/;
const BULLET = /^( *)[-*] (.*)$/;
const ORDERED = /^( *)(\d+)\. (.*)$/;
const QUOTE = /^> ?(.*)$/;
const BLOCK_START = /^(#{1,3} |[-*] |\d+\. |> ?)/;

// ---- Inline -------------------------------------------------------------------------------------------------

/** Text with the Markdown marks turned into text nodes; a mark that isn't closed later stays as it is. */
export function parseInline(src: string): InlineNode[] {
  const out: InlineNode[] = [];
  const active = new Set<Mark>();
  let buf = '';
  const push = () => {
    if (!buf) return;
    const marks = MARKS.filter((m) => active.has(m));
    out.push(marks.length ? { type: 'text', text: buf, marks: marks.map((type) => ({ type })) } : { type: 'text', text: buf });
    buf = '';
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    if (rest[0] === '\\' && /^\\[*\\<#>.-]/.test(rest)) {
      buf += rest[1];
      i += 2;
      continue;
    }
    if (rest[0] === '\n') {
      push();
      out.push({ type: 'hardBreak' });
      i++;
      continue;
    }
    const token = rest.startsWith('**') ? 'bold' : rest[0] === '*' ? 'italic' : rest.startsWith('<u>') ? 'underline' : rest.startsWith('</u>') ? 'underline-close' : null;
    if (token === 'underline-close') {
      if (active.has('underline')) {
        push();
        active.delete('underline');
        i += 4;
        continue;
      }
    } else if (token) {
      const len = OPEN[token].length;
      if (active.has(token)) {
        push();
        active.delete(token);
        i += len;
        continue;
      }
      if (hasClose(src, i + len, token)) {
        push();
        active.add(token);
        i += len;
        continue;
      }
    }
    buf += rest[0];
    i++;
  }
  push();
  return merge(out);
}

/** Whether a mark opened at `from` is closed later in the same text. */
function hasClose(src: string, from: number, mark: Mark): boolean {
  if (mark === 'underline') return src.indexOf('</u>', from) > from;
  for (let i = from; i < src.length; i++) {
    if (src[i] === '\\') {
      i++;
      continue;
    }
    if (mark === 'bold' && src.startsWith('**', i)) return i > from;
    if (mark === 'italic' && src[i] === '*') {
      if (src.startsWith('**', i)) {
        i++;
        continue;
      }
      return i > from;
    }
  }
  return false;
}

const sameMarks = (a: InlineNode, b: InlineNode) => (a.marks ?? []).map((m) => m.type).join() === (b.marks ?? []).map((m) => m.type).join();

/** Joins neighbouring text with the same marks. */
function merge(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const n of nodes) {
    const last = out[out.length - 1];
    if (last && last.type === 'text' && n.type === 'text' && sameMarks(last, n)) out[out.length - 1] = { ...last, text: last.text! + n.text! };
    else out.push(n);
  }
  return out;
}

/** Lines that would read as a heading, list or quote, escaped so they stay text. */
const keepAsText = (text: string) => text.replace(/^(#{1,3} |- |>)/gm, '\\$1').replace(/^(\d+)\. /gm, '$1\\. ');

const escapeText =(text: string) => text.replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/<(\/?u>)/g, '\\<$1');

/** Text nodes back to Markdown, opening and closing marks as they change. */
export function serializeInline(nodes: Array<BlockNode | InlineNode> = []): string {
  let out = '';
  const open: Mark[] = [];
  const closeTo = (keep: Set<Mark>) => {
    // Closes from the innermost out, down to the first mark that should stay; ones above it reopen after.
    const cut = open.findIndex((m) => !keep.has(m));
    if (cut < 0) return;
    while (open.length > cut) out += CLOSE[open.pop()!];
  };
  // Spaces at the end of a text wait until the next text's marks are known, so they land outside a closing mark
  // and "**word **" never happens.
  let space = '';
  for (const node of nodes as InlineNode[]) {
    if (node.type === 'hardBreak') {
      closeTo(new Set());
      out += space + '\n';
      space = '';
      continue;
    }
    if (node.type !== 'text' || !node.text) continue;
    const want = new Set((node.marks ?? []).map((m) => m.type).filter((m): m is Mark => MARKS.includes(m)));
    const [, lead, body, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(node.text)!;
    if (!body) {
      space += node.text;
      continue;
    }
    closeTo(want);
    out += space + lead;
    for (const m of MARKS) {
      if (want.has(m) && !open.includes(m)) {
        out += OPEN[m];
        open.push(m);
      }
    }
    out += escapeText(body);
    space = trail;
  }
  closeTo(new Set());
  return out + space;
}

// ---- Blocks -------------------------------------------------------------------------------------------------

const textBlock = (type: 'paragraph' | 'heading', src: string, level?: number): BlockNode => {
  const content = parseInline(src);
  return { type, ...(level ? { attrs: { level } } : {}), ...(content.length ? { content } : {}) };
};

/** Markdown to the editor's document. Plain text from before (lines and blank lines) comes through as paragraphs. */
export function toDoc(md: string): BlockNode {
  return { type: 'doc', content: parseBlocks(md.replace(/\r\n?/g, '\n').split('\n')) };
}

function parseBlocks(lines: string[]): BlockNode[] {
  const out: BlockNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      out.push(textBlock('heading', h[2], h[1].length));
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) inner.push(QUOTE.exec(lines[i++])![1]);
      out.push({ type: 'blockquote', content: parseBlocks(inner) });
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const [list, next] = parseList(lines, i, indentOf(line));
      out.push(list);
      i = next;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && BLOCK_START.test(lines[i]))) para.push(lines[i++]);
    out.push(textBlock('paragraph', para.join('\n')));
  }
  return out;
}

const indentOf = (line: string) => /^ */.exec(line)![0].length;

/** A list at one indent; deeper lines are nested lists or the item's continued text. */
function parseList(lines: string[], start: number, indent: number): [BlockNode, number] {
  const ordered = ORDERED.test(lines[start]);
  const items: BlockNode[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    const m = ordered ? ORDERED.exec(line) : BULLET.exec(line);
    if (!m || m[1].length !== indent) break;
    const text: string[] = [ordered ? m[3] : m[2]];
    const children: BlockNode[] = [];
    i++;
    while (i < lines.length && lines[i].trim() && indentOf(lines[i]) > indent) {
      if (BULLET.test(lines[i]) || ORDERED.test(lines[i])) {
        const [nested, next] = parseList(lines, i, indentOf(lines[i]));
        children.push(nested);
        i = next;
      } else text.push(lines[i++].trim());
    }
    items.push({ type: 'listItem', content: [textBlock('paragraph', text.join('\n')), ...children] });
  }
  const start1 = ordered ? Number(ORDERED.exec(lines[start])![2]) : 1;
  return [{ type: ordered ? 'orderedList' : 'bulletList', ...(ordered ? { attrs: { start: start1 } } : {}), content: items }, i];
}

/** The editor's document back to Markdown. */
export function fromDoc(doc: BlockNode): string {
  return blocks(doc.content as BlockNode[] | undefined, '').trim();
}

function blocks(nodes: BlockNode[] = [], indent: string): string {
  const parts: string[] = [];
  for (const node of nodes) {
    const text = node.type === 'paragraph' || node.type === 'heading' ? serializeInline(node.content) : '';
    if (node.type === 'paragraph') {
      if (!text.trim()) continue;
      // A line that would read as a heading, list or quote is kept as text.
      parts.push(keepAsText(text));
    } else if (node.type === 'heading') {
      parts.push(`${'#'.repeat(Math.min(3, node.attrs?.level ?? 1))} ${text.replace(/\n/g, ' ')}`);
    } else if (node.type === 'blockquote') {
      const inner = blocks(node.content as BlockNode[], '');
      if (inner) parts.push(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      parts.push(list(node, indent));
    }
  }
  return parts.join('\n\n');
}

function list(node: BlockNode, indent: string): string {
  const ordered = node.type === 'orderedList';
  let n = node.attrs?.start ?? 1;
  const lines: string[] = [];
  for (const item of (node.content ?? []) as BlockNode[]) {
    const marker = ordered ? `${n++}. ` : '- ';
    const pad = indent + ' '.repeat(marker.length);
    let first = true;
    for (const child of (item.content ?? []) as BlockNode[]) {
      if (child.type === 'bulletList' || child.type === 'orderedList') lines.push(list(child, pad));
      else {
        const text = serializeInline(child.content).split('\n').join(`\n${pad}`);
        lines.push(first ? `${indent}${marker}${text}` : `${pad}${text}`);
        first = false;
      }
    }
    if (first) lines.push(`${indent}${marker}`.trimEnd());
  }
  return lines.join('\n');
}

// ---- Plain text and corrections -----------------------------------------------------------------------------

/** Every paragraph, heading and list item of a document, in order. */
function textBlocks(node: BlockNode, out: BlockNode[] = []): BlockNode[] {
  if (node.type === 'paragraph' || node.type === 'heading') out.push(node);
  else for (const child of (node.content ?? []) as BlockNode[]) textBlocks(child, out);
  return out;
}

const plainOf = (node: BlockNode) => ((node.content ?? []) as InlineNode[]).map((n) => (n.type === 'hardBreak' ? '\n' : (n.text ?? ''))).join('');

/** The entry as plain text, one blank line between paragraphs, headings and list items: what the AI reads and words are counted in. */
export function toPlain(md: string): string {
  return textBlocks(toDoc(md))
    .map(plainOf)
    .filter((t) => t.trim())
    .join('\n\n');
}

/**
 * Puts a corrected plain text back into the entry: paragraph by paragraph when the counts match, so each keeps its
 * heading or list marker (and its marks, where the paragraph didn't change); else the corrected text as paragraphs.
 */
export function mergeCorrected(md: string, corrected: string): string {
  const doc = toDoc(md);
  const targets = textBlocks(doc).filter((b) => plainOf(b).trim());
  const paragraphs = corrected
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length !== targets.length) return paragraphs.map((p) => keepAsText(escapeText(p))).join('\n\n');
  targets.forEach((block, i) => {
    if (plainOf(block).trim() === paragraphs[i]) return;
    const content: InlineNode[] = [];
    paragraphs[i].split('\n').forEach((line, j) => {
      if (j) content.push({ type: 'hardBreak' });
      if (line) content.push({ type: 'text', text: line });
    });
    block.content = content;
  });
  return fromDoc(doc);
}
