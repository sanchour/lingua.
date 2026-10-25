// The radio's list as sections (Lingua 5.2-2): each station's kinds from its tags (news, talk,
// music, culture, sport), the sections they make, the sorts, and the tuner's spacing.
import type { RadioStation } from '@/data/types';

export type Kind = 'news' | 'talk' | 'music' | 'culture' | 'sport';

export const KIND_NAME: Record<Kind, string> = { news: 'News', talk: 'Talk', music: 'Music', culture: 'Culture', sport: 'Sport' };

// Tags come in every language the owners speak; these cover the six core ones and English.
const KIND_RE: Record<Kind, RegExp> = {
  news: /news|noticia|informa|nachricht|actualit|info\b|новост|информ|أخبار|اخبار|新闻|新聞|资讯/,
  talk: /talk|parole|discus|debat|wort|charla|hablad|tertuli|spoken|разговор|ток|حوار|谈话|談話/,
  music: /music|musique|musik|música|musica|pop|rock|jazz|hits|dance|classic|electro|hip.?hop|reggae|latin|salsa|chanson|schlager|oldies|музык|موسيقى|音乐|音樂/,
  culture: /cultur|kultur|культур|ثقاف|文化|art\b|literat|educa|bildung/,
  sport: /sport|deport|futbol|fútbol|football|спорт|رياض|体育|體育/,
};

const REGIONAL_RE = /local|regional|region|community|comunitar|provinc|landes|regionale|региональ|محلي|地方/;

export function kindsOf(s: Pick<RadioStation, 'tags' | 'name'>): Kind[] {
  const text = [...s.tags, s.name.toLowerCase()].join(' ');
  return (Object.keys(KIND_RE) as Kind[]).filter((k) => KIND_RE[k].test(text));
}

export type SectionId = 'yours' | 'speech' | 'music' | 'regional' | 'all';

export const SECTION_NAME: Record<SectionId, string> = { yours: 'Your stations', speech: 'Talk and news', music: 'Music', regional: 'Regional', all: 'Everything' };

/** The list's sections, speech first since it's what helps learning; empty ones are left out. */
export function sectionsOf(stations: RadioStation[], yours: RadioStation[]): Array<{ id: SectionId; stations: RadioStation[] }> {
  const speech: RadioStation[] = [];
  const music: RadioStation[] = [];
  const regional: RadioStation[] = [];
  for (const s of stations) {
    const kinds = kindsOf(s);
    if (kinds.includes('news') || kinds.includes('talk')) speech.push(s);
    else if (kinds.includes('music')) music.push(s);
    if (REGIONAL_RE.test(s.tags.join(' ')) || REGIONAL_RE.test(s.name.toLowerCase())) regional.push(s);
  }
  const all: Array<{ id: SectionId; stations: RadioStation[] }> = [
    { id: 'yours', stations: yours },
    { id: 'speech', stations: speech },
    { id: 'music', stations: music },
    { id: 'regional', stations: regional },
    { id: 'all', stations },
  ];
  return all.filter((x) => x.stations.length > 0);
}

export type StationSort = 'listened' | 'name' | 'quality';

export function sortStations(list: RadioStation[], sort: StationSort): RadioStation[] {
  if (sort === 'listened') return list;
  const out = [...list];
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  else out.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return out;
}

/** The tuner's marks: "All" and then each country, as wide as its stations make it, with its centre. */
export function dialMarks(countries: Array<{ code: string; name: string; count: number }>): Array<{ code: string | null; name: string; count: number; width: number; centre: number }> {
  const total = countries.reduce((n, c) => n + c.count, 0);
  let x = 0;
  return [{ code: null, name: 'All', count: total }, ...countries].map((c) => {
    const width = c.code === null ? 76 : Math.round(62 + 9 * Math.log2(c.count + 1));
    const mark = { ...c, width, centre: x + width / 2 };
    x += width;
    return mark;
  });
}

/** The mark nearest to a point on the dial. */
export function nearestMark<T extends { centre: number }>(marks: T[], at: number): number {
  let best = 0;
  for (let i = 1; i < marks.length; i++) if (Math.abs(marks[i].centre - at) < Math.abs(marks[best].centre - at)) best = i;
  return best;
}
