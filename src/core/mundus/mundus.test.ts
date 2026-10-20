import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/core/lang/languages';
import { amazonSearch, pickLinks, subtitleSearch } from './links';
import { hasPicks, loadPicks } from './load';
import { deviceCountry, matchProviders, serviceById, serviceLink, servicesFor, SERVICES } from './services';
import { streakOf } from './streak';
import { tipOfTheDay, tipsFor } from './tips';
import { GROUP_KIND, inBand, pickOfTheDay, withinReach } from './types';
import type { PickGroup } from './types';

const MAIN = LANGUAGES.filter((l) => l.tier !== 2).map((l) => l.code);
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1']);

describe('picks', () => {
  it('exist for the twenty main languages and none of the beta ones', () => {
    expect(MAIN).toHaveLength(20);
    for (const code of MAIN) expect(hasPicks(code), code).toBe(true);
    expect(hasPicks('pl')).toBe(false);
  });

  it('are well formed: levels, known services, secure links, short reasons', async () => {
    for (const code of MAIN) {
      const picks = (await loadPicks(code))!;
      for (const group of Object.keys(GROUP_KIND) as PickGroup[]) {
        for (const p of picks[group]) {
          const where = `${code} ${group} ${p.title}`;
          expect(LEVELS.has(p.level), where).toBe(true);
          expect(p.why.length, where).toBeLessThanOrEqual(130);
          expect(p.why, where).not.toMatch(/'/);
          for (const id of p.on ?? []) expect(serviceById(id), `${where} on ${id}`).toBeTruthy();
          if (p.url) expect(p.url, where).toMatch(/^https:\/\//);
        }
      }
      for (const d of picks.dictionaries) expect(d.url, `${code} ${d.title}`).toBeTruthy();
      const total = Object.keys(GROUP_KIND).reduce((n, g) => n + picks[g as PickGroup].length, 0);
      expect(total, code).toBeGreaterThanOrEqual(12);
    }
  });
});

describe('links', () => {
  const ctx = { lang: 'es', country: 'NL', services: ['netflix'] };

  it('opens series on their services by search, with a trailer', () => {
    const links = pickLinks({ title: 'La casa de papel', year: 2017, level: 'B2', why: 'x', on: ['rtve', 'netflix'] }, 'series', ctx);
    expect(links[0]).toMatchObject({ service: 'netflix', url: 'https://www.netflix.com/search?q=La%20casa%20de%20papel' });
    expect(links[1]).toMatchObject({ service: 'rtve', url: 'https://www.rtve.es/play/' });
    expect(links.at(-1)!.url).toContain('youtube.com/results?search_query=La%20casa%20de%20papel%202017%20trailer');
  });

  it('sends books to the learner’s own Amazon store and Goodreads', () => {
    const links = pickLinks({ title: 'Momo', by: 'Michael Ende', level: 'B1', why: 'x' }, 'book', { ...ctx, country: 'DE' });
    expect(links.map((l) => l.label)).toEqual(['Goodreads', 'Amazon']);
    expect(links[1].url).toBe('https://www.amazon.de/s?k=Momo%20Michael%20Ende');
    expect(amazonSearch('x', 'ZZ')).toBe('https://www.amazon.com/s?k=x');
  });

  it('uses a game’s own site when it has one, else Steam', () => {
    expect(pickLinks({ title: 'Minecraft', level: 'A2', why: 'x', url: 'https://www.minecraft.net/' }, 'game', ctx)[0].url).toBe('https://www.minecraft.net/');
    expect(pickLinks({ title: 'Stardew Valley', level: 'B1', why: 'x' }, 'game', ctx)[0].url).toContain('store.steampowered.com/search/?term=Stardew');
  });

  it('finds subtitles in the language', () => {
    expect(subtitleSearch('Dark', 'de')).toBe('https://www.opensubtitles.org/en/search2/sublanguageid-ger/moviename-Dark');
  });
});

describe('services', () => {
  it('offers the big services everywhere and the language’s own ones', () => {
    const { main, more } = servicesFor('es', 'NL');
    const ids = main.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['netflix', 'prime', 'rtve', 'skyshowtime']));
    expect(ids).not.toContain('nrk');
    expect(ids).not.toContain('atresplayer');
    expect(main.length + more.length).toBe(SERVICES.length);
    expect(servicesFor('es', 'NL', ['nrk']).main.map((s) => s.id)).toContain('nrk');
  });

  it('matches TMDB’s provider names to services', () => {
    const providers = [{ provider_name: 'Netflix basic with Ads' }, { provider_name: 'Amazon Prime Video' }, { provider_name: 'Apple TV' }];
    expect(matchProviders(providers, ['netflix', 'prime', 'appletv', 'max'])).toEqual(['netflix', 'prime']);
    expect(matchProviders([{ provider_name: 'HBO Max' }, { provider_name: 'Apple TV Plus' }], ['max', 'appletv'])).toEqual(['max', 'appletv']);
  });

  it('builds service links and guesses the country from the device', () => {
    expect(serviceLink(serviceById('arte')!, 'En thérapie', 'fr')).toBe('https://www.arte.tv/fr/search/?q=En%20th%C3%A9rapie');
    expect(serviceLink(serviceById('disney')!, 'Coco')).toBe('https://www.disneyplus.com/');
    expect(deviceCountry(['nl-NL', 'en'])).toBe('NL');
    expect(deviceCountry(['de'])).toBe('DE');
    expect(deviceCountry([])).toBe('US');
  });
});

