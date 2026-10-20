import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/app/context';
import { loadPicks } from '@/core/mundus/load';
import { deviceCountry, serviceById } from '@/core/mundus/services';
import type { Pick, Picks } from '@/core/mundus/types';
import { discoverTitles, findTitle, providersIn, TmdbError, whereToWatch } from '@/services/mundus/tmdb';
import type { TitleType, TmdbTitle, WhereToWatch } from '@/services/mundus/tmdb';

/** A language's picks; `undefined` while loading, `null` for a language without any. */
export function usePicks(lang: string): Picks | null | undefined {
  const [picks, setPicks] = useState<{ lang: string; picks: Picks | null }>();
  useEffect(() => {
    let alive = true;
    void loadPicks(lang).then((p) => alive && setPicks({ lang, picks: p }));
    return () => {
      alive = false;
    };
  }, [lang]);
  return picks?.lang === lang ? picks.picks : undefined;
}

/** The learner's services, their country (chosen, else the device's) and TMDB token. */
export function useStreaming(): { services: string[]; country: string; token: string } {
  const { settings } = useApp();
  const { services, country } = settings.streaming;
  return useMemo(
    () => ({ services: services.filter((id) => serviceById(id)), country: country || deviceCountry(), token: settings.apiKeys.tmdb.trim() }),
    [services, country, settings.apiKeys.tmdb],
  );
}

export const pickKey = (pick: Pick) => `${pick.title}|${pick.year ?? ''}`;

export interface PickLookup {
  title: TmdbTitle;
  where: WhereToWatch;
}

/** Runs async jobs a few at a time (TMDB answers fast, but not fifty at once). */
async function inBatches<T>(jobs: Array<() => Promise<T>>, size = 4): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < jobs.length; i += size) out.push(...(await Promise.all(jobs.slice(i, i + size).map((j) => j()))));
  return out;
}

/**
 * With a TMDB token: each hand-picked series and film found on TMDB (a poster, and where it streams
 * in the learner's country). Empty without a token.
 */
export function usePickLookups(lang: string, picks: Picks | null | undefined, country: string, token: string): Map<string, PickLookup> {
  const [found, setFound] = useState<Map<string, PickLookup>>(new Map());
  useEffect(() => {
    setFound(new Map());
    if (!token || !picks) return;
    let alive = true;
    const items: Array<{ pick: Pick; type: TitleType }> = [...picks.series.map((pick) => ({ pick, type: 'tv' as const })), ...picks.films.map((pick) => ({ pick, type: 'movie' as const }))];
    void inBatches(
      items.map(({ pick, type }) => async () => {
        try {
          const title = await findTitle({ title: pick.title, en: pick.en, year: pick.year, type, lang }, token);
          if (!title) return null;
          const where = await whereToWatch(type, title.id, country, token);
          if (alive) setFound((prev) => new Map(prev).set(pickKey(pick), { title, where }));
          return null;
        } catch {
          return null;
        }
      }),
    );
    return () => {
      alive = false;
    };
  }, [lang, picks, country, token]);
  return found;
}

export interface LiveLists {
  tv: TmdbTitle[];
  movie: TmdbTitle[];
  loading: boolean;
  error: string | null;
}

/** Series and films originally in the language, on the learner's services in their country. */
export function useLiveLists(lang: string, country: string, services: readonly string[], token: string): LiveLists {
  const [state, setState] = useState<LiveLists>({ tv: [], movie: [], loading: false, error: null });
  const key = services.join(',');
  useEffect(() => {
    if (!token || !services.length) {
      setState({ tv: [], movie: [], loading: false, error: null });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    const listFor = async (type: TitleType) => {
      const known = await providersIn(country, type, token);
      const ids = known.filter((p) => services.some((id) => serviceById(id)?.tmdb.test(p.provider_name))).map((p) => p.provider_id);
      return discoverTitles({ lang, region: country, type, providerIds: ids }, token);
    };
    Promise.all([listFor('tv'), listFor('movie')])
      .then(([tv, movie]) => alive && setState({ tv, movie, loading: false, error: null }))
      .catch((e: unknown) => alive && setState({ tv: [], movie: [], loading: false, error: e instanceof TmdbError ? e.message : 'TMDB couldn’t be reached. Check the connection and try again.' }));
    return () => {
      alive = false;
    };
    // `key` stands for `services`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, country, key, token]);
  return state;
}
