// The learner's own mistakes as plain text, for Max to make exercises from (6-6b): the weak spots of the record, in words.
import { loadGrammar } from '@/core/grammar/load';
import { findTopic } from '@/core/grammar/types';
import { learnerRecord } from './learner';

/** One line per persistent or recent weak spot ("word casa: wrote cassa, should be casa"); empty when there is nothing to say. */
export async function mistakesText(lang: string, limit = 12): Promise<string> {
  const [spots, grammar] = await Promise.all([learnerRecord().weakSpots(lang, { limit }), loadGrammar(lang)]);
  return spots
    .map((s) => {
      const name = s.item.type === 'word' ? `word ${s.item.wordId.split(':').slice(1).join(':')}` : s.item.type === 'grammar' ? `grammar: ${(grammar && findTopic(grammar, s.item.topicId)?.title) || s.item.topicId.replace(/^course:/, '')}` : s.item.type === 'sound' ? `sound ${s.item.soundId}` : 'a sentence pattern';
      const ex = s.examples.find((e) => e.given && e.expected);
      return `${name}${ex ? `: wrote "${ex.given}", should be "${ex.expected}"` : ''} (wrong ${s.wrong} times)`;
    })
    .join('\n');
}
