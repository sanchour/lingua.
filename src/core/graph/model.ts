// The word graph's model (6-29 G1, docs/WORD-GRAPH-PLAN.md section 10.2): the learner's words and what joins them, from
// plain data. No Dexie, no drawing: the worker (G4) reads the tables and passes them in; the canvas (G2) draws the result.
import type { FullDictRow, FullEntry } from '@/core/dictionary/format';
import { STARTER_THEMES } from '@/core/lang/starter';
import { normalizeWord } from '@/core/text/normalize';
import type { WordState } from '@/data/types';
import { arabicRoot, hanCharacters, isAffix, LENS_AFFIXES, PAIR_LABELS } from './langs';

/** A shared thing is a hub only when 2 to 60 of your words share it; a bigger group is a lens (a filter or a tint). */
export const HUB_MIN = 2;
export const HUB_MAX = 60;
/** Words to discover around one word: at most this many a kind, the most common first. */
export const GHOSTS_EACH = 3;
export const PHRASES_MAX = 5;
/** Senses with these labels give no words to discover (the plan's "All registers" switch shows them). */
const FOLDED_TAGS = new Set(['vulgar', 'derogatory', 'slang', 'offensive']);

export type NodeKind = 'word' | 'theme' | 'affix' | 'char' | 'root' | 'tag';
export type Family = 'meaning' | 'form' | 'origin' | 'use' | 'yours';
/** The families in a fixed order: the cached scene stores a thread's family as its index here. */
export const FAMILIES: readonly Family[] = ['meaning', 'form', 'origin', 'use', 'yours'];

export interface WebNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** The word's key (normalizeWord of its lemma); for a hub, what it stands for. */
  key: string;
  rank?: number;
  state?: WordState;
  pos?: string;
}

export interface Thread {
  a: number;
  b: number;
  family: Family;
  kind: 'syn' | 'ant' | 'family' | 'pair' | 'hom' | 'link' | 'member';
}

export interface Lens {
  id: string;
  label: string;
  members: number[];
}

export interface Web {
  lang: string;
  nodes: WebNode[];
  threads: Thread[];
  lenses: Lens[];
  /** Word key → node index. */
  byKey: Map<string, number>;
}

export interface WebWord {
  /** normalizeWord of the lemma (or of the word, when it has none). */
  key: string;
  state: WordState;
  tags?: readonly string[];
  /** The learner's own links, as word ids (`${lang}:${norm}`). */
  relatedWordIds?: readonly string[];
}

export interface WebInput {
  lang: string;
  /** The learner's words (known and learning). */
  words: readonly WebWord[];
  /** The full dictionary's rows by key; empty for tier 2 or before it is installed. */
  dict: ReadonlyMap<string, FullDictRow>;
  /** The pack's themed lists (`StarterList.themes`): theme id → rows whose first field is the word. */
  themes?: Readonly<Record<string, ReadonlyArray<readonly string[]>>>;
}

const HUB_FAMILY: Record<Exclude<NodeKind, 'word'>, Family> = { theme: 'meaning', affix: 'form', char: 'form', root: 'origin', tag: 'yours' };
const THEMES = new Map(STARTER_THEMES.map((t) => [t.id, t]));

const synonymsOf = (e: FullEntry, senses = e.senses) => [...(e.syn ?? []), ...senses.flatMap((s) => s.syn ?? [])];
const antonymsOf = (e: FullEntry, senses = e.senses) => [...(e.ant ?? []), ...senses.flatMap((s) => s.ant ?? [])];
/** Words of the same family: made into (`derived`), related, and what it is made from (`parts` that aren't affixes). */
const familyOf = (e: FullEntry) => [...(e.derived ?? []), ...(e.related ?? []), ...(e.parts ?? []).filter((p) => !isAffix(p))];
/** The ancestor, only when it is not the same word, older (mar ← Old Spanish mar says nothing). */
/** A word's main part of speech is the one with the most meanings: de is a preposition, not the letter d. */
const mainPos = (row: FullDictRow | undefined) => (row?.entries.length ? row.entries.reduce((a, b) => (b.senses.length > a.senses.length ? b : a)).pos : undefined);
export const ancestorOf = (e: FullEntry, key: string, lang: string) => (e.root && normalizeWord(e.root[1].split(',')[0], lang) !== key ? `${e.root[0]}:${e.root[1].split(',')[0]}` : undefined);

/** The atlas's web: your words, the threads between them, small shared things as hubs and big ones as lenses.
 *  Set phrases and look-alikes are never here: they belong to one word's neighbourhood (measured: 8,588 phrase hubs and
 *  1,258 look-alike threads among 3,000 Spanish words). */