describe('beyond the app', () => {
  it('gives every main language its general and own challenges, with unique ids', () => {
    for (const code of MAIN) {
      const tips = tipsFor(code);
      expect(new Set(tips.map((t) => t.id)).size, code).toBe(tips.length);
      expect(tips.length, code).toBeGreaterThanOrEqual(18);
      for (const t of tips) expect(t.steps?.length || t.platforms?.length, `${code} ${t.id}`).toBeTruthy();
    }
    expect(tipsFor('ja').some((t) => t.id === 'keyboard')).toBe(true);
    expect(tipsFor('la').some((t) => t.id === 'keyboard' || t.id === 'siri')).toBe(false);
    expect(tipsFor('pl').length).toBeGreaterThan(10);
  });

  it('picks a challenge of the day, skipping ones done once', () => {
    const tips = tipsFor('es');
    const done = new Set(tips.filter((t) => !t.habit).map((t) => t.id));
    expect(tipOfTheDay(tips, done, 3)?.habit).toBe(true);
    expect(tipOfTheDay(tips, new Set(), 0)).toBe(tips[0]);
  });

  it('counts a streak of days back from today, or from yesterday', () => {
    expect(streakOf(['2026-10-18', '2026-10-19', '2026-10-20'], '2026-10-20')).toEqual({ days: 3, doneToday: true, activeDays: 3 });
    expect(streakOf(['2026-10-18', '2026-10-19'], '2026-10-20')).toMatchObject({ days: 2, doneToday: false });
    expect(streakOf(['2026-10-17', '2026-10-19', '2026-10-19'], '2026-10-20')).toMatchObject({ days: 1, activeDays: 2 });
    expect(streakOf(['2026-03-28', '2026-03-29', '2026-03-30'], '2026-03-30').days).toBe(3);
    expect(streakOf([], '2026-10-20').days).toBe(0);
  });

  it('sorts levels into bands', () => {
    expect(inBand('A2', 'beginner')).toBe(true);
    expect(inBand('B2', 'beginner')).toBe(false);
    expect(inBand('C1', 'advanced')).toBe(true);
  });
});

describe('explore', () => {
  it('reaches one level above the learner, and a beginner reaches A2', () => {
    expect(withinReach('A2', 'A0')).toBe(true);
    expect(withinReach('B1', 'A0')).toBe(false);
    expect(withinReach('B1', 'A2')).toBe(true);
    expect(withinReach('C1', 'B1')).toBe(false);
  });
  it('picks the same series, film or book all day, within reach', async () => {
    const picks = (await loadPicks('es'))!;
    const a = pickOfTheDay(picks, 'A1', 20_000)!;
    expect(pickOfTheDay(picks, 'A1', 20_000)).toEqual(a);
    expect(['series', 'films', 'books']).toContain(a.group);
    expect(withinReach(a.pick.level, 'A1')).toBe(true);
  });
});
