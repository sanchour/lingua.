import { serviceById, serviceLink } from './services';
import type { Pick, PickKind } from './types';

// Where a pick opens: searches on the sites where things live, so links don't go stale.

export interface PickLink {
  label: string;
  url: string;
  /** A service badge's id when the link opens a streaming service. */
  service?: string;
}

const q = encodeURIComponent;

/** Amazon's store for a country (books go to the learner's own store). */
const AMAZON: Record<string, string> = {
  US: 'com', GB: 'co.uk', IE: 'co.uk', DE: 'de', AT: 'de', CH: 'de', FR: 'fr', BE: 'com.be', LU: 'fr', NL: 'nl', ES: 'es', IT: 'it', SE: 'se', PL: 'pl', TR: 'com.tr', JP: 'co.jp',
  BR: 'com.br', MX: 'com.mx', CA: 'ca', AU: 'com.au', NZ: 'com.au', IN: 'in', AE: 'ae', SA: 'sa', EG: 'eg', SG: 'sg',
};

export function amazonSearch(term: string, country: string): string {
  return `https://www.amazon.${AMAZON[country] ?? 'com'}/s?k=${q(term)}`;
}

export const youtubeSearch = (term: string) => `https://www.youtube.com/results?search_query=${q(term)}`;
/** YouTube's search with only channels (the "Channel" filter). */
export const youtubeChannelSearch = (term: string) => `${youtubeSearch(term)}&sp=EgIQAg%253D%253D`;
export const spotifySearch = (term: string, kind: 'podcasts' | 'artists' | 'playlists') => `https://open.spotify.com/search/${q(term)}/${kind}`;
export const applePodcastsSearch = (term: string) => `https://podcasts.apple.com/search?term=${q(term)}`;
export const goodreadsSearch = (term: string) => `https://www.goodreads.com/search?q=${q(term)}`;
export const steamSearch = (term: string) => `https://store.steampowered.com/search/?term=${q(term)}`;

/** OpenSubtitles' three-letter codes, for "find subtitles" in the language. */
const SUBTITLE_CODES: Record<string, string> = {
  en: 'eng', es: 'spa', fr: 'fre', de: 'ger', it: 'ita', pt: 'por', ru: 'rus', el: 'ell', sv: 'swe', hu: 'hun', nl: 'dut', nb: 'nor', tr: 'tur', id: 'ind', sw: 'swa',
  ar: 'ara', zh: 'chi', ja: 'jpn', ko: 'kor', la: 'lat',
};

export function subtitleSearch(title: string, lang: string): string {
  const code = SUBTITLE_CODES[lang];
  return `https://www.opensubtitles.org/en/search2/${code ? `sublanguageid-${code}/` : ''}moviename-${q(title)}`;
}

/**
 * The links a pick shows, by kind. Series and films open on the services they are known to live on
 * (with the learner's own services first) and get a trailer; the rest open where they are found.
 */
export function pickLinks(pick: Pick, kind: PickKind, ctx: { lang: string; country: string; services?: readonly string[] }): PickLink[] {
  const term = pick.search ?? pick.title;
  switch (kind) {
    case 'series':
    case 'film': {
      const mine = new Set(ctx.services ?? []);
      const on = [...(pick.on ?? [])].sort((a, b) => Number(mine.has(b)) - Number(mine.has(a)));
      const links: PickLink[] = [];
      for (const id of on) {
        const service = serviceById(id);
        if (service) links.push({ label: service.name, url: serviceLink(service, term, ctx.lang), service: id });
      }
      if (pick.url) links.push({ label: 'Website', url: pick.url });
      links.push({ label: 'Trailer', url: youtubeSearch(`${pick.title}${pick.year ? ` ${pick.year}` : ''} trailer`) });
      return links;
    }
    case 'book': {
      const full = pick.by ? `${pick.title} ${pick.by}` : pick.title;
      const links: PickLink[] = [];
      if (pick.url) links.push({ label: 'Website', url: pick.url });
      links.push({ label: 'Goodreads', url: goodreadsSearch(full) }, { label: 'Amazon', url: amazonSearch(full, ctx.country) });
      return links;
    }
    case 'game':
      return pick.url ? [{ label: 'Website', url: pick.url }] : [{ label: 'Steam', url: steamSearch(term) }];
    case 'podcast':
      return [
        ...(pick.url ? [{ label: 'Website', url: pick.url }] : []),
        { label: 'Spotify', url: spotifySearch(term, 'podcasts') },
        { label: 'Apple Podcasts', url: applePodcastsSearch(term) },
      ];
    case 'youtube':
      return [{ label: 'YouTube', url: pick.url ?? youtubeChannelSearch(term) }];
    case 'dictionary':
      return [{ label: 'Open', url: pick.url ?? `https://www.google.com/search?q=${q(term)}` }];
  }
}

/** An artist from Sonus's "artists to learn with": Spotify and YouTube alongside Sonus itself. */
export function artistLinks(name: string): PickLink[] {
  return [
    { label: 'Spotify', url: spotifySearch(name, 'artists') },
    { label: 'YouTube', url: youtubeSearch(name) },
  ];
}
