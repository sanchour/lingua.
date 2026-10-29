// The learner's error log (6-5b, F1127): what they got wrong, newest first, from the one record every room writes to and from the
// corrections in their conversations. Pure: the rows come in, a list goes out.
import type { EvidenceItem, EvidenceRow, MistakeCategory } from '@/core/contracts/learner';
import type { Chat } from '@/data/types';

export interface ErrorEntry {
  id: string;
  at: number;
  /** Where it came from: the record (a word, a grammar topic, a sound) or a conversation. */
  source: 'word' | 'grammar' | 'sound' | 'pattern' | 'text' | 'conversation';
  /** What it is about, in words. */
  title: string;
  /** What was written or said, and what was right. */
  given?: string;
  expected?: string;
  /** For a conversation: why. */
  note?: string;
  category?: MistakeCategory;
  /** Where to practise it. */
  link?: string;
  /** How many times the same mistake is in the log (the same correction in conversations, the same item in the record). */
  times: number;
}

/** The wrong rows of the record and the corrections in the chats, newest first, at most `limit`. `nameOf` says an item in words. */
export function buildErrorLog(rows: readonly EvidenceRow[], chats: readonly Chat[], nameOf: (item: EvidenceItem) => string, limit = 60): ErrorEntry[] {
  const fromRecord = rows
    .filter((r) => r.outcome === 'wrong')
    .map<ErrorEntry>((r) => ({
      id: r.id,
      at: r.at,
      source: r.item.type,
      title: nameOf(r.item),
      given: r.given,
      expected: r.expected,
      category: r.category,
      link: r.item.type === 'grammar' && !r.item.topicId.startsWith('course:') ? `/cursus/grammatica/${r.item.topicId}` : undefined,
      times: 1,
    }));
  const fromChats = chats
    .filter((c) => !c.deletedAt)
    .flatMap((c) =>
      c.messages.flatMap((m, i) =>
        (m.corrections ?? []).map<ErrorEntry>((x, j) => ({ id: `${c.id}:${i}:${j}`, at: m.at, source: 'conversation', title: c.title, given: x.original, expected: x.suggestion, note: x.explanation, times: 1 })),
      ),
    );
  const all = [...fromRecord, ...fromChats];
  // The same correction again and again, in any conversation, is a habit; so is the same item missed again and again in the record.
  const keyOf = (e: ErrorEntry) => (e.source === 'conversation' ? `c:${(e.expected ?? '').trim().toLocaleLowerCase()}` : `r:${e.source}:${e.title}`);
  const seen = new Map<string, number>();
  for (const e of all) seen.set(keyOf(e), (seen.get(keyOf(e)) ?? 0) + 1);
  return all
    .map((e) => ({ ...e, times: seen.get(keyOf(e)) ?? 1 }))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}
