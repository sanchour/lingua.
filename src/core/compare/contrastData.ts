export type ContrastDimension =
  | 'word-order'
  | 'gender'
  | 'cases'
  | 'tense-aspect'
  | 'articles'
  | 'prepositions'
  | 'pronouns'
  | 'politeness'
  | 'idioms'
  | 'false-friends'
  | 'roots-formation'
  | 'pronunciation'
  | 'culture-semantics';

export interface ContrastItem {
  id: string;
  dimension: ContrastDimension;
  title: string;
  summary: string;
  lang1: {
    lang: string;
    description: string;
    example?: string;
    literal?: string;
  };
  lang2: {
    lang: string;
    description: string;
    example?: string;
    literal?: string;
  };
  alert?: string;
  falseFriends?: Array<{
    term: string;
    looksLike: string;
    actualMeaning: string;
    correctTerm: string;
    note?: string;
  }>;
}

export interface LanguagePairContrast {
  pairKey: string;
  fromLang: string;
  toLang: string;
  title: string;
  overview: string;
  items: ContrastItem[];
}

export const CONTRAST_PAIRS: LanguagePairContrast[] = [
  // ==========================================
  // ENGLISH ↔ SPANISH
  // ==========================================
  {
    pairKey: 'en-es',
    fromLang: 'en',
    toLang: 'es',
    title: 'English & Spanish',
    overview: 'While both are Indo-European and share vast Latinate vocabulary, Spanish is heavily inflected, pro-drop, and features grammatical gender, strict subjunctive moods, and post-nominal adjectives.',
    items: [
      {
        id: 'es-wo-1',
        dimension: 'word-order',
        title: 'Subject Pronoun Dropping (Pro-Drop) & Flexible Order',
        summary: 'Spanish verbal inflections render subject pronouns redundant, while English strictly requires explicit subjects.',
        lang1: {
          lang: 'en',
          description: 'Subject pronouns are obligatory in standard declarative clauses.',
          example: 'I study every afternoon.',
        },
        lang2: {
          lang: 'es',
          description: 'Subject pronouns are omitted unless needed for contrast or emphasis.',
          example: 'Estudio todas las tardes.',
          literal: 'Study all the afternoons.',
        },
      },
      {
        id: 'es-wo-2',
        dimension: 'word-order',
        title: 'Adjective Placement',
        summary: 'Descriptive adjectives usually precede nouns in English, but follow them in Spanish.',
        lang1: {
          lang: 'en',
          description: 'Adjectives strictly precede the noun.',
          example: 'a red car, an interesting book',
        },
        lang2: {
          lang: 'es',
          description: 'Descriptive and classifying adjectives normally follow the noun.',
          example: 'un coche rojo, un libro interesante',
          literal: 'a car red, a book interesting',
        },
        alert: 'Some adjectives change meaning based on position: "un viejo amigo" (a longtime friend) vs "un amigo viejo" (an elderly friend).',
      },
      {
        id: 'es-gen-1',
        dimension: 'gender',
        title: 'Two-Gender Nominal System',
        summary: 'Every Spanish noun is inherently masculine or feminine, triggering agreement across articles, adjectives, and demonstratives.',
        lang1: {
          lang: 'en',
          description: 'Natural gender only (animate pronouns he/she; inanimate it).',
          example: 'The table is big. It is made of wood.',
        },
        lang2: {
          lang: 'es',
          description: 'Grammatical gender applies to all nouns with morphological concord.',
          example: 'La mesa es grande. Es de madera.',
          literal: 'The (fem) table (fem) is big.',
        },
      },
      {
        id: 'es-ta-1',
        dimension: 'tense-aspect',
        title: 'Preterite vs Imperfect (Aspectual Past)',
        summary: 'English uses "was doing" or "used to", but Spanish grammaticalizes completed events vs ongoing/habitual past states.',
        lang1: {
          lang: 'en',
          description: 'Simple past "went / wrote" often covers both finished actions and descriptive states.',
          example: 'I went to Spain every summer / I went to Spain yesterday.',
        },
        lang2: {
          lang: 'es',
          description: 'Pretérito indefinido (completed action) vs Pretérito imperfecto (ongoing/habitual/setting scene).',
          example: 'Iba a España cada verano (imperfect) / Fui a España ayer (preterite).',
        },
      },
      {
        id: 'es-ta-2',
        dimension: 'tense-aspect',
        title: 'Subjunctive Mood Requirement',
        summary: 'English retains only traces of the subjunctive, whereas Spanish requires it after wishes, doubts, emotions, and negation.',
        lang1: {
          lang: 'en',
          description: 'English uses infinitive structures: "I want you to be happy".',
          example: 'I want you to come.',
        },
        lang2: {
          lang: 'es',
          description: 'Subordinate clauses triggered by desire require the subjunctive mood.',
          example: 'Quiero que vengas.',
          literal: 'I want that you come (subjunctive).',
        },
      },
      {
        id: 'es-pol-1',
        dimension: 'politeness',
        title: 'T-V Distinction: Tú vs Usted',
        summary: 'Spanish maintains a dual address system for intimacy vs social distance/respect.',
        lang1: {
          lang: 'en',
          description: 'Unified second-person pronoun "you" for all interlocutors.',
          example: 'Could you tell me the time?',
        },
        lang2: {
          lang: 'es',
          description: 'Informal "tú" (family, peers) vs formal "usted" (elders, officials, strangers) using 3rd-person verbs.',
          example: '¿Me puedes decir la hora? (tú) / ¿Me puede decir la hora? (usted)',
        },
      },
      {
        id: 'es-ff-1',
        dimension: 'false-friends',
        title: 'False Friends & Deceptive Cognates',
        summary: 'Words that look virtually identical but have diverged in meaning.',
        lang1: {
          lang: 'en',
          description: 'English terms with deceptive Latin roots.',
        },
        lang2: {
          lang: 'es',
          description: 'True Spanish meanings and correct equivalents.',
        },
        falseFriends: [
          { term: 'embarazada', looksLike: 'embarrassed', actualMeaning: 'pregnant', correctTerm: 'avergonzado / apenado', note: 'Never say "estoy embarazada" to mean embarrassed!' },
          { term: 'actual / actualmente', looksLike: 'actual / actually', actualMeaning: 'current / currently', correctTerm: 'real / en realidad' },
          { term: 'éxito', looksLike: 'exit', actualMeaning: 'success', correctTerm: 'salida' },
          { term: 'sensible', looksLike: 'sensible (reasonable)', actualMeaning: 'sensitive', correctTerm: 'sensato / razonable' },
          { term: 'constipado', looksLike: 'constipated', actualMeaning: 'having a head cold / congested', correctTerm: 'estreñido' },
        ],
      },
      {
        id: 'es-id-1',
        dimension: 'idioms',
        title: 'Comparative Idioms & Figurative Logic',
        summary: 'How everyday metaphors differ in cultural imagery.',
        lang1: {
          lang: 'en',
          description: 'It’s raining cats and dogs / To pull someone’s leg.',
        },
        lang2: {
          lang: 'es',
          description: 'Está lloviendo a cántaros (by the pitcher) / Tomar el pelo (to take the hair).',
          literal: 'Raining by pitchers / Taking the hair.',
        },
      },
      {
        id: 'es-cult-1',
        dimension: 'culture-semantics',
        title: 'Cultural Associations: "Sobremesa" & Social Pacing',
        summary: 'Cultural vocabulary reflecting societal habits.',
        lang1: {
          lang: 'en',
          description: 'No single word; described as "lingering at the table chatting after a meal".',
        },
        lang2: {
          lang: 'es',
          description: '"Sobremesa": the cherished period of conversation shared around the table after finishing food.',
        },
      },
    ],
  },

  // ==========================================
  // ENGLISH ↔ FRENCH
  // ==========================================
  {
    pairKey: 'en-fr',
    fromLang: 'en',
    toLang: 'fr',
    title: 'English & French',
    overview: 'English absorbed thousands of Norman French words after 1066, yet the syntactic architectures diverge across clitic pronouns, partitive articles, and precise liaison phonetics.',
    items: [
      {
        id: 'fr-wo-1',
        dimension: 'word-order',
        title: 'Pre-Verbal Object Clitic Pronouns',
        summary: 'In French, object pronouns jump in front of the conjugated verb, whereas English places them after the verb.',
        lang1: {
          lang: 'en',
          description: 'Subject + Verb + Object order.',
          example: 'I see him. I give it to her.',
        },
        lang2: {
          lang: 'es',
          description: 'Subject + Object pronoun + Verb order.',
          example: 'Je le vois. Je le lui donne.',
          literal: 'I him see. I it to-her give.',
        },
      },
      {
        id: 'fr-art-1',
        dimension: 'articles',
        title: 'Partitive Articles (Du, De la, Des)',
        summary: 'French requires explicit partitive articles for unspecified quantities where English uses bare nouns or "some".',
        lang1: {
          lang: 'en',
          description: 'Bare noun or optional "some".',
          example: 'I drink water and eat bread.',
        },
        lang2: {
          lang: 'fr',
          description: 'Partitive article obligatory before mass nouns.',
          example: 'Je bois de l’eau et je mange du pain.',
          literal: 'I drink of-the water and eat of-the bread.',
        },
      },
      {
        id: 'fr-pol-1',
        dimension: 'politeness',
        title: 'The "Tu" vs "Vous" Social Boundary',
        summary: 'Tutoiement vs vouvoiement is a strictly observed social code in France and Francophone cultures.',
        lang1: {
          lang: 'en',
          description: 'Universal "you".',
          example: 'How are you today?',
        },
        lang2: {
          lang: 'fr',
          description: 'Tu (intimate, young, family) vs Vous (colleagues, strangers, shopkeepers, formal plural).',
          example: 'Comment vas-tu ? (tu) / Comment allez-vous ? (vous)',
        },
      },
      {
        id: 'fr-ff-1',
        dimension: 'false-friends',
        title: 'False Friends (Faux Amis)',
        summary: 'Because of shared Anglo-Norman heritage, faux amis are frequent and treacherous.',
        lang1: {
          lang: 'en',
          description: 'English terms with Norman/Latin cognates.',
        },
        lang2: {
          lang: 'fr',
          description: 'True French meanings.',
        },
        falseFriends: [
          { term: 'actuellement', looksLike: 'actually', actualMeaning: 'currently / at the moment', correctTerm: 'en fait / en réalité' },
          { term: 'blesser', looksLike: 'to bless', actualMeaning: 'to wound / injure', correctTerm: 'bénir' },
          { term: 'formidable', looksLike: 'formidable (frightening)', actualMeaning: 'wonderful / fantastic', correctTerm: 'redoutable' },
          { term: 'attendre', looksLike: 'to attend', actualMeaning: 'to wait', correctTerm: 'assister à' },
          { term: 'demander', looksLike: 'to demand', actualMeaning: 'to ask politely', correctTerm: 'exiger' },
        ],
      },
      {
        id: 'fr-pron-1',
        dimension: 'pronunciation',
        title: 'Nasal Vowels & Silent Final Consonants',
        summary: 'French orthography retains historical final consonants that are silent unless phonetically linked via liaison.',
        lang1: {
          lang: 'en',
          description: 'Final consonants are almost always sounded.',
          example: 'chat, grand, vent (all consonants audible)',
        },
        lang2: {
          lang: 'fr',
          description: 'Final -t, -d, -s, -x are silent in isolation; vowels before n/m become nasalized.',
          example: 'chat [ʃa], grand [ɡʁɑ̃], vent [vɑ̃]',
        },
      },
    ],
  },

  // ==========================================
  // ENGLISH ↔ GERMAN
  // ==========================================
  {
    pairKey: 'en-de',
    fromLang: 'en',
    toLang: 'de',
    title: 'English & German',
    overview: 'As sister Germanic tongues, English and German share thousands of core words (water/Wasser, father/Vater), but German retains a robust four-case system, strict V2 main clause syntax, verb-final subordinate clauses, and compounding.',
    items: [
      {
        id: 'de-wo-1',
        dimension: 'word-order',
        title: 'The V2 Rule & Subordinate Verb-Final (SOV)',
        summary: 'Main clauses require the finite verb in Position 2; subordinate clauses push all verbs to the absolute end.',
        lang1: {
          lang: 'en',
          description: 'Rigid SVO in both main and subordinate clauses.',
          example: 'Tomorrow I will go to the market because I need fresh fruit.',
        },
        lang2: {
          lang: 'de',
          description: 'Inversion in main clause ("Morgen gehe ich") and verb-final in subordinate ("brauche").',
          example: 'Morgen gehe ich auf den Markt, weil ich frisches Obst brauche.',
          literal: 'Tomorrow go I to the market, because I fresh fruit need.',
        },
        alert: 'Remember: Verb in Position 2 in main clauses, verb at the absolute end after subordinating conjunctions (weil, dass, obwohl, wenn).',
      },
      {
        id: 'de-cas-1',
        dimension: 'cases',
        title: 'Four-Case Declension (Nom, Acc, Dat, Gen)',
        summary: 'Grammatical relations (subject, direct object, indirect object, possessor) are marked on articles and adjectives.',
        lang1: {
          lang: 'en',
          description: 'Syntactic role determined primarily by word order and prepositions.',
          example: 'The father gives the son the book.',
        },
        lang2: {
          lang: 'de',
          description: 'Case morphology: Subject (Nom), Indirect Object (Dat), Direct Object (Acc).',
          example: 'Der Vater (Nom) gibt dem Sohn (Dat) das Buch (Acc).',
          literal: 'The father gives to-the son the book.',
        },
      },
      {
        id: 'de-prep-1',
        dimension: 'prepositions',
        title: 'Two-Way Prepositions (Wechselpräpositionen)',
        summary: 'Nine prepositions take the dative for stationary location, or the accusative for directed movement.',
        lang1: {
          lang: 'en',
          description: 'Uses "in" for both location and movement (or optional "into").',
          example: 'I am in the kitchen / I walk into the kitchen.',
        },
        lang2: {
          lang: 'de',
          description: 'In + Dative = location (Wo?); In + Accusative = destination (Wohin?).',
          example: 'Ich bin in der Küche (Dat) / Ich gehe in die Küche (Acc).',
        },
      },
      {
        id: 'de-comp-1',
        dimension: 'roots-formation',
        title: 'Compounding & Transparent Word Formation',
        summary: 'German builds elaborate compound nouns directly by concatenation where English writes separate words.',
        lang1: {
          lang: 'en',
          description: 'Compound terms written with spaces or hyphens.',
          example: 'health insurance card / emergency room',
        },
        lang2: {
          lang: 'de',
          description: 'Single concatenated lexical compound with predictable gender determined by the final head.',
          example: 'Krankenversicherungskarte (die Karte) / Notaufnahme',
        },
      },
      {
        id: 'de-pol-1',
        dimension: 'politeness',
        title: 'Du vs Sie Formal Address',
        summary: 'The formal "Sie" (capitalized, using 3rd person plural verbs) is strictly required with all adult non-family members.',
        lang1: {
          lang: 'en',
          description: 'Universal "you".',
          example: 'Are you ready?',
        },
        lang2: {
          lang: 'de',
          description: 'Du (intimate) vs Sie (formal, respectful). Transitioning to "du" is an explicit ritual (das Du anbieten).',
          example: 'Bist du bereit? (du) / Sind Sie bereit? (Sie)',
        },
      },
      {
        id: 'de-ff-1',
        dimension: 'false-friends',
        title: 'False Friends (Falsche Freunde)',
        summary: 'German-English deceptive cognates can produce dramatic misunderstandings.',
        lang1: {
          lang: 'en',
          description: 'English terms with deceptive Germanic/Latin appearance.',
        },
        lang2: {
          lang: 'de',
          description: 'True German meanings.',
        },
        falseFriends: [
          { term: 'das Gift', looksLike: 'gift (present)', actualMeaning: 'poison / venom', correctTerm: 'das Geschenk', note: 'Never give someone "Gift" in Germany!' },
          { term: 'bekommen', looksLike: 'to become', actualMeaning: 'to receive / get', correctTerm: 'werden' },
          { term: 'der Chef', looksLike: 'chef (cook)', actualMeaning: 'boss / manager', correctTerm: 'der Koch' },
          { term: 'aktuell', looksLike: 'actual', actualMeaning: 'current / up to date', correctTerm: 'tatsächlich / echt' },
          { term: 'brav', looksLike: 'brave', actualMeaning: 'well-behaved / obedient', correctTerm: 'mutig' },
        ],
      },
      {
        id: 'de-cult-1',
        dimension: 'culture-semantics',
        title: 'Untranslatable Words: "Waldeinsamkeit" & Nature',
        summary: 'Vocabulary rooted in German romanticism and connection to woodland solitude.',
        lang1: {
          lang: 'en',
          description: 'Described as "the feeling of being alone in the forest and connected to nature".',
        },
        lang2: {
          lang: 'de',
          description: '"Waldeinsamkeit": profound peaceful solitude experienced when walking alone through deep woods.',
        },
      },
    ],
  },

  // ==========================================
  // ENGLISH ↔ ITALIAN
  // ==========================================
  {
    pairKey: 'en-it',
    fromLang: 'en',
    toLang: 'it',
    title: 'English & Italian',
    overview: 'Italian features high vowel sonority, pro-drop sentence architecture, inverted affective verbs like "piacere", and vivid gesture-associated pragmatic registers.',
    items: [
      {
        id: 'it-wo-1',
        dimension: 'word-order',
        title: 'Inverted Construction: The Verb "Piacere"',
        summary: 'In Italian, what you like is the grammatical subject that pleases you.',
        lang1: {
          lang: 'en',
          description: 'Subject + Verb "like" + Object.',
          example: 'I like Italian music.',
        },
        lang2: {
          lang: 'it',
          description: 'Indirect object pronoun + Verb + Subject.',
          example: 'Mi piace la musica italiana.',
          literal: 'To-me is-pleasing the Italian music.',
        },
      },
      {
        id: 'it-pol-1',
        dimension: 'politeness',
        title: 'The "Lei" Form (Feminine Pronoun as Formal Address)',
        summary: 'Italian uses the third-person feminine pronoun "Lei" (capitalized in writing) for formal address to both men and women.',
        lang1: {
          lang: 'en',
          description: 'Universal "you".',
          example: 'Could you help me, sir?',
        },
        lang2: {
          lang: 'it',
          description: 'Tu (informal) vs Lei (formal, 3rd-person singular agreement).',
          example: 'Come ti chiami? (tu) / Come si chiama? (Lei)',
        },
      },
      {
        id: 'it-ff-1',
        dimension: 'false-friends',
        title: 'False Friends (Falsi Amici)',
        summary: 'Common English-Italian traps.',
        lang1: {
          lang: 'en',
          description: 'English lookalikes.',
        },
        lang2: {
          lang: 'it',
          description: 'True Italian meanings.',
        },
        falseFriends: [
          { term: 'eventualmente', looksLike: 'eventually', actualMeaning: 'possibly / if necessary', correctTerm: 'alla fine / con il tempo' },
          { term: 'la fattoria', looksLike: 'factory', actualMeaning: 'farm', correctTerm: 'la fabbrica' },
          { term: 'la camera', looksLike: 'camera', actualMeaning: 'bedroom / room', correctTerm: 'la macchina fotografica' },
          { term: 'il magazzino', looksLike: 'magazine', actualMeaning: 'warehouse / department store', correctTerm: 'la rivista' },
          { term: 'morbido', looksLike: 'morbid', actualMeaning: 'soft / gentle', correctTerm: 'morboso' },
        ],
      },
    ],
  },

  // ==========================================
  // ENGLISH ↔ RUSSIAN
  // ==========================================
  {
    pairKey: 'en-ru',
    fromLang: 'en',
    toLang: 'ru',
    title: 'English & Russian',
    overview: 'Russian is a highly synthetic Slavic language with six grammatical cases, aspectual verb pairs (imperfective/perfective), free word order governed by information focus, zero copula in the present tense, and no articles.',
    items: [
      {
        id: 'ru-cas-1',
        dimension: 'cases',
        title: 'Six-Case Nominal Inflection',
        summary: 'Nouns, adjectives, numbers and pronouns decline through 6 cases: Nominative, Accusative, Genitive, Dative, Instrumental, and Prepositional.',
        lang1: {
          lang: 'en',
          description: 'Word order and prepositions signal roles.',
          example: 'He opened the door with a key for his sister.',
        },
        lang2: {
          lang: 'ru',
          description: 'Case morphology: Door (Acc), Key (Instrumental: ключом), Sister (Dative: сестре).',
          example: 'Он открыл дверь (Acc) ключом (Inst) сестре (Dat).',
        },
      },
      {
        id: 'ru-wo-1',
        dimension: 'word-order',
        title: 'Topic-Focus Information Perspective',
        summary: 'Because cases mark syntactic roles, word order in Russian communicates what is known (topic) vs what is new (focus).',
        lang1: {
          lang: 'en',
          description: 'Word order strictly marks Subject-Verb-Object.',
          example: 'The boy saw the bear / The bear saw the boy.',
        },
        lang2: {
          lang: 'ru',
          description: 'Word order can vary freely; the most important new information moves to the end of the clause.',
          example: 'Мальчик увидел медведя / Медведя увидел мальчик (It was the boy who saw the bear).',
        },
      },
      {
        id: 'ru-art-1',
        dimension: 'articles',
        title: 'Zero Articles & Contextual Definiteness',
        summary: 'Russian has no definite or indefinite articles ("the" or "a"); definiteness is expressed through word order or demonstratives.',
        lang1: {
          lang: 'en',
          description: 'Articles mandatory: "a book" (indefinite) vs "the book" (definite).',
          example: 'A student entered the room / The student entered the room.',
        },
        lang2: {
          lang: 'ru',
          description: 'Word position encodes definiteness: initial position signals definite, final signals indefinite.',
          example: 'В комнату вошёл студент (A student entered) vs Студент вошёл в комнату (The student entered).',
        },
      },
      {
        id: 'ru-ta-1',
        dimension: 'tense-aspect',
        title: 'Grammaticalized Aspectual Verb Pairs',
        summary: 'Every Russian verb belongs to an aspectual pair: Imperfective (ongoing, repeated, general fact) vs Perfective (completed result, single event).',
        lang1: {
          lang: 'en',
          description: 'Past tense with auxiliary distinctions.',
          example: 'I was reading the book / I finished reading the book.',
        },
        lang2: {
          lang: 'ru',
          description: 'Pair: Читать (imperfective process) vs Прочитать (perfective result achieved).',
          example: 'Я читал книгу (I was reading) / Я прочитал книгу (I read it through).',
        },
      },
      {
        id: 'ru-ff-1',
        dimension: 'false-friends',
        title: 'False Friends (Ложные друзья переводчика)',
        summary: 'Cyrillic-Latin deceptive borrowings.',
        lang1: {
          lang: 'en',
          description: 'English words.',
        },
        lang2: {
          lang: 'ru',
          description: 'Russian meanings.',
        },
        falseFriends: [
          { term: 'фамилия (familiya)', looksLike: 'family', actualMeaning: 'surname / last name', correctTerm: 'семья (semya)' },
          { term: 'журнал (zhurnal)', looksLike: 'journal / diary', actualMeaning: 'glossy magazine or school log', correctTerm: 'дневник (dnevnik)' },
          { term: 'аккуратный (akkuratny)', looksLike: 'accurate', actualMeaning: 'tidy / neat / punctual', correctTerm: 'точный (tochny)' },
          { term: 'композиция (kompozitsiya)', looksLike: 'composition (school essay)', actualMeaning: 'musical composition or arrangement', correctTerm: 'сочинение (sochineniye)' },
        ],
      },
      {
        id: 'ru-cult-1',
        dimension: 'culture-semantics',
        title: 'Untranslatable Words: "Тоска" (Toska)',
        summary: 'Vladimir Nabokov famously described toska as a sensation of great spiritual anguish.',
        lang1: {
          lang: 'en',
          description: 'Described as longing, melancholy, or homesickness, but no single English equivalent captures it.',
        },
        lang2: {
          lang: 'ru',
          description: '"Тоска": deep, unprovoked emotional ache, longing for something unattainable or missing from the soul.',
        },
      },
    ],
  },

  // ==========================================
  // ENGLISH ↔ CHINESE (MANDARIN)
  // ==========================================
  {
    pairKey: 'en-zh',
    fromLang: 'en',
    toLang: 'zh',
    title: 'English & Mandarin Chinese',
    overview: 'Chinese is an analytic, isolating tonal language with zero inflectional morphology (no conjugation, no declension, no gender, no plural -s), relying on strict word order, measure words, and aspect particles.',
    items: [
      {
        id: 'zh-wo-1',
        dimension: 'word-order',
        title: 'Pre-Verbal Time and Manner Positioning',
        summary: 'In Chinese, time and location adverbials strictly precede the main action verb.',
        lang1: {
          lang: 'en',
          description: 'Adverbials of time and place commonly appear at the end of the sentence.',
          example: 'I play tennis in the park on Sundays.',
        },
        lang2: {
          lang: 'zh',
          description: 'Time and Place always go before the Verb (Subject + Time + Place + Verb).',
          example: '我星期天在公园打网球。',
          literal: 'I Sunday at park play tennis.',
        },
      },
      {
        id: 'zh-ta-1',
        dimension: 'tense-aspect',
        title: 'No Verb Tenses: Aspect Particles (了, 过, 着)',
        summary: 'Verbs never change form for past, present, or future. Temporal reference is provided by context and aspect markers.',
        lang1: {
          lang: 'en',
          description: 'Verbal tense morphology (write, wrote, written, writing).',
          example: 'I have eaten / I ate.',
        },
        lang2: {
          lang: 'zh',
          description: 'Particle 了 (le) marks completion or change of state; 过 (guo) marks experiential past.',
          example: '我吃了 (I have eaten) / 我去过中国 (I have had the experience of going to China).',
        },
      },
      {
        id: 'zh-cls-1',
        dimension: 'roots-formation',
        title: 'Measure Words (Classifiers)',
        summary: 'Numerals cannot directly modify nouns without an intervening classifier suited to the object’s shape or type.',
        lang1: {
          lang: 'en',
          description: 'Numerals directly modify countable nouns.',
          example: 'two books, three dogs',
        },
        lang2: {
          lang: 'zh',
          description: 'Classifier required: 本 (běn) for books, 只 (zhī) for small animals, 张 (zhāng) for flat sheets.',
          example: '两本书 (two-volume book) / 三只狗 (three-animal dog)',
        },
      },
      {
        id: 'zh-pol-1',
        dimension: 'politeness',
        title: 'Formal "您" (Nín) vs "你" (Nǐ) & Relational Honorifics',
        summary: 'Mandarin uses 您 to express deference to elders and superiors, along with humble self-reference.',
        lang1: {
          lang: 'en',
          description: 'Universal "you".',
          example: 'How are you, Professor?',
        },
        lang2: {
          lang: 'zh',
          description: '你 (nǐ) for peers vs 您 (nín, with the heart 心 radical underneath) for elders and respected figures.',
          example: '您好，老师！(Nín hǎo, lǎoshī!)',
        },
      },
      {
        id: 'zh-cult-1',
        dimension: 'culture-semantics',
        title: 'Cultural Semantics: "面子" (Miànzi / Face)',
        summary: 'Social standing, reputation, and relational harmony in Chinese culture.',
        lang1: {
          lang: 'en',
          description: 'Partially translated as "saving face" or "reputation".',
        },
        lang2: {
          lang: 'zh',
          description: '"面子" (miànzi) & "关系" (guānxi): interconnected social currency involving mutual respect, avoiding public embarrassment, and reciprocal obligation.',
        },
      },
    ],
  },

  // ==========================================
  // SPANISH ↔ FRENCH (Romance Cross-Language F1341)
  // ==========================================
  {
    pairKey: 'es-fr',
    fromLang: 'es',
    toLang: 'fr',
    title: 'Spanish & French (Romance Cross-Pair)',
    overview: 'Because Spanish and French are close Romance cousins sharing Vulgar Latin roots, lexical overlap is enormous, but false friends and syntactic divergence can trap multilingual learners.',
    items: [
      {
        id: 'rom-ff-1',
        dimension: 'false-friends',
        title: 'Romance False Friends (Spanish vs French)',
        summary: 'Deceptive cross-Romance lookalikes that lead learners astray.',
        lang1: {
          lang: 'es',
          description: 'Spanish meaning.',
        },
        lang2: {
          lang: 'fr',
          description: 'French meaning and equivalent.',
        },
        falseFriends: [
          { term: 'salir (es) vs salir (fr)', looksLike: 'identical spelling', actualMeaning: 'In Spanish: to leave / exit. In French: to make dirty / soil.', correctTerm: 'French to leave: partir / sortir; Spanish to dirty: ensuciar.', note: 'A Spanish speaker saying "je vais salir" means "I will dirty it" in French!' },
          { term: 'constipado (es) vs constipé (fr)', looksLike: 'cognates', actualMeaning: 'In Spanish: having a head cold. In French: bowel constipation.', correctTerm: 'Spanish cold: tener un resfriado; French cold: avoir un rhume.' },
          { term: 'discutir (es) vs discuter (fr)', looksLike: 'cognates', actualMeaning: 'In Spanish: to argue / dispute. In French: to chat / converse calmly.', correctTerm: 'Spanish to chat: charlar; French to argue: se disputer.' },
        ],
      },
      {
        id: 'rom-wo-1',
        dimension: 'word-order',
        title: 'Pro-Drop vs Obligatory Subject Pronouns',
        summary: 'Spanish easily omits subject pronouns, while modern French demands them strictly.',
        lang1: {
          lang: 'es',
          description: 'Pro-drop: "Hablo español".',
          example: 'Hablo español.',
        },
        lang2: {
          lang: 'fr',
          description: 'Non pro-drop: "Je parle français" (subject pronoun mandatory).',
          example: 'Je parle français.',
        },
      },
    ],
  },
];

/** Returns contrast entries for a specific pair of languages. */
export function getContrastPair(lang1: string, lang2: string): LanguagePairContrast | undefined {
  const direct = `${lang1}-${lang2}`;
  const reverse = `${lang2}-${lang1}`;
  return CONTRAST_PAIRS.find((p) => p.pairKey === direct || p.pairKey === reverse);
}

/** Lists all available contrast language pairs. */
export function listAvailablePairs(): Array<{ pairKey: string; fromLang: string; toLang: string; title: string }> {
  return CONTRAST_PAIRS.map((p) => ({
    pairKey: p.pairKey,
    fromLang: p.fromLang,
    toLang: p.toLang,
    title: p.title,
  }));
}
