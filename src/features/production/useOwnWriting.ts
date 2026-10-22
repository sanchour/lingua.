import { useState } from 'react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { createEntry, saveEntryText, saveReview } from '@/data/journal';
import { aiKeys } from '@/data/plan';
import type { JournalReview } from '@/data/types';
import { checkEntry } from '@/services/llm/journal';
import { toast } from '@/state/ui';

/** A message for someone who speaks the language: the task and the text, asking for corrections. */
export function speakerRequest(languageName: string, level: string, task: string, text: string): string {
  return `Could you correct my ${languageName}? I’m learning (about ${level}), and this is a writing task I gave myself.\n\nThe task: ${task}\n\nWhat I wrote:\n${text.trim()}\n\nThank you!`;
}

/** Words written, or characters for Mandarin. */
export const writtenCount = (text: string, lang: string) => (lang === 'zh' ? text.trim().length : text.trim() ? text.trim().split(/\s+/).length : 0);

/**
 * Writing in your own words, wherever it is asked for (the course's Write lesson, the reader's end
 * page, the players): the text, the AI check with a key (Max), keeping it in Diarium, and copying it
 * for someone who speaks the language. `prompt` is what the check and the speaker are told.
 */
export function useOwnWriting(lang: string, prompt: string) {
  const { settings, language } = useApp();
  const canCheck = Boolean(aiKeys(settings)[settings.llm.provider]?.trim() && settings.llm.model);
  const name = getLanguage(lang)?.name ?? lang;
  const [text, setTextRaw] = useState('');
  const [review, setReview] = useState<JournalReview | null>(null);
  const [checking, setChecking] = useState(false);
  const [kept, setKept] = useState(false);
  const count = writtenCount(text, lang);
  const enough = lang === 'zh' ? count >= 8 : count >= 5;

  const setText = (next: string) => {
    setTextRaw(next);
    setReview(null);
    setKept(false);
  };

  const check = async () => {
    setChecking(true);
    try {
      setReview(await checkEntry(lang, language.level, text, prompt));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The check didn’t work this time.', { tone: 'error' });
    } finally {
      setChecking(false);
    }
  };

  const ask = async () => {
    try {
      await navigator.clipboard.writeText(speakerRequest(name, language.level === 'A0' ? 'A1' : language.level, prompt, text));
      toast(`Copied. Paste it to a friend who speaks ${name}, or in a language exchange.`, { tone: 'success' });
    } catch {
      toast('Couldn’t copy. Select the text and copy it yourself.', { tone: 'error' });
    }
  };

  /** Into Diarium, with the check if there was one; `title` is the entry's prompt (what it is about). */
  const keep = async (title = prompt) => {
    const id = await createEntry(lang, { text: title, en: prompt });
    await saveEntryText(id, text, lang);
    if (review) await saveReview(id, review);
    setKept(true);
    toast('Kept in Diarium, in Mentis.', { tone: 'success' });
  };

  return { text, setText, count, enough, review, checking, kept, canCheck, name, check, ask, keep };
}
