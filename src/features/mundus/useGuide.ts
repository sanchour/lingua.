import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { emptyWeek, guideNote, nextSteps, SESSION_LANE, steer } from '@/core/mundus/guide';
import type { GuideInput, Step, Steer, Week } from '@/core/mundus/guide';
import { tipsFor } from '@/core/mundus/tips';
import type { Picks } from '@/core/mundus/types';
import { useChallenges } from '@/data/challenges';
import { db } from '@/data/db';
import { currentGrammarTopic } from '@/data/grammar';
import { localDateKey } from '@/lib/format';
import { usePicks } from '@/features/mundus/hooks';

const DAY = 86_400_000;

/** Minutes per lane over the last seven days, from the activity sessions. */
export function useWeek(lang: string): Week | undefined {
  return useLiveQuery(async () => {
    const rows = await db.sessions.where('[lang+startedAt]').between([lang, Date.now() - 7 * DAY], [lang, Infinity]).toArray();
    const week = emptyWeek();
    for (const r of rows) {
      const lane = SESSION_LANE[r.type];
      if (lane) week[lane] += r.activeMs / 60_000;
    }
    for (const lane of Object.keys(week) as Array<keyof Week>) week[lane] = Math.round(week[lane]);
    return week;
  }, [lang]);
}

/** Whether the learner has anything yet in each room, for "try a room you haven't" steps. */
function useUsed(lang: string): GuideInput['used'] | undefined {
  return useLiveQuery(async () => {
    const [texts, feeds, media, decks] = await Promise.all([
      db.texts.where('lang').equals(lang).filter((t) => !t.deletedAt).count(),
      db.feeds.where('lang').equals(lang).filter((f) => !f.deletedAt).count(),
      db.media.where('lang').equals(lang).filter((m) => !m.deletedAt && m.kind !== 'radio').toArray(),
      db.decks.where('lang').equals(lang).filter((d) => !d.deletedAt).count(),
    ]);
    return { codex: texts > 0, sonus: feeds > 0 || media.some((m) => m.kind !== 'video'), visio: media.some((m) => m.kind === 'video'), thesaurus: decks > 0 };
  }, [lang]);
}

/** Grammatica's next topic for the learner, when the language has grammar. */
function useGrammarNext(lang: string, level: string): GuideInput['grammar'] {
  const [found, setFound] = useState<{ key: string; topic?: GuideInput['grammar'] }>();
  const key = `${lang}:${level}`;
  useEffect(() => {
    let alive = true;
    currentGrammarTopic(lang, level)
      .then((r) => alive && setFound({ key, topic: r ? { id: r.topic.id, title: r.topic.title } : undefined }))
      .catch(() => alive && setFound({ key }));
    return () => {
      alive = false;
    };
  }, [lang, level, key]);
  return found?.key === key ? found.topic : undefined;
}

export interface Guide {
  lang: string;
  langName: string;
  week: Week;
  steer: Steer;
  note: string;
  steps: Step[];
  picks: Picks | null;
  /** Tips done today (they stay in place, ticked). */
  doneToday: Set<string>;
}

/** Everything Mundus shows: the week, where to steer, the note and the next steps. */
export function useGuide(): Guide | undefined {
  const { language, settings } = useApp();
  const lang = language.id;
  const enjoys = settings.learner.enjoys;
  const picks = usePicks(lang);
  const week = useWeek(lang);
  const used = useUsed(lang);
  const done = useChallenges(lang);
  const grammar = useGrammarNext(lang, language.level);
  const day = Math.floor(Date.now() / DAY);

  return useMemo(() => {
    if (picks === undefined || !week || !used || !done) return undefined;
    const today = localDateKey();
    const doneTips = new Set(done.filter((r) => r.date !== today).map((r) => r.tipId));
    const s = steer(week, enjoys);
    const langName = getLanguage(lang)?.name ?? lang;
    return {
      lang,
      langName,
      week,
      steer: s,
      note: guideNote(week, s, langName),
      steps: nextSteps({ level: language.level, enjoys, week, picks, tips: tipsFor(lang), doneTips, used, grammar, day }),
      picks,
      doneToday: new Set(done.filter((r) => r.date === today).map((r) => r.tipId)),
    };
  }, [picks, week, used, done, enjoys, lang, language.level, grammar, day]);
}
