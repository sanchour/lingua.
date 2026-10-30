// Marks and shapes (6-23): small multiple-choice drills for what the alphabet chart doesn't teach. Accent marks and
// where they go, diacritics, ligatures, and Russian cursive. Hand-written, one fact per item, checked in marks.test.ts.
export type MarkKind = 'accent' | 'diacritic' | 'ligature' | 'cursive' | 'signs' | 'vowels' | 'stress' | 'aspect' | 'motion' | 'numerals' | 'participles' | 'reflexive' | 'order' | 'clitics' | 'prepositions' | 'regional' | 'variety';
export interface MarkItem {
  kind: MarkKind;
  prompt: string;
  /** Options as written; the first is the right one (shuffled when asked). */
  options: [string, ...string[]];
  why: string;
}
export const MARK_LABEL: Record<MarkKind, string> = {
  accent: 'Accent marks', diacritic: 'Diacritics', ligature: 'Ligatures', cursive: 'Cursive',
  signs: 'Soft and hard signs', vowels: 'Unstressed vowels', stress: 'Stress', aspect: 'Aspect', motion: 'Verbs of motion', numerals: 'Numerals', participles: 'Participles', reflexive: 'Reflexive verbs', order: 'Word order', clitics: 'Clitic pronouns', prepositions: 'Verbs and prepositions', regional: 'Regional words', variety: 'European and Brazilian',
};

const a = (prompt: string, ok: string, wrong: string, why: string): MarkItem => ({ kind: 'accent', prompt, options: [ok, wrong], why });
const r = (kind: MarkKind, prompt: string, ok: string, wrong: string, why: string): MarkItem => ({ kind, prompt, options: [ok, wrong], why });
const d = (prompt: string, ok: string, wrong: string, why: string): MarkItem => ({ kind: 'diacritic', prompt, options: [ok, wrong], why });

