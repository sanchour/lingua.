export type Script = 'Latn' | 'Cyrl' | 'Grek' | 'Arab' | 'Hans' | 'Jpan' | 'Kore';

export interface LanguageInfo {
  /** BCP-47 code used everywhere as `lang`. */
  code: string;
  name: string;
  endonym: string;
  script: Script;
  /** A short original sentence for previews. */
  sample: string;
  /** Written right to left (Arabic). */
  rtl?: boolean;
  /** Flags to show for the language, the usual one first (see design/flags). */
  flags: string[];
}

/** The twenty languages with full support: offline dictionary pack, frequency list, starter decks. */
export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', endonym: 'English', script: 'Latn', flags: ['gb', 'us', 'ie', 'au', 'ca'], sample: 'In the evening we read by the window while snow fell quietly outside.' },
  { code: 'es', name: 'Spanish', endonym: 'Español', script: 'Latn', flags: ['es', 'mx', 'ar', 'co'], sample: 'Por la tarde leíamos junto a la ventana mientras nevaba en silencio.' },
  { code: 'fr', name: 'French', endonym: 'Français', script: 'Latn', flags: ['fr', 'be', 'ch', 'ca'], sample: 'Le soir, nous lisions près de la fenêtre pendant qu’il neigeait doucement.' },
  { code: 'de', name: 'German', endonym: 'Deutsch', script: 'Latn', flags: ['de', 'at', 'ch'], sample: 'Am Abend lasen wir am Fenster, während draußen leise Schnee fiel.' },
  { code: 'it', name: 'Italian', endonym: 'Italiano', script: 'Latn', flags: ['it', 'ch'], sample: 'La sera leggevamo vicino alla finestra mentre fuori nevicava piano.' },
  { code: 'pt', name: 'Portuguese', endonym: 'Português', script: 'Latn', flags: ['br', 'pt'], sample: 'À noite líamos junto à janela enquanto nevava baixinho lá fora.' },
  { code: 'ru', name: 'Russian', endonym: 'Русский', script: 'Cyrl', flags: ['ru'], sample: 'Вечером мы читали у окна, и тихо шёл снег.' },
  { code: 'el', name: 'Greek', endonym: 'Ελληνικά', script: 'Grek', flags: ['gr'], sample: 'Το βράδυ διαβάζαμε δίπλα στο παράθυρο, ενώ έξω χιόνιζε ήσυχα.' },
  { code: 'sv', name: 'Swedish', endonym: 'Svenska', script: 'Latn', flags: ['se', 'fi'], sample: 'På kvällen läste vi vid fönstret medan snön föll tyst utanför.' },
  { code: 'hu', name: 'Hungarian', endonym: 'Magyar', script: 'Latn', flags: ['hu'], sample: 'Esténként az ablaknál olvastunk, miközben kint csendben esett a hó.' },
  { code: 'nl', name: 'Dutch', endonym: 'Nederlands', script: 'Latn', flags: ['nl', 'be'], sample: '’s Avonds lazen we bij het raam, terwijl buiten zachtjes de sneeuw viel.' },
  { code: 'nb', name: 'Norwegian', endonym: 'Norsk', script: 'Latn', flags: ['no'], sample: 'Om kvelden leste vi ved vinduet mens snøen falt stille utenfor.' },
  { code: 'tr', name: 'Turkish', endonym: 'Türkçe', script: 'Latn', flags: ['tr'], sample: 'Akşamları dışarıda sessizce kar yağarken pencerenin yanında kitap okurduk.' },
  { code: 'id', name: 'Indonesian', endonym: 'Bahasa Indonesia', script: 'Latn', flags: ['id'], sample: 'Pada malam hari kami membaca di dekat jendela, sementara salju turun pelan di luar.' },
  { code: 'sw', name: 'Swahili', endonym: 'Kiswahili', script: 'Latn', flags: ['tz', 'ke'], sample: 'Jioni tulisoma karibu na dirisha huku theluji ikianguka kimya nje.' },
  { code: 'la', name: 'Latin', endonym: 'Latina', script: 'Latn', flags: ['laurel'], sample: 'Vesperi prope fenestram legebamus, dum foris nix tacite cadebat.' },
  { code: 'ar', name: 'Arabic', endonym: 'العربية', script: 'Arab', rtl: true, flags: ['sa', 'eg', 'ae', 'ma', 'jo'], sample: 'في المساء كنا نقرأ قرب النافذة، بينما كان الثلج يتساقط بهدوء في الخارج.' },
  { code: 'zh', name: 'Mandarin', endonym: '中文', script: 'Hans', flags: ['cn', 'tw', 'sg'], sample: '傍晚我们在窗边看书，外面静静地下着雪。' },
  { code: 'ja', name: 'Japanese', endonym: '日本語', script: 'Jpan', flags: ['jp'], sample: '夕方、外で雪が静かに降る中、私たちは窓辺で本を読んだ。' },
  { code: 'ko', name: 'Korean', endonym: '한국어', script: 'Kore', flags: ['kr'], sample: '저녁에 우리는 창가에서 책을 읽었고, 밖에는 조용히 눈이 내렸다.' },
];

export function getLanguage(code: string): LanguageInfo | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/** Right-to-left languages: text in them is set with dir="rtl". */
export const isRtl = (code: string) => Boolean(getLanguage(code)?.rtl);

/** Languages written without spaces between words (word splitting by dictionary). */
export const UNSPACED_LANGS = new Set(['zh', 'ja']);

/** Languages whose words get a reading above them: pinyin for Mandarin, kana for Japanese. */
export const READING_LANGS = new Set(['zh', 'ja']);

/** Languages whose learner texts use combining stress marks that should not split word identity. */
export const STRESS_MARKED_LANGS = new Set(['ru']);

/** Language all instant translations are given in. */
export const GLOSS_LANG = 'en';
