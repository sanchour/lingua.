export type Script = 'Latn' | 'Cyrl' | 'Grek';

export interface LanguageInfo {
  /** BCP-47 code used everywhere as `lang`. */
  code: string;
  name: string;
  endonym: string;
  script: Script;
  /** A short original sentence for previews. */
  sample: string;
}

/** The ten languages with full support: offline dictionary pack, frequency list, starter decks. */
export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', endonym: 'English', script: 'Latn', sample: 'In the evening we read by the window while snow fell quietly outside.' },
  { code: 'es', name: 'Spanish', endonym: 'Español', script: 'Latn', sample: 'Por la tarde leíamos junto a la ventana mientras nevaba en silencio.' },
  { code: 'ru', name: 'Russian', endonym: 'Русский', script: 'Cyrl', sample: 'Вечером мы читали у окна, и тихо шёл снег.' },
  { code: 'pt', name: 'Portuguese', endonym: 'Português', script: 'Latn', sample: 'À noite líamos junto à janela enquanto nevava baixinho lá fora.' },
  { code: 'fr', name: 'French', endonym: 'Français', script: 'Latn', sample: 'Le soir, nous lisions près de la fenêtre pendant qu’il neigeait doucement.' },
  { code: 'el', name: 'Greek', endonym: 'Ελληνικά', script: 'Grek', sample: 'Το βράδυ διαβάζαμε δίπλα στο παράθυρο, ενώ έξω χιόνιζε ήσυχα.' },
  { code: 'de', name: 'German', endonym: 'Deutsch', script: 'Latn', sample: 'Am Abend lasen wir am Fenster, während draußen leise Schnee fiel.' },
  { code: 'it', name: 'Italian', endonym: 'Italiano', script: 'Latn', sample: 'La sera leggevamo vicino alla finestra mentre fuori nevicava piano.' },
  { code: 'sv', name: 'Swedish', endonym: 'Svenska', script: 'Latn', sample: 'På kvällen läste vi vid fönstret medan snön föll tyst utanför.' },
  { code: 'hu', name: 'Hungarian', endonym: 'Magyar', script: 'Latn', sample: 'Esténként az ablaknál olvastunk, miközben kint csendben esett a hó.' },
];

export function getLanguage(code: string): LanguageInfo | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/** Languages whose learner texts use combining stress marks that should not split word identity. */
export const STRESS_MARKED_LANGS = new Set(['ru']);

/** Language all instant translations are given in. */
export const GLOSS_LANG = 'en';