export function buildWeb(input: WebInput): Web {
  const { lang, dict } = input;
  const nodes: WebNode[] = [];
  const byKey = new Map<string, number>();
  for (const w of input.words) {
    if (byKey.has(w.key)) continue;
    const row = dict.get(w.key);
    byKey.set(w.key, nodes.length);
    nodes.push({ id: `w:${w.key}`, kind: 'word', label: row?.word ?? w.key, key: w.key, rank: row?.rank, state: w.state, pos: mainPos(row) });
  }
  const at = (word: string) => byKey.get(normalizeWord(word, lang));

  const threads: Thread[] = [];
  const seen = new Set<string>();
  const thread = (a: number | undefined, b: number | undefined, family: Family, kind: Thread['kind']) => {
    if (a === undefined || b === undefined || a === b) return;
    const id = `${kind}|${Math.min(a, b)}|${Math.max(a, b)}`;
    if (seen.has(id)) return;
    seen.add(id);
    threads.push({ a, b, family, kind });
  };
  const groups = new Map<string, { kind: Exclude<NodeKind, 'word'>; label: string; key: string; members: Set<number> }>();
  const join = (kind: Exclude<NodeKind, 'word'>, key: string, label: string, member: number) => {
    const id = `${kind}:${key}`;
    if (!groups.has(id)) groups.set(id, { kind, key, label, members: new Set() });
    groups.get(id)!.members.add(member);
  };

  input.words.forEach((w) => {
    const i = byKey.get(w.key)!;
    for (const e of dict.get(w.key)?.entries ?? []) {
      for (const s of synonymsOf(e)) thread(i, at(s), 'meaning', 'syn');
      for (const s of antonymsOf(e)) thread(i, at(s), 'meaning', 'ant');
      for (const s of familyOf(e)) thread(i, at(s), 'form', 'family');
      for (const [label, s] of e.pair ?? []) if (PAIR_LABELS.has(label)) thread(i, at(s), 'form', 'pair');
      for (const s of e.hom ?? []) thread(i, at(s), 'form', 'hom');
      for (const p of (e.parts ?? []).filter(isAffix)) join('affix', p, p, i);
      const ancestor = ancestorOf(e, w.key, lang);
      if (ancestor) join('root', ancestor, ancestor.slice(ancestor.indexOf(':') + 1), i);
      const root = lang === 'ar' ? arabicRoot(e.ety) : undefined;
      if (root) join('root', `ar:${root}`, root, i);
    }
    for (const c of hanCharacters(lang, nodes[i].label)) join('char', c, c, i);
    for (const t of w.tags ?? []) join('tag', t, t, i);
    for (const id of w.relatedWordIds ?? []) thread(i, byKey.get(id.slice(id.indexOf(':') + 1)), 'yours', 'link');
  });
  for (const [id, rows] of Object.entries(input.themes ?? {})) for (const row of rows) { const i = at(row[0]); if (i !== undefined) join('theme', id, THEMES.get(id)?.name ?? id, i); }

  const lenses: Lens[] = [];
  for (const [id, g] of groups) {
    const members = [...g.members];
    // Lists shaped by grammar (Verbs, Irregular, Connectors) and endings that only make a part of speech are lenses whatever their size.
    const grammarShaped = (g.kind === 'theme' && ['grammar', 'computed'].includes(THEMES.get(g.key)?.group ?? '')) || (g.kind === 'affix' && LENS_AFFIXES[lang]?.has(g.key));
    if (grammarShaped || members.length > HUB_MAX) { lenses.push({ id, label: g.label, members }); continue; }
    if (members.length < HUB_MIN) continue;
    // A character that is itself one of your words is the hub: 人 the word holds 女人 and 男人.
    const self = g.kind === 'char' ? byKey.get(normalizeWord(g.key, lang)) : undefined;
    const hub = self ?? nodes.push({ id, kind: g.kind, label: g.label, key: g.key }) - 1;
    for (const m of members) thread(hub, m, HUB_FAMILY[g.kind], 'member');
  }
  return { lang, nodes, threads, lenses, byKey };
}

// ── One word's neighbourhood: the compass's contents (drawn in G2) ─────────────────────────────────────────────────

export type Quarter = 'meaning' | 'form' | 'origin' | 'use';
export interface Neighbour {
  quarter: Quarter;
  kind: 'syn' | 'ant' | 'theme' | 'link' | 'family' | 'affix' | 'char' | 'pair' | 'hom' | 'lookalike' | 'ancestor' | 'cognate' | 'phrase' | 'text' | 'sentence' | 'deck';
  label: string;
  /** A word of this language (yours or to discover). */
  key?: string;
  /** For an ancestor or a cognate: its language. */
  lang?: string;
  state?: WordState;
  /** Not yours yet: a word to discover. */
  ghost?: boolean;
  rank?: number;
  /** Behind a switch (look-alikes). */
  optional?: boolean;
}