/** Russian beyond the letters (6-23, slice 4). */
const RU: MarkItem[] = [
  r('signs', '“object”', 'объект', 'обьект', 'The hard sign ъ separates a prefix ending in a consonant from е, ё, ю, я: об-ъект.'),
  r('signs', '“entrance (by vehicle)”', 'въезд', 'вьезд', 'Again the prefix в- before е: the hard sign keeps the е a “ye”.'),
  r('signs', '“family”', 'семья', 'семя', 'ь before я marks the soft “mya”. семя is another word: “seed”.'),
  r('signs', '“night”', 'ночь', 'ноч', 'Feminine nouns ending in a hushing sound (ч, ш, щ) take ь: ночь, дочь, мышь.'),
  r('signs', '“key”', 'ключ', 'ключь', 'Masculine nouns ending in a hushing sound take no ь: ключ, нож, врач.'),
  r('signs', '“coal”', 'уголь', 'угол', 'ь makes the л soft: уголь is coal, угол is a corner.'),
  r('signs', '“to take”', 'брать', 'брат', 'The infinitive ends in -ть. брат is “brother”.'),
  r('vowels', 'How is the first о of “молоко́” (milk) pronounced?', 'like а: ma-la-KO', 'like о: mo-lo-KO', 'Unstressed о is said [а] (akanye): the stressed syllable is the last.'),
  r('vowels', 'The word sounds like “сабака” (dog). Spelled…', 'собака', 'сабака', 'Spelling follows the stressed form: соба́ка is spelled with о though the first о is said like а.'),
  r('vowels', 'How is the first vowel of “язы́к” (language) said?', 'like и: yi-ZYK', 'like я: ya-ZYK', 'Unstressed я and е after a soft consonant are said close to [и] (ikanye).'),
  r('vowels', '“spring”: в?сна. Which vowel is written?', 'весна', 'висна', 'Test word: stress the vowel in a related form. вёсны (springs) has е.'),
  r('stress', 'Where is the stress: звонит (rings)?', 'звони́т', 'зво́нит', 'Always the ending: звони́т, звони́шь.'),
  r('stress', 'Where is the stress: квартал (quarter)?', 'кварта́л', 'ква́ртал', 'Last syllable.'),
  r('stress', 'Where is the stress: каталог (catalogue)?', 'катало́г', 'ката́лог', 'Last syllable, as in алфави́т.'),
  r('stress', 'Where is the stress: красивее (more beautiful)?', 'красиве́е', 'краси́вее', 'The comparative -ее is stressed here.'),
  r('stress', 'Where is the stress: кухонный (kitchen, adj.)?', 'ку́хонный', 'кухо́нный', 'First syllable, like ку́хня.'),
  r('stress', '“in the house”: в доме. Which syllable carries the stress?', 'до́ме', 'в', 'A one-syllable preposition has no stress of its own; it is said as one word with what follows.'),
  r('stress', 'In “Я вчера́ купи́л кни́гу” the new information is “who bought it?” Which word gets the sentence stress?', 'я', 'вчера', 'The word that answers the question carries the stress; the others weaken.'),
  r('aspect', '“Tomorrow I will write (and finish) the letter”: Завтра я ___ письмо.', 'напишу', 'пишу', 'One finished action: perfective (написать). пишу is “I write / am writing”.'),
  r('aspect', '“Every day I read the news”: Каждый день я ___ новости.', 'читаю', 'прочитаю', 'A repeated action takes the imperfective. прочитаю is a one-time future.'),
  r('aspect', '“All evening I read the book”: Весь вечер я ___ книгу.', 'читал', 'прочитал', 'Duration (“all evening”) takes the imperfective; прочитал says it was finished.'),
  r('aspect', '“He has already done his homework”: Он уже ___ домашнее задание.', 'сделал', 'делал', 'A result that stands (already) takes the perfective.'),
  r('aspect', 'Perfective partner of “покупа́ть” (to buy):', 'купи́ть', 'покупи́ть', 'Many imperfective verbs in -ать have a perfective with a changed stem: покупа́ть, купи́ть.'),
  r('motion', '“I am walking to school now”: Я ___ в школу.', 'иду', 'хожу', 'One direction, now: идти. хожу (ходить) is back and forth or habitual.'),
  r('motion', '“Every day I walk to school”: Каждый день я ___ в школу.', 'хожу', 'иду', 'A habit takes the multidirectional verb ходить.'),
  r('motion', '“I am riding to Moscow” (one trip, now): Я ___ в Москву.', 'еду', 'езжу', 'One direction by transport: ехать; ездить is repeated or round trips.'),
  r('motion', '“He came (on foot)”: Он ___ домой.', 'пришёл', 'ушёл', 'при- is arrival, у- is leaving.'),
  r('motion', '“He went out of the room”: Он ___ из комнаты.', 'вышел', 'вошёл', 'вы- is out; в-/во- is in (вошёл: he came in).'),
  r('motion', '“We crossed the street”: Мы ___ улицу.', 'перешли', 'прошли', 'пере- is across; про- is past or through.'),
  r('motion', '“He walked up to the window”: Он ___ к окну.', 'подошёл', 'отошёл', 'под- is up to; от- is away from.'),
  r('numerals', '“two books” (книга is feminine)', 'две книги', 'два книги', 'два (masculine, neuter) but две (feminine); after 2, 3, 4 the genitive singular: книги.'),
  r('numerals', '“five books”', 'пять книг', 'пять книги', 'After 5 and more, the genitive plural: книг.'),
  r('numerals', '“twenty-one books”', 'двадцать одна книга', 'двадцать одну книгу', 'A number ending in 1 is followed by the singular, in the same case as the whole: nominative.'),
  r('numerals', '“with three friends”', 'с тремя друзьями', 'с три друзьями', 'Numerals decline: три becomes тремя in the instrumental.'),
  r('numerals', '“two houses”', 'два дома', 'два домов', '2, 3, 4: genitive singular (дома), not plural.'),
  r('participles', '“the person who is reading”', 'читающий', 'читавший', 'Present active participle: -ющ-. читавший is “who was reading”.'),
  r('participles', '“a book that has been read”', 'прочитанная книга', 'прочитающая книга', 'Past passive participle: -нн- from the perfective, agreeing like an adjective.'),
  r('participles', '“a woman who is writing”', 'пишущая женщина', 'пишущий женщина', 'A participle agrees with its noun in gender, number and case.'),
  r('reflexive', '“I am studying” (учить is “to teach / learn”): Я ___.', 'учусь', 'учуся', 'The ending is -сь after a vowel (я учу-сь) and -ся after a consonant (он учит-ся).'),
  r('reflexive', '“I get dressed”: Я ___.', 'одеваюсь', 'одеваюся', 'After a vowel the ending is -сь.'),
  r('reflexive', '“He gets dressed”: Он ___.', 'одевается', 'одеваетсь', 'After a consonant (т) the ending is -ся.'),
  r('reflexive', '“The lesson begins”: Урок ___.', 'начинается', 'начинает', 'The reflexive ending can mean “happens by itself”: начинать (to start something), начинаться (to start).'),
  r('order', '“Книгу читает студент” answers…', 'Кто читает книгу?', 'Что читает студент?', 'New information goes last: студент is the answer.'),
  r('order', 'The neutral order for “The student is reading a book”:', 'Студент читает книгу', 'Читает книгу студент', 'Subject, verb, object is neutral; moving the subject to the end stresses it.'),
];

