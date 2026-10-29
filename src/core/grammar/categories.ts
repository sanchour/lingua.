import type { Topic } from './types';

export const GRAMMAR_CATEGORIES = [
  'Verbs & Tenses',
  'Nouns & Articles',
  'Pronouns & Determiners',
  'Adjectives & Adverbs',
  'Prepositions & Particles',
  'Sentence Structure & Clauses',
  'Questions & Negation',
  'General Grammar',
] as const;

export type GrammarCategory = (typeof GRAMMAR_CATEGORIES)[number];

export const GRAMMAR_POS_LIST = [
  'verb',
  'noun',
  'pronoun',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'particle',
  'sentence',
] as const;

export type GrammarPos = (typeof GRAMMAR_POS_LIST)[number];

export const POS_LABELS: Record<GrammarPos, string> = {
  verb: 'Verbs',
  noun: 'Nouns & Articles',
  pronoun: 'Pronouns',
  adjective: 'Adjectives',
  adverb: 'Adverbs',
  preposition: 'Prepositions',
  conjunction: 'Conjunctions',
  particle: 'Particles',
  sentence: 'Sentence Structure',
};

/** Infer or return a topic's category. */
export function topicCategory(topic: Topic, unitTitle = ''): GrammarCategory {
  if (topic.category && GRAMMAR_CATEGORIES.includes(topic.category as GrammarCategory)) {
    return topic.category as GrammarCategory;
  }

  const text = `${topic.id} ${topic.title} ${topic.summary} ${unitTitle} ${(topic.tags ?? []).join(' ')}`.toLowerCase();

  // Questions and negation take high precedence
  if (/\b(question|interrogat|negat|no\b|not\b|ne pas|nicht)/i.test(text)) return 'Questions & Negation';
  // Pronouns before nouns because pronoun descriptions often mention "replaces a noun"
  if (/\b(pronoun|clitic|reflexive|possessive|demonstrative|relative pronoun)/i.test(text)) return 'Pronouns & Determiners';
  if (/\b(verb|tense|preterite|imperfect|subjunctive|conjugat|passive|infinitive|gerund|participle|futur|present|past|conditional|imperative|aspect|auxiliary|copula)/i.test(text)) return 'Verbs & Tenses';
  if (/\b(noun|article|gender|plural|declension)/i.test(text)) return 'Nouns & Articles';
  if (/\b(adjective|adverb|comparative|superlative|agreement)/i.test(text)) return 'Adjectives & Adverbs';
  if (/\b(preposition|postposition|particle|por\b|para\b|prepositional)/i.test(text)) return 'Prepositions & Particles';
  if (/\b(clause|word order|sentence|subordinate|conjunction|connective|syntax)/i.test(text)) return 'Sentence Structure & Clauses';

  return 'General Grammar';
}

/** Infer or return a topic's primary part of speech. */
export function topicPos(topic: Topic, unitTitle = ''): GrammarPos {
  if (topic.pos && GRAMMAR_POS_LIST.includes(topic.pos as GrammarPos)) {
    return topic.pos as GrammarPos;
  }

  const text = `${topic.id} ${topic.title} ${topic.summary} ${unitTitle} ${(topic.tags ?? []).join(' ')}`.toLowerCase();

  if (/\b(pronoun|clitic|possessive pronoun)/i.test(text)) return 'pronoun';
  if (/\b(verb|tense|conjugat|subjunctive|preterite|imperfect|gerund|participle|infinitive|copula)/i.test(text)) return 'verb';
  if (/\b(noun|article|gender|declension)/i.test(text)) return 'noun';
  if (/\b(adjective|comparative|superlative)/i.test(text)) return 'adjective';
  if (/\b(adverb)/i.test(text)) return 'adverb';
  if (/\b(preposition)/i.test(text)) return 'preposition';
  if (/\b(conjunction|connective)/i.test(text)) return 'conjunction';
  if (/\b(particle)/i.test(text)) return 'particle';
  if (/\b(order|clause|sentence|question|negation)/i.test(text)) return 'sentence';

  return 'sentence';
}
