// "Label the speakers" (6-9, Max): the model reads a transcript's lines and says which voice says each. A guess from the words alone;
// it cannot hear the audio, so it is offered as a guess and kept on the cues.
import { applySpeakers, MAX_SPEAKER_LINES } from '@/core/audio/speakers';
import type { Cue } from '@/data/types';
import { askJson, LlmError } from './client';

export async function labelSpeakers(cues: readonly Cue[]): Promise<Cue[]> {
  if (cues.length > MAX_SPEAKER_LINES) throw new LlmError(`This transcript has more than ${MAX_SPEAKER_LINES} lines; labelling is for shorter ones.`, 'bad-response');
  const answer = await askJson<unknown>({
    system:
      'You read a transcript of a conversation, one numbered line each, and say who speaks each line. Answer only with JSON: {"speakers": [string]}, one short label per line in order ("A", "B"…, at most four; the same label means the same person). ' +
      'You cannot hear the audio: decide from the words (questions answered, turns taken, greetings). If it is one person talking, label every line "A".',
    user: cues.map((c, i) => `${i + 1}. ${c.text}`).join('\n'),
    kind: 'speakers',
  });
  const labelled = applySpeakers(cues, answer);
  if (!labelled) throw new LlmError('The AI’s answer did not fit the transcript. Try again.', 'bad-response');
  return labelled;
}
