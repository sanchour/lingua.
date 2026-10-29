import type { Grammar } from '../types';

// Italian (tier 2: a short map of the first topics). Sentences: the Italian pack's Wiktionary
// examples. Rules checked against Wikipedia's "Italian grammar" (articles, articulated
// prepositions, pronouns, auxiliaries) and "Italian conjugation" (present, imperfect, future,
// passato prossimo and participle agreement).

const grammar: Grammar = {
  lang: 'it',
  sources: [
    { name: 'Wikipedia: Italian grammar', url: 'https://en.wikipedia.org/wiki/Italian_grammar' },
    { name: 'Wikipedia: Italian conjugation', url: 'https://en.wikipedia.org/wiki/Italian_conjugation' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: the subjunctive, the conditional, ci and ne, combined pronouns (glielo), the passato remoto and reflexive verbs as a topic of their own (the pack has few short sentences for them).',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'articles',
          title: 'Gender and articles',
          level: 'A1',
          summary: 'Every noun is masculine or feminine, and "the" changes with the sound that follows.',
          rule: [
            'Italian nouns are **masculine** or **feminine**. Most in **-o** are masculine and most in **-a** feminine; nouns in **-e** can be either, so learn each with its article.',
            'Masculine "the" is **il** before most consonants, **lo** before *s* + consonant, *z*, *gn* and *ps*, and **l\'** before a vowel. The plurals are **i** and **gli** (for words that take *lo* or *l\'*).',
            'Feminine "the" is **la**, or **l\'** before a vowel; the plural is always **le**.',
          ],
          tables: [
            {
              columns: ['', 'masculine', 'feminine'],
              rows: [
                ['the (singular)', 'il · lo · l\'', 'la · l\''],
                ['the (plural)', 'i · gli', 'le'],
                ['a, an', 'un · uno', 'una · un\''],
              ],
              note: 'il libro → i libri; lo studente → gli studenti; l\'amico → gli amici; la casa → le case.',
            },
          ],
          watch: 'Gli is the plural of both lo and masculine l\': gli esseri, gli zii.',
          why: 'Il/i before most consonants, lo/gli before s + consonant, z and vowels; la/le for feminine nouns.',
          tags: [],
          items: [
            { s: '[Il] pane è nel forno.', en: 'The bread is in the oven.', wrong: ['Lo', 'La', 'I'] },
            { s: '[Lo] smeraldo è una gemma verde.', en: 'Emerald is a green gemstone.', wrong: ['Il', 'La', 'Gli'] },
            { s: "[L']arancia è un tipo di frutta.", en: 'The orange is a type of fruit.', wrong: ['La', 'Il', 'Lo'] },
            { s: '[I] nonni sono gli angeli custodi dei nipoti.', en: 'Grandparents are the grandchildren’s guardian angels.', wrong: ['Gli', 'Le', 'Il'] },
            { s: '[Gli] esseri viventi sono dotati di senso.', en: 'Living beings are equipped with sensation.', wrong: ['I', 'Le', 'Lo'] },
            { s: '[La] professoressa scrive sulla lavagna.', en: 'The teacher writes on the board.', wrong: ['Il', 'Lo', 'Le'] },
            { s: 'Lorenzo legge [il] giornale.', en: 'Lorenzo reads the newspaper.', wrong: ['lo', 'la', 'i'] },
            { s: '[Le] cose non sono sempre come sembrano.', en: 'Things are not always as they appear.', wrong: ['La', 'Gli', 'I'] },
          ],
          related: ['prepositions'],
          targetLangRule: [
            'In italiano i nomi sono **maschili** o **femminili**. La maggior parte dei nomi in **-o** è maschile (*il libro*), in **-a** è femminile (*la casa*); i nomi in **-e** possono essere maschili (*il fiore*) o femminili (*la notte*).',
            'L\'articolo determinativo maschile è **il** (davanti a consonante), **lo** (davanti a *s* impura, *z*, *gn*, *ps*) e **l\'** (davanti a vocale). I plurali corrispondenti sono **i** e **gli**.',
            'Al femminile l\'articolo è **la** (singolare), **l\'** (davanti a vocale) e **le** (plurale).',
          ],
          exceptions: [
            'Nomi in -a maschili: il problema, il cinema, il clima, il programma.',
            'Nomi in -o femminili: la mano, la foto, la moto, la radio.',
          ],
          formalityPairs: [
            {
              formal: { s: 'Come sta Lei?', en: 'How are you? (formal)' },
              informal: { s: 'Come stai tu?', en: 'How are you? (informal)' },
              note: 'Lei uses 3rd person singular and is capitalized in writing.',
            },
          ],
          rightWrongPairs: [
            {
              right: 'Lo studente studia.',
              wrong: 'Il studente studia.',
              reason: 'Words beginning with s + consonant take lo and gli, not il.',
            },
            {
              right: 'Un\'amica sincera.',
              wrong: 'Un amica sincera.',
              reason: 'Feminine un\' takes an apostrophe before a vowel; masculine un never does.',
            },
          ],
        },
        {
          id: 'essere-avere',
          title: 'Essere and avere: to be and to have',
          level: 'A1',
          summary: 'The two verbs everything else leans on, both irregular.',
          rule: [
            '**Essere** is "to be": **sono, sei, è, siamo, siete, sono**. *Sono* is both "I am" and "they are".',
            '**Avere** is "to have": **ho, hai, ha, abbiamo, avete, hanno**. The *h* is never pronounced; it only tells *ho* (I have) from *o* (or).',
            'Italian says age with avere: *ho vent\'anni*, "I am twenty". Both verbs also make the past (*ho mangiato*, *sono andato*).',
          ],
          tables: [
            {
              columns: ['', 'essere', 'avere'],
              rows: [
                ['io', 'sono', 'ho'],
                ['tu', 'sei', 'hai'],
                ['lui, lei, Lei', 'è', 'ha'],
                ['noi', 'siamo', 'abbiamo'],
                ['voi', 'siete', 'avete'],
                ['loro', 'sono', 'hanno'],
              ],
              note: 'Lei with a capital is the polite "you", and takes the third person: Lei è, Lei ha.',
            },
          ],
          watch: 'È (is) has an accent; e without one means "and".',
          why: 'Essere: sono, sei, è, siamo, siete, sono. Avere: ho, hai, ha, abbiamo, avete, hanno.',
          tags: [],
          items: [
            { s: 'Non [sei] solo.', en: 'You are not alone.', wrong: ['sono', 'è', 'siamo'], base: 'essere', cue: 'tu' },
            { s: '[Sono] alto e forte.', en: 'I am tall and strong.', wrong: ['Sei', 'È', 'Siamo'], base: 'essere', cue: 'io' },
            { s: 'Il pane [è] economico.', en: 'The bread is cheap.', wrong: ['sono', 'sei', 'ha'], base: 'essere', cue: 'lui' },
            { s: '[Siamo] al lavoro.', en: 'We are at work.', wrong: ['Sono', 'Siete', 'Abbiamo'], base: 'essere', cue: 'noi' },
            { s: '[Ho] qualcosa in tasca.', en: 'I have something in my pocket.', wrong: ['Hai', 'Ha', 'Sono'], base: 'avere', cue: 'io' },
            { s: 'La ragazza [ha] una bella bambola.', en: 'The girl has a beautiful doll.', wrong: ['hanno', 'hai', 'è'], base: 'avere', cue: 'lei' },
            { s: '[Hai] programmi per stasera?', en: 'Do you have plans for tonight?', wrong: ['Ho', 'Hanno', 'Sei'], base: 'avere', cue: 'tu' },
            { s: 'Quanti figli [avete]?', en: 'How many children do you have?', wrong: ['abbiamo', 'hanno', 'siete'], base: 'avere', cue: 'voi' },
          ],
          related: ['present', 'passato-prossimo'],
        },
        {
          id: 'present',
          title: 'The present tense',
          level: 'A1',
          summary: 'Verbs in -are, -ere and -ire: drop the ending, add one for the person.',
          rule: [
            'Drop **-are**, **-ere** or **-ire** and add the ending: *parlare* → **parlo, parli, parla, parliamo, parlate, parlano**.',
            '-ere and -ire verbs share most endings (**-o, -i, -e**); they differ in *voi* (**-ete**, **-ite**) and *loro* (**-ono**).',
            'Many -ire verbs add **-isc-** in all but *noi* and *voi*: *finisco*, *preferisci*, but *finiamo*. The ending shows the person, so *io* and *tu* are usually left out.',
          ],
          tables: [
            {
              columns: ['', 'parlare', 'scrivere', 'dormire', 'finire'],
              rows: [
                ['io', 'parlo', 'scrivo', 'dormo', 'finisco'],
                ['tu', 'parli', 'scrivi', 'dormi', 'finisci'],
                ['lui, lei', 'parla', 'scrive', 'dorme', 'finisce'],
                ['noi', 'parliamo', 'scriviamo', 'dormiamo', 'finiamo'],
                ['voi', 'parlate', 'scrivete', 'dormite', 'finite'],
                ['loro', 'parlano', 'scrivono', 'dormono', 'finiscono'],
              ],
            },
          ],
          why: 'Present endings: -are → o, i, a, iamo, ate, ano; -ere/-ire → o, i, e, iamo, ete/ite, ono.',
          tags: ['present indicative'],
          items: [
            { s: 'Lorenzo [legge] il giornale.', en: 'Lorenzo reads the newspaper.', wrong: ['leggo', 'leggi', 'leggono'], base: 'leggere', cue: 'lui' },
            { s: 'La professoressa [scrive] sulla lavagna.', en: 'The teacher writes on the board.', wrong: ['scrivo', 'scrivi', 'scrivono'], base: 'scrivere', cue: 'lei' },
            { s: '[Abito] a Roma.', en: 'I live in Rome.', wrong: ['Abiti', 'Abita', 'Abitano'], base: 'abitare', cue: 'io' },
            { s: '[Guardi] dei film?', en: 'Do you watch movies?', wrong: ['Guardo', 'Guarda', 'Guardano'], base: 'guardare', cue: 'tu' },
            { s: 'Ogni voto [conta].', en: 'Every vote counts.', wrong: ['conto', 'conti', 'contano'], base: 'contare', cue: 'lui' },
            { s: "L'acqua [entra] dal tetto.", en: 'The water enters from the roof.', wrong: ['entro', 'entri', 'entrano'], base: 'entrare', cue: 'lei' },
            { s: 'Il treno [impiega] due ore.', en: 'The train takes two hours.', wrong: ['impiego', 'impieghi', 'impiegano'], base: 'impiegare', cue: 'lui' },
            { s: 'Questa azienda [produce] microchip.', en: 'That company produces microchips.', wrong: ['produco', 'produci', 'producono'], base: 'produrre', cue: 'lei' },
          ],
          related: ['essere-avere'],
        },
        {
          id: 'prepositions',
          title: 'Prepositions with the article: nel, sul, alla',
          level: 'A1',
          summary: 'a, da, di, in and su merge with "the" into one word.',
          rule: [
            'Before a definite article, **a, da, di, in** and **su** join it: *in + il* = **nel**, *su + la* = **sulla**, *a + la* = **alla**, *di + l\'* = **dell\'**.',
            'The joined form follows the article exactly: **il → -l**, **lo → -llo**, **la → -lla**, **l\' → -ll\'**, **i → -i**, **gli → -gli**, **le → -lle**. *In* becomes **ne-** and *di* becomes **de-**.',
            '*Con* and *per* stay apart in everyday Italian: *con il*, *per la*.',
          ],
          tables: [
            {
              columns: ['', 'il', 'lo', 'la', "l'", 'i', 'gli', 'le'],
              rows: [
                ['a', 'al', 'allo', 'alla', "all'", 'ai', 'agli', 'alle'],
                ['da', 'dal', 'dallo', 'dalla', "dall'", 'dai', 'dagli', 'dalle'],
                ['di', 'del', 'dello', 'della', "dell'", 'dei', 'degli', 'delle'],
                ['in', 'nel', 'nello', 'nella', "nell'", 'nei', 'negli', 'nelle'],
                ['su', 'sul', 'sullo', 'sulla', "sull'", 'sui', 'sugli', 'sulle'],
              ],
            },
          ],
          watch: '"In il" and "su la" are never written; the joined form is the only one.',
          why: 'a, da, di, in and su join the article: nel forno, sulla lavagna, alla nonna.',
          tags: [],
          items: [
            { s: 'Il pane è [nel] forno.', en: 'The bread is in the oven.', wrong: ['in il', 'nello', 'nella'] },
            { s: 'Il tuo gatto si lava [sul] mio letto.', en: 'Your cat cleans himself/itself on my bed.', wrong: ['su il', 'sullo', 'sulla'] },
            { s: 'Porta questo cesto [alla] nonna.', en: 'Bring this basket to grandma.', wrong: ['a la', 'al', 'allo'] },
            { s: "L'acqua entra [dal] tetto.", en: 'The water enters from the roof.', wrong: ['da il', 'dallo', 'dalla'] },
            { s: 'Lascia il bambino [nella] culla.', en: 'Leave the baby in the crib.', wrong: ['in la', 'nel', 'nello'] },
            { s: 'La professoressa scrive [sulla] lavagna.', en: 'The teacher writes on the board.', wrong: ['su la', 'sul', 'sullo'] },
            { s: "Sono capolavori [dell']arte europea.", en: 'They are masterpieces of European art.', wrong: ['della', 'del', 'dello'] },
            { s: 'Il guasto è [nel] motore.', en: 'The fault is in the engine.', wrong: ['in il', 'nello', 'nei'] },
          ],
          related: ['articles'],
        },
        {
          id: 'piacere',
          title: 'Piacere: saying what you like',
          level: 'A1',
          summary: 'Mi piace: the thing liked is the subject, and "I" becomes "to me".',
          rule: [
            'Italian says "it pleases me" instead of "I like it": **mi piace** la birra. The thing liked is the subject, so the verb agrees with it: **piace** for one thing or a verb, **piacciono** for several.',
            'The person who likes takes an indirect pronoun: **mi, ti, gli, le, ci, vi**, or **a** + a name or noun: *il cioccolato piace alla maggioranza della gente*.',
            'For emphasis use *a me, a te*: *a me non piace*.',
          ],
          watch: '"Io piaccio" means "I am liked" (I please someone), not "I like".',
          why: 'Piace for one thing, piacciono for several; the person who likes is mi, ti, gli, le… or a + noun.',
          tags: [],
          items: [
            { s: 'Mi [piace] la birra.', en: 'I like beer.', wrong: ['piaccio', 'piacciono', 'piaci'], base: 'piacere' },
            { s: 'Il cioccolato [piace] alla maggioranza della gente.', en: 'Most people like chocolate.', wrong: ['piacciono', 'piaccio', 'piacere'], base: 'piacere' },
            { s: 'A essere onesto, non [mi] piace molto.', en: "I don't like it very much, to be frank.", wrong: ['io', 'me', 'lo'] },
            { s: 'Sono uno a cui [piace] alzarsi presto.', en: 'I’m someone who likes getting up early or I’m a person who likes getting up early.', wrong: ['piacciono', 'piaccio', 'piaci'], base: 'piacere' },
          ],
          related: ['object-pronouns'],
        },
      ],
    },
    {
      title: 'The past',
      topics: [
        {
          id: 'passato-prossimo',
          title: 'The passato prossimo: avere or essere?',
          level: 'A2',
          summary: 'The everyday past: ho mangiato, sono andato.',
          rule: [
            'The passato prossimo is the present of **avere** or **essere** plus the past participle: *parlare* → **parlato**, *vendere* → **venduto**, *dormire* → **dormito**.',
            'Most verbs take **avere**: *ho visitato*, *il cane ha scovato*.',
            'Verbs of moving and changing (*andare, venire, arrivare, partire, tornare, cadere, scappare, nascere, morire, restare*) and every **reflexive** verb take **essere**: *è tornato*, *mi sono accorto*.',
            'With essere the participle agrees with the subject like an adjective: *è tornato*, *è arrivata*, *sono partiti*.',
          ],
          tables: [
            {
              columns: ['', 'with avere', 'with essere'],
              rows: [
                ['io', 'ho parlato', 'sono andato/a'],
                ['tu', 'hai parlato', 'sei andato/a'],
                ['lui, lei', 'ha parlato', 'è andato/a'],
                ['noi', 'abbiamo parlato', 'siamo andati/e'],
                ['voi', 'avete parlato', 'siete andati/e'],
                ['loro', 'hanno parlato', 'sono andati/e'],
              ],
            },
          ],
          watch: 'Common irregular participles: fatto (fare), detto (dire), visto (vedere), preso (prendere), messo (mettere), scritto (scrivere).',
          why: 'Avere for most verbs; essere for moving, changing and reflexive verbs, with the participle agreeing.',
          tags: ['participle past'],
          items: [
            { s: '[Ho] visitato i miei zii.', en: 'I visited my uncle and aunt.', wrong: ['Sono', 'Hai', 'Abbiamo'], cue: 'io' },
            { s: 'Il cane [ha] scovato la lepre.', en: 'The dog flushed out the hare.', wrong: ['è', 'hanno', 'sono'], cue: 'lui' },
            { s: '[Ho] ucciso la zanzara.', en: 'I killed the mosquito.', wrong: ['Sono', 'Hai', 'È'], cue: 'io' },
            { s: '[Ho] cucinato un\'intera confezione di spaghetti.', en: 'I cooked an entire package of spaghetti.', wrong: ['Sono', 'Hanno', 'È'], cue: 'io' },
            { s: 'Il gatto [è] scappato ancora.', en: 'The cat has fled again.', wrong: ['ha', 'sono', 'hanno'], cue: 'lui' },
            { s: 'La madre ha abbracciato il figlio quando [è] tornato dalla guerra.', en: 'The mother hugged her son when he came back from the war.', wrong: ['ha', 'hanno', 'avevo'], cue: 'lui' },
            { s: 'Mi [sono] abbronzata sulla spiaggia.', en: 'I tanned myself on the beach.', wrong: ['ho', 'ha', 'è'], cue: 'io' },
            { s: 'Me ne [sono] accorto.', en: 'I noticed.', wrong: ['ho', 'ha', 'hai'], cue: 'io' },
          ],
          related: ['essere-avere', 'imperfetto'],
        },
        {
          id: 'imperfetto',
          title: 'The imperfetto: what was going on',
          level: 'A2',
          summary: 'For how things were, what was happening and what used to happen.',
          rule: [
            'The imperfetto describes the past as a scene: what things were like, what was going on, what used to happen. *Il passaggio era libero*, "the passage was clear".',
            'Its endings are the same for all three groups: **-vo, -vi, -va, -vamo, -vate, -vano** after the vowel of the infinitive: *parlavo*, *avevo*, *dormivo*.',
            '**Essere** is irregular: **ero, eri, era, eravamo, eravate, erano**. *Stare* + gerund says what was in progress: *stava scavando*.',
          ],
          tables: [
            {
              columns: ['', 'parlare', 'avere', 'essere'],
              rows: [
                ['io', 'parlavo', 'avevo', 'ero'],
                ['tu', 'parlavi', 'avevi', 'eri'],
                ['lui, lei', 'parlava', 'aveva', 'era'],
                ['noi', 'parlavamo', 'avevamo', 'eravamo'],
                ['voi', 'parlavate', 'avevate', 'eravate'],
                ['loro', 'parlavano', 'avevano', 'erano'],
              ],
            },
          ],
          compare: {
            title: 'Imperfetto or passato prossimo',
            sides: [
              { label: 'Imperfetto: the scene', points: ['how things were', 'what was going on', 'habits'], example: { s: 'Il cane stava scavando una buca.', en: 'The dog was digging a hole.' } },
              { label: 'Passato prossimo: what happened', points: ['a finished event', 'something that happened once'], example: { s: 'Il cane ha scovato la lepre.', en: 'The dog flushed out the hare.' } },
            ],
          },
          why: 'The imperfetto sets the scene: -vo, -vi, -va, -vamo, -vate, -vano; essere: ero, eri, era…',
          tags: ['imperfect indicative'],
          items: [
            { s: 'Il passaggio [era] libero.', en: 'The passage was clear.', wrong: ['erano', 'eri', 'essere'], base: 'essere', cue: 'lui' },
            { s: '[Erano] al posto giusto al momento giusto.', en: 'They were in the right place at the right time.', wrong: ['Era', 'Eravamo', 'Eri'], base: 'essere', cue: 'loro' },
            { s: 'La musica da camera [era] assai allegra.', en: 'The chamber music was very cheerful.', wrong: ['erano', 'eri', 'eravamo'], base: 'essere', cue: 'lei' },
            { s: 'La ragazza [aveva] una lunga sciarpa al collo.', en: 'The girl had a long scarf around her neck.', wrong: ['avevano', 'avevi', 'avere'], base: 'avere', cue: 'lei' },
            { s: 'Il gatto si [nascondeva] tra i cespugli.', en: 'The cat lay hidden in the bushes.', wrong: ['nascondevano', 'nascondevi', 'nascondere'], base: 'nascondere', cue: 'lui' },
            { s: 'Questa casa [apparteneva] al mio defunto nonno.', en: 'This house used to belong to my dead grandfather.', wrong: ['appartenevano', 'appartenevo', 'appartenere'], base: 'appartenere', cue: 'lei' },
            { s: 'Il cane [stava] scavando una buca.', en: 'The dog was digging a hole.', wrong: ['stavano', 'stavo', 'stare'], base: 'stare', cue: 'lui' },
            { s: 'Nessuno [sapeva] esattamente cosa fosse accaduto.', en: 'No one knew exactly what had happened.', wrong: ['sapevano', 'sapevo', 'sapere'], base: 'sapere', cue: 'lui' },
          ],
          related: ['passato-prossimo'],
        },
      ],
    },
    {
      title: 'Going further',
      topics: [
        {
          id: 'object-pronouns',
          title: 'Object pronouns: lo, la, gli, le',
          level: 'A2',
          summary: '"It", "him", "her" and "them" go before the verb.',
          rule: [
            'Direct object pronouns stand for the thing or person the verb acts on: **mi, ti, lo, la, ci, vi, li, le**. They go **before** the verb: *Dio lo conservi*, "God save him".',
            'Indirect ones mean "to someone": **mi, ti, gli** (to him), **le** (to her, and polite *Le*), **ci, vi, gli** (to them). *Le ho detto* is "I told her".',
            'Before *avere*, **lo** and **la** shorten to **l\'**, and in the passato prossimo the participle agrees with **lo, la, li, le**: *le ho viste*, "I saw them" (women or feminine things).',
          ],
          tables: [
            {
              columns: ['', 'direct', 'indirect'],
              rows: [
                ['me', 'mi', 'mi'],
                ['you', 'ti', 'ti'],
                ['him, it', 'lo', 'gli'],
                ['her, it', 'la', 'le'],
                ['us', 'ci', 'ci'],
                ['you (all)', 'vi', 'vi'],
                ['them', 'li · le', 'gli'],
              ],
            },
          ],
          watch: 'Le is both "them" (feminine, direct) and "to her" (indirect): le ho viste, le ho detto.',
          why: 'Direct: lo, la, li, le; indirect: gli (to him, to them), le (to her). They go before the verb.',
          tags: [],
          items: [
            { s: 'Dio [lo] conservi.', en: 'God save him.', wrong: ['la', 'gli', 'li'] },
            { s: 'Alcuni addirittura [lo] accusarono di tradimento.', en: 'Some even accused him of treason.', wrong: ['gli', 'la', 'li'] },
            { s: "L'uomo [lo] derubò di tutti i suoi soldi.", en: 'The man robbed him of all his money.', wrong: ['gli', 'le', 'li'] },
            { s: '[Le] ho viste.', en: 'I saw them.', wrong: ['Li', 'La', 'Gli'] },
            { s: '[Le] ho detto che la amo.', en: 'I told her that I love her.', wrong: ['La', 'Gli', 'Lo'] },
            { s: 'Non [le] torcerebbe un capello.', en: "He wouldn't harm a hair on her head.", wrong: ['la', 'lo', 'li'] },          ],
          related: ['piacere'],
        },
        {
          id: 'future',
          title: 'The future: partirò, sarà',
          level: 'A2',
          summary: 'Plans and predictions, with one set of endings for every verb.',
          rule: [
            'Take the infinitive, drop the final **-e**, and add **-ò, -ai, -à, -emo, -ete, -anno**: *partire* → **partirò**. Verbs in **-are** change the *a* to **e**: *organizzare* → **organizzerò**.',
            'Common irregular stems: **sarò** (essere), **avrò** (avere), **verrò** (venire), **andrò**, **farò**, **potrò**, **vorrò**.',
            'The present is often used for the near future, *parto domani*; the future is for plans, promises and predictions.',
          ],
          tables: [
            {
              columns: ['', 'parlare', 'partire', 'essere'],
              rows: [
                ['io', 'parlerò', 'partirò', 'sarò'],
                ['tu', 'parlerai', 'partirai', 'sarai'],
                ['lui, lei', 'parlerà', 'partirà', 'sarà'],
                ['noi', 'parleremo', 'partiremo', 'saremo'],
                ['voi', 'parlerete', 'partirete', 'sarete'],
                ['loro', 'parleranno', 'partiranno', 'saranno'],
              ],
            },
          ],
          why: 'Future endings: -ò, -ai, -à, -emo, -ete, -anno, on the infinitive (-are → -er-).',
          tags: ['future indicative'],
          items: [
            { s: '[Partirò] in primavera.', en: 'I will be leaving in spring.', wrong: ['Partirai', 'Partiranno', 'Partire'], base: 'partire', cue: 'io' },
            { s: '[Partiremo] stanotte alle 2.', en: 'We are leaving tonight at 2 am.', wrong: ['Partirò', 'Partiranno', 'Partirete'], base: 'partire', cue: 'noi' },
            { s: '[Organizzerò] un convegno con loro.', en: "I'll arrange a meeting with them.", wrong: ['Organizzarò', 'Organizzeranno', 'Organizzerà'], base: 'organizzare', cue: 'io' },
            { s: 'Nessuno si [accorgerà] dell\'errore.', en: 'Nobody will notice the error.', wrong: ['accorgeranno', 'accorgerò', 'accorgerai'], base: 'accorgersi', cue: 'lui' },
            { s: 'Questo tour [sarà] strepitoso!', en: 'This tour is going to be amazing!', wrong: ['saranno', 'sarò', 'esserà'], base: 'essere', cue: 'lui' },
            { s: 'Le sue buone azioni non [saranno] mai dimenticate.', en: 'His good deeds will never be forgotten.', wrong: ['sarà', 'saremo', 'sarai'], base: 'essere', cue: 'loro' },
            { s: 'Domani qualcuno [verrà] ad aggiustare il lavandino.', en: 'Someone is coming tomorrow to fix the sink.', wrong: ['verranno', 'verrò', 'venirà'], base: 'venire', cue: 'lui' },
            { s: 'Un europeo su cinque [avrà] più di 65 anni entro il 2025.', en: 'One in five Europeans will be more than 65 years old by year 2025.', wrong: ['avranno', 'avrò', 'averà'], base: 'avere', cue: 'lui' },
          ],
          related: ['present'],
        },
      ],
    },
  ],
};

export default grammar;