/** Everything around one word, quarter by quarter: your words first, then words to discover (ranked, at most three a
 *  kind, never an unranked one), set phrases made of your words first. */
export function neighbourhood(input: WebInput, web: Web, word: string): Neighbour[] {
  const { lang, dict } = input;
  const key = normalizeWord(word, lang);
  const row = dict.get(key);
  const self = web.byKey.get(key);
  const out: Neighbour[] = [];
  const done = new Set<string>([key]);

  const words = (quarter: Quarter, kind: Neighbour['kind'], mine: readonly string[], discover: readonly string[] = mine) => {
    const ghosts: Neighbour[] = [];
    for (const w of [...mine, ...discover]) {
      const k = normalizeWord(w, lang);
      if (done.has(k)) continue;
      const i = web.byKey.get(k);
      if (i !== undefined) {
        done.add(k);
        out.push({ quarter, kind, label: web.nodes[i].label, key: k, state: web.nodes[i].state, rank: web.nodes[i].rank });
      } else if (discover.includes(w) && dict.get(k)?.rank !== undefined) {
        done.add(k);
        ghosts.push({ quarter, kind, label: dict.get(k)!.word, key: k, ghost: true, rank: dict.get(k)!.rank });
      }
    }
    out.push(...ghosts.sort((a, b) => a.rank! - b.rank!).slice(0, GHOSTS_EACH));
  };

  const add = (id: string, n: Neighbour) => {
    if (done.has(id)) return;
    done.add(id);
    out.push(n);
  };
  for (const e of row?.entries ?? []) {
    // Words to discover come only from the first two meanings, and not from vulgar or slang ones.
    const clean = e.senses.slice(0, 2).filter((s) => !s.tags?.some((t) => FOLDED_TAGS.has(t)));
    words('meaning', 'syn', synonymsOf(e), synonymsOf(e, clean));
    words('meaning', 'ant', antonymsOf(e), antonymsOf(e, clean));
    words('form', 'family', familyOf(e));
    words('form', 'pair', (e.pair ?? []).filter(([l]) => PAIR_LABELS.has(l)).map(([, w]) => w));
    words('form', 'hom', e.hom ?? []);
    for (const p of (e.parts ?? []).filter(isAffix)) add(`affix:${p}`, { quarter: 'form', kind: 'affix', label: p });
    const ancestor = ancestorOf(e, key, lang);
    if (ancestor) add(ancestor, { quarter: 'origin', kind: 'ancestor', label: ancestor.slice(ancestor.indexOf(':') + 1), lang: e.root![0] });
    for (const [l, w] of e.cog ?? []) add(`${l}:${w}`, { quarter: 'origin', kind: 'cognate', label: w, lang: l });
  }
  for (const w of row?.confused ?? []) {
    const k = normalizeWord(w, lang), i = web.byKey.get(k);
    add(k, { quarter: 'form', kind: 'lookalike', label: w, key: k, optional: true, state: i === undefined ? undefined : web.nodes[i].state, ghost: i === undefined });
  }
  for (const t of self === undefined ? [] : web.threads) {
    const other = t.a === self ? t.b : t.b === self ? t.a : undefined;
    if (other === undefined) continue;
    const n = web.nodes[other];
    if (t.kind === 'link') add(n.key, { quarter: 'meaning', kind: 'link', label: n.label, key: n.key, state: n.state });
    else if (t.kind === 'member' && n.kind === 'theme') add(n.id, { quarter: 'meaning', kind: 'theme', label: n.label });
    // Between two words a hub thread is always a shared character: the character itself, or a word written with it.
    else if (t.kind === 'member' && (n.kind === 'char' || n.kind === 'word')) add(n.id, { quarter: 'form', kind: 'char', label: n.label, key: n.kind === 'word' ? n.key : undefined, state: n.state });
  }
  // Set phrases: the ones made of more of your words first, then the shorter.
  const yours = (p: string) => p.split(/[\s,.;!?¿¡]+/).filter((t) => web.byKey.has(normalizeWord(t, lang))).length;
  const phrases = [...new Set((row?.entries ?? []).flatMap((e) => (e.phrases ?? []).map(([p]) => p)))];
  phrases.sort((a, b) => yours(b) - yours(a) || a.length - b.length);
  for (const p of phrases.slice(0, PHRASES_MAX)) out.push({ quarter: 'use', kind: 'phrase', label: p });
  return out;
}
