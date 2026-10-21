import { useLiveQuery } from 'dexie-react-hooks';
import type { Recent } from '@/core/mentis/today';
import { db } from '@/data/db';

const WEEK = 7 * 86_400_000;

/** What the learner read, watched and listened to in the last seven days, newest first. */
export function useRecent(lang: string): Recent[] | undefined {
  return useLiveQuery(async () => {
    const since = Date.now() - WEEK;
    const [texts, media] = await Promise.all([
      db.texts.where('lang').equals(lang).filter((t) => !t.deletedAt && t.kind !== 'shelfItem' && (t.lastOpenedAt ?? 0) >= since).toArray(),
      db.media.where('lang').equals(lang).filter((m) => !m.deletedAt && m.kind !== 'radio' && (m.lastPlayedAt ?? 0) >= since).toArray(),
    ]);
    const seen = new Set<string>();
    const out: Recent[] = [
      ...texts.map((t): Recent => ({ title: t.title, lane: 'read', at: t.lastOpenedAt! })),
      // A series or a podcast is talked about by its name, not by the episode's.
      ...media.map((m): Recent => ({ title: m.collection ?? m.title, lane: m.kind === 'video' ? 'watch' : 'listen', at: m.lastPlayedAt! })),
    ]
      .sort((a, b) => b.at - a.at)
      .filter((r) => !seen.has(r.title) && Boolean(seen.add(r.title)));
    return out.slice(0, 6);
  }, [lang]);
}
