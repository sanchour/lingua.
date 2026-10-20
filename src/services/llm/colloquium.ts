// Colloquium's chat with the learner's own key: the AI answers in the language, and each of the
// learner's lines comes back with what to fix, so mistakes are corrected without stopping the talk.
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import type { Chat, ChatMessage } from '@/data/types';
import { chatJson } from './client';
import type { Turn } from './client';

export interface AiTurn {
  reply: string;
  en?: string;
  /** For the learner's last line. */
  corrections: NonNullable<ChatMessage['corrections']>;
  words: NonNullable<ChatMessage['words']>;
}

function system(lang: string, level: Level): string {
  const name = getLanguage(lang)?.name ?? lang;
  const cefr = level === 'A0' ? 'A1' : level;
  return (
    `You are a warm, natural conversation partner for a learner of ${name} at about CEFR ${cefr}. ` +
    `Follow the scene and wishes in the learner's first message, stay in ${name} whatever the learner writes, and keep the conversation going with a question or a new turn. ` +
    'Answer only with JSON: {"reply": string, "english": string, "corrections": [{"original": string, "suggestion": string, "explanation": string}], "words": [{"word": string, "meaning": string}]}. ' +
    `"reply" is your next line in ${name}, one to three sentences that fit the level. "english" is its English translation. ` +
    '"corrections" fixes the learner\'s last message only: "original" quotes the exact wrong words from it, "suggestion" replaces them, "explanation" is one short English sentence; leave it empty when the message is fine or when there is no learner message yet. ' +
    '"words" lists up to three useful words from your reply, in their dictionary form, with a short English meaning.'
  );
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Reads the AI's answer, keeping only well-formed parts (a correction must quote the learner). */
export function readTurn(raw: unknown, lastLine: string | undefined): AiTurn {
  const r = (raw ?? {}) as Record<string, unknown>;
  const reply = text(r.reply);
  if (!reply) throw new Error('The AI sent an empty answer. Try again.');
  const corrections = (Array.isArray(r.corrections) ? r.corrections : [])
    .map((c) => ({ original: text(c?.original), suggestion: text(c?.suggestion), explanation: text(c?.explanation) }))
    .filter((c) => c.original && c.suggestion && c.original !== c.suggestion && Boolean(lastLine?.includes(c.original)));
  const words = (Array.isArray(r.words) ? r.words : [])
    .map((w) => ({ word: text(w?.word), meaning: text(w?.meaning) }))
    .filter((w) => w.word && w.meaning)
    .slice(0, 3);
  return { reply, en: text(r.english) || undefined, corrections, words };
}

/** The AI's next line, given the chat so far (its opening prompt first). */
export async function nextTurn(lang: string, level: Level, chat: Pick<Chat, 'prompt' | 'messages'>): Promise<AiTurn> {
  const turns: Turn[] = [{ role: 'user', content: chat.prompt ?? '' }, ...chat.messages.map((m): Turn => ({ role: m.role === 'me' ? 'user' : 'assistant', content: m.text }))];
  const last = chat.messages.at(-1);
  return readTurn(await chatJson(system(lang, level), turns), last?.role === 'me' ? last.text : undefined);
}
