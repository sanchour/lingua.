// Mentis's "Today's prompt" (Lingua 5.1-1): one thing to write and one thing to talk about, at the
// learner's level, chosen from what they read, watched and listened to this week. Pure: the rail
// gathers the week (features/mentis/useRecent.ts) and draws this.
import { sceneOfTheDay } from '@/core/colloquium/prompts';
import { curatedPrompt } from '@/core/lang/prompts';
import type { Level } from '@/core/lang/levels';

/** Something the learner spent time with this week. */
export interface Recent {
  title: string;
  lane: 'read' | 'watch' | 'listen';
  /** When it was last opened. */
  at: number;
}

export interface TodayWrite {
  /** The prompt as the entry keeps it: in the language, or the title it is about. */
  text: string;
  en: string;
  about?: string;
}

export interface TodayTalk {
  title: string;
  detail: string;
  scene?: string;
  about?: string;
}

const LOW = new Set<Level>(['A0', 'A1', 'A2']);

const WRITE_ABOUT: Record<Recent['lane'], (title: string) => string> = {
  read: (t) => `Write three lines about ${t}: what happened, and what you think of it.`,
  watch: (t) => `Write three lines about ${t}: a scene you remember, and why.`,
  listen: (t) => `Write three lines about ${t}: one thing you heard and want to keep.`,
};

const VERB: Record<Recent['lane'], string> = { read: 'read', watch: 'watched', listen: 'listened to' };

/**
 * Today's two prompts. With things from this week they take turns by day (the newest first);
 * without, writing falls back to Diarium's prompt of the day and talking to the scene of the day.
 */
export function todayPrompt(lang: string, level: Level, recent: readonly Recent[], day: number): { write: TodayWrite; talk: TodayTalk } {
  const list = [...recent].sort((a, b) => b.at - a.at).slice(0, 3);
  const writeAbout = list.length ? list[day % list.length] : undefined;
  // Talking takes the next one along, so the two prompts are about different things when they can be.
  const talkAbout = list.length ? list[(day + 1) % list.length] : undefined;

  const write: TodayWrite = writeAbout ? { text: writeAbout.title, en: WRITE_ABOUT[writeAbout.lane](writeAbout.title), about: writeAbout.title } : curatedPrompt(lang, level, new Date(day * 86_400_000));

  let talk: TodayTalk;
  if (talkAbout) {
    talk = {
      title: `Talk about ${talkAbout.title}`,
      detail: LOW.has(level)
        ? `Something you ${VERB[talkAbout.lane]} this week. Say what it is and whether you liked it, in short sentences.`
        : `Something you ${VERB[talkAbout.lane]} this week. Retell a part of it, say what you think, and ask the AI what it would have done.`,
      about: talkAbout.title,
    };
  } else {
    const scene = sceneOfTheDay(level, day);
    talk = { title: scene.title, detail: scene.detail, scene: scene.id };
  }
  return { write, talk };
}

/** Where the talk prompt opens: Sermo with its topic or scene picked. */
export const talkPath = (talk: TodayTalk) => (talk.about ? `/mentis/sermo?topic=${encodeURIComponent(talk.about)}` : `/mentis/sermo?scene=${talk.scene ?? ''}`);
