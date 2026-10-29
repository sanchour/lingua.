import type { Grammar, Topic } from './types';
import { topicsOf } from './types';

export interface GrammarSearchResult {
  topic: Topic;
  score: number;
  matchReasons: string[];
}

const COMMON_STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'and', 'or',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'how', 'when', 'why', 'what', 'where', 'who', 'which', 'can',
  'could', 'should', 'would', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my',
  'your', 'his', 'her', 'its', 'our', 'their', 'use', 'using', 'say', 'saying',
]);

const GRAMMAR_SYNONYMS: Record<string, string[]> = {
  past: ['preterite', 'imperfect', 'passé', 'perfekt', 'präteritum', 'past', 'pluperfect'],
  future: ['future', 'futur', 'ir a', 'will', 'going to'],
  continuous: ['progressive', 'gerund', 'ing', 'estar'],
  commands: ['imperative', 'command', 'order'],
  polite: ['formal', 'politeness', 'usted', 'vous', 'conditional'],
  gender: ['masculine', 'feminine', 'neuter', 'articles', 'noun'],
  articles: ['article', 'definite', 'indefinite', 'el', 'la', 'un', 'una', 'le', 'der', 'die', 'das'],
  questions: ['question', 'interrogative', 'asking', 'word order'],
  negation: ['negative', 'not', 'no', 'never', 'ne pas', 'nicht'],
  pronouns: ['pronoun', 'direct object', 'indirect object', 'clitic', 'reflexive', 'possessive'],
  subjunctive: ['subjunctive', 'subjuntivo', 'subjonctif', 'konjunktiv', 'mood', 'doubt', 'wishes'],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

/** Rank topics matching a plain-language search query. */
export function searchTopics(grammar: Grammar, query: string): GrammarSearchResult[] {
  const normQuery = normalize(query);
  if (!normQuery) return [];

  const rawTokens = normQuery.split(/\s+/).filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => !COMMON_STOP_WORDS.has(t));
  const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  // Expand with synonyms
  const expandedTokens = new Set(queryTokens);
  for (const token of queryTokens) {
    for (const [key, syns] of Object.entries(GRAMMAR_SYNONYMS)) {
      if (token === key || syns.includes(token)) {
        expandedTokens.add(key);
        for (const s of syns) expandedTokens.add(s);
      }
    }
  }

  const allTopics = topicsOf(grammar);
  const results: GrammarSearchResult[] = [];

  for (const topic of allTopics) {
    let score = 0;
    const matchReasons: string[] = [];

    const normTitle = normalize(topic.title);
    const normSummary = normalize(topic.summary);
    const normWhy = normalize(topic.why);
    const normId = normalize(topic.id);
    const tags = (topic.tags ?? []).map((t) => normalize(t));
    const ruleText = normalize(topic.rule.join(' '));

    // Full query matches title
    if (normTitle.includes(normQuery)) {
      score += 120;
      matchReasons.push('Title exact match');
    }

    // Full query matches summary
    if (normSummary.includes(normQuery)) {
      score += 60;
      matchReasons.push('Summary match');
    }

    // Token matches
    for (const token of queryTokens) {
      if (token.length < 2) continue;

      if (normId.includes(token)) {
        score += 40;
        matchReasons.push(`Topic key matches "${token}"`);
      }

      const titleWords = normTitle.split(/\s+/);
      if (titleWords.some((w) => w === token)) {
        score += 50;
        matchReasons.push(`Title contains "${token}"`);
      } else if (normTitle.includes(token)) {
        score += 25;
      }

      if (tags.some((t) => t.includes(token))) {
        score += 35;
        matchReasons.push(`Tag matches "${token}"`);
      }

      if (normSummary.includes(token)) {
        score += 20;
      }

      if (normWhy.includes(token)) {
        score += 15;
      }

      if (ruleText.includes(token)) {
        score += 10;
      }
    }

    // Synonym matches
    for (const token of expandedTokens) {
      if (queryTokens.includes(token)) continue;
      if (normTitle.includes(token)) {
        score += 25;
        matchReasons.push(`Related concept "${token}"`);
      } else if (normSummary.includes(token) || tags.some((t) => t.includes(token))) {
        score += 15;
      }
    }

    // Search in examples bracketed focus words
    const sampleWords = topic.items.slice(0, 5).map((item) => {
      const m = /\[(.*?)\]/.exec(item.s);
      return m ? normalize(m[1]) : '';
    });
    for (const token of queryTokens) {
      if (sampleWords.some((w) => w === token)) {
        score += 20;
        matchReasons.push(`Matches example word "${token}"`);
      }
    }

    if (score > 15) {
      results.push({
        topic,
        score,
        matchReasons: [...new Set(matchReasons)],
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
