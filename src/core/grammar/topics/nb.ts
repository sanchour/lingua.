import type { Grammar } from '../types';

// Norwegian Bokmål (tier 2: a short map of the first topics). Sentences: the Bokmål pack's
// Wiktionary examples. Rules checked against Wikipedia's "Norwegian language" (grammar section:
// genders, the definite suffix, verbs) and "Bokmål" (feminine nouns may take the masculine forms).

const grammar: Grammar = {
  lang: 'nb',
  sources: [
    { name: 'Wikipedia: Norwegian language (grammar)', url: 'https://en.wikipedia.org/wiki/Norwegian_language#Grammar' },
    { name: 'Wikipedia: Bokmål', url: 'https://en.wikipedia.org/wiki/Bokm%C3%A5l' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: verb-second word order (the pack has too few short sentences that start with something other than the subject), adjective agreement, plurals, and the choice between en and ei, since Bokmål allows both for feminine nouns.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'gender',
          title: 'En, ei or et',
          level: 'A1',
          summary: 'Masculine, feminine and neuter: "a" is en, ei or et.',
          rule: [
            'Bokmål nouns are **masculine** (*en gård*), **feminine** (*ei jente*) or **neuter** (*et rep*). Learn each noun with its article.',
            'Feminine nouns may also take the masculine forms in Bokmål: *en jente* and *ei jente* are both correct. Neuter is always **et**.',
            'The gender decides the definite ending too: *gården*, *jenta*, *repet*.',
          ],
          tables: [
            {
              columns: ['', 'masculine', 'feminine', 'neuter'],
              rows: [
                ['a', 'en gård', 'ei / en jente', 'et rep'],
                ['the', 'gården', 'jenta / jenten', 'repet'],
              ],
            },
          ],
          why: 'En for masculine nouns, et for neuter ones; feminine nouns take ei or en.',
          tags: [],
          items: [
            { s: 'Ha [en] fin kveld.', en: 'Have a nice evening.', wrong: ['et', 'ei', 'den'] },
            { s: 'Det er [et] lite kjent begrep.', en: 'This is a little-known term.', wrong: ['en', 'ei', 'det'] },
            { s: 'Bjørnar jobber på [en] gård.', en: 'Bjørnar works on a farm.', wrong: ['et', 'ei', 'den'] },
            { s: 'Bind [et] rep om halsen hans!', en: 'Tie a rope around his neck!', wrong: ['en', 'ei', 'det'] },
            { s: 'Skal vi bestille [en] pizza?', en: 'Should we order a pizza?', wrong: ['et', 'ei', 'den'] },
            { s: 'Det er [et] lovbrudd.', en: "It's a breach of the law.", wrong: ['en', 'ei', 'det'] },
            { s: 'Hun krenket [en] lov.', en: 'She broke a law.', wrong: ['et', 'ei', 'den'] },
            { s: 'Legg deigen i [en] stor bolle.', en: 'Put the dough in a large bowl.', wrong: ['et', 'ei', 'den'] },
          ],
          related: ['definite'],
        },
        {
          id: 'definite',
          title: '"The" at the end: bilen, huset, døra',
          level: 'A1',
          summary: 'Norwegian puts "the" on the end of the noun.',
          rule: [
            'The definite form adds an ending: **-en** for masculine nouns (*bil* → **bilen**), **-et** for neuter ones (*hus* → **huset**), and **-a** or **-en** for feminine ones (*dør* → **døra** or **døren**).',
            'A noun ending in unstressed -e adds only **-n** or **-t**, and a feminine one swaps the -e for **-a**: *en bonde* → **bonden**, *et eple* → **eplet**, *ei klokke* → **klokka**.',
            'With an adjective, Norwegian uses **den** or **det** in front as well as the ending: *den store bilen*.',
          ],
          tables: [
            {
              columns: ['', 'indefinite', 'definite'],
              rows: [
                ['masculine', 'en bil', 'bilen'],
                ['feminine', 'ei dør', 'døra / døren'],
                ['neuter', 'et hus', 'huset'],
              ],
            },
          ],
          why: 'Masculine -en, neuter -et, feminine -a (or -en).',
          tags: [],
          items: [
            { s: '[Huset] ligger ved veien.', en: 'The house is situated by the road.', wrong: ['Husen', 'Hus', 'Husete'] },
            { s: '[Døra] er låst.', en: 'The door is locked.', wrong: ['Døret', 'Dør', 'Dørn'] },
            { s: '[Filmen] hadde en trist slutt.', en: 'The film had a sad ending.', wrong: ['Filmet', 'Film', 'Filmn'] },
            { s: 'Noen har stjålet [bilen] min!', en: 'Someone has stolen my car!', wrong: ['bilet', 'bil', 'biln'] },
            { s: '[Billetten] kostet 100 spenn.', en: 'The ticket cost 100 bucks.', wrong: ['Billettet', 'Billett', 'Billettn'] },
            { s: '[Engelen] støtte trompeten.', en: 'The angel blew the trumpet.', wrong: ['Engelet', 'Engel', 'Engeln'] },
            { s: 'Jorda går rundt [sola].', en: 'The Earth goes around the Sun.', wrong: ['solet', 'sol', 'solan'] },
          ],
          related: ['gender'],
        },
        {
          id: 'present',
          title: 'The present tense: one form for everyone',
          level: 'A1',
          summary: 'Jeg snakker, hun snakker, vi snakker: add -r to the infinitive.',
          rule: [
            'Norwegian verbs have **one present form for every person**. Most add **-r** to the infinitive: *snakke* → **snakker**, *spise* → **spiser**.',
            'A few common verbs are irregular: *være* → **er**, *gjøre* → **gjør**, *vite* → **vet**, *si* → **sier**.',
            'The present also covers "is doing" and the near future: *Jeg kommer om ti minutter*.',
          ],
          tables: [
            {
              columns: ['infinitive', 'present'],
              rows: [
                ['snakke', 'snakker'],
                ['spise', 'spiser'],
                ['studere', 'studerer'],
                ['være', 'er'],
              ],
            },
          ],
          why: 'One present form for all persons: the infinitive + -r.',
          tags: ['present'],
          items: [
            { s: 'Han [snakker] veldig høyt.', en: 'He speaks very loudly.', wrong: ['snakke', 'snakk', 'snakkes'], base: 'snakke' },
            { s: 'Vi [spiser] taco hver fredag.', en: 'We eat tacos every Friday.', wrong: ['spise', 'spis', 'spises'], base: 'spise' },
            { s: 'Hun [baker] brød hver helg.', en: 'She bakes bread every weekend.', wrong: ['bake', 'bak', 'bakes'], base: 'bake' },
            { s: 'Hun [studerer] skotsk historie.', en: 'She studies Scottish history.', wrong: ['studere', 'studer', 'studeres'], base: 'studere' },
            { s: 'Du [trenger] litt hvile.', en: 'You need some rest.', wrong: ['trenge', 'treng', 'trenges'], base: 'trenge' },
            { s: 'Han [elsker] mora si.', en: 'He loves his mother.', wrong: ['elske', 'elsk', 'elskes'], base: 'elske' },
            { s: 'Jeg [kommer] om ti minutter.', en: 'I shall be there in ten minutes', wrong: ['komme', 'kommet', 'kommes'], base: 'komme' },
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
          title: 'The past tense: -et, -te, -de, -dde',
          level: 'A2',
          summary: 'Weak verbs add an ending; strong verbs change their vowel.',
          rule: [
            'Weak verbs add one of four endings: **-et** (or **-a**), common when the stem ends in two consonants: *vandre* → **vandret**, *lytte* → **lyttet**; **-te**, common after a single consonant and after *-ll*, *-mm*, *-nn*, *-ng*: *spise* → **spiste**, *kjenne* → **kjente**, *ringe* → **ringte**; **-de** after *-v*, *-g* and diphthongs: *leve* → **levde**; **-dde** for short verbs ending in a stressed vowel: *bo* → **bodde**.',
            'Strong verbs change their vowel: *sette* → **satte**, *komme* → **kom**, *stjele* → **stjal**.',
            'Like the present, the past has one form for every person. It isn\'t always predictable, so dictionaries list it: *svømme, svømte, svømt*.',
          ],
          tables: [
            {
              columns: ['infinitive', 'past', 'perfect'],
              rows: [
                ['vandre', 'vandret', 'har vandret'],
                ['ringe', 'ringte', 'har ringt'],
                ['bo', 'bodde', 'har bodd'],
                ['sette', 'satte', 'har satt'],
              ],
            },
          ],
          why: 'Weak verbs: -et, -te, -de or -dde; strong verbs change their vowel.',
          tags: ['past'],
          items: [
            { s: 'Han [ringte] etter ambulanse.', en: 'He called an ambulance.', wrong: ['ringer', 'ringe', 'ringde'], base: 'ringe' },
            { s: 'Han [svømte] over elven.', en: 'He swam across the river.', wrong: ['svømmer', 'svømme', 'svømmede'], base: 'svømme' },
            { s: 'De [vandret] hånd i hånd.', en: 'They walked hand in hand.', wrong: ['vandrer', 'vandre', 'vandrte'], base: 'vandre' },
            { s: 'Vi [bodde] i hotellets anneks.', en: "We stayed at the hotel's annex.", wrong: ['bor', 'bo', 'bodet'], base: 'bo' },
            { s: 'De [lyttet] ved dørene.', en: 'They listened at the doors.', wrong: ['lytter', 'lytte', 'lyttede'], base: 'lytte' },
            { s: 'Hun [satte] seg i sofaen.', en: 'She sat down on the sofa.', wrong: ['setter', 'sette', 'settet'], base: 'sette' },
            { s: 'Han [kjente] seg opplagt.', en: 'He felt fresh.', wrong: ['kjenner', 'kjenne', 'kjennede'], base: 'kjenne' },
          ],
          related: ['present', 'perfect'],
        },
        {
          id: 'perfect',
          title: 'The perfect: har + participle',
          level: 'A2',
          summary: 'Har stjålet, har kommet: have done.',
          rule: [
            'The perfect is **har** plus the past participle: *Noen har stjålet bilen min!*',
            'For **-et** verbs the participle is the same as the past (*har vandret*); **-te** and **-de** verbs drop the final -e (*ringte* → **har ringt**, *levde* → **har levd**); **-dde** verbs drop -de (*bodde* → **har bodd**). Strong verbs have their own: *stjålet*, *kommet*, *fortalt*.',
            'Verbs of moving and changing can also take **er**: *Helga har kommet* and *Helga er kommet* are both correct.',
          ],
          why: 'Har + the past participle: har ringt, har bodd, har kommet.',
          tags: ['participle past'],
          items: [
            { s: 'Hun har [sluttet] å røyke.', en: 'She has stopped smoking.', wrong: ['slutter', 'slutte', 'sluttte'], base: 'slutte' },
            { s: 'Noen har [stjålet] bilen min!', en: 'Someone has stolen my car!', wrong: ['stjal', 'stjeler', 'stjele'], base: 'stjele' },
            { s: 'Han har [fortalt] deg en løgn.', en: 'He has told you a lie.', wrong: ['fortalte', 'forteller', 'fortelle'], base: 'fortelle' },
            { s: 'Helga har [kommet].', en: 'The weekend has arrived.', wrong: ['kom', 'kommer', 'komme'], base: 'komme' },
            { s: 'Jeg har aldri [løyet]!', en: 'I have never told a lie!', wrong: ['løy', 'lyver', 'lyve'], base: 'lyve' },
          ],
          related: ['past'],
        },
      ],
    },
  ],
};

export default grammar;
