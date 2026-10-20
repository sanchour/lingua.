// Streaming services for Visio › Services and Mundus (Lingua 3.0-7). Each opens in its own app or
// site: on a phone, the service's links open its app when it is installed. Search addresses were
// checked to answer on 2026-10-19; a service without a reliable search opens at its front page.

export interface StreamingService {
  id: string;
  name: string;
  /** One or two letters for its badge. */
  mono: string;
  /** Badge colour (white text on it reads in both themes). */
  hue: string;
  /** Free (public broadcasters, with ads) or by subscription. */
  free?: boolean;
  /** Languages it is most useful for; none means every language. */
  langs?: string[];
  /** Countries it can be watched in, when it is regional (ISO 3166 codes). */
  countries?: string[];
  home: string;
  /** Search address, `{q}` replaced by the title. */
  search?: string;
  /** How TMDB names it among a title's providers. */
  tmdb: RegExp;
}

export const SERVICES: StreamingService[] = [
  { id: 'netflix', name: 'Netflix', mono: 'N', hue: '#b81d24', home: 'https://www.netflix.com/', search: 'https://www.netflix.com/search?q={q}', tmdb: /^netflix/i },
  { id: 'prime', name: 'Prime Video', mono: 'P', hue: '#1f6fb2', home: 'https://www.primevideo.com/', search: 'https://www.primevideo.com/search/ref=atv_nb_sug?ie=UTF8&phrase={q}', tmdb: /amazon prime video|^prime video/i },
  { id: 'disney', name: 'Disney+', mono: 'D+', hue: '#1d3b8f', home: 'https://www.disneyplus.com/', tmdb: /disney ?(plus|\+)/i },
  { id: 'max', name: 'HBO Max', mono: 'M', hue: '#5b2bc0', home: 'https://www.hbomax.com/', search: 'https://play.hbomax.com/search?q={q}', tmdb: /^(hbo )?max\b|^hbo/i },
  { id: 'appletv', name: 'Apple TV+', mono: 'tv', hue: '#3a3a3c', home: 'https://tv.apple.com/', search: 'https://tv.apple.com/search?term={q}', tmdb: /apple tv( plus|\+)/i },
  {
    id: 'skyshowtime',
    name: 'SkyShowtime',
    mono: 'S',
    hue: '#4b2a8c',
    countries: ['NL', 'ES', 'PT', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'RS', 'BA', 'ME', 'MK', 'AL', 'AD', 'SE', 'NO', 'DK', 'FI'],
    home: 'https://www.skyshowtime.com/',
    tmdb: /skyshowtime/i,
  },
  { id: 'viaplay', name: 'Viaplay', mono: 'V', hue: '#d1004a', countries: ['SE', 'NO', 'DK', 'FI', 'IS', 'PL', 'EE', 'LV', 'LT', 'NL'], home: 'https://viaplay.com/', tmdb: /viaplay/i },
  { id: 'mubi', name: 'MUBI', mono: 'MU', hue: '#222222', home: 'https://mubi.com/', search: 'https://mubi.com/en/search/films?query={q}', tmdb: /^mubi/i },
  { id: 'youtube', name: 'YouTube', mono: '▶', hue: '#c4302b', free: true, home: 'https://www.youtube.com/', search: 'https://www.youtube.com/results?search_query={q}', tmdb: /^youtube/i },
  // Free public broadcasters and services for one language or region.
  { id: 'rtve', name: 'RTVE Play', mono: 'R', hue: '#d4471a', free: true, langs: ['es'], home: 'https://www.rtve.es/play/', tmdb: /rtve/i },
  { id: 'atresplayer', name: 'Atresplayer', mono: 'A3', hue: '#e3591c', langs: ['es'], countries: ['ES'], home: 'https://www.atresplayer.com/', tmdb: /atresplayer/i },
  { id: 'filmin', name: 'Filmin', mono: 'F', hue: '#1b1b1b', langs: ['es', 'pt'], countries: ['ES', 'PT', 'MX'], home: 'https://www.filmin.es/', tmdb: /filmin/i },
  { id: 'ard', name: 'ARD Mediathek', mono: 'ARD', hue: '#003c78', free: true, langs: ['de'], home: 'https://www.ardmediathek.de/', search: 'https://www.ardmediathek.de/suche/{q}', tmdb: /ard ?mediathek|^ard\b/i },
  { id: 'zdf', name: 'ZDF', mono: 'ZDF', hue: '#e86a10', free: true, langs: ['de'], home: 'https://www.zdf.de/', search: 'https://www.zdf.de/suche?q={q}', tmdb: /^zdf/i },
  { id: 'joyn', name: 'Joyn', mono: 'J', hue: '#2a2a2a', free: true, langs: ['de'], countries: ['DE', 'AT'], home: 'https://www.joyn.de/', tmdb: /^joyn/i },
  { id: 'arte', name: 'arte', mono: 'a', hue: '#e85a1b', free: true, langs: ['de', 'fr'], home: 'https://www.arte.tv/', search: 'https://www.arte.tv/{lang}/search/?q={q}', tmdb: /^arte/i },
  { id: 'francetv', name: 'france.tv', mono: 'f', hue: '#2652a3', free: true, langs: ['fr'], home: 'https://www.france.tv/', search: 'https://www.france.tv/recherche/?q={q}', tmdb: /france\.?\s?tv/i },
  { id: 'tf1', name: 'TF1+', mono: 'TF1', hue: '#1f4fa3', free: true, langs: ['fr'], countries: ['FR', 'BE', 'CH', 'LU'], home: 'https://www.tf1.fr/', tmdb: /^tf1/i },
  { id: 'raiplay', name: 'RaiPlay', mono: 'Rai', hue: '#0b5fa5', free: true, langs: ['it'], home: 'https://www.raiplay.it/', search: 'https://www.raiplay.it/ricerca.html?q={q}', tmdb: /rai ?play/i },
  { id: 'rtp', name: 'RTP Play', mono: 'RTP', hue: '#b3261e', free: true, langs: ['pt'], home: 'https://www.rtp.pt/play/', tmdb: /^rtp/i },
  { id: 'globoplay', name: 'Globoplay', mono: 'G', hue: '#e3263b', langs: ['pt'], home: 'https://globoplay.globo.com/', search: 'https://globoplay.globo.com/busca/?q={q}', tmdb: /globoplay/i },
  { id: 'nrk', name: 'NRK TV', mono: 'NRK', hue: '#1f3a5f', free: true, langs: ['nb'], home: 'https://tv.nrk.no/', search: 'https://tv.nrk.no/sok?q={q}', tmdb: /^nrk/i },
  { id: 'svt', name: 'SVT Play', mono: 'SVT', hue: '#1d6b3a', free: true, langs: ['sv'], home: 'https://www.svtplay.se/', search: 'https://www.svtplay.se/sok?q={q}', tmdb: /^svt/i },
  { id: 'npo', name: 'NPO Start', mono: 'NPO', hue: '#e3570f', free: true, langs: ['nl'], home: 'https://npo.nl/start', search: 'https://npo.nl/start/zoeken?zoekTerm={q}', tmdb: /^npo/i },
  { id: 'vrt', name: 'VRT MAX', mono: 'VRT', hue: '#2f2f6b', free: true, langs: ['nl'], home: 'https://www.vrt.be/vrtmax/', tmdb: /^vrt/i },
  { id: 'videoland', name: 'Videoland', mono: 'VL', hue: '#c4161c', langs: ['nl'], countries: ['NL'], home: 'https://www.videoland.com/', tmdb: /videoland/i },
  { id: 'ert', name: 'ERTFLIX', mono: 'ERT', hue: '#0d4c92', free: true, langs: ['el'], home: 'https://www.ertflix.gr/', tmdb: /^ert/i },
  { id: 'mediaklikk', name: 'MédiaKlikk', mono: 'MK', hue: '#2b5fa8', free: true, langs: ['hu'], home: 'https://mediaklikk.hu/', tmdb: /m[ée]diaklikk/i },
  { id: 'tabii', name: 'tabii (TRT)', mono: 'T', hue: '#1d5aa8', free: true, langs: ['tr'], home: 'https://www.tabii.com/', tmdb: /tabii|^trt/i },
  { id: 'shahid', name: 'Shahid', mono: 'ش', hue: '#20a66a', langs: ['ar'], home: 'https://shahid.mbc.net/', tmdb: /shahid/i },
  { id: 'iqiyi', name: 'iQIYI', mono: 'iQ', hue: '#00a85a', langs: ['zh'], home: 'https://www.iq.com/', search: 'https://www.iq.com/search?query={q}', tmdb: /iqiyi/i },
  { id: 'viki', name: 'Rakuten Viki', mono: 'Vk', hue: '#1a8fd6', langs: ['ko', 'zh', 'ja'], home: 'https://www.viki.com/', search: 'https://www.viki.com/search?q={q}', tmdb: /viki/i },
  { id: 'crunchyroll', name: 'Crunchyroll', mono: 'CR', hue: '#e8661c', langs: ['ja'], home: 'https://www.crunchyroll.com/', search: 'https://www.crunchyroll.com/search?q={q}', tmdb: /crunchyroll/i },
];

