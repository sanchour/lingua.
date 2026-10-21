import type { Grammar } from '../types';

// Hungarian (tier 2: a short map of the first topics). Sentences: the Hungarian pack's
// Wiktionary examples. Rules checked against Wikipedia's "Hungarian grammar" (articles, vowel
// harmony, cases) and "Hungarian verbs" (present and past, indefinite and definite conjugation).
// The pack's paradigm tags don't name tense and person cleanly, so the topics carry no tags.

const grammar: Grammar = {
  lang: 'hu',
  sources: [
    { name: 'Wikipedia: Hungarian grammar', url: 'https://en.wikipedia.org/wiki/Hungarian_grammar' },
    { name: 'Wikipedia: Hungarian verbs', url: 'https://en.wikipedia.org/wiki/Hungarian_verbs' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: the definite conjugation as a topic of its own (it is named in the present and past), possessive endings, the other cases, -ik verbs, and verbal prefixes such as meg-.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'a-az',
          title: 'A or az: "the"',
          level: 'A1',
          summary: '"The" is a before a consonant and az before a vowel.',
          rule: [
            'Hungarian has no gender. "The" is **a** before a consonant (*a ház*, *a lovak*) and **az** before a vowel (*az eke*, *az ebihal*), like English "a" and "an".',
            '"A" or "one" is **egy**: *egy ház*.',
            'Hungarian uses "the" for things in general, where English has none: *A lovak állva alszanak*, "horses sleep standing up".',
          ],
          why: 'A before a consonant, az before a vowel.',
          tags: [],
          items: [
            { s: '[Az] eke jól fogja a földet.', en: 'The plow cuts/grips the ground well.', wrong: ['A', 'Azt', 'Annak'] },
            { s: '[Az] ebihalból béka lesz.', en: 'The tadpole turns into a frog.', wrong: ['A', 'Azt', 'Annak'] },
            { s: '[A] ház egy dombon áll.', en: 'The house stands on a hill.', wrong: ['Az', 'Azt', 'Annak'] },
            { s: '[A] lovak állva alszanak.', en: 'Horses sleep standing up.', wrong: ['Az', 'Azt', 'Annak'] },
            { s: '[A] falak tartják a tetőt.', en: 'The walls support the roof.', wrong: ['Az', 'Azt', 'Annak'] },
            { s: '[Az] összes bolt zárva tart holnap.', en: 'All the shops will be closed tomorrow.', wrong: ['A', 'Azt', 'Annak'] },
            { s: '[A] többi szoba üres.', en: 'The other rooms are empty.', wrong: ['Az', 'Azt', 'Annak'] },
          ],
          related: ['ban-ben'],
        },
        {
          id: 'ban-ben',
          title: 'In: -ban or -ben',
          level: 'A1',
          summary: 'Hungarian says "in" with an ending, and the ending follows the vowels of the word.',
          rule: [
            'Where English uses a preposition, Hungarian adds an ending. "In" is **-ban** or **-ben**: *ház* → **házban**, "in the house".',
            '**Vowel harmony** picks the form. Words with back vowels (**a, á, o, ó, u, ú**) take **-ban**; words with only front vowels (**e, é, i, í, ö, ő, ü, ű**) take **-ben**. *I* and *í* next to a back vowel don\'t count: *Párizsban*.',
            'A final **-a** or **-e** lengthens before the ending: *szoba* → **szobában**. "Into" is a different ending, **-ba/-be**: *a szobába*.',
          ],
          tables: [
            {
              columns: ['word', 'in', 'into'],
              rows: [
                ['ház (house)', 'házban', 'házba'],
                ['szoba (room)', 'szobában', 'szobába'],
                ['kert (garden)', 'kertben', 'kertbe'],
                ['börtön (prison)', 'börtönben', 'börtönbe'],
              ],
            },
          ],
          watch: '-ban/-ben says where something is; -ba/-be where it is going.',
          why: 'Back vowels (a, o, u) take -ban; front vowels (e, i, ö, ü) take -ben.',
          tags: [],
          items: [
            { s: 'Péter van a [házban], nem pedig Juli.', en: 'Peter is in the house, and not Juli.', wrong: ['házben', 'házba', 'házbe'] },
            { s: 'Nincs elég hely ebben a [szobában].', en: 'There is not enough space in this room.', wrong: ['szobáben', 'szobába', 'szobaban'] },
            { s: 'Egyszer voltam [Párizsban].', en: 'I have been to Paris once.', wrong: ['Párizsben', 'Párizsba', 'Párizsbe'] },
            { s: 'Mióta laktok ebben a [városban]?', en: 'How long have you been living in this city?', wrong: ['városben', 'városba', 'városbe'] },
            { s: 'Mi megy ma este a [tévében]?', en: "What's on TV tonight?", wrong: ['tévéban', 'tévébe', 'tévéba'] },
            { s: 'Aki [börtönben] van, az nem szabad.', en: 'One who is in prison, is not free.', wrong: ['börtönban', 'börtönbe', 'börtönba'] },
            { s: 'Mi van a [kezedben]?', en: 'What is in your hand?', wrong: ['kezedban', 'kezedbe', 'kezedba'] },
          ],
          related: ['a-az', 'accusative'],
        },
        {
          id: 'accusative',
          title: 'The object: -t',
          level: 'A1',
          summary: 'The thing you see, buy or give takes -t.',
          rule: [
            'The direct object takes **-t**: *Julit sem láttam*, "I didn\'t see Juli either". Because the ending marks the object, word order is free to stress other things.',
            'After many consonants a linking vowel comes in, chosen by vowel harmony: **-ot**, **-et** or **-öt**: *könyv* → **könyvet**, *gyerek* → **gyereket**. After *l, n, r, s, sz, z, j* the -t usually attaches directly: *bor* → **bort**, *pénz* → **pénzt**.',
            'A final **-a** or **-e** lengthens: *alma* → **almát**; after other vowels just add -t: *csoki* → **csokit**, *tető* → **tetőt**.',
          ],
          tables: [
            {
              columns: ['word', 'object'],
              rows: [
                ['Juli', 'Julit'],
                ['tető (roof)', 'tetőt'],
                ['könyv (book)', 'könyvet'],
                ['alma (apple)', 'almát'],
              ],
            },
          ],
          why: 'The direct object takes -t, with -ot, -et or -öt after many consonants.',
          tags: [],
          items: [
            { s: 'Adtam Sándornak egy [könyvet].', en: 'I gave Sándor a book.', wrong: ['könyv', 'könyvnek', 'könyvben'] },
            { s: 'Megevett vagy hat [szendvicset].', en: 'He ate about six sandwiches.', wrong: ['szendvics', 'szendvicsnek', 'szendvicsben'] },
            { s: 'Én is szeretem a [csokit].', en: 'I, too, like chocolate (aside from other people).', wrong: ['csoki', 'csokinak', 'csokiban'] },
            { s: 'A falak tartják a [tetőt].', en: 'The walls support the roof.', wrong: ['tető', 'tetőnek', 'tetőben'] },
            { s: 'A húgom [gyereket] vár.', en: 'My younger sister is expecting a baby.', wrong: ['gyerek', 'gyereknek', 'gyerekben'] },
            { s: '[Julit] sem láttam.', en: 'I didn’t see Juli, either. [aside from not having seen another person]', wrong: ['Juli', 'Julinak', 'Juliban'] },
            { s: 'Ezt a [könyvet] neki vettem.', en: 'I bought this book for her.', wrong: ['könyv', 'könyvnek', 'könyvben'] },
          ],
          related: ['ban-ben'],
        },
        {
          id: 'present',
          title: 'The present tense',
          level: 'A1',
          summary: 'Six endings, in a back-vowel and a front-vowel set.',
          rule: [
            'With no definite object, verbs take the **indefinite** endings. For back-vowel verbs: **-ok, -sz, –, -unk, -tok, -nak**; for front-vowel verbs: **-ek (-ök), -sz, –, -ünk, -tek (-tök), -nek**. The "he, she" form is the bare stem: *él*, *áll*, *szeret*.',
            'With a definite object (*a csokit*, *Julit*) a second set of endings is used: *szeretem a csokit*. Lingua drills the indefinite set here.',
            'Some common verbs are irregular, like *alszik* (sleeps), *alszanak* (they sleep).',
          ],
          tables: [
            {
              columns: ['', 'tanul (learn)', 'beszél (speak)', 'ül (sit)'],
              rows: [
                ['én', 'tanulok', 'beszélek', 'ülök'],
                ['te', 'tanulsz', 'beszélsz', 'ülsz'],
                ['ő, Ön', 'tanul', 'beszél', 'ül'],
                ['mi', 'tanulunk', 'beszélünk', 'ülünk'],
                ['ti', 'tanultok', 'beszéltek', 'ültök'],
                ['ők, Önök', 'tanulnak', 'beszélnek', 'ülnek'],
              ],
            },
          ],
          why: 'Indefinite present: -ok/-ek, -sz, the bare stem, -unk/-ünk, -tok/-tek, -nak/-nek.',
          tags: [],
          items: [
            { s: 'A fiam [szeret] olvasni.', en: 'My son likes reading.', wrong: ['szeretek', 'szeretsz', 'szeretnek'], base: 'szeret', cue: 'ő' },
            { s: 'A ház egy dombon [áll].', en: 'The house stands on a hill.', wrong: ['állok', 'állsz', 'állnak'], base: 'áll', cue: 'ő' },
            { s: 'Mindannyian hazugságban [élünk].', en: 'We are all living a lie.', wrong: ['él', 'élek', 'élnek'], base: 'él', cue: 'mi' },
            { s: 'A fia egy másik városban [él].', en: 'His/her son lives in another city.', wrong: ['élek', 'élsz', 'élnek'], base: 'él', cue: 'ő' },
            { s: 'Két szobában [laknak], de a többi üres.', en: 'In two of the rooms there are people living, but the others are empty.', wrong: ['lakik', 'lakom', 'lakunk'], base: 'lakik', cue: 'ők' },
            { s: 'Sokkal jobban [beszélsz] angolul.', en: 'You speak English much better.', wrong: ['beszélek', 'beszélnek', 'beszélünk'], base: 'beszél', cue: 'te' },
            { s: 'A lovak állva [alszanak].', en: 'Horses sleep standing up.', wrong: ['alszik', 'alszom', 'alszol'], base: 'alszik', cue: 'ők' },
          ],
          related: ['past'],
        },
      ],
    },
    {
      title: 'The past',
      topics: [
        {
          id: 'past',
          title: 'The past tense: -t-',
          level: 'A2',
          summary: 'Láttam, adtam, mondtam: one -t- for the past.',
          rule: [
            'The past adds **-t-** (or **-tt-**) before the person ending: *lát* → **láttam** (I saw), *ad* → **adtam** (I gave), *mond* → **mondtam** (I said).',
            'The endings: **-am/-em** (I), **-ál/-él** (you), and for "he, she" the bare past: **-t**, **-ott**, **-ett** or **-ött**: *várt*, *látott*, *adott*, *hitt*.',
            'The "I" form is the same in both conjugations: *láttam* is "I saw" and "I saw it".',
          ],
          tables: [
            {
              columns: ['', 'vár (wait)', 'lát (see)', 'ígér (promise)'],
              rows: [
                ['én', 'vártam', 'láttam', 'ígértem'],
                ['te', 'vártál', 'láttál', 'ígértél'],
                ['ő', 'várt', 'látott', 'ígért'],
              ],
            },
          ],
          why: 'Past: stem + t(t) + -am/-em, -ál/-él; he/she -t, -ott, -ett.',
          tags: [],
          items: [
            { s: '[Adtam] Sándornak egy könyvet.', en: 'I gave Sándor a book.', wrong: ['Adok', 'Adtál', 'Adott'], base: 'ad', cue: 'én' },
            { s: 'Nem [hittem] a szememnek!', en: 'I couldn’t believe my eyes!', wrong: ['hiszek', 'hittél', 'hitt'], base: 'hisz', cue: 'én' },
            { s: 'Mint [mondtam], ő nem tud ma eljönni.', en: 'As I said, he cannot come today.', wrong: ['mondok', 'mondtál', 'mondott'], base: 'mond', cue: 'én' },
            { s: 'Betartom, amit [ígértem].', en: 'I keep what I promised.', wrong: ['ígérek', 'ígértél', 'ígért'], base: 'ígér', cue: 'én' },
            { s: 'Julit sem [láttam].', en: 'I didn’t see Juli, either. [aside from not having seen another person]', wrong: ['látok', 'láttál', 'látott'], base: 'lát', cue: 'én' },
            { s: 'A mellett a ház mellett [vártam] rá.', en: 'I waited for him/her next to that house.', wrong: ['várok', 'vártál', 'várt'], base: 'vár', cue: 'én' },
            { s: '[Beszéltem] az orvossal.', en: 'I talked to the doctor.', wrong: ['Beszélek', 'Beszéltél', 'Beszélt'], base: 'beszél', cue: 'én' },
          ],
          related: ['present'],
        },
      ],
    },
  ],
};

export default grammar;