/** The Romance languages (6-23, slice 5): clitics, verbs and their prepositions, and where words differ. */
const ROM: Record<string, MarkItem[]> = {
  es: [
    r('clitics', '“I give it (the book) to him”', 'Se lo doy', 'Le lo doy', 'Le and les become se before lo, la, los, las.'),
    r('clitics', '“I want to see it (the film)”', 'Quiero verla', 'Quiero la ver', 'A pronoun goes after an infinitive and is written with it (verla), or before the conjugated verb (la quiero ver).'),
    r('clitics', '“Buy it!” (tú, the book)', 'Cómpralo', 'Lo compra', 'In an affirmative command the pronoun is attached, and the stress keeps its place, so the accent is written. “Lo compra” is “he buys it”.'),
    r('clitics', '“Don’t buy it!”', 'No lo compres', 'No cómpralo', 'In a negative command the pronoun goes before the verb.'),
    r('prepositions', '“I think about you”: Pienso ___ ti.', 'en', 'de', 'pensar en is “to think about”; pensar de is “to have an opinion of”.'),
    r('prepositions', '“I dream about you”: Sueño ___ ti.', 'con', 'de', 'soñar con.'),
    r('prepositions', '“It depends on you”: Depende ___ ti.', 'de', 'en', 'depender de.'),
    r('prepositions', '“I am marrying her”: Me caso ___ ella.', 'con', 'a', 'casarse con.'),
    r('prepositions', '“I remember you”: Me acuerdo ___ ti.', 'de', 'a', 'acordarse de.'),
    r('prepositions', '“I fell in love with her”: Me enamoré ___ ella.', 'de', 'con', 'enamorarse de.'),
    r('regional', 'In Spain, a computer is usually…', 'ordenador', 'computadora', 'Latin America says computadora or computador.'),
    r('regional', 'In Spain, a mobile phone is…', 'móvil', 'celular', 'Latin America says celular.'),
    r('regional', 'In Spain, orange juice is…', 'zumo', 'jugo', 'Latin America says jugo.'),
    r('regional', 'In Latin America, “you all” (even among friends)', 'ustedes', 'vosotros', 'vosotros is used in Spain only.'),
    r('regional', 'In Latin America, “to take the bus”', 'tomar el autobús', 'coger el autobús', 'coger is common in Spain, but vulgar in much of Latin America.'),
    r('regional', 'In Argentina, “you speak” (informal, singular)', 'vos hablás', 'tú hablas', 'Argentina and some other regions use vos (voseo), with its own verb forms.'),
  ],
  fr: [
    r('clitics', '“I give it to him”', 'Je le lui donne', 'Je lui le donne', 'The direct pronoun (le, la, les) comes before lui and leur.'),
    r('clitics', '“Give it to me!”', 'Donne-le-moi', 'Donne-moi-le', 'In an affirmative command, the direct pronoun comes first and moi follows (and me becomes moi).'),
    r('clitics', '“I am going to do it”', 'Je vais le faire', 'Je le vais faire', 'The pronoun goes before the infinitive it belongs to.'),
    r('clitics', '“I am going there”', 'J’y vais', 'Je y vais', 'y and en come right before the verb, and je elides before them.'),
    r('prepositions', '“I think of you”: Je pense ___ toi.', 'à', 'de', 'penser à: to think of someone. penser de asks for an opinion.'),
    r('prepositions', '“I dream of you”: Je rêve ___ toi.', 'de', 'à', 'rêver de.'),
    r('prepositions', '“It depends on you”: Ça dépend ___ toi.', 'de', 'sur', 'dépendre de.'),
    r('prepositions', '“I play football”: Je joue ___ football.', 'au', 'du', 'jouer à a game or sport; jouer de an instrument.'),
    r('prepositions', '“I play the guitar”: Je joue ___ guitare.', 'de la', 'à la', 'jouer de an instrument.'),
    r('prepositions', '“I count on you”: Je compte ___ toi.', 'sur', 'à', 'compter sur.'),
    r('regional', 'In Belgium and Switzerland, “seventy”', 'septante', 'soixante-dix', 'Septante and nonante are used there; France says soixante-dix, quatre-vingt-dix.'),
    r('regional', 'In Québec, “the evening meal”', 'souper', 'dîner', 'In Québec: déjeuner is breakfast, dîner lunch, souper dinner. In France dîner is the evening meal.'),
    r('regional', 'In Québec, “weekend”', 'fin de semaine', 'week-end', 'Québec prefers its own words to English loans; France says le week-end.'),
    r('regional', 'In France, “breakfast”', 'petit déjeuner', 'déjeuner', 'In France déjeuner is lunch; in Québec it is breakfast.'),
  ],
  pt: [
    r('clitics', '“He told me” (European Portuguese)', 'Ele disse-me', 'Ele me disse', 'In Portugal the pronoun usually follows the verb with a hyphen; in Brazil it goes before.'),
    r('clitics', '“He told me” (Brazilian Portuguese)', 'Ele me disse', 'Ele disse-me', 'Brazilians put the pronoun before the verb.'),
    r('clitics', '“He did not tell me” (both)', 'Ele não me disse', 'Ele não disse-me', 'After não, a pronoun goes before the verb in both.'),
    r('prepositions', '“I think about you”: Penso ___ ti.', 'em', 'de', 'pensar em.'),
    r('prepositions', '“I like you”: Gosto ___ ti.', 'de', 'em', 'gostar de.'),
    r('prepositions', '“I dream about you”: Sonho ___ ti.', 'com', 'de', 'sonhar com.'),
    r('prepositions', '“I am marrying her”: Caso-me ___ ela.', 'com', 'a', 'casar com.'),
    r('variety', '“bus” in Portugal', 'autocarro', 'ônibus', 'Brazil says ônibus.'),
    r('variety', '“train” in Brazil', 'trem', 'comboio', 'Portugal says comboio.'),
    r('variety', '“breakfast” in Portugal', 'pequeno-almoço', 'café da manhã', 'Brazil says café da manhã.'),
    r('variety', '“mobile phone” in Brazil', 'celular', 'telemóvel', 'Portugal says telemóvel.'),
    r('variety', '“I am speaking” in Portugal', 'Estou a falar', 'Estou falando', 'Portugal: estar a + infinitive. Brazil: the gerund (falando).'),
    r('variety', '“you” (one person, everyday) in Brazil', 'você', 'tu', 'Brazil uses você in most regions; in Portugal tu is for friends and você can sound distant.'),
    r('variety', '“fact” in Portugal', 'facto', 'fato', 'Brazil writes fato (and Portugal uses fato for “suit”).'),
  ],
  it: [
    r('clitics', '“I give it to him”', 'Glielo do', 'Gli lo do', 'gli + lo is written as one word: glielo.'),
    r('clitics', '“Give it to me!”', 'Dammelo', 'Da mi lo', 'In an affirmative command the pronouns join the verb: da’ + mi + lo, with the m doubled.'),
    r('clitics', '“I want to see it”', 'Voglio vederlo', 'Voglio lo vedere', 'The pronoun joins the infinitive (vederlo), or goes before the first verb (lo voglio vedere).'),
    r('prepositions', '“I think about you”: Penso ___ te.', 'a', 'di', 'pensare a.'),
    r('prepositions', '“It depends on you”: Dipende ___ te.', 'da', 'di', 'dipendere da.'),
    r('prepositions', '“I fell in love with her”: Mi sono innamorato ___ lei.', 'di', 'con', 'innamorarsi di.'),
    r('prepositions', '“I believe in God”: Credo ___ Dio.', 'in', 'a', 'credere in: to believe in. credere a is to believe someone.'),
  ],
};

