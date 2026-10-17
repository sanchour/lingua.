// News sources with a "Latest" list, per language. Only feeds that let apps read them directly
// (CORS) are listed, so the list works without a relay; checked October 2026.

export interface NewsSource {
  id: string;
  name: string;
  feed: string;
}

export const NEWS_SOURCES: Record<string, NewsSource[]> = {
  es: [
    { id: 'elpais', name: 'El País', feed: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
    { id: 'dw-es', name: 'DW Español', feed: 'https://rss.dw.com/xml/rss-sp-all' },
  ],
  pt: [{ id: 'agenciabrasil', name: 'Agência Brasil', feed: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml' }],
  fr: [
    { id: 'franceinfo', name: 'franceinfo', feed: 'https://www.franceinfo.fr/titres.rss' },
    { id: 'radio-canada', name: 'Radio-Canada', feed: 'https://ici.radio-canada.ca/info/rss/info/a-la-une' },
  ],
  it: [
    { id: 'corriere', name: 'Corriere della Sera', feed: 'https://www.corriere.it/rss/homepage.xml' },
    { id: 'sole24ore', name: 'Il Sole 24 Ore', feed: 'https://www.ilsole24ore.com/rss/italia.xml' },
  ],
  de: [
    { id: 'tagesschau', name: 'tagesschau', feed: 'https://www.tagesschau.de/index~rss2.xml' },
    { id: 'dw-de', name: 'DW Deutsch', feed: 'https://rss.dw.com/xml/rss-de-all' },
  ],
  sv: [{ id: 'ekot', name: 'Ekot · Sveriges Radio', feed: 'https://api.sr.se/api/rss/program/83' }],
  en: [{ id: 'dw-en', name: 'DW English', feed: 'https://rss.dw.com/xml/rss-en-all' }],
  el: [{ id: 'protothema', name: 'Πρώτο Θέμα', feed: 'https://www.protothema.gr/rss/' }],
  hu: [
    { id: 'hvg', name: 'HVG', feed: 'https://hvg.hu/rss' },
    { id: '24hu', name: '24.hu', feed: 'https://24.hu/feed/' },
  ],
  ru: [{ id: 'dw-ru', name: 'DW Русский', feed: 'https://rss.dw.com/xml/rss-ru-all' }],
  tr: [{ id: 'dw-tr', name: 'DW Türkçe', feed: 'https://rss.dw.com/xml/rss-tur-all' }],
  // Lingua 3.0. Dutch news sites don't let apps read their feeds; Tweakers (technology) does.
  nl: [{ id: 'tweakers', name: 'Tweakers', feed: 'https://tweakers.net/feeds/mixed.xml' }],
  nb: [{ id: 'nrk', name: 'NRK', feed: 'https://www.nrk.no/toppsaker.rss' }],
  ar: [{ id: 'dw-ar', name: 'DW عربية', feed: 'https://rss.dw.com/xml/rss-ar-all' }],
  zh: [{ id: 'dw-zh', name: 'DW 中文', feed: 'https://rss.dw.com/xml/rss-chi-all' }],
  ja: [{ id: 'nhk', name: 'NHK ニュース', feed: 'https://www3.nhk.or.jp/rss/news/cat0.xml' }],
  ko: [{ id: 'jtbc', name: 'JTBC 뉴스', feed: 'https://fs.jtbc.co.kr/RSS/newsflash.xml' }],
  id: [{ id: 'antara', name: 'ANTARA', feed: 'https://www.antaranews.com/rss/terkini.xml' }],
  sw: [{ id: 'dw-sw', name: 'DW Kiswahili', feed: 'https://rss.dw.com/xml/rss-kis-all' }],
};

export const newsSources = (lang: string): NewsSource[] => NEWS_SOURCES[lang] ?? [];
