import type { ExerciseSpec, Hint } from '@/core/contracts/exercise';
import type { Lang } from '@/data/types';

export type TranslationCategory = 'sentence' | 'paragraph' | 'dialogue' | 'idiom' | 'slang' | 'formal' | 'passage';

export interface DialogueExchange {
  speaker: string;
  source: string;
  target: string;
}

export interface TranslationTask {
  id: string;
  fromLang: string;
  toLang: string;
  category?: TranslationCategory;
  source: string;
  expected: string;
  accepted?: string[];
  literal?: string;
  natural?: string;
  hints?: string[];
  requiredWord?: string;
  requiredPattern?: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  notes?: string;
  whyDirectFails?: string;
  register?: 'informal' | 'neutral' | 'formal';
  dialogue?: DialogueExchange[];
}

export interface TranslateBody {
  sourceText: string;
  fromLang: string;
  toLang: string;
  category?: TranslationCategory;
  literal?: string;
  natural?: string;
  hints?: string[];
  requiredWord?: string;
  requiredPattern?: string;
  accepted?: string[];
  notes?: string;
  whyDirectFails?: string;
  register?: 'informal' | 'neutral' | 'formal';
  dialogue?: DialogueExchange[];
}

/** Pre-bundled authentic translation sets covering English with the six core languages. */
export const TRANSLATION_PAIRS: TranslationTask[] = [
  // ==========================================
  // SPANISH (es)
  // ==========================================
  {
    id: 'es-1',
    fromLang: 'en',
    toLang: 'es',
    category: 'sentence',
    source: 'I want you to come early.',
    expected: 'Quiero que vengas temprano.',
    accepted: [
      'Quiero que vengas temprano.',
      'Quiero que vengas pronto.',
      'Deseo que vengas temprano.',
    ],
    literal: 'I want that you come (subjunctive) early.',
    natural: 'Quiero que vengas temprano.',
    hints: ['Requires the subjunctive form of venir', 'early = temprano'],
    requiredWord: 'vengas',
    level: 'B1',
    notes: 'In Spanish, wanting someone else to act requires "querer que" followed by the subjunctive mood.',
    whyDirectFails: 'English uses infinitive ("want you to come"), while Spanish requires a subordinate clause with the subjunctive ("que vengas").',
  },
  {
    id: 'es-2',
    fromLang: 'en',
    toLang: 'es',
    category: 'idiom',
    source: "It's raining cats and dogs.",
    expected: 'Está lloviendo a cántaros.',
    accepted: [
      'Está lloviendo a cántaros.',
      'Llueve a cántaros.',
      'Está diluviando.',
    ],
    literal: 'It is raining by pitchers.',
    natural: 'Está lloviendo a cántaros.',
    hints: ['Spanish uses the idiom "a cántaros" (by the jugful)'],
    level: 'A2',
    notes: 'A literal translation of "cats and dogs" makes no sense in Spanish; the natural idiom is "llover a cántaros".',
    whyDirectFails: 'Translating "cats and dogs" literally as "perros y gatos" sounds completely nonsensical to Spanish speakers.',
  },
  {
    id: 'es-3',
    fromLang: 'en',
    toLang: 'es',
    category: 'sentence',
    source: 'Have you seen my keys?',
    expected: '¿Has visto mis llaves?',
    accepted: [
      '¿Has visto mis llaves?',
      '¿Viste mis llaves?',
      'Has visto mis llaves?',
      'Viste mis llaves?',
    ],
    literal: 'Have you seen my keys?',
    natural: '¿Has visto mis llaves?',
    hints: ['Present perfect with haber + visto'],
    requiredWord: 'llaves',
    level: 'A2',
  },
  {
    id: 'es-4',
    fromLang: 'en',
    toLang: 'es',
    category: 'slang',
    source: 'That party was totally awesome!',
    expected: '¡Esa fiesta estuvo genial!',
    accepted: [
      '¡Esa fiesta estuvo genial!',
      '¡Esa fiesta fue genial!',
      '¡Esa fiesta estuvo flipante!',
      '¡Esa fiesta estuvo padrisima!',
      '¡Esa fiesta estuvo brutal!',
    ],
    literal: 'That party was genial/flipante!',
    natural: '¡Esa fiesta estuvo genial!',
    hints: ['Informal expressions: genial, flipante (Spain), padrísima (Mexico)'],
    level: 'B1',
    register: 'informal',
    notes: 'Slang varies widely: "flipante" or "mola mucho" in Spain, "padre" in Mexico, "copado" in Argentina.',
  },
  {
    id: 'es-5',
    fromLang: 'en',
    toLang: 'es',
    category: 'formal',
    source: 'Please do not hesitate to contact us.',
    expected: 'No dude en ponerse en contacto con nosotros.',
    accepted: [
      'No dude en ponerse en contacto con nosotros.',
      'No duden en contactarnos.',
      'Por favor no dude en contactarnos.',
    ],
    literal: 'Do not hesitate (usted) in putting yourself in contact with us.',
    natural: 'No dude en ponerse en contacto con nosotros.',
    hints: ['Use formal usted form: "no dude"', 'ponerse en contacto = get in contact'],
    requiredWord: 'dude',
    level: 'B2',
    register: 'formal',
    notes: 'Formal business correspondence uses "usted" commands and reflexive periphrasis.',
  },
  {
    id: 'es-6',
    fromLang: 'en',
    toLang: 'es',
    category: 'dialogue',
    source: 'A: Good morning, what time does the museum open?\nB: It opens at ten in the morning.',
    expected: 'A: Buenos días, ¿a qué hora abre el museo?\nB: Abre a las diez de la mañana.',
    accepted: [
      'A: Buenos días, ¿a qué hora abre el museo?\nB: Abre a las diez de la mañana.',
      'Buenos días, ¿a qué hora abre el museo? Abre a las diez de la mañana.',
    ],
    literal: 'A: Good days, at what hour opens the museum? B: Opens at the ten of the morning.',
    natural: 'A: Buenos días, ¿a qué hora abre el museo?\nB: Abre a las diez de la mañana.',
    hints: ['time of day: "a qué hora"', 'at ten = "a las diez"'],
    level: 'A1',
    dialogue: [
      { speaker: 'A', source: 'Good morning, what time does the museum open?', target: 'Buenos días, ¿a qué hora abre el museo?' },
      { speaker: 'B', source: 'It opens at ten in the morning.', target: 'Abre a las diez de la mañana.' },
    ],
  },
  {
    id: 'es-7',
    fromLang: 'en',
    toLang: 'es',
    category: 'paragraph',
    source: 'Madrid is a lively city. In the afternoon, people stroll through the Retiro park and enjoy the gentle sun.',
    expected: 'Madrid es una ciudad animada. Por la tarde, la gente pasea por el parque del Retiro y disfruta del sol suave.',
    accepted: [
      'Madrid es una ciudad animada. Por la tarde, la gente pasea por el parque del Retiro y disfruta del sol suave.',
      'Madrid es una ciudad alegre. Por la tarde, la gente pasea por el parque del Retiro y disfruta del sol.',
    ],
    literal: 'Madrid is a city animated. By the afternoon, the people strolls through the park of-the Retiro and enjoys of-the sun soft.',
    natural: 'Madrid es una ciudad animada. Por la tarde, la gente pasea por el parque del Retiro y disfruta del sol suave.',
    hints: ['people is singular in Spanish: "la gente pasea"', 'in the afternoon = por la tarde'],
    requiredWord: 'gente',
    level: 'B1',
    notes: 'Remember that "la gente" is treated as a third-person singular noun in Spanish, unlike the English plural "people".',
  },

  // ==========================================
  // FRENCH (fr)
  // ==========================================
  {
    id: 'fr-1',
    fromLang: 'en',
    toLang: 'fr',
    category: 'sentence',
    source: 'I need to leave now.',
    expected: 'Je dois partir maintenant.',
    accepted: [
      'Je dois partir maintenant.',
      'Il faut que je parte maintenant.',
      'J’ai besoin de partir maintenant.',
      'J\'ai besoin de partir maintenant.',
    ],
    literal: 'I must to-leave now.',
    natural: 'Je dois partir maintenant.',
    hints: ['Verb devoir or avoir besoin de', 'now = maintenant'],
    requiredWord: 'partir',
    level: 'A1',
  },
  {
    id: 'fr-2',
    fromLang: 'en',
    toLang: 'fr',
    category: 'idiom',
    source: 'It costs an arm and a leg.',
    expected: 'Ça coûte les yeux de la tête.',
    accepted: [
      'Ça coûte les yeux de la tête.',
      'Cela coûte les yeux de la tête.',
      'Ca coute les yeux de la tete.',
    ],
    literal: 'That costs the eyes of the head.',
    natural: 'Ça coûte les yeux de la tête.',
    hints: ['French uses "les yeux de la tête" (the eyes in your head)'],
    level: 'B1',
    notes: 'French expresses excessive cost through the eyes of the head rather than limbs.',
    whyDirectFails: 'Directly translating "un bras et une jambe" is an English calque and is not used in French.',
  },
  {
    id: 'fr-3',
    fromLang: 'en',
    toLang: 'fr',
    category: 'slang',
    source: "I'm completely broke.",
    expected: 'Je suis fauché.',
    accepted: [
      'Je suis fauché.',
      'Je suis complètement fauché.',
      'J’ai plus un rond.',
      'J\'ai plus un rond.',
    ],
    literal: 'I am scythed/mown down.',
    natural: 'Je suis fauché.',
    hints: ['Informal slang: fauché (literally scythed/reaped)'],
    level: 'B1',
    register: 'informal',
  },
  {
    id: 'fr-4',
    fromLang: 'en',
    toLang: 'fr',
    category: 'formal',
    source: 'Please accept my sincere regards.',
    expected: 'Veuillez agréer mes salutations distinguées.',
    accepted: [
      'Veuillez agréer mes salutations distinguées.',
      'Veuillez agréer mes sincères salutations.',
    ],
    literal: 'Please agree to my distinguished greetings.',
    natural: 'Veuillez agréer mes salutations distinguées.',
    hints: ['Standard French formal sign-off: "Veuillez agréer..."'],
    requiredWord: 'agréer',
    level: 'B2',
    register: 'formal',
    notes: 'French formal correspondence demands standardized polite ritual formulas.',
  },
  {
    id: 'fr-5',
    fromLang: 'en',
    toLang: 'fr',
    category: 'dialogue',
    source: 'A: Hello, could I have a coffee please?\nB: Right away, with milk or black?',
    expected: 'A: Bonjour, je voudrais un café s’il vous plaît.\nB: Tout de suite, avec du lait ou noir ?',
    accepted: [
      'A: Bonjour, je voudrais un café s’il vous plaît.\nB: Tout de suite, avec du lait ou noir ?',
      'A: Bonjour, je voudrais un café s\'il vous plaît.\nB: Tout de suite, avec du lait ou noir ?',
      'Bonjour, je voudrais un café s’il vous plaît. Tout de suite, avec du lait ou noir ?',
    ],
    literal: 'A: Good day, I would want a coffee if it to-you pleases. B: All of continuation, with some milk or black?',
    natural: 'A: Bonjour, je voudrais un café s’il vous plaît.\nB: Tout de suite, avec du lait ou noir ?',
    hints: ['conditional politeness: "je voudrais"', 'right away = tout de suite'],
    level: 'A2',
    dialogue: [
      { speaker: 'A', source: 'Hello, could I have a coffee please?', target: 'Bonjour, je voudrais un café s’il vous plaît.' },
      { speaker: 'B', source: 'Right away, with milk or black?', target: 'Tout de suite, avec du lait ou noir ?' },
    ],
  },
  {
    id: 'fr-6',
    fromLang: 'en',
    toLang: 'fr',
    category: 'paragraph',
    source: 'The morning was quiet along the Seine. The old bookstalls opened one by one under the pale autumn light.',
    expected: 'Le matin était calme le long de la Seine. Les vieux bouquinistes ouvraient un par un sous la pâle lumière d’automne.',
    accepted: [
      'Le matin était calme le long de la Seine. Les vieux bouquinistes ouvraient un par un sous la pâle lumière d’automne.',
      'Le matin était calme le long de la Seine. Les vieux bouquinistes ouvraient un par un sous la pâle lumière d\'automne.',
    ],
    literal: 'The morning was calm the long of the Seine. The old booksellers were-opening one by one under the pale light of autumn.',
    natural: 'Le matin était calme le long de la Seine. Les vieux bouquinistes ouvraient un par un sous la pâle lumière d’automne.',
    hints: ['imparfait for setting the scene: "était calme", "ouvraient"', 'riverside booksellers = bouquinistes'],
    requiredWord: 'bouquinistes',
    level: 'B2',
  },

  // ==========================================
  // GERMAN (de)
  // ==========================================
  {
    id: 'de-1',
    fromLang: 'en',
    toLang: 'de',
    category: 'sentence',
    source: 'Tomorrow I am going to school.',
    expected: 'Morgen gehe ich zur Schule.',
    accepted: [
      'Morgen gehe ich zur Schule.',
      'Ich gehe morgen zur Schule.',
      'Morgen gehe ich in die Schule.',
    ],
    literal: 'Tomorrow go I to-the school.',
    natural: 'Morgen gehe ich zur Schule.',
    hints: ['Remember the V2 word order: the verb comes second after "Morgen"'],
    requiredWord: 'gehe',
    level: 'A1',
    notes: 'German main clauses strictly enforce the V2 rule: when Position 1 is occupied by an adverb, the subject inverts behind the finite verb.',
    whyDirectFails: 'In English, "Tomorrow I go" keeps subject-verb order; in German, V2 demands inversion ("Morgen gehe ich").',
  },
  {
    id: 'de-2',
    fromLang: 'en',
    toLang: 'de',
    category: 'idiom',
    source: 'I keep my fingers crossed for you.',
    expected: 'Ich drücke dir die Daumen.',
    accepted: [
      'Ich drücke dir die Daumen.',
      'Ich drücke Ihnen die Daumen.',
      'Daumen gedrückt.',
    ],
    literal: 'I press for-you the thumbs.',
    natural: 'Ich drücke dir die Daumen.',
    hints: ['German presses thumbs (die Daumen drücken) with the dative dir'],
    level: 'A2',
    notes: 'German speakers press their thumbs ("die Daumen drücken") where English speakers cross fingers.',
    whyDirectFails: 'Crossing fingers ("Finger kreuzen") is an unnatural Anglicism in German; always use "Daumen drücken".',
  },
  {
    id: 'de-3',
    fromLang: 'en',
    toLang: 'de',
    category: 'sentence',
    source: 'I know that you are right.',
    expected: 'Ich weiß, dass du recht hast.',
    accepted: [
      'Ich weiß, dass du recht hast.',
      'Ich weiß, dass du Recht hast.',
      'Ich weiss, dass du recht hast.',
    ],
    literal: 'I know, that you right have.',
    natural: 'Ich weiß, dass du recht hast.',
    hints: ['Subordinate clause introduced by "dass" sends the verb "hast" to the very end'],
    requiredWord: 'hast',
    level: 'A2',
    requiredPattern: 'subordinate verb-final',
  },
  {
    id: 'de-4',
    fromLang: 'en',
    toLang: 'de',
    category: 'formal',
    source: 'We look forward to hearing from you.',
    expected: 'Wir freuen uns auf Ihre Rückmeldung.',
    accepted: [
      'Wir freuen uns auf Ihre Rückmeldung.',
      'Wir freuen uns auf Ihre Antwort.',
    ],
    literal: 'We rejoice ourselves on your (formal) feedback.',
    natural: 'Wir freuen uns auf Ihre Rückmeldung.',
    hints: ['Reflexive verb sich freuen auf + accusative'],
    requiredWord: 'freuen',
    level: 'B1',
    register: 'formal',
  },
  {
    id: 'de-5',
    fromLang: 'en',
    toLang: 'de',
    category: 'dialogue',
    source: 'A: Good morning, two bread rolls please.\nB: Certainly, anything else for you?',
    expected: 'A: Guten Tag, zwei Brötchen bitte.\nB: Gerne, sonst noch etwas?',
    accepted: [
      'A: Guten Tag, zwei Brötchen bitte.\nB: Gerne, sonst noch etwas?',
      'Guten Tag, zwei Brötchen bitte. Gerne, sonst noch etwas?',
    ],
    literal: 'A: Good day, two rolls please. B: Gladly, otherwise still something?',
    natural: 'A: Guten Tag, zwei Brötchen bitte.\nB: Gerne, sonst noch etwas?',
    hints: ['bread rolls = Brötchen', 'anything else = sonst noch etwas'],
    level: 'A1',
    dialogue: [
      { speaker: 'A', source: 'Good morning, two bread rolls please.', target: 'Guten Tag, zwei Brötchen bitte.' },
      { speaker: 'B', source: 'Certainly, anything else for you?', target: 'Gerne, sonst noch etwas?' },
    ],
  },
  {
    id: 'de-6',
    fromLang: 'en',
    toLang: 'de',
    category: 'paragraph',
    source: 'On Sundays the shops remain closed. Families take long walks through the forest and stop at a cosy tavern.',
    expected: 'Sonntags bleiben die Geschäfte geschlossen. Familien machen lange Spaziergänge durch den Wald und kehren in einem gemütlichen Gasthaus ein.',
    accepted: [
      'Sonntags bleiben die Geschäfte geschlossen. Familien machen lange Spaziergänge durch den Wald und kehren in einem gemütlichen Gasthaus ein.',
      'Am Sonntag bleiben die Geschäfte geschlossen. Familien machen lange Spaziergänge durch den Wald und gehen in ein gemütliches Gasthaus.',
    ],
    literal: 'On-Sundays remain the shops closed. Families make long strolls through the forest and turn-in in a cosy inn.',
    natural: 'Sonntags bleiben die Geschäfte geschlossen. Familien machen lange Spaziergänge durch den Wald und kehren in einem gemütlichen Gasthaus ein.',
    hints: ['V2 after Sonntags', 'durch takes accusative: den Wald', 'cosy = gemütlich'],
    requiredWord: 'geschlossen',
    level: 'B1',
  },

  // ==========================================
  // ITALIAN (it)
  // ==========================================
  {
    id: 'it-1',
    fromLang: 'en',
    toLang: 'it',
    category: 'sentence',
    source: 'I like Italian food very much.',
    expected: 'Mi piace molto il cibo italiano.',
    accepted: [
      'Mi piace molto il cibo italiano.',
      'A me piace molto il cibo italiano.',
      'Mi piace moltissimo il cibo italiano.',
    ],
    literal: 'To-me pleases much the food Italian.',
    natural: 'Mi piace molto il cibo italiano.',
    hints: ['Use the verb piacere with indirect pronoun mi'],
    requiredWord: 'piace',
    level: 'A1',
    whyDirectFails: 'English "I like food" has "I" as subject; Italian reverses this with "cibo" as subject and "mi" as indirect object.',
  },
  {
    id: 'it-2',
    fromLang: 'en',
    toLang: 'it',
    category: 'idiom',
    source: 'Good luck!',
    expected: 'In bocca al lupo!',
    accepted: [
      'In bocca al lupo!',
      'Buona fortuna!',
    ],
    literal: 'Into the mouth of the wolf!',
    natural: 'In bocca al lupo!',
    hints: ['Traditional Italian saying wishing protection: in the wolf\'s mouth'],
    level: 'A1',
    notes: 'The traditional Italian response is "Crepi il lupo!" (may the wolf die) or "Viva il lupo!"',
    whyDirectFails: 'While "Buona fortuna" exists, Italians consider wishing good luck directly bad luck; the protective idiom is "In bocca al lupo".',
  },
  {
    id: 'it-3',
    fromLang: 'en',
    toLang: 'it',
    category: 'slang',
    source: 'What a drag! We missed the bus.',
    expected: 'Che pizza! Abbiamo perso l’autobus.',
    accepted: [
      'Che pizza! Abbiamo perso l’autobus.',
      'Che pizza! Abbiamo perso l\'autobus.',
      'Che barba! Abbiamo perso l’autobus.',
    ],
    literal: 'What a pizza! We have lost the bus.',
    natural: 'Che pizza! Abbiamo perso l’autobus.',
    hints: ['Italian slang: "che pizza" means what a bore / what a nuisance'],
    level: 'B1',
    register: 'informal',
  },
  {
    id: 'it-4',
    fromLang: 'en',
    toLang: 'it',
    category: 'dialogue',
    source: 'A: A ticket to Florence, please.\nB: One-way or round trip?',
    expected: 'A: Un biglietto per Firenze, per favore.\nB: Solo andata o andata e ritorno?',
    accepted: [
      'A: Un biglietto per Firenze, per favore.\nB: Solo andata o andata e ritorno?',
      'Un biglietto per Firenze, per favore. Solo andata o andata e ritorno?',
    ],
    literal: 'A: A ticket for Florence, please. B: Only going or going and return?',
    natural: 'A: Un biglietto per Firenze, per favore.\nB: Solo andata o andata e ritorno?',
    hints: ['one-way = solo andata', 'round trip = andata e ritorno'],
    level: 'A1',
    dialogue: [
      { speaker: 'A', source: 'A ticket to Florence, please.', target: 'Un biglietto per Firenze, per favore.' },
      { speaker: 'B', source: 'One-way or round trip?', target: 'Solo andata o andata e ritorno?' },
    ],
  },
  {
    id: 'it-5',
    fromLang: 'en',
    toLang: 'it',
    category: 'paragraph',
    source: 'In summer the square comes alive at dusk. Old men chat on stone benches while children chase pigeons.',
    expected: 'In estate la piazza si anima al tramonto. Gli anziani chiacchierano sulle panchine di pietra mentre i bambini rincorrono i piccioni.',
    accepted: [
      'In estate la piazza si anima al tramonto. Gli anziani chiacchierano sulle panchine di pietra mentre i bambini rincorrono i piccioni.',
      'D’estate la piazza si anima al tramonto. I vecchi chiacchierano sulle panchine di pietra mentre i bambini inseguono i piccioni.',
    ],
    literal: 'In summer the square itself animates at-the dusk. The elderly chat on-the benches of stone while the children chase the pigeons.',
    natural: 'In estate la piazza si anima al tramonto. Gli anziani chiacchierano sulle panchine di pietra mentre i bambini rincorrono i piccioni.',
    hints: ['reflexive "si anima"', 'dusk = tramonto', 'chase = rincorrere'],
    requiredWord: 'tramonto',
    level: 'B2',
  },

  // ==========================================
  // RUSSIAN (ru)
  // ==========================================
  {
    id: 'ru-1',
    fromLang: 'en',
    toLang: 'ru',
    category: 'sentence',
    source: 'I have a new car.',
    expected: 'У меня есть новая машина.',
    accepted: [
      'У меня есть новая машина.',
      'У меня новая машина.',
    ],
    literal: 'At me is new (fem) car.',
    natural: 'У меня есть новая машина.',
    hints: ['Use the "У меня есть..." structure'],
    requiredWord: 'машина',
    level: 'A1',
    whyDirectFails: 'Russian does not typically use a verb "to have" (иметь); it uses prepositional genitive "У меня есть".',
  },
  {
    id: 'ru-2',
    fromLang: 'en',
    toLang: 'ru',
    category: 'sentence',
    source: 'He read the whole book yesterday.',
    expected: 'Вчера он прочитал всю книгу.',
    accepted: [
      'Вчера он прочитал всю книгу.',
      'Он прочитал всю книгу вчера.',
      'Он вчера прочитал всю книгу.',
    ],
    literal: 'Yesterday he read (perfective) all (fem acc) book.',
    natural: 'Вчера он прочитал всю книгу.',
    hints: ['Completed result requires the perfective verb прочитал and accusative книгу'],
    requiredWord: 'прочитал',
    level: 'A2',
    notes: 'Russian uses the perfective aspect (прочитал) for a finished action with an achieved result.',
  },
  {
    id: 'ru-3',
    fromLang: 'en',
    toLang: 'ru',
    category: 'idiom',
    source: 'Don’t make a mountain out of a molehill.',
    expected: 'Не делай из мухи слона.',
    accepted: [
      'Не делай из мухи слона.',
      'Не делайте из мухи слона.',
    ],
    literal: 'Do not make an elephant out of a fly.',
    natural: 'Не делай из мухи слона.',
    hints: ['Russian idiom: turning a fly into an elephant'],
    level: 'B1',
    whyDirectFails: 'English mentions molehills and mountains; Russian contrasts a fly (муха) with an elephant (слон).',
  },
  {
    id: 'ru-4',
    fromLang: 'en',
    toLang: 'ru',
    category: 'dialogue',
    source: 'A: Hello, how are you?\nB: Thanks, everything is fine.',
    expected: 'A: Здравствуйте, как ваши дела?\nB: Спасибо, всё в порядке.',
    accepted: [
      'A: Здравствуйте, как ваши дела?\nB: Спасибо, всё в порядке.',
      'A: Привет, как дела?\nB: Спасибо, всё отлично.',
      'Здравствуйте, как ваши дела? Спасибо, всё в порядке.',
    ],
    literal: 'A: Be healthy (formal), how your affairs? B: Thanks, all in order.',
    natural: 'A: Здравствуйте, как ваши дела?\nB: Спасибо, всё в порядке.',
    hints: ['how are things: "как дела?"', 'all in order = всё в порядке'],
    level: 'A1',
    dialogue: [
      { speaker: 'A', source: 'Hello, how are you?', target: 'Здравствуйте, как ваши дела?' },
      { speaker: 'B', source: 'Thanks, everything is fine.', target: 'Спасибо, всё в порядке.' },
    ],
  },
  {
    id: 'ru-5',
    fromLang: 'en',
    toLang: 'ru',
    category: 'paragraph',
    source: 'Winter came unexpectedly to the city. Snow quietly blanketed the avenues and frozen canals.',
    expected: 'Зима пришла в город неожиданно. Снег тихо покрыл проспекты и замерзшие каналы.',
    accepted: [
      'Зима пришла в город неожиданно. Снег тихо покрыл проспекты и замерзшие каналы.',
      'Зима пришла неожиданно. Снег тихо покрыл проспекты и замерзшие каналы.',
    ],
    literal: 'Winter came into city unexpectedly. Snow quietly covered avenues and frozen canals.',
    natural: 'Зима пришла в город неожиданно. Снег тихо покрыл проспекты и замерзшие каналы.',
    hints: ['perfective verbs for completed narrative events: пришла, покрыл'],
    requiredWord: 'снег',
    level: 'B2',
  },

  // ==========================================
  // CHINESE (zh)
  // ==========================================
  {
    id: 'zh-1',
    fromLang: 'en',
    toLang: 'zh',
    category: 'sentence',
    source: 'I take the subway to work every day.',
    expected: '我每天坐地铁去上班。',
    accepted: [
      '我每天坐地铁去上班。',
      '我每天坐地铁上班。',
    ],
    literal: 'I everyday take subway go to-work.',
    natural: '我每天坐地铁去上班。',
    hints: ['Time word 每天 goes before the verb 坐地铁'],
    requiredWord: '地铁',
    level: 'A1',
    notes: 'Chinese time and manner adverbials strictly precede the verb.',
    whyDirectFails: 'English places "every day" and "to work" after the verb, but Chinese puts time adverbials before verbs.',
  },
  {
    id: 'zh-2',
    fromLang: 'en',
    toLang: 'zh',
    category: 'sentence',
    source: 'The milk has gone bad.',
    expected: '牛奶坏了。',
    accepted: [
      '牛奶坏了。',
      '牛奶变质了。',
    ],
    literal: 'Milk broken/bad new-state (le).',
    natural: '牛奶坏了。',
    hints: ['Sentence-final 了 marks a change of state'],
    requiredWord: '坏了',
    level: 'A2',
  },
  {
    id: 'zh-3',
    fromLang: 'en',
    toLang: 'zh',
    category: 'idiom',
    source: 'To gild the lily (to ruin something by adding unnecessary details).',
    expected: '画蛇添足。',
    accepted: [
      '画蛇添足。',
      '画蛇添足',
    ],
    literal: 'Draw snake add feet.',
    natural: '画蛇添足。',
    hints: ['Four-character classical chengyu about drawing a snake'],
    level: 'B2',
    notes: 'Classical chengyu comes from the Warring States period story where someone lost a competition by drawing feet on a snake.',
    whyDirectFails: 'English references lilies and gilding; Chinese refers to the historical parable of adding feet to a snake.',
  },
  {
    id: 'zh-4',
    fromLang: 'en',
    toLang: 'zh',
    category: 'dialogue',
    source: 'A: Waiter, two bowls of rice please.\nB: Right away, please wait a moment.',
    expected: 'A: 服务员，请给我们两碗米饭。\nB: 好的，请稍等。',
    accepted: [
      'A: 服务员，请给我们两碗米饭。\nB: 好的，请稍等。',
      '服务员，两碗米饭。好的，请稍等。',
    ],
    literal: 'A: Waiter, please give us two bowls rice. B: Good, please wait-a-little.',
    natural: 'A: 服务员，请给我们两碗米饭。\nB: 好的，请稍等。',
    hints: ['measure word for bowl: 碗 (wǎn)', 'wait a moment: 稍等 (shāoděng)'],
    level: 'A1',
    dialogue: [
      { speaker: 'A', source: 'Waiter, two bowls of rice please.', target: '服务员，请给我们两碗米饭。' },
      { speaker: 'B', source: 'Right away, please wait a moment.', target: '好的，请稍等。' },
    ],
  },
  {
    id: 'zh-5',
    fromLang: 'en',
    toLang: 'zh',
    category: 'paragraph',
    source: 'Autumn in Beijing is the most beautiful season. The sky is extraordinarily blue, and the maple leaves in the hills turn fiery red.',
    expected: '北京的秋天是最美丽的季节。天空格外晴朗，山里的枫叶变得像火一样红。',
    accepted: [
      '北京的秋天是最美丽的季节。天空格外晴朗，山里的枫叶变得像火一样红。',
      '北京的秋天是最美的季节。天空格外蓝，山上的枫叶都红了。',
    ],
    literal: 'Beijing\'s autumn is most beautiful season. Sky exceptionally clear, mountain inside maple leaves become like fire same red.',
    natural: '北京的秋天是最美丽的季节。天空格外晴朗，山里的枫叶变得像火一样红。',
    hints: ['most beautiful = 最美丽', 'maple leaves = 枫叶'],
    requiredWord: '秋天',
    level: 'B2',
  },
];