export const MARKS: Record<string, MarkItem[]> = {
  es: [
    a('“he/she is” (the verb estar)', 'está', 'esta', 'esta without a mark is “this”.'),
    a('“you” (subject)', 'tú', 'tu', 'tu without a mark is “your”.'),
    a('“yes”', 'sí', 'si', 'si without a mark is “if”.'),
    a('“song”', 'canción', 'cancion', 'Words ending in a vowel, n or s are stressed on the second-last syllable; a stress elsewhere takes a written accent.'),
    a('“telephone”', 'teléfono', 'telefono', 'Stressed on the third-last syllable: always written.'),
    a('“what” (a question)', 'qué', 'que', 'Question words carry the accent; que alone means “that”.'),
    a('“more”', 'más', 'mas', 'mas without a mark is “but”.'),
    a('“tree”', 'árbol', 'arbol', 'Stress on the first syllable of a word ending in l: written.'),
    d('“Spain”', 'España', 'Espana', 'ñ is its own letter, not n with a mark.'),
    d('“bilingual” (the ü)', 'pingüino', 'pinguino', 'ü makes the u sound after g before e or i.'),
    ...ROM.es,
  ],
  fr: [
    a('“where”', 'où', 'ou', 'ou without a mark is “or”.'),
    a('“there”', 'là', 'la', 'la without a mark is “the” (feminine).'),
    a('“school”', 'école', 'ecole', 'The acute é is a closed “ay” sound at the start of many words.'),
    a('“mother”', 'mère', 'mere', 'The grave è is an open sound before a consonant plus a silent e.'),
    a('“forest”', 'forêt', 'foret', 'The circumflex often stands for an s that was lost (Latin forestis).'),
    d('“boy” (the cedilla)', 'garçon', 'garcon', 'ç is a soft s before a, o and u.'),
    d('“Noël”', 'Noël', 'Noel', 'The trema ë says: pronounce the e separately from the o.'),
    d('“heart”', 'cœur', 'coeur', 'œ is one letter, a ligature of o and e.'),
    ...ROM.fr,
  ],
  pt: [
    a('“mother”', 'mãe', 'mae', 'The tilde nasalises the vowel.'),
    a('“is” (ele ...)', 'é', 'e', 'e without a mark is “and”.'),
    a('“coffee”', 'café', 'cafe', 'Final stressed vowels are written with an accent.'),
    a('“grandmother”', 'avó', 'avo', 'avô (circumflex) is “grandfather”: the mark tells them apart.'),
    d('“heart” (the cedilla)', 'coração', 'coracao', 'ç and the tilde: the ending -ção is always written so.'),
    ...ROM.pt,
  ],
  it: [
    a('“is”', 'è', 'e', 'e without a mark is “and”.'),
    a('“city”', 'città', 'citta', 'Words stressed on the last syllable carry the accent.'),
    a('“there”', 'là', 'la', 'la without a mark is “the”.'),
    a('“yes”', 'sì', 'si', 'si without a mark is “oneself”.'),
    a('“coffee”', 'caffè', 'caffe', 'Final stressed vowels are written with a grave accent.'),
    ...ROM.it,
  ],
  de: [
    d('“beautiful”', 'schön', 'schon', 'schon means “already”: the umlaut changes the word.'),
    d('“to hear”', 'hören', 'horen', 'ö is a rounded e sound, not the same as o.'),
    d('“for”', 'für', 'fur', 'ü is spoken with rounded lips, like French u.'),
    d('“street”', 'Straße', 'Strase', 'ß is a double s after a long vowel (in Switzerland, ss).'),
    d('“to be able” (ich ... )', 'können', 'konnen', 'The umlaut belongs to the infinitive and the plural (wir können); ich kann has none.'),
  ],
  ru: [
    { kind: 'ligature', prompt: 'ё is written as…', options: ['е with two dots', 'е with an acute'], why: 'ё is a separate letter, usually printed without its dots; the acute marks stress.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “m”', options: ['т', 'м'], why: 'Cursive т is written like a small m, often with a line above it; м has a hook at the start.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “u”', options: ['и', 'у'], why: 'Cursive и is a u-shape; у has a descending tail like a Latin “y”.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “g”', options: ['д', 'г'], why: 'Cursive д has a loop and a tail; г looks like a Latin r.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “r”', options: ['г', 'р'], why: 'Cursive г has a hook at the top; р has a descender.' },
    ...RU,
  ],
  ar: [
    { kind: 'ligature', prompt: 'ل followed by ا is always written…', options: ['لا', 'ل ا'], why: 'Lām and alif join in a crossed ligature, the one compulsory ligature of Arabic.' },
    { kind: 'diacritic', prompt: 'The mark that doubles a consonant', options: ['ّ (shadda)', 'ْ (sukūn)'], why: 'Shadda doubles; sukūn says “no vowel here”.' },
  ],
};

/** Which kinds a language has drills for. */
export const marksOf = (lang: string) => MARKS[lang] ?? [];
