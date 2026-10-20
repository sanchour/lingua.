export type Script = 'Latn' | 'Cyrl' | 'Grek' | 'Arab' | 'Hans' | 'Hant' | 'Jpan' | 'Kore' | 'Deva' | 'Thai' | 'Taml' | 'Geor' | 'Beng' | 'Guru' | 'Hebr' | 'Armn' | 'Mymr' | 'Khmr' | 'Ethi';

/** 1 core, 2 full, 3 partial (beta), 4 basics, 'x' experimental (Lingua 4.0-1). */
export type Tier = 1 | 2 | 3 | 4 | 'x';

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
  /** How much the language comes with; see TIERS. */
  tier: Tier;
  /** A placeholder for a language planned in 4.0: shown in the picker, not yet chosen. */
  soon?: true;
}

/** What each tier is called in the app and what it comes with. */
export const TIERS: Record<Tier, { name: string; includes: string }> = {
  1: { name: 'Core', includes: 'Everything at its best: a dedicated course, grammar, alphabet, recommendations, Sonus and Cantus.' },
  2: { name: 'Full', includes: 'Everything (grammar, alphabet, recommendations, Sonus, Cantus) except a course.' },
  3: {
    name: 'Beta',
    includes:
      'Beta: the reader with tap and select to translate, an offline dictionary, flashcards and Ludus, Diarium, subtitles, podcasts and music search. No grammar, alphabet or hand-picked recommendations yet.',
  },
  4: { name: 'Basics', includes: 'The basics: the reader with tap to translate, your own words and decks, radio and podcast search.' },
  x: { name: 'Experimental', includes: 'Experimental: as much as the free services know about the language, and no more.' },
};

