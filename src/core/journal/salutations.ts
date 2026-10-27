// How a diary page begins in each language (5.2-5): "Dear diary" where people write that, else the date.

/** "Dear diary" in the languages where diaries are addressed that way. */
const DEAR: Record<string, string> = {
  en: 'Dear diary', es: 'Querido diario', fr: 'Cher journal', de: 'Liebes Tagebuch', it: 'Caro diario', pt: 'Querido diário', nl: 'Lief dagboek',
  ru: 'Дорогой дневник', uk: 'Любий щоденнику', bg: 'Скъпи дневнико', pl: 'Drogi pamiętniku', cs: 'Milý deníčku', sk: 'Milý denníček', sh: 'Dragi dnevniče',
  ro: 'Dragă jurnalule', el: 'Αγαπητό μου ημερολόγιο', sv: 'Kära dagbok', nb: 'Kjære dagbok', da: 'Kære dagbog', is: 'Kæra dagbók', fi: 'Rakas päiväkirja',
  et: 'Kallis päevik', lv: 'Dārgā dienasgrāmata', lt: 'Mielas dienoraštį', hu: 'Kedves naplóm', tr: 'Sevgili günlük', ca: 'Estimat diari', af: 'Liewe dagboek',
  sq: 'I dashur ditar', eo: 'Kara taglibro', he: 'יומן יקר', zh: '亲爱的日记',
};

/** "Today…", the first word of an empty page. */
const TODAY: Record<string, string> = {
  en: 'Today', es: 'Hoy', fr: 'Aujourd’hui', de: 'Heute', it: 'Oggi', pt: 'Hoje', nl: 'Vandaag', ru: 'Сегодня', el: 'Σήμερα', sv: 'I dag', hu: 'Ma',
  nb: 'I dag', tr: 'Bugün', id: 'Hari ini', sw: 'Leo', la: 'Hodie', ar: 'اليوم', zh: '今天', ja: '今日は', ko: '오늘은', hi: 'आज', pl: 'Dzisiaj', vi: 'Hôm nay',
  tl: 'Ngayon', th: 'วันนี้', fa: 'امروز', yue: '今日', cs: 'Dnes', ro: 'Astăzi', sh: 'Danas', ms: 'Hari ini', ta: 'இன்று', ka: 'დღეს', uz: 'Bugun',
  mn: 'Өнөөдөр', is: 'Í dag', fy: 'Hjoed', grc: 'Σήμερον', bn: 'আজ', pa: 'ਅੱਜ', he: 'היום', uk: 'Сьогодні', fi: 'Tänään', da: 'I dag', ca: 'Avui',
  bg: 'Днес', kk: 'Бүгін', af: 'Vandag', am: 'ዛሬ', yo: 'Lónìí', hy: 'Այսօր', my: 'ဒီနေ့', ur: 'آج', sk: 'Dnes', et: 'Täna', lt: 'Šiandien', lv: 'Šodien',
  km: 'ថ្ងៃនេះ', sq: 'Sot', mt: 'Illum', eo: 'Hodiaŭ', non: 'Í dag', sa: 'अद्य', ht: 'Jodi a', haw: 'I kēia lā', mi: 'I tēnei rā', ga: 'Inniu', eu: 'Gaur',
};

const base = (lang: string) => lang.split('-')[0];

/** The date the way the language writes it, for languages without a "Dear diary". */
export function diaryDate(lang: string, date: Date): string {
  try {
    return date.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }
}

/** The heading of an entry without a title: "Dear diary" in the language, or the date in it. */
export function salutation(lang: string, date: Date): string {
  return DEAR[lang] ?? DEAR[base(lang)] ?? diaryDate(lang, date);
}

/** Whether the language has a "Dear diary". */
export function hasSalutation(lang: string): boolean {
  return Boolean(DEAR[lang] ?? DEAR[base(lang)]);
}

/** What an empty page says: "Today…" in the language. */
export function emptyPage(lang: string): string {
  const word = TODAY[lang] ?? TODAY[base(lang)] ?? TODAY.en;
  return base(lang) === 'zh' || base(lang) === 'yue' ? `${word}……` : `${word}…`;
}
