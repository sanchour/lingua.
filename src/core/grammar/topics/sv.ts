import type { Grammar } from '../types';

// Swedish (tier 2: a short map of the first topics). Sentences: the Swedish pack's Wiktionary
// examples. Rules checked against Wikipedia's "Swedish grammar" (en and ett, the definite
// suffix, the present, the four verb groups, the supine and verb-second word order).

const grammar: Grammar = {
  lang: 'sv',
  sources: [{ name: 'Wikipedia: Swedish grammar', url: 'https://en.wikipedia.org/wiki/Swedish_grammar' }],
  notes:
    'Tier 2, kept short. Left out for now: adjective agreement (stor, stort, stora), the plural groups, the s-passive, and word order with inte in subordinate clauses.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'en-ett',
          title: 'En or ett',
          level: 'A1',
          summary: 'Two genders: en-words and ett-words.',
          rule: [
            'Swedish nouns are **en-words** (common gender, about three in four nouns) or **ett-words** (neuter). "A" is **en** or **ett**: *en bok*, *ett hus*.',
            'The shape of the noun rarely tells you which, so learn each with its article. The gender also decides the definite ending and the adjective: *ett stort hus*.',
          ],
          tables: [
            {
              columns: ['', 'en-words', 'ett-words'],
              rows: [
                ['a', 'en bok', 'ett hus'],
                ['the', 'boken', 'huset'],
                ['a big …', 'en stor bok', 'ett stort hus'],
              ],
            },
          ],
          why: 'En for common-gender nouns, ett for neuter ones; learn each noun with its article.',
          tags: [],
          items: [
            { s: 'Jag läser [en] bok.', en: "I'm reading a book.", wrong: ['ett', 'den', 'det'] },
            { s: 'Jag ser [ett] hus. Det är stort.', en: 'I see a house. It is big.', wrong: ['en', 'den', 'det'] },
            { s: 'Jag gör [en] paj.', en: "I'm making a pie.", wrong: ['ett', 'den', 'det'] },
            { s: 'Kan jag få [ett] glas vatten?', en: 'Can I have a glass of water?', wrong: ['en', 'den', 'det'] },
            { s: 'Jag vill ha [en] egen hund.', en: 'I want a dog of my own.', wrong: ['ett', 'den', 'det'] },
            { s: 'Har du skaffat [ett] jobb än?', en: 'Have you gotten a job yet?', wrong: ['en', 'den', 'det'] },
            { s: 'Cykeln saknar [ett] hjul.', en: 'The bicycle lacks a wheel.', wrong: ['en', 'den', 'det'] },
            { s: 'Hon åt soppa med [en] sked.', en: 'She ate soup with a spoon.', wrong: ['ett', 'den', 'det'] },
          ],
          related: ['definite'],
        },
        {
          id: 'definite',
          title: '"The" at the end: boken, huset',
          level: 'A1',
          summary: 'Swedish puts "the" on the end of the noun.',
          rule: [
            'The definite form adds an ending: **-en** for en-words and **-et** for ett-words: *en bok* → **boken**, *ett brev* → **brevet**.',
            'After a vowel only **-n** or **-t** is added: *en klocka* → **klockan**, *en sjö* → **sjön**, *ett äpple* → **äpplet**.',
            'Some en-words ending in unstressed -el, -er or -en drop the *e*: *en cykel* → **cykeln**.',
          ],
          tables: [
            {
              columns: ['', 'en-word', 'ett-word'],
              rows: [
                ['indefinite', 'en buss · en klocka', 'ett brev · ett äpple'],
                ['definite', 'bussen · klockan', 'brevet · äpplet'],
              ],
            },
          ],
          watch: 'With an adjective, Swedish uses both den/det in front and the ending: den stora boken.',
          why: 'En-words take -en (-n after a vowel), ett-words -et (-t after a vowel).',
          tags: [],
          items: [
            { s: '[Boken] ligger på bordet.', en: 'The book lies on the table.', wrong: ['Boket', 'Bok', 'Den bok'] },
            { s: '[Cykeln] saknar ett hjul.', en: 'The bicycle lacks a wheel.', wrong: ['Cykelet', 'Cykel', 'Cyklet'] },
            { s: '[Middagen] är klar!', en: "Dinner's ready!", wrong: ['Middaget', 'Middag', 'Den middag'] },
            { s: 'Jag skickade [brevet] igår.', en: 'I sent the letter yesterday.', wrong: ['brevn', 'brev', 'den brev'] },
            { s: 'Vi simmade i [sjön].', en: 'We swam in the lake.', wrong: ['sjöet', 'sjö', 'sjöen'] },
            { s: 'Vi väntar på [bussen].', en: "We're waiting for the bus.", wrong: ['busset', 'buss', 'bussn'] },
            { s: '[Klockan] har just slagit tre.', en: 'The clock has just struck three.', wrong: ['Klocka', 'Klockat', 'Klockaen'] },
            { s: '[Scenen] är din!', en: 'The stage [common gender] is yours!', wrong: ['Scenet', 'Scen', 'Den scen'] },
          ],
          related: ['en-ett'],
        },
        {
          id: 'present',
          title: 'The present tense: one form for everyone',
          level: 'A1',
          summary: 'Jag läser, du läser, de läser: the verb never changes for the person.',
          rule: [
            'Swedish verbs have **one present form for every person**: *jag väntar*, *hon väntar*, *vi väntar*.',
            'It ends in **-r**: verbs whose infinitive ends in -a add **-r** (*vänta* → **väntar**); most others swap -a for **-er** (*läsa* → **läser**, *behöva* → **behöver**). Short verbs add -r: *se* → **ser**, *bo* → **bor**.',
            'The present also covers "is doing" and the near future: *Jag kommer runt tre*, "I\'ll come around three".',
          ],
          tables: [
            {
              columns: ['infinitive', 'present'],
              rows: [
                ['vänta', 'väntar'],
                ['läsa', 'läser'],
                ['behöva', 'behöver'],
                ['se', 'ser'],
              ],
            },
          ],
          why: 'One present form for all persons, ending in -ar, -er or -r.',
          tags: ['indicative present'],
          items: [
            { s: 'Jag [läser] en bok.', en: "I'm reading a book.", wrong: ['läsa', 'läsar', 'läst'], base: 'läsa' },
            { s: 'Vi [väntar] på bussen.', en: "We're waiting for the bus.", wrong: ['vänta', 'väntat', 'vänter'], base: 'vänta' },
            { s: 'Han [behöver] mycket pengar.', en: 'He needs a lot of money.', wrong: ['behöva', 'behövar', 'behövt'], base: 'behöva' },
            { s: 'Jag [gillar] hundar och katter.', en: 'I like dogs and cats.', wrong: ['gilla', 'giller', 'gillat'], base: 'gilla' },
            { s: 'Du [använder] Wiktionary.', en: "You're using Wiktionary.", wrong: ['använda', 'användar', 'använt'], base: 'använda' },
            { s: 'Jag [saknar] dig.', en: 'I miss you.', wrong: ['sakna', 'sakner', 'saknat'], base: 'sakna' },
            { s: 'Jag [kommer] runt tre.', en: "I'll come around three o'clock.", wrong: ['komma', 'kommar', 'kommit'], base: 'komma' },
          ],
          related: ['past'],
        },
        {
          id: 'word-order',
          title: 'The verb comes second',
          level: 'A1',
          summary: 'Start with "now" or "that", and the subject moves behind the verb.',
          rule: [
            'In a main clause the verb is always the **second** element. If the sentence starts with something other than the subject (a time, a place, *det*), the **subject moves behind the verb**: *Nu **har vi** lite tid*.',
            'The infinitive or the supine stays at the end: *Nu ska jag hara iväg*.',
          ],
          watch: '"Nu vi har" follows English order and is wrong.',
          why: 'The verb is always second; if something else comes first, the subject goes after the verb.',
          tags: [],
          items: [
            { s: 'Nu [har vi] lite tid att döda.', en: "Now we've got some time to kill.", wrong: ['vi har', 'har oss', 'oss har'] },
            { s: 'Nu [är det] dags.', en: 'Now is the time.', wrong: ['det är', 'den är', 'är den'] },
            { s: 'Nu [får ni] sluta föra oväsen!', en: "Now you'll have to stop making noise!", wrong: ['ni får', 'får er', 'er får'] },
            { s: 'Nu [ska jag] hara iväg till affären.', en: "I'll trot to the store now.", wrong: ['jag ska', 'ska mig', 'mig ska'] },
            { s: 'Det [har vi] nog.', en: 'We probably do (have that).', wrong: ['vi har', 'har oss', 'oss har'] },
          ],
          related: ['present'],
        },
      ],
    },
    {
      title: 'The past',
      topics: [
        {
          id: 'past',
          title: 'The past tense: -ade, -de, -te',
          level: 'A2',
          summary: 'Four groups of verbs, each with its own past ending.',
          rule: [
            'Verbs fall into four groups. **Group 1** (present -ar) adds **-ade**: *prata* → **pratade**, *vakna* → **vaknade**.',
            '**Group 2** (present -er) adds **-de**, or **-te** after a voiceless consonant (k, p, s, t, x): *glömma* → **glömde**, *nämna* → **nämnde**, *köpa* → **köpte**.',
            '**Group 3** (short verbs) adds **-dde**: *bo* → **bodde**. **Group 4**, the strong verbs, change their vowel: *se* → **såg**, *komma* → **kom**, *finna* → **fann**.',
            'Like the present, the past has one form for every person.',
          ],
          tables: [
            {
              columns: ['group', 'infinitive', 'past'],
              rows: [
                ['1', 'prata', 'pratade'],
                ['2', 'glömma · köpa', 'glömde · köpte'],
                ['3', 'bo', 'bodde'],
                ['4', 'se · komma', 'såg · kom'],
              ],
            },
          ],
          why: 'Group 1 -ade; group 2 -de or -te after k, p, s, t, x; group 3 -dde; strong verbs change their vowel.',
          tags: ['indicative past'],
          items: [
            { s: 'Jag [köpte] det för 1000 kronor.', en: 'I bought it for 1000 kronor.', wrong: ['köpade', 'köpt', 'köpde'], base: 'köpa' },
            { s: 'Jag [glömde] att köpa mjölk.', en: 'I forgot to buy milk.', wrong: ['glömmade', 'glömt', 'glömte'], base: 'glömma' },
            { s: 'Jag [skickade] brevet igår.', en: 'I sent the letter yesterday.', wrong: ['skickde', 'skickat', 'skickte'], base: 'skicka' },
            { s: 'Vi [simmade] i sjön.', en: 'We swam in the lake.', wrong: ['simde', 'simmat', 'simte'], base: 'simma' },
            { s: 'Hon [nämnde] att du var sjuk.', en: 'She mentioned that you were ill.', wrong: ['nämnade', 'nämnt', 'nämnte'], base: 'nämna' },
            { s: 'Han [vaknade] med ett pang.', en: 'He woke up with a bang.', wrong: ['vaknde', 'vaknat', 'vaknte'], base: 'vakna' },
            { s: 'Hon [korsade] armarna.', en: 'She crossed her arms.', wrong: ['korsde', 'korsat', 'korste'], base: 'korsa' },
          ],
          related: ['present', 'perfect'],
        },
        {
          id: 'perfect',
          title: 'The perfect: har + supine',
          level: 'A2',
          summary: 'Jag har sett, vi har pratat: have done, with a form of its own.',
          rule: [
            'The perfect is **har** plus the **supine**, a form used only after *har* and *hade*: *Vi har pratat om dig*.',
            'The supine ends in **-at** for group 1 (*pratat*), **-t** for group 2 (*glömt*, *köpt*), **-tt** for group 3 (*bott*) and **-it** for strong verbs (*funnit*, *slagit*, *tagit*). *Se* has **sett**.',
            'Don\'t confuse the supine with the participle used as an adjective: *jag har funnit* but *en funnen väska*.',
          ],
          tables: [
            {
              columns: ['infinitive', 'past', 'supine'],
              rows: [
                ['prata', 'pratade', '(har) pratat'],
                ['köpa', 'köpte', '(har) köpt'],
                ['se', 'såg', '(har) sett'],
                ['finna', 'fann', '(har) funnit'],
              ],
            },
          ],
          why: 'Har + the supine: -at, -t, -tt, or -it for strong verbs.',
          tags: ['supine'],
          items: [
            { s: 'Vi har [pratat] om dig.', en: 'We have talked about you.', wrong: ['pratade', 'pratar', 'pratad'], base: 'prata' },
            { s: 'Jag har aldrig [sett] det förr.', en: "I've never seen that before.", wrong: ['såg', 'ser', 'sedd'], base: 'se' },
            { s: 'Du har [räddat] mitt liv!', en: 'You have saved my life!', wrong: ['räddade', 'räddar', 'räddad'], base: 'rädda' },
            { s: 'Har du [skaffat] ett jobb än?', en: 'Have you gotten a job yet?', wrong: ['skaffade', 'skaffar', 'skaffad'], base: 'skaffa' },
            { s: 'Titta! Jag har [funnit] en ledtråd!', en: 'Look! I have found a clue!', wrong: ['fann', 'finner', 'funnen'], base: 'finna' },
            { s: 'Jag har [dejtat] ett tag nu.', en: "I've been dating for a while now.", wrong: ['dejtade', 'dejtar', 'dejtad'], base: 'dejta' },
            { s: 'Klockan har just [slagit] tre.', en: 'The clock has just struck three.', wrong: ['slog', 'slår', 'slagen'], base: 'slå' },
            { s: 'Han hade [tagit] kakan.', en: 'He had taken the cake.', wrong: ['tog', 'tar', 'tagen'], base: 'ta' },
          ],
          related: ['past'],
        },
      ],
    },
  ],
};

export default grammar;