/** The twenty languages with full support: offline dictionary pack, frequency list, starter decks. */
export const LANGUAGES: LanguageInfo[] = [
  { tier: 2, code: 'en', name: 'English', endonym: 'English', script: 'Latn', flags: ['gb', 'us', 'ie', 'au', 'ca'], sample: 'In the evening we read by the window while snow fell quietly outside.' },
  { tier: 1, code: 'es', name: 'Spanish', endonym: 'Español', script: 'Latn', flags: ['es', 'mx', 'ar', 'co'], sample: 'Por la tarde leíamos junto a la ventana mientras nevaba en silencio.' },
  { tier: 1, code: 'fr', name: 'French', endonym: 'Français', script: 'Latn', flags: ['fr', 'be', 'ch', 'ca'], sample: 'Le soir, nous lisions près de la fenêtre pendant qu’il neigeait doucement.' },
  { tier: 1, code: 'de', name: 'German', endonym: 'Deutsch', script: 'Latn', flags: ['de', 'at', 'ch'], sample: 'Am Abend lasen wir am Fenster, während draußen leise Schnee fiel.' },
  { tier: 2, code: 'it', name: 'Italian', endonym: 'Italiano', script: 'Latn', flags: ['it', 'ch'], sample: 'La sera leggevamo vicino alla finestra mentre fuori nevicava piano.' },
  { tier: 2, code: 'pt', name: 'Portuguese', endonym: 'Português', script: 'Latn', flags: ['br', 'pt'], sample: 'À noite líamos junto à janela enquanto nevava baixinho lá fora.' },
  { tier: 1, code: 'ru', name: 'Russian', endonym: 'Русский', script: 'Cyrl', flags: ['ru'], sample: 'Вечером мы читали у окна, и тихо шёл снег.' },
  { tier: 2, code: 'el', name: 'Greek', endonym: 'Ελληνικά', script: 'Grek', flags: ['gr'], sample: 'Το βράδυ διαβάζαμε δίπλα στο παράθυρο, ενώ έξω χιόνιζε ήσυχα.' },
  { tier: 2, code: 'sv', name: 'Swedish', endonym: 'Svenska', script: 'Latn', flags: ['se', 'fi'], sample: 'På kvällen läste vi vid fönstret medan snön föll tyst utanför.' },
  { tier: 2, code: 'hu', name: 'Hungarian', endonym: 'Magyar', script: 'Latn', flags: ['hu'], sample: 'Esténként az ablaknál olvastunk, miközben kint csendben esett a hó.' },
  { tier: 2, code: 'nl', name: 'Dutch', endonym: 'Nederlands', script: 'Latn', flags: ['nl', 'be'], sample: '’s Avonds lazen we bij het raam, terwijl buiten zachtjes de sneeuw viel.' },
  { tier: 2, code: 'nb', name: 'Norwegian', endonym: 'Norsk', script: 'Latn', flags: ['no'], sample: 'Om kvelden leste vi ved vinduet mens snøen falt stille utenfor.' },
  { tier: 2, code: 'tr', name: 'Turkish', endonym: 'Türkçe', script: 'Latn', flags: ['tr'], sample: 'Akşamları dışarıda sessizce kar yağarken pencerenin yanında kitap okurduk.' },
  { tier: 2, code: 'id', name: 'Indonesian', endonym: 'Bahasa Indonesia', script: 'Latn', flags: ['id'], sample: 'Pada malam hari kami membaca di dekat jendela, sementara salju turun pelan di luar.' },
  { tier: 2, code: 'sw', name: 'Swahili', endonym: 'Kiswahili', script: 'Latn', flags: ['tz', 'ke'], sample: 'Jioni tulisoma karibu na dirisha huku theluji ikianguka kimya nje.' },
  { tier: 2, code: 'la', name: 'Latin', endonym: 'Latina', script: 'Latn', flags: ['laurel'], sample: 'Vesperi prope fenestram legebamus, dum foris nix tacite cadebat.' },
  { tier: 1, code: 'ar', name: 'Arabic', endonym: 'العربية', script: 'Arab', rtl: true, flags: ['sa', 'eg', 'ae', 'ma', 'jo'], sample: 'في المساء كنا نقرأ قرب النافذة، بينما كان الثلج يتساقط بهدوء في الخارج.' },
  { tier: 1, code: 'zh', name: 'Mandarin', endonym: '中文', script: 'Hans', flags: ['cn', 'tw', 'sg'], sample: '傍晚我们在窗边看书，外面静静地下着雪。' },
  { tier: 2, code: 'ja', name: 'Japanese', endonym: '日本語', script: 'Jpan', flags: ['jp'], sample: '夕方、外で雪が静かに降る中、私たちは窓辺で本を読んだ。' },
  { tier: 2, code: 'ko', name: 'Korean', endonym: '한국어', script: 'Kore', flags: ['kr'], sample: '저녁에 우리는 창가에서 책을 읽었고, 밖에는 조용히 눈이 내렸다.' },
  // Lingua 3.0-1b: beta languages, built automatically.
  { tier: 3, code: 'hi', name: 'Hindi', endonym: 'हिन्दी', script: 'Deva', flags: ['in'], sample: 'शाम को हम खिड़की के पास पढ़ते थे, जबकि बाहर चुपचाप बर्फ़ गिर रही थी।' },
  { tier: 3, code: 'pl', name: 'Polish', endonym: 'Polski', script: 'Latn', flags: ['pl'], sample: 'Wieczorem czytaliśmy przy oknie, a na zewnątrz cicho padał śnieg.' },
  { tier: 3, code: 'vi', name: 'Vietnamese', endonym: 'Tiếng Việt', script: 'Latn', flags: ['vn'], sample: 'Buổi tối chúng tôi đọc sách bên cửa sổ, trong khi tuyết lặng lẽ rơi bên ngoài.' },
  { tier: 3, code: 'tl', name: 'Tagalog', endonym: 'Tagalog', script: 'Latn', flags: ['ph'], sample: 'Sa gabi, nagbabasa kami sa tabi ng bintana habang tahimik na bumabagsak ang niyebe sa labas.' },
  { tier: 3, code: 'th', name: 'Thai', endonym: 'ไทย', script: 'Thai', flags: ['th'], sample: 'ตอนเย็นเรานั่งอ่านหนังสือข้างหน้าต่าง ขณะที่หิมะตกเงียบ ๆ อยู่ข้างนอก' },
  { tier: 3, code: 'fa', name: 'Persian', endonym: 'فارسی', script: 'Arab', rtl: true, flags: ['ir', 'af', 'tj'], sample: 'شب‌ها کنار پنجره کتاب می‌خواندیم، در حالی که بیرون برف آرام می‌بارید.' },
  { tier: 3, code: 'yue', name: 'Cantonese', endonym: '粵語', script: 'Hant', flags: ['hk'], sample: '夜晚我哋喺窗邊睇書，出面靜靜咁落緊雪。' },
  { tier: 3, code: 'cs', name: 'Czech', endonym: 'Čeština', script: 'Latn', flags: ['cz'], sample: 'Večer jsme četli u okna, zatímco venku tiše padal sníh.' },
  { tier: 3, code: 'ro', name: 'Romanian', endonym: 'Română', script: 'Latn', flags: ['ro', 'md'], sample: 'Seara citeam lângă fereastră, în timp ce afară ningea liniștit.' },
  { tier: 3, code: 'sh', name: 'Serbo-Croatian', endonym: 'Srpskohrvatski', script: 'Latn', flags: ['hr', 'rs', 'ba', 'me'], sample: 'Navečer smo čitali kraj prozora, dok je vani tiho padao snijeg.' },
  { tier: 3, code: 'ms', name: 'Malay', endonym: 'Bahasa Melayu', script: 'Latn', flags: ['my'], sample: 'Pada waktu petang kami membaca di tepi tingkap, sementara salji turun perlahan di luar.' },
  { tier: 3, code: 'ta', name: 'Tamil', endonym: 'தமிழ்', script: 'Taml', flags: ['in', 'lk', 'sg'], sample: 'மாலையில் நாங்கள் ஜன்னல் அருகே படித்தோம், வெளியே பனி அமைதியாகப் பெய்துகொண்டிருந்தது.' },
  { tier: 3, code: 'ka', name: 'Georgian', endonym: 'ქართული', script: 'Geor', flags: ['ge'], sample: 'საღამოს ფანჯარასთან ვკითხულობდით, გარეთ კი ჩუმად თოვდა.' },
  { tier: 3, code: 'uz', name: 'Uzbek', endonym: 'Oʻzbekcha', script: 'Latn', flags: ['uz'], sample: 'Kechqurun deraza yonida kitob oʻqirdik, tashqarida esa qor jimgina yogʻardi.' },
  { tier: 3, code: 'mn', name: 'Mongolian', endonym: 'Монгол', script: 'Cyrl', flags: ['mn'], sample: 'Орой бид цонхны дэргэд ном уншдаг байсан, гадаа цас чимээгүй орж байлаа.' },
  // Lingua 4.0-1: placeholders, shown in the picker and not yet chosen. Their words, packs and sample
  // sentences come with the tier they are in.
  { tier: 3, code: 'is', name: 'Icelandic', endonym: 'Íslenska', script: 'Latn', flags: ['is'], sample: '', soon: true },
  { tier: 3, code: 'fy', name: 'Frisian', endonym: 'Frysk', script: 'Latn', flags: ['nl'], sample: '', soon: true },
  { tier: 3, code: 'grc', name: 'Ancient Greek', endonym: 'Ἑλληνική', script: 'Grek', flags: ['gr'], sample: '', soon: true },
  { tier: 3, code: 'bn', name: 'Bengali', endonym: 'বাংলা', script: 'Beng', flags: ['bd', 'in'], sample: '', soon: true },
  { tier: 3, code: 'pa', name: 'Punjabi', endonym: 'ਪੰਜਾਬੀ', script: 'Guru', flags: ['in', 'pk'], sample: '', soon: true },
  { tier: 4, code: 'he', name: 'Hebrew', endonym: 'עברית', script: 'Hebr', rtl: true, flags: ['il'], sample: '', soon: true },
  { tier: 4, code: 'uk', name: 'Ukrainian', endonym: 'Українська', script: 'Cyrl', flags: ['ua'], sample: '', soon: true },
  { tier: 4, code: 'fi', name: 'Finnish', endonym: 'Suomi', script: 'Latn', flags: ['fi'], sample: '', soon: true },
  { tier: 4, code: 'da', name: 'Danish', endonym: 'Dansk', script: 'Latn', flags: ['dk'], sample: '', soon: true },
  { tier: 4, code: 'ca', name: 'Catalan', endonym: 'Català', script: 'Latn', flags: ['es', 'ad'], sample: '', soon: true },
  { tier: 4, code: 'bg', name: 'Bulgarian', endonym: 'Български', script: 'Cyrl', flags: ['bg'], sample: '', soon: true },
  { tier: 4, code: 'kk', name: 'Kazakh', endonym: 'Қазақша', script: 'Cyrl', flags: ['kz'], sample: '', soon: true },
  { tier: 4, code: 'af', name: 'Afrikaans', endonym: 'Afrikaans', script: 'Latn', flags: ['za', 'na'], sample: '', soon: true },
  { tier: 4, code: 'am', name: 'Amharic', endonym: 'አማርኛ', script: 'Ethi', flags: ['et'], sample: '', soon: true },
  { tier: 4, code: 'yo', name: 'Yoruba', endonym: 'Yorùbá', script: 'Latn', flags: ['ng'], sample: '', soon: true },
  { tier: 4, code: 'hy', name: 'Armenian', endonym: 'Հայերեն', script: 'Armn', flags: ['am'], sample: '', soon: true },
  { tier: 4, code: 'my', name: 'Burmese', endonym: 'မြန်မာ', script: 'Mymr', flags: ['mm'], sample: '', soon: true },
  { tier: 4, code: 'ur', name: 'Urdu', endonym: 'اردو', script: 'Arab', rtl: true, flags: ['pk', 'in'], sample: '', soon: true },
  { tier: 4, code: 'sk', name: 'Slovak', endonym: 'Slovenčina', script: 'Latn', flags: ['sk'], sample: '', soon: true },
  { tier: 4, code: 'et', name: 'Estonian', endonym: 'Eesti', script: 'Latn', flags: ['ee'], sample: '', soon: true },
  { tier: 4, code: 'lt', name: 'Lithuanian', endonym: 'Lietuvių', script: 'Latn', flags: ['lt'], sample: '', soon: true },
  { tier: 4, code: 'lv', name: 'Latvian', endonym: 'Latviešu', script: 'Latn', flags: ['lv'], sample: '', soon: true },
  { tier: 4, code: 'km', name: 'Khmer', endonym: 'ខ្មែរ', script: 'Khmr', flags: ['kh'], sample: '', soon: true },
  { tier: 4, code: 'sq', name: 'Albanian', endonym: 'Shqip', script: 'Latn', flags: ['al', 'xk'], sample: '', soon: true },
  { tier: 4, code: 'mt', name: 'Maltese', endonym: 'Malti', script: 'Latn', flags: ['mt'], sample: '', soon: true },
  { tier: 'x', code: 'eo', name: 'Esperanto', endonym: 'Esperanto', script: 'Latn', flags: [], sample: '', soon: true },
  { tier: 'x', code: 'non', name: 'Old Norse', endonym: 'Norrœnt mál', script: 'Latn', flags: ['is', 'no'], sample: '', soon: true },
  { tier: 'x', code: 'sa', name: 'Sanskrit', endonym: 'संस्कृतम्', script: 'Deva', flags: ['in'], sample: '', soon: true },
  { tier: 'x', code: 'ht', name: 'Haitian Creole', endonym: 'Kreyòl ayisyen', script: 'Latn', flags: ['ht'], sample: '', soon: true },
  { tier: 'x', code: 'qu', name: 'Quechua', endonym: 'Runasimi', script: 'Latn', flags: ['pe', 'bo', 'ec'], sample: '', soon: true },
  { tier: 'x', code: 'yua', name: 'Maya (Yucatec)', endonym: 'Maayaʼ tʼaan', script: 'Latn', flags: ['mx'], sample: '', soon: true },
  { tier: 'x', code: 'haw', name: 'Hawaiian', endonym: 'ʻŌlelo Hawaiʻi', script: 'Latn', flags: ['us'], sample: '', soon: true },
  { tier: 'x', code: 'mi', name: 'Māori', endonym: 'Te reo Māori', script: 'Latn', flags: ['nz'], sample: '', soon: true },
  { tier: 'x', code: 'ga', name: 'Irish', endonym: 'Gaeilge', script: 'Latn', flags: ['ie'], sample: '', soon: true },
  { tier: 'x', code: 'eu', name: 'Basque', endonym: 'Euskara', script: 'Latn', flags: ['es'], sample: '', soon: true },
];

/** Languages that can be chosen today (the others are placeholders). */
export const AVAILABLE_LANGUAGES = LANGUAGES.filter((l) => !l.soon);

/** The beta languages (tier 3) that can be chosen today. */
export const isBeta = (code: string) => getLanguage(code)?.tier === 3;

/** What a beta language comes with, said wherever one can be chosen. */
export const BETA_INCLUDES = TIERS[3].includes;

export function getLanguage(code: string): LanguageInfo | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/** Right-to-left languages: text in them is set with dir="rtl". */
export const isRtl = (code: string) => Boolean(getLanguage(code)?.rtl);

/** Languages written without spaces between words (word splitting by dictionary). */
export const UNSPACED_LANGS = new Set(['zh', 'yue', 'ja', 'th']);

/** Languages whose words get a reading above them: pinyin for Mandarin, Jyutping for Cantonese, kana for Japanese. */
export const READING_LANGS = new Set(['zh', 'yue', 'ja']);

/** Languages whose learner texts use combining stress marks that should not split word identity. */
export const STRESS_MARKED_LANGS = new Set(['ru']);

/** Language all instant translations are given in. */
export const GLOSS_LANG = 'en';
