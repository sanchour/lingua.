// The learner's record, worked out (6-5): from the evidence rows alone, what is weak, what is quiet, what is known one way
// and not the other. Pure: no database, no DOM, so Grammatica, Ratio and the tutor ask the same questions of the same rows.
import type { EvidenceDay, EvidenceItem, EvidenceRow, MistakeCategory, Skill, WeakSpot } from '@/core/contracts/learner';
import { PERSISTENT_MISTAKE } from '@/core/contracts/learner';

export const SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'pronunciation', 'speaking', 'writing', 'translating'];

/** An item as one string: the index, and what rows are grouped by. */
export function itemKeyOf(item: EvidenceItem): string {
  switch (item.type) {
    case 'word':
      return `word:${item.wordId}`;
    case 'grammar':
      return `grammar:${item.topicId}`;
    case 'sound':
      return `sound:${item.soundId}`;
    case 'pattern':
      return `pattern:${item.patternId}`;
    case 'text':
      return `text:${item.textId}`;
  }
}

/** The word a `word:` key is about (`es:casa`), or null for another kind of item. */
export const wordIdOfKey = (key: string) => (key.startsWith('word:') ? key.slice(5) : null);

/** Exercise kinds that show the answer among others (knowing it when it is seen), and kinds that make it (knowing it to say or write). */
const RECOGNISING = new Set(['mcq', 'match', 'choose-meaning', 'choose-term', 'listen', 'truefalse', 'article', 'classic']);
const PRODUCING = new Set(['type', 'spell', 'dictation', 'build', 'translate', 'speak', 'transform', 'cloze']);

/** Wrong answers per item (and category), most worrying first: a mistake on three different days, or in three places, is persistent; once is a slip. */
export function weakSpotsOf(rows: readonly EvidenceRow[], opts: { skill?: Skill; limit?: number } = {}): WeakSpot[] {
  const groups = new Map<string, EvidenceRow[]>();
  for (const r of rows) {
    if (r.outcome !== 'wrong' || (opts.skill && r.skill !== opts.skill)) continue;
    const key = `${r.itemKey}|${r.category ?? ''}`;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  const spots = [...groups.values()].map((wrong): WeakSpot => {
    wrong.sort((a, b) => b.at - a.at);
    const days = new Set(wrong.map((r) => r.day)).size;
    const places = new Set(wrong.map((r) => r.contextId ?? r.room)).size;
    const first = wrong[0];
    return {
      item: first.item,
      category: first.category,
      skill: first.skill,
      wrong: wrong.length,
      days,
      places,
      persistent: days >= PERSISTENT_MISTAKE.days || places >= PERSISTENT_MISTAKE.places,
      examples: wrong.slice(0, 5).map((r) => ({ given: r.given, expected: r.expected, at: r.at, room: r.room, contextId: r.contextId })),
    };
  });
  spots.sort((a, b) => Number(b.persistent) - Number(a.persistent) || b.days - a.days || b.wrong - a.wrong || b.examples[0].at - a.examples[0].at);
  return spots.slice(0, opts.limit ?? spots.length);
}

/** Words answered right when the answer was in front of them, and never right (but wrong at least once) when they had to make it. */
export function recognisedNotRecalled(rows: readonly EvidenceRow[], limit = 50): string[] {
  const seen = new Map<string, { recognised: boolean; recalled: boolean; failedToRecall: number; last: number }>();
  for (const r of rows) {
    if (r.item.type !== 'word') continue;
    const s = seen.get(r.itemKey) ?? { recognised: false, recalled: false, failedToRecall: 0, last: 0 };
    const kind = r.kind ?? '';
    const right = r.outcome === 'right' || r.outcome === 'close';
    if (RECOGNISING.has(kind) && right && !r.assisted) s.recognised = true;
    if (PRODUCING.has(kind)) {
      if (right && !r.assisted) s.recalled = true;
      else if (r.outcome === 'wrong') s.failedToRecall++;
    }
    s.last = Math.max(s.last, r.at);
    seen.set(r.itemKey, s);
  }
  return [...seen.entries()]
    .filter(([, s]) => s.recognised && !s.recalled && s.failedToRecall > 0)
    .sort((a, b) => b[1].last - a[1].last)
    .slice(0, limit)
    .map(([key]) => wordIdOfKey(key)!);
}

/** The skills with the fewest answers in the last `days` days, quietest first (a skill with none comes first). */
export function quietSkills(rows: readonly EvidenceRow[], now: number, days = 14): Skill[] {
  const since = now - days * 86_400_000;
  const counts = new Map<Skill, number>(SKILLS.map((s) => [s, 0]));
  for (const r of rows) if (r.at >= since && r.at <= now) counts.set(r.skill, (counts.get(r.skill) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[1] - b[1] || SKILLS.indexOf(a[0]) - SKILLS.indexOf(b[0])).map(([s]) => s);
}

/** One day's rows as the small summary kept for it. */
export function summariseDay(lang: string, day: string, rows: readonly EvidenceRow[]): EvidenceDay {
  const bySkill: EvidenceDay['bySkill'] = {};
  const byCategory: EvidenceDay['byCategory'] = {};
  for (const r of rows) {
    const s = (bySkill[r.skill] ??= { right: 0, wrong: 0, assisted: 0 });
    if (r.outcome === 'right' || r.outcome === 'close') s.right++;
    else if (r.outcome === 'wrong') s.wrong++;
    if (r.assisted) s.assisted++;
    if (r.outcome === 'wrong' && r.category) byCategory[r.category as MistakeCategory] = (byCategory[r.category as MistakeCategory] ?? 0) + 1;
  }
  return { id: `${lang}:${day}`, lang, day, bySkill, byCategory };
}
