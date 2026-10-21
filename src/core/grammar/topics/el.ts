import type { Grammar } from '../types';

// Greek (tier 2: a short map of the first topics). Sentences: the Greek pack's Wiktionary
// examples. Rules checked against Wikipedia's "Modern Greek grammar" (articles, είμαι, the two
// present conjugations, θα + the perfective or imperfective stem, δεν and μη).

const grammar: Grammar = {
  lang: 'el',
  sources: [{ name: 'Wikipedia: Modern Greek grammar', url: 'https://en.wikipedia.org/wiki/Modern_Greek_grammar' }],
  notes:
    'Tier 2, kept short. Left out for now: the cases beyond the nominative as topics of their own, the past tenses (aorist and imperfect), the subjunctive with να, and clitic pronouns.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'articles',
          title: 'Ο, η, το: the three genders',
          level: 'A1',
          summary: 'Masculine, feminine and neuter nouns, each with its own "the".',
          rule: [
            'Greek nouns are **masculine**, **feminine** or **neuter**, and "the" shows which: **ο** καφές, **η** ώρα, **το** πλοίο.',
            'In the plural, masculine and feminine share **οι** (*οι γονείς*), and neuter takes **τα** (*τα παιδιά*).',
            'Endings help: most nouns in **-ος** and **-ας** are masculine, most in **-α** and **-η** feminine, and most in **-ο**, **-ι** and **-μα** neuter. Names take the article too: *ο Γιώργος*, *η Ελένη*.',
          ],
          tables: [
            {
              title: 'the, as the subject (nominative)',
              columns: ['', 'masculine', 'feminine', 'neuter'],
              rows: [
                ['singular', 'ο', 'η', 'το'],
                ['plural', 'οι', 'οι', 'τα'],
              ],
              note: 'The article changes with the case too: τον καφέ, τη γυναίκα, του παιδιού.',
            },
          ],
          why: 'Ο for masculine, η for feminine, το for neuter; οι and τα in the plural.',
          tags: [],
          items: [
            { s: '[Ο] καφές είναι πολύ γλυκός.', en: 'The coffee is too sweet.', wrong: ['Η', 'Το', 'Τα'] },
            { s: '[Η] ώρα είναι δέκα ακριβώς.', en: "It is ten o'clock precisely.", wrong: ['Ο', 'Το', 'Τα'] },
            { s: '[Το] πλοίο φεύγει από τον Πειραιά.', en: 'The boat leaves from Piraeus.', wrong: ['Ο', 'Η', 'Οι'] },
            { s: '[Οι] γονείς μου τότε έμεναν στην Αθήνα.', en: 'My parents were then living in Athens.', wrong: ['Τα', 'Ο', 'Το'] },
            { s: '[Τα] παιδιά έπαιζαν στο σοκάκι.', en: 'Children were playing in the street.', wrong: ['Οι', 'Το', 'Η'] },
            { s: '[Η] ομάδα μας έχασε στον ημιτελικό.', en: 'Our team lost in the semifinal.', wrong: ['Ο', 'Το', 'Τα'] },
            { s: '[Το] μωρό θέλει τάισμα.', en: 'The baby needs feeding.', wrong: ['Ο', 'Η', 'Οι'] },
            { s: '[Ο] άντρας αγαπάει τη γυναίκα του.', en: 'The man loves his wife.', wrong: ['Η', 'Το', 'Τα'] },
          ],
        },
        {
          id: 'eimai',
          title: 'Είμαι: to be',
          level: 'A1',
          summary: 'The verb "to be", with είναι for both "is" and "are".',
          rule: [
            '**Είμαι** is "I am". Its forms: **είμαι, είσαι, είναι, είμαστε, είστε, είναι**. *Είναι* is both "he/she/it is" and "they are".',
            '**Είστε** is "you are" for several people, and also the polite "you" for one person: *Δεν ξέρω αν είστε στο σπίτι σας*.',
            'The subject pronoun is usually left out, since the verb already shows the person.',
          ],
          tables: [
            {
              title: 'είμαι, present',
              rows: [
                ['εγώ', 'είμαι'],
                ['εσύ', 'είσαι'],
                ['αυτός, αυτή, αυτό', 'είναι'],
                ['εμείς', 'είμαστε'],
                ['εσείς', 'είστε'],
                ['αυτοί, αυτές, αυτά', 'είναι'],
              ],
            },
          ],
          why: 'Είμαι, είσαι, είναι, είμαστε, είστε, είναι.',
          tags: [],
          items: [
            { s: 'Η Ελένη [είναι] πολύ χαρούμενη.', en: 'Eleni is very happy.', wrong: ['είμαι', 'είσαι', 'είμαστε'], base: 'είμαι', cue: 'αυτή' },
            { s: 'Όλα [είναι] εντάξει!', en: 'Everything is OK!', wrong: ['είμαι', 'είσαι', 'είστε'], base: 'είμαι', cue: 'αυτά' },
            { s: 'Δεν ξέρω αν [είστε] στο σπίτι σας.', en: "I don't know whether you are at home.", wrong: ['είμαστε', 'είσαι', 'είμαι'], base: 'είμαι', cue: 'εσείς' },
            { s: 'Όταν [είστε] στην Αθήνα.', en: 'When you are in Athens.', wrong: ['είμαι', 'είσαι', 'είμαστε'], base: 'είμαι', cue: 'εσείς' },
            { s: 'Σύντομα θα [είστε] ευτυχισμένοι!', en: 'Soon you will be happy!', wrong: ['είμαι', 'είσαι', 'είμαστε'], base: 'είμαι', cue: 'εσείς' },
            { s: 'Τα ρέστα σας [είναι] σαράντα λεπτά.', en: 'Your change is forty cents.', wrong: ['είμαι', 'είσαι', 'είστε'], base: 'είμαι', cue: 'αυτά' },
            { s: 'Δεν [είναι] πια εδώ.', en: 'He is no longer here.', wrong: ['είμαι', 'είσαι', 'είμαστε'], base: 'είμαι', cue: 'αυτός' },
          ],
          related: ['present'],
        },
        {
          id: 'present',
          title: 'The present tense: -ω and -άω',
          level: 'A1',
          summary: 'Two families of verbs: θέλω, θέλεις… and αγαπάω, αγαπάς…',
          rule: [
            'Most verbs end in **-ω** and take the endings **-ω, -εις, -ει, -ουμε, -ετε, -ουν(ε)**: *θέλω, θέλεις, θέλει*.',
            'Verbs stressed on the ending (**-άω** or **-ώ**) take **-άω, -άς, -άει, -άμε, -άτε, -άνε** (or -ούν): *αγαπάω, αγαπάς, αγαπάει*. A few, like *μπορώ*, go **-ώ, -είς, -εί, -ούμε, -είτε, -ούν**.',
            'The ending shows the person, so *εγώ* and *εσύ* are usually left out.',
          ],
          tables: [
            {
              columns: ['', 'θέλω', 'αγαπάω', 'μπορώ'],
              rows: [
                ['εγώ', 'θέλω', 'αγαπάω', 'μπορώ'],
                ['εσύ', 'θέλεις', 'αγαπάς', 'μπορείς'],
                ['αυτός, αυτή', 'θέλει', 'αγαπάει', 'μπορεί'],
                ['εμείς', 'θέλουμε', 'αγαπάμε', 'μπορούμε'],
                ['εσείς', 'θέλετε', 'αγαπάτε', 'μπορείτε'],
                ['αυτοί, αυτές', 'θέλουν(ε)', 'αγαπάνε', 'μπορούν(ε)'],
              ],
            },
          ],
          why: '-ω verbs: ω, εις, ει, ουμε, ετε, ουν; -άω verbs: άω, άς, άει, άμε, άτε, άνε.',
          tags: ['imperfective indicative present'],
          items: [
            { s: 'Ο Σταύρος [θέλει] την Ελένη.', en: 'Stavros desires Eleni.', wrong: ['θέλω', 'θέλεις', 'θέλουν'], base: 'θέλω', cue: 'αυτός' },
            { s: 'Το πλοίο [φεύγει] από τον Πειραιά.', en: 'The boat leaves from Piraeus.', wrong: ['φεύγω', 'φεύγεις', 'φεύγουν'], base: 'φεύγω', cue: 'αυτό' },
            { s: 'Το κάπνισμα [σκοτώνει]!', en: 'Smoking kills!', wrong: ['σκοτώνω', 'σκοτώνεις', 'σκοτώνουν'], base: 'σκοτώνω', cue: 'αυτό' },
            { s: 'Ο άντρας [αγαπάει] τη γυναίκα του.', en: 'The man loves his wife.', wrong: ['αγαπάω', 'αγαπάς', 'αγαπάνε'], base: 'αγαπάω', cue: 'αυτός' },
            { s: 'Οι κωφοί δεν [ακούνε].', en: 'Deaf people cannot hear.', wrong: ['ακούει', 'ακούω', 'ακούς'], base: 'ακούω', cue: 'αυτοί' },
            { s: 'Κάπου έβαλα τα κλειδιά και τώρα δεν τα [βρίσκω].', en: "I put the keys somewhere and now I can't find them.", wrong: ['βρίσκει', 'βρίσκεις', 'βρίσκουν'], base: 'βρίσκω', cue: 'εγώ' },
            { s: 'Θέλω να βγω απόψε μα δεν [μπορώ].', en: "I want to go out tonight, but I can't.", wrong: ['μπορεί', 'μπορείς', 'μπορούν'], base: 'μπορώ', cue: 'εγώ' },
            { s: 'Τα μωρά δεν [μπορούν] να περπατήσουν.', en: 'Babies cannot walk.', wrong: ['μπορεί', 'μπορώ', 'μπορείς'], base: 'μπορώ', cue: 'αυτά' },
          ],
          related: ['eimai', 'future'],
        },
      ],
    },
    {
      title: 'Going further',
      topics: [
        {
          id: 'future',
          title: 'The future with θα',
          level: 'A2',
          summary: 'Θα + a verb: θα πάμε, θα κλείσει.',
          rule: [
            'The future is **θα** plus a verb. For a single event, Greek uses the **perfective** stem (the one of the aorist): *θα κλείσει*, "it will shut"; *θα ξυπνήσω*, "I will wake up".',
            'For something ongoing or repeated, it uses the present stem: *θα βλέπει*, "he will be watching".',
            'The endings are the present ones (-ω, -εις, -ει, -ουμε, -ετε, -ουν). The negative is **δε(ν) θα**: *δεν θα πάμε*.',
          ],
          watch: 'θα never changes, and it always comes right before the verb (or its pronouns): θα τα παρατήσω.',
          why: 'θα + the verb with present endings; the perfective stem for a one-off event.',
          tags: [],
          items: [
            { s: 'Αύριο [θα ξυπνήσω] νωρίς.', en: 'Tomorrow I shall wake up early.', wrong: ['θα ξυπνήσεις', 'θα ξυπνήσει', 'ξυπνήσω θα'], cue: 'εγώ' },
            { s: 'Για χάρη σου [θα κάνουμε] οτιδήποτε.', en: "For your sake, we'll do anything.", wrong: ['θα κάνω', 'θα κάνουν', 'κάνουμε θα'], cue: 'εμείς' },
            { s: 'Οι καλοί [θα πάνε] στον Παράδεισο.', en: 'The good will go to Heaven.', wrong: ['θα πάει', 'θα πάω', 'πάνε θα'], cue: 'αυτοί' },
            { s: 'Η αυτόματη πόρτα [θα κλείσει] μετά από 10 δευτερόλεπτα.', en: 'The automatic door will shut after 10 seconds.', wrong: ['θα κλείσω', 'θα κλείσουν', 'κλείσει θα'], cue: 'αυτή' },
            { s: 'Στην καλύτερη περίπτωση, [θα χάσεις] μόνο είκοσι ευρώ.', en: 'In the best case, you’ll only lose twenty euros.', wrong: ['θα χάσω', 'θα χάσει', 'χάσεις θα'], cue: 'εσύ' },
            { s: 'Δεν έχουμε λεφτά· λοιπόν, δεν [θα πάμε] διακοπές φέτος.', en: "We have no money; so we won't go on holiday this year.", wrong: ['θα πάω', 'θα πάνε', 'πάμε θα'], cue: 'εμείς' },
          ],
          related: ['present', 'negation'],
        },
        {
          id: 'negation',
          title: 'Not: δεν or μη',
          level: 'A2',
          summary: 'Δεν for statements; μη(ν) for "don\'t!" and after να.',
          rule: [
            '**Δεν** (often **δε** before most consonants) negates statements and questions: *Οι κωφοί δεν ακούνε*.',
            '**Μη** or **μην** negates commands and everything after **να**: *μη φοβάσαι*, "don\'t be afraid"; *αποφασίζω να μην πάρω ομπρέλα*.',
            'The *-ν* is kept before a vowel and before κ, π, τ, ξ, ψ and μπ, ντ, γκ, τσ, τζ: *δεν είναι*, *μην πέσεις*. In everyday writing *δεν* often keeps it everywhere.',
          ],
          compare: {
            title: 'Δεν or μη',
            sides: [
              { label: 'Δεν: statements', points: ['what is or isn\'t so', 'questions'], example: { s: 'Τα μωρά δεν μπορούν να περπατήσουν.', en: 'Babies cannot walk.' } },
              { label: 'Μη: commands and να', points: ['"don\'t…!"', 'after να'], example: { s: 'Καλά ντε, μη φωνάζεις.', en: 'OK then, do not shout.' } },
            ],
          },
          why: 'Δεν negates statements; μη(ν) negates commands and verbs after να.',
          tags: [],
          items: [
            { s: 'Οι κωφοί [δεν] ακούνε.', en: 'Deaf people cannot hear.', wrong: ['μην', 'όχι', 'ούτε'] },
            { s: 'Ίσως [δεν] ξέρει τί έγινε.', en: "Maybe she doesn't know what happened.", wrong: ['μην', 'όχι', 'ούτε'] },
            { s: 'Μοιάζει με βούτυρο αλλά [δεν] είναι.', en: "It looks like butter but isn't.", wrong: ['μην', 'όχι', 'ούτε'] },
            { s: 'Το σαπούνι [δεν] παράγεται φυσικά.', en: 'Soap is not produced naturally.', wrong: ['μην', 'όχι', 'ούτε'] },
            { s: 'Πήγαινε, [μη] φοβάσαι, δε θα πάθεις τίποτα κακό!', en: "Go, don't be afraid, nothing bad will happen to you!", wrong: ['δεν', 'όχι', 'ούτε'] },
            { s: 'Καλά ντε, [μη] φωνάζεις.', en: 'OK then, do not shout.', wrong: ['δεν', 'όχι', 'ούτε'] },
            { s: 'Μερικές φορές αποφασίζω να [μην] πάρω ομπρέλα.', en: 'Sometimes I decide to not take an umbrella.', wrong: ['δεν', 'όχι', 'ούτε'] },
            { s: 'Κράτα γερά, [μην] πέσεις!', en: 'Hold firmly, so that you will not fall down!', wrong: ['δεν', 'όχι', 'ούτε'] },
          ],
          related: ['future'],
        },
      ],
    },
  ],
};

export default grammar;
