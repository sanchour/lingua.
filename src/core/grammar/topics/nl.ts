import type { Grammar } from '../types';

// Dutch (tier 2: a short map of the first topics). Sentences: the Dutch pack's Wiktionary
// examples. Rules checked against Wikipedia's "Dutch grammar" (de and het, verb-second word order,
// niet and geen) and "Dutch conjugation" (present, weak and strong past, 't kofschip, hebben or
// zijn in the perfect).

const grammar: Grammar = {
  lang: 'nl',
  sources: [
    { name: 'Wikipedia: Dutch grammar', url: 'https://en.wikipedia.org/wiki/Dutch_grammar' },
    { name: 'Wikipedia: Dutch conjugation', url: 'https://en.wikipedia.org/wiki/Dutch_conjugation' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: separable verbs, word order in subordinate clauses, er, adjective endings as a topic of their own, and diminutives (mentioned under de and het).',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'de-het',
          title: 'De or het',
          level: 'A1',
          summary: 'Two words for "the": de for most nouns, het for neuter ones.',
          rule: [
            'Dutch has two words for "the". **De** goes with common-gender nouns (most nouns, and all people) and with **every plural**. **Het** goes with neuter nouns in the singular: *het huis*, but *de huizen*.',
            'There is no reliable rule from the noun\'s shape, so learn each noun with its article. Two safe ones: every diminutive in **-je** is a het-word (*het wolkje*), and so is every verb used as a noun (*het eten*).',
            '"This" and "that" follow the same split: **deze** and **die** with de-words, **dit** and **dat** with het-words. "A" is **een** for both.',
          ],
          tables: [
            {
              columns: ['', 'de-words', 'het-words'],
              rows: [
                ['the', 'de muur', 'het bed'],
                ['this', 'deze muur', 'dit bed'],
                ['that', 'die muur', 'dat bed'],
                ['plural', 'de muren', 'de bedden'],
              ],
            },
          ],
          watch: 'Adjectives before a het-word lose their -e after een: een rood huis, but het rode huis and de rode jurk.',
          why: 'De for common-gender nouns and all plurals; het for neuter nouns in the singular.',
          tags: [],
          items: [
            { s: '[Het] vuur is uit.', en: 'The fire is out.', wrong: ['De', 'Die', 'Deze'] },
            { s: '[De] televisie is uit.', en: 'The television is off.', wrong: ['Het', 'Dat', 'Dit'] },
            { s: '[Het] meer was kalm en helder.', en: 'The lake was calm and clear.', wrong: ['De', 'Die', 'Deze'] },
            { s: '[De] bal ligt achter de kast.', en: 'The ball is (lying) behind the cupboard.', wrong: ['Het', 'Dat', 'Dit'] },
            { s: '[Het] huis is af.', en: 'The house is ready.', wrong: ['De', 'Die', 'Deze'] },
            { s: '[De] auto is zwart.', en: 'The car is black.', wrong: ['Het', 'Dat', 'Dit'] },
            { s: '[Het] gras is groen na de regen.', en: 'The grass is green after the rain.', wrong: ['De', 'Die', 'Deze'] },
            { s: '[De] muur is wit.', en: 'The wall is white.', wrong: ['Het', 'Dat', 'Dit'] },
            { s: '[Het] bed staat langs de muur.', en: 'The bed stands along the wall.', wrong: ['De', 'Die', 'Deze'] },
          ],
        },
        {
          id: 'zijn-hebben',
          title: 'Zijn and hebben: to be and to have',
          level: 'A1',
          summary: 'Two irregular verbs you need from the first day.',
          rule: [
            '**Zijn** is "to be": **ik ben, jij bent, hij is, wij zijn, jullie zijn, zij zijn**.',
            '**Hebben** is "to have": **ik heb, jij hebt, hij heeft, wij hebben, jullie hebben, zij hebben**.',
            '*Ze* can be "she" or "they"; the verb tells which: *ze is* (she), *ze zijn* (they).',
          ],
          tables: [
            {
              columns: ['', 'zijn', 'hebben'],
              rows: [
                ['ik', 'ben', 'heb'],
                ['jij, u', 'bent', 'hebt'],
                ['hij, zij, het', 'is', 'heeft'],
                ['wij, jullie, zij', 'zijn', 'hebben'],
              ],
              note: 'When jij or je follows the verb, the t drops: heb je?, ben je?',
            },
          ],
          why: 'Zijn: ben, bent, is, zijn. Hebben: heb, hebt, heeft, hebben.',
          tags: [],
          items: [
            { s: 'Ik [ben] een man.', en: 'I am a man.', wrong: ['bent', 'is', 'zijn'], base: 'zijn', cue: 'ik' },
            { s: 'Hij [is] een gewone jongen.', en: "He's a normal boy.", wrong: ['ben', 'bent', 'zijn'], base: 'zijn', cue: 'hij' },
            { s: 'Ze [zijn] nog niet thuis.', en: "They're not home yet.", wrong: ['is', 'ben', 'bent'], base: 'zijn', cue: 'zij (they)' },
            { s: 'Ik [ben] bang voor het donker!', en: 'I am scared of the dark!', wrong: ['bent', 'is', 'heb'], base: 'zijn', cue: 'ik' },
            { s: 'Ik [heb] griep.', en: 'I have the flu.', wrong: ['hebt', 'heeft', 'hebben'], base: 'hebben', cue: 'ik' },
            { s: 'Hij [heeft] geen tijd om te wachten.', en: "He doesn't have time to wait.", wrong: ['heb', 'hebt', 'hebben'], base: 'hebben', cue: 'hij' },
            { s: 'De zeilboot [heeft] water in de buik.', en: 'The sailboat has water in its hull.', wrong: ['heb', 'hebben', 'is'], base: 'hebben', cue: 'hij' },
            { s: 'Zij [heeft] een prachtig gebit.', en: 'She has a beautiful set of teeth.', wrong: ['heb', 'hebben', 'is'], base: 'hebben', cue: 'zij (she)' },
          ],
          related: ['present', 'perfect'],
        },
        {
          id: 'present',
          title: 'The present tense',
          level: 'A1',
          summary: 'The stem for ik, stem + t for jij and hij, the infinitive for the plural.',
          rule: [
            'The **stem** is the infinitive without **-en**: *maken* → *maak*. For **ik** use the stem: *ik maak*. For **jij**, **u** and **hij/zij/het** add **-t**: *je maakt*, *ze leeft*. For all plurals use the infinitive: *wij maken*.',
            'Spelling keeps the sound: a long vowel in an open syllable is written double in the stem (*maken* → *maak*), and the stem never ends in *v* or *z* (*leven* → *leef*). A stem that already ends in **-t** gets no extra t: *hij zit*.',
            'When **jij** or **je** comes after the verb, the **-t** drops: *je maakt*, but *maak je?*',
          ],
          tables: [
            {
              columns: ['', 'maken', 'leven', 'lopen'],
              rows: [
                ['ik', 'maak', 'leef', 'loop'],
                ['jij, u', 'maakt', 'leeft', 'loopt'],
                ['hij, zij, het', 'maakt', 'leeft', 'loopt'],
                ['wij, jullie, zij', 'maken', 'leven', 'lopen'],
              ],
            },
          ],
          why: 'Ik + stem; jij, u, hij + stem + t; plural = the infinitive.',
          tags: ['present first-person', 'present second-person', 'present third-person', 'plural present'],
          items: [
            { s: 'Ik [maak] graag tomatensoep.', en: 'I like preparing tomato soup.', wrong: ['maakt', 'maken', 'gemaakt'], base: 'maken', cue: 'ik' },
            { s: 'Je [maakt] me gek.', en: 'You make me crazy.', wrong: ['maak', 'maken', 'gemaakt'], base: 'maken', cue: 'jij' },
            { s: 'Ze [leeft] voor haar kunst.', en: 'She lives for her art.', wrong: ['leef', 'leven', 'leevt'], base: 'leven', cue: 'zij (she)' },
            { s: 'Ik [loop] graag op het strand.', en: 'I gladly walk on the beach.', wrong: ['loopt', 'lopen', 'lop'], base: 'lopen', cue: 'ik' },
            { s: 'Misdaad [loont] niet.', en: "Crime doesn't pay.", wrong: ['loon', 'lonen', 'geloond'], base: 'lonen', cue: 'het' },
            { s: 'Maar ik [rook] niet.', en: "But I don't smoke.", wrong: ['rookt', 'roken', 'gerookt'], base: 'roken', cue: 'ik' },
            { s: 'De vochtige aarde [ruikt] goed.', en: 'The moist soil smells good.', wrong: ['ruik', 'ruiken', 'ruikd'], base: 'ruiken', cue: 'zij (it)' },
            { s: 'Ze [komt] over een uur.', en: "She's coming in an hour.", wrong: ['kom', 'komen', 'gekomen'], base: 'komen', cue: 'zij (she)' },
          ],
          related: ['zijn-hebben', 'word-order'],
        },
        {
          id: 'word-order',
          title: 'The verb comes second',
          level: 'A1',
          summary: 'Start with "yesterday" or "then", and the subject moves behind the verb.',
          rule: [
            'In a main clause the verb that carries the person is always the **second** element. Usually the subject comes first: *Ik heb een fiets gekocht.*',
            'If something else comes first (a time, a place, *dan*, *toen*), the verb stays second and the **subject moves behind it**: *Gisteren **heb ik** een nieuwe fiets gekocht.*',
            'The rest of the verb, the participle or the infinitive, goes to the **end**: *heb … gekocht*, *zal … aankomen*.',
          ],
          watch: '"Gisteren ik heb" follows English order and is wrong: the verb must come second.',
          why: 'The verb is always second; if the sentence starts with something else, the subject goes after the verb.',
          tags: [],
          items: [
            { s: 'Gisteren [heb ik] een nieuwe fiets gekocht.', en: 'Yesterday I bought a new bicycle.', wrong: ['ik heb', 'ik hebt', 'heeft ik'] },
            { s: 'Toen [ging hij] weg.', en: 'Then he left.', wrong: ['hij ging', 'gingen hij', 'hij gaat'] },
            { s: 'Vanavond [hebben we] gevulde kalkoen.', en: "Tonight we're having stuffed turkey.", wrong: ['we hebben', 'heeft we', 'we heeft'] },
            { s: 'Morgen [halen ze] het afval op.', en: "They're collecting the garbage tomorrow.", wrong: ['ze halen', 'ze haalt', 'haal ze'] },
            { s: 'Dan [doe ik] dit alvast.', en: "Then I'll do this in advance.", wrong: ['ik doe', 'ik doet', 'doet ik'] },
            { s: 'Daar [heb ik] niet bij stilgestaan.', en: 'I did not pay attention to that.', wrong: ['ik heb', 'ik hebt', 'heeft ik'] },
            { s: 'Nu [zal het] op haar aankomen.', en: 'Now it will depend on her.', wrong: ['het zal', 'het zullen', 'zullen het'] },
          ],
          related: ['present', 'perfect'],
        },
        {
          id: 'niet-geen',
          title: 'Not: niet or geen',
          level: 'A1',
          summary: 'Geen before a noun without "the"; niet everywhere else.',
          rule: [
            '**Geen** means "not a" or "no", before a noun that would otherwise have **een** or no article: *Ik ben geen robot* (ik ben een robot), *Ik heb geen tijd*.',
            '**Niet** negates everything else: verbs, adjectives, places, and nouns with *de*, *het* or *mijn*: *Ik ben niet thuis*, *De wereld is niet plat*.',
            'Niet usually goes at the end of the clause, but before an adjective, a place or a preposition: *niet plat*, *niet thuis*, *niet voor jou*.',
          ],
          compare: {
            title: 'Niet or geen',
            sides: [
              { label: 'Geen', points: ['before a noun with een or no article'], example: { s: 'Ik ben geen robot.', en: "I'm not a robot." } },
              { label: 'Niet', points: ['verbs, adjectives, places', 'nouns with de, het, mijn…'], example: { s: 'Ik ben niet thuis.', en: "I'm not at home." } },
            ],
          },
          why: 'Geen replaces een (or no article) before a noun; niet negates everything else.',
          tags: [],
          items: [
            { s: 'Hij heeft [geen] tijd om te wachten.', en: "He doesn't have time to wait.", wrong: ['niet', 'nee', 'neen'] },
            { s: 'Dat was [geen] slimme zet.', en: 'That was not a smart move.', wrong: ['niets', 'nee', 'neen'] },
            { s: 'Er is [geen] wolkje aan de hemel.', en: "There isn't a cloud in the sky.", wrong: ['niet', 'nee', 'neen'] },
            { s: 'Ik heb [geen] contanten voor een biertje.', en: 'I have no cash for a beer.', wrong: ['niet', 'nee', 'neen'] },
            { s: 'De wereld is [niet] plat.', en: 'The world is not flat.', wrong: ['geen', 'nee', 'neen'] },
            { s: 'Dat is [niet] waar.', en: 'That is not true.', wrong: ['geen', 'nee', 'neen'] },
            { s: 'Maar ik rook [niet].', en: "But I don't smoke.", wrong: ['geen', 'nee', 'neen'] },
            { s: 'Ze zijn nog [niet] thuis.', en: "They're not home yet.", wrong: ['geen', 'nee', 'neen'] },
          ],
        },
      ],
    },
    {
      title: 'The past',
      topics: [
        {
          id: 'perfect',
          title: 'The perfect: hebben or zijn + ge-',
          level: 'A2',
          summary: 'The everyday past: ik heb gekocht, hij is gekomen.',
          rule: [
            'The perfect is **hebben** or **zijn** plus the past participle at the end of the clause: *Ik heb nieuwe kleren gekocht.*',
            'Regular participles are **ge- + stem + -t or -d**: *-t* if the stem ends in one of the consonants of **\'t kofschip** (t, k, f, s, ch, p), otherwise *-d*: *gekust*, *gehuurd*. Strong verbs end in **-en** and often change their vowel: *gekomen*, *gezonken*.',
            'Most verbs take **hebben**. Verbs of a change of place or state take **zijn**: *komen, gaan, worden, sterven, zinken, smelten, trouwen*. *Lopen* takes *zijn* with a destination (*ik ben naar de stad gelopen*) and *hebben* without (*hij heeft veel gelopen*).',
          ],
          compare: {
            title: 'Hebben or zijn',
            sides: [
              { label: 'Hebben', points: ['most verbs', 'moving without a destination'], example: { s: 'Hij heeft daar veel gelopen.', en: 'He did a lot of running there.' } },
              { label: 'Zijn', points: ['a change of place or state', 'moving towards a destination'], example: { s: 'Ik ben naar de stad gelopen.', en: 'I ran to the city.' } },
            ],
          },
          why: 'Hebben for most verbs; zijn for a change of place or state. The participle goes to the end.',
          tags: ['participle past'],
          items: [
            { s: 'Ik [heb] nieuwe kleren gekocht.', en: 'I bought new clothes.', wrong: ['ben', 'heeft', 'hebben'], cue: 'ik' },
            { s: 'We [hebben] een leuke vakantie gehad.', en: 'We had a nice vacation.', wrong: ['zijn', 'heeft', 'is'], cue: 'wij' },
            { s: 'Hij [heeft] niet geantwoord.', en: 'He has not answered.', wrong: ['is', 'hebben', 'heb'], cue: 'hij' },
            { s: 'Hij [is] nog niet gekomen.', en: 'He has not come yet.', wrong: ['heeft', 'heb', 'zijn'], cue: 'hij' },
            { s: 'Ze [zijn] gisteren getrouwd.', en: 'They married yesterday.', wrong: ['hebben', 'is', 'heeft'], cue: 'zij (they)' },
            { s: 'De boot [is] gezonken.', en: 'The boat has sunk.', wrong: ['heeft', 'zijn', 'hebben'], cue: 'hij' },
            { s: 'Ik [ben] naar de stad gelopen.', en: 'I ran to the city.', wrong: ['heb', 'is', 'hebben'], cue: 'ik' },
            { s: 'Hij [heeft] daar veel gelopen.', en: 'He did a lot of running there.', wrong: ['is', 'ben', 'hebben'], cue: 'hij' },
          ],
          related: ['zijn-hebben', 'simple-past'],
        },
        {
          id: 'simple-past',
          title: 'The simple past: -te or -de',
          level: 'A2',
          summary: 'Hij legde, we hoopten: for telling a story.',
          rule: [
            'Regular (weak) verbs add **-te** (plural **-ten**) to the stem if it ends in a consonant of **\'t kofschip** (t, k, f, s, ch, p), and **-de** (**-den**) otherwise: *koken* → **kookte**, *leggen* → **legde**.',
            'The singular has one form for every person: *ik, jij, hij legde*; the plural adds *-n*: *wij legden*.',
            'Strong verbs change their vowel instead: *zitten* → **zat**, **zaten**; *lopen* → **liep**; *gaan* → **ging**.',
            'In speech the perfect is more usual; the simple past is for telling what happened, one thing after another.',
          ],
          tables: [
            {
              columns: ['', 'koken', 'leggen', 'zitten'],
              rows: [
                ['ik, jij, hij', 'kookte', 'legde', 'zat'],
                ['wij, jullie, zij', 'kookten', 'legden', 'zaten'],
              ],
            },
          ],
          watch: '\'t kofschip looks at the stem as spoken: leven → leef → leefde (the stem ends in v in the infinitive), but kussen → kus → kuste.',
          why: 'Stem + te/ten after t, k, f, s, ch, p (\'t kofschip); stem + de/den otherwise.',
          tags: ['past singular', 'past plural'],
          items: [
            { s: 'Het water [kookte].', en: 'The water boiled.', wrong: ['kookten', 'kookde', 'gekookt'], base: 'koken', cue: 'het' },
            { s: 'Hij [legde] het boek neer.', en: 'He laid the book down.', wrong: ['legden', 'legte', 'gelegd'], base: 'leggen', cue: 'hij' },
            { s: 'We [hoopten] op goed weer.', en: 'We were hoping for good weather.', wrong: ['hoopte', 'hoopden', 'gehoopt'], base: 'hopen', cue: 'wij' },
            { s: 'Ik [kuste] hem zachtjes op zijn wang.', en: 'I kissed him gently on the cheek.', wrong: ['kusten', 'kusde', 'gekust'], base: 'kussen', cue: 'ik' },
            { s: 'Hij [vertelde] een boeiend verhaal.', en: 'He told an interesting story.', wrong: ['vertelden', 'vertelte', 'verteld'], base: 'vertellen', cue: 'hij' },
            { s: 'De soldaten [vuurden] hun geweren.', en: 'The soldiers fired their rifles.', wrong: ['vuurde', 'vuurten', 'gevuurd'], base: 'vuren', cue: 'zij (they)' },
            { s: 'Hij [lachte] gul.', en: 'He laughed heartily.', wrong: ['lachten', 'lachde', 'gelachen'], base: 'lachen', cue: 'hij' },
            { s: 'Ze [zaten] op de bank.', en: 'They were sitting on the couch.', wrong: ['zat', 'zatten', 'gezeten'], base: 'zitten', cue: 'zij (they)' },
          ],
          related: ['perfect'],
        },
      ],
    },
  ],
};

export default grammar;
