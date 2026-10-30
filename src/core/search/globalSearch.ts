// Global search ranking across Lingua (`Ctrl+K` / `⌘K` palette, 6-22):
// Searches words, decks, flashcards/notes (F1283), saved Codex texts & chapters (F1282),
// journal entries, and grammar topics.
import type { Chapter, Deck, JournalEntry, Note, Text, Word } from '@/data/types';
import { editDistance, stripAccents } from '@/core/dictionary/searchTools';

export type GlobalSearchKind = 'word' | 'deck' | 'card' | 'text' | 'journal' | 'grammar';

export interface GlobalSearchHit {
  id: string;
  kind: GlobalSearchKind;
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  score: number;
}

export interface GlobalSearchCorpus {
  words?: Word[];
  decks?: Deck[];
  notes?: Note[];
  texts?: Text[];
  chapters?: Chapter[];
  journalEntries?: JournalEntry[];
  grammarTopics?: Array<{ id: string; title: string; level?: string; summary?: string }>;
}

function scoreField(queryFold: string, candidateRaw: string): number {
  const c = stripAccents(candidateRaw);
  if (!c || !queryFold) return 0;
  if (c === queryFold) return 100;
  if (c.startsWith(queryFold)) return 85 - Math.min(20, (c.length - queryFold.length) * 0.5);
  if (c.includes(queryFold)) return 65;
  if (queryFold.length >= 4 && c.length >= 3 && Math.abs(c.length - queryFold.length) <= 2) {
    const dist = editDistance(c, queryFold, 1);
    if (dist <= 1) return 50;
  }
  return 0;
}

export function rankGlobalSearch(corpus: GlobalSearchCorpus, rawQuery: string, limit = 24): GlobalSearchHit[] {
  const qFold = stripAccents(rawQuery);
  if (!qFold) return [];

  const hits: GlobalSearchHit[] = [];

  // 1. Personal vocabulary words (F1281)
  for (const w of corpus.words ?? []) {
    if (w.deletedAt) continue;
    const termScore = scoreField(qFold, w.norm);
    const glossScore = w.gloss ? scoreField(qFold, w.gloss) * 0.85 : 0;
    const noteScore = w.note ? scoreField(qFold, w.note) * 0.7 : 0;
    const best = Math.max(termScore, glossScore, noteScore);
    if (best > 0) {
      hits.push({
        id: `word:${w.id}`,
        kind: 'word',
        title: w.norm,
        subtitle: w.gloss || (w.state === 1 ? 'Known word' : w.state === 2 ? 'Learning word' : 'Saved word'),
        snippet: w.note,
        href: `/thesaurus?tab=dictionary&word=${encodeURIComponent(w.lemma || w.norm)}`,
        score: best + (w.favourite ? 4 : 0),
      });
    }
  }

  // 2. Decks
  const deckNames = new Map<string, string>();
  for (const d of corpus.decks ?? []) {
    if (d.deletedAt) continue;
    deckNames.set(d.id, d.name);
    const nameScore = scoreField(qFold, d.name);
    const descScore = d.description ? scoreField(qFold, d.description) * 0.7 : 0;
    const best = Math.max(nameScore, descScore);
    if (best > 0) {
      hits.push({
        id: `deck:${d.id}`,
        kind: 'deck',
        title: d.name,
        subtitle: d.description || 'Vocabulary deck',
        href: `/thesaurus/deck/${d.id}`,
        score: best + 2,
      });
    }
  }

  // 3. Flashcards & notes (F1283)
  for (const n of corpus.notes ?? []) {
    if (n.deletedAt) continue;
    const termScore = scoreField(qFold, n.term);
    const meaningScore = scoreField(qFold, n.meaning) * 0.9;
    const exScore = n.example?.text ? scoreField(qFold, n.example.text) * 0.75 : 0;
    const mnemonicScore = n.mnemonic ? scoreField(qFold, n.mnemonic) * 0.7 : 0;
    const tagScore = (n.tags ?? []).some((t) => stripAccents(t).includes(qFold)) ? 60 : 0;
    const best = Math.max(termScore, meaningScore, exScore, mnemonicScore, tagScore);
    if (best > 0) {
      const deckName = deckNames.get(n.deckId) ?? 'Deck';
      hits.push({
        id: `card:${n.id}`,
        kind: 'card',
        title: `${n.term} — ${n.meaning}`,
        subtitle: `Card in ${deckName}`,
        snippet: n.example?.text ?? n.mnemonic,
        href: `/thesaurus/deck/${n.deckId}`,
        score: best,
      });
    }
  }

  // 4. Saved texts, highlights & chapters in Codex (F1282)
  const textById = new Map<string, Text>();
  for (const t of corpus.texts ?? []) {
    if (t.deletedAt) continue;
    textById.set(t.id, t);
    const titleScore = scoreField(qFold, t.title);
    const authorScore = t.author ? scoreField(qFold, t.author) * 0.85 : 0;
    let markSnippet: string | undefined;
    let markScore = 0;
    for (const m of t.readingMarks ?? []) {
      const ms = Math.max(scoreField(qFold, m.quote), m.note ? scoreField(qFold, m.note) : 0) * 0.8;
      if (ms > markScore) {
        markScore = ms;
        markSnippet = m.note ? `"${m.quote}" — ${m.note}` : `"${m.quote}"`;
      }
    }
    const best = Math.max(titleScore, authorScore, markScore);
    if (best > 0) {
      hits.push({
        id: `text:${t.id}`,
        kind: 'text',
        title: t.title,
        subtitle: t.author ? `By ${t.author}` : 'Codex text',
        snippet: markSnippet,
        href: `/codex/read/${t.id}`,
        score: best + 3,
      });
    }
  }

  for (const ch of corpus.chapters ?? []) {
    if (ch.deletedAt) continue;
    const parent = textById.get(ch.textId);
    if (!parent) continue;
    for (const b of ch.blocks) {
      if (b.t === 'img') continue;
      if (stripAccents(b.text).includes(qFold)) {
        hits.push({
          id: `chapter:${ch.id}`,
          kind: 'text',
          title: parent.title,
          subtitle: ch.title ? `${ch.title}` : `Chapter ${ch.index + 1}`,
          snippet: b.text.slice(0, 140),
          href: `/codex/read/${parent.id}`,
          score: 58,
        });
        break;
      }
    }
  }

  // 5. Journal entries (F1283)
  for (const j of corpus.journalEntries ?? []) {
    if (j.deletedAt) continue;
    const titleScore = j.title ? scoreField(qFold, j.title) : 0;
    const bodyScore = scoreField(qFold, j.text) * 0.8;
    const best = Math.max(titleScore, bodyScore);
    if (best > 0) {
      hits.push({
        id: `journal:${j.id}`,
        kind: 'journal',
        title: j.title || `Journal (${j.date})`,
        subtitle: `Diarium · ${j.date}`,
        snippet: j.text.slice(0, 120),
        href: `/mentis/entry/${j.id}`,
        score: best,
      });
    }
  }

  // 6. Grammar topics
  for (const g of corpus.grammarTopics ?? []) {
    const tScore = scoreField(qFold, g.title);
    const sScore = g.summary ? scoreField(qFold, g.summary) * 0.75 : 0;
    const best = Math.max(tScore, sScore);
    if (best > 0) {
      hits.push({
        id: `grammar:${g.id}`,
        kind: 'grammar',
        title: g.title,
        subtitle: g.level ? `Grammatica · ${g.level}` : 'Grammatica',
        snippet: g.summary,
        href: `/cursus/grammatica/${encodeURIComponent(g.id)}`,
        score: best + 1,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
