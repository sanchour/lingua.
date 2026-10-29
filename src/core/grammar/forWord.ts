// Which grammar topics a word leads to (6-1c): by what kind of word it is, found by what the topics are called. A stand-in for
// hand-made links (shortcut: keywords in titles; upgrade to a `pos` field on Topic when the topics are tagged).
import { topicsOf } from './types';
import type { Grammar, Topic } from './types';

const BY_POS: Record<string, RegExp> = {
  noun: /gender|article|plural/i,
  verb: /present|tense|preterite|imperfect|conjugat|verb|reflexive|perfect/i,
  adj: /adjective|agree|possessive|more than|compar/i,
  adv: /adverb/i,
  pron: /pronoun|\blo, la\b|\ble and les\b|it and them|to him|possessive/i,
  prep: /preposition|por or para|\bin, on\b/i,
  det: /article|possessive|gender/i,
};

/** Up to three topics for a word of this kind, the earliest levels first. A reflexive sense adds the topic on reflexive verbs. */
export function topicsForWord(grammar: Grammar, pos: string | undefined, reflexive = false): Topic[] {
  const all = topicsOf(grammar);
  const kind = BY_POS[(pos ?? '').toLowerCase()];
  const picked = kind ? all.filter((t) => kind.test(t.title)) : [];
  if (reflexive) {
    const r = all.find((t) => /reflexive/i.test(t.title));
    if (r) picked.splice(0, picked.length, r, ...picked.filter((x) => x !== r));
  }
  return picked.slice(0, 3);
}