export function serviceById(id: string): StreamingService | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** Where to open a title on a service: its search when it has one, else its front page. */
export function serviceLink(service: StreamingService, title: string, lang = 'en'): string {
  if (!service.search) return service.home;
  // arte's site is per language: German and French have their own pages, others go to English.
  const site = lang === 'de' || lang === 'fr' ? lang : 'en';
  return service.search.replace('{q}', encodeURIComponent(title)).replace('{lang}', site);
}

/**
 * The services worth offering a learner: the big ones everywhere, then those made for the
 * language or the learner's country. Everything else sits under "More services".
 */
export function servicesFor(lang: string, country: string, chosen: readonly string[] = []): { main: StreamingService[]; more: StreamingService[] } {
  const main: StreamingService[] = [];
  const more: StreamingService[] = [];
  for (const s of SERVICES) {
    const forLanguage = !s.langs || s.langs.includes(lang);
    const inCountry = !s.countries || s.countries.includes(country);
    if ((forLanguage && inCountry) || chosen.includes(s.id)) main.push(s);
    else more.push(s);
  }
  return { main, more };
}

/** Which of a title's TMDB providers are services the learner chose. */
export function matchProviders(providers: Array<{ provider_name: string }>, chosen: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of chosen) {
    const s = serviceById(id);
    if (s && providers.some((p) => s.tmdb.test(p.provider_name))) out.push(id);
  }
  return out;
}

/** The country a device is in, from its language settings (en-GB → GB); a sensible guess otherwise. */
export function deviceCountry(locales: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): string {
  for (const locale of locales) {
    try {
      const region = new Intl.Locale(locale).maximize().region;
      if (region && /^[A-Z]{2}$/.test(region)) return region;
    } catch {
      // An odd locale string: try the next one.
    }
  }
  return 'US';
}

/** Countries to choose from, by name. */
export const COUNTRIES = [
  'AR', 'AT', 'AU', 'BE', 'BR', 'CA', 'CH', 'CL', 'CN', 'CO', 'CZ', 'DE', 'DK', 'EG', 'ES', 'FI', 'FR', 'GB', 'GR', 'HK', 'HU', 'ID', 'IE', 'IN', 'IT', 'JP', 'KE', 'KR',
  'MA', 'MX', 'MY', 'NL', 'NO', 'NZ', 'PE', 'PH', 'PL', 'PT', 'RO', 'SA', 'SE', 'SG', 'TR', 'TW', 'TZ', 'UA', 'AE', 'US', 'ZA',
] as const;

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