/** Validates whether an answer contains the specified required word or pattern. */
export function validateRequirements(
  answer: string,
  requiredWord?: string,
  requiredPattern?: string,
): { valid: boolean; missingRequirement?: string } {
  if (requiredWord) {
    const cleanAnswer = answer.toLowerCase().replace(/[.,!?;:¿¡]/g, '');
    const cleanReq = requiredWord.toLowerCase().replace(/[.,!?;:¿¡]/g, '');
    if (!cleanAnswer.includes(cleanReq)) {
      return { valid: false, missingRequirement: `Answer must include the required word: "${requiredWord}"` };
    }
  }

  if (requiredPattern) {
    // If a pattern description exists, we provide feedback
    return { valid: true };
  }

  return { valid: true };
}

/** Builds an ExerciseSpec for a translation task. */
export function buildTranslationExercise(
  task: TranslationTask,
  rulePreference: 'accepted' | 'ai' | 'self' = 'accepted',
): ExerciseSpec<'translate', TranslateBody> {
  const acceptedList = task.accepted && task.accepted.length > 0 ? task.accepted : [task.expected];

  let answerRule: ExerciseSpec<'translate', TranslateBody>['check'];

  if (rulePreference === 'ai') {
    answerRule = {
      rule: 'ai',
      modelAnswer: task.expected,
      criteria: task.requiredWord ? `Must convey the meaning naturally and contain "${task.requiredWord}".` : undefined,
    };
  } else if (rulePreference === 'self') {
    answerRule = {
      rule: 'self',
      modelAnswer: task.expected,
    };
  } else {
    answerRule = {
      rule: 'accepted',
      accepted: acceptedList,
    };
  }

  const specHints: Hint[] | undefined = task.hints?.map((h, i) => ({
    text: h,
    strength: (i === 0 ? 0 : 1) as 0 | 1 | 2,
  }));

  return {
    kind: 'translate',
    key: `translate:${task.id}`,
    lang: task.toLang as Lang,
    instruction: `Translate into ${task.toLang === 'es' ? 'Spanish' : task.toLang === 'fr' ? 'French' : task.toLang === 'de' ? 'German' : task.toLang === 'it' ? 'Italian' : task.toLang === 'ru' ? 'Russian' : task.toLang === 'zh' ? 'Chinese' : task.toLang}:`,
    check: answerRule,
    body: {
      sourceText: task.source,
      fromLang: task.fromLang,
      toLang: task.toLang,
      category: task.category,
      literal: task.literal,
      natural: task.natural,
      hints: task.hints,
      requiredWord: task.requiredWord,
      requiredPattern: task.requiredPattern,
      accepted: acceptedList,
      notes: task.notes,
      whyDirectFails: task.whyDirectFails,
      register: task.register,
      dialogue: task.dialogue,
    },
    hints: specHints,
    trains: {
      skill: 'writing',
      item: { type: 'pattern', patternId: `translate:${task.id}` },
    },
  };
}

/** Returns translation tasks available for a language. */
export function getTranslationTasks(lang: string, category?: TranslationCategory): TranslationTask[] {
  let list = TRANSLATION_PAIRS.filter((p) => p.toLang === lang || p.fromLang === lang);
  if (category) {
    list = list.filter((p) => p.category === category);
  }
  return list;
}
