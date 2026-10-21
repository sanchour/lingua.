import type { Grammar } from '../types';

// Portuguese (tier 2: a short map of the first topics). Sentences: the Portuguese pack's
// Wiktionary examples, which mix Brazilian and European Portuguese. Rules checked against
// Wikipedia's "Portuguese grammar" (articles, contractions, ser and estar) and "Portuguese verb
// conjugation" (present, preterite, imperfect, ir + infinitive).

const grammar: Grammar = {
  lang: 'pt',
  sources: [
    { name: 'Wikipedia: Portuguese grammar', url: 'https://en.wikipedia.org/wiki/Portuguese_grammar' },
    { name: 'Wikipedia: Portuguese verb conjugation', url: 'https://en.wikipedia.org/wiki/Portuguese_verb_conjugation' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: object pronouns (their place differs between Brazil and Portugal, and the pack mixes both), the subjunctive, the personal infinitive and the synthetic future.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'articles',
          title: 'Gender and articles',
          level: 'A1',
          summary: 'Every noun is masculine or feminine: o and os, a and as.',
          rule: [
            'Portuguese nouns are **masculine** or **feminine**. Most in **-o** are masculine and most in **-a** feminine; learn the others with their article: *o leite*, *a árvore*.',
            '"The" is **o** and **os** for masculine nouns, **a** and **as** for feminine ones. "A" is **um** or **uma**.',
            'Portuguese uses "the" where English doesn\'t, for things in general: *as árvores melhoram a qualidade do ar*, "trees improve air quality".',
          ],
          tables: [
            {
              columns: ['', 'masculine', 'feminine'],
              rows: [
                ['the (singular)', 'o', 'a'],
                ['the (plural)', 'os', 'as'],
                ['a, an', 'um', 'uma'],
                ['some', 'uns', 'umas'],
              ],
            },
          ],
          why: 'O and os go with masculine nouns, a and as with feminine ones.',
          tags: [],
          items: [
            { s: '[O] livro está na mesa.', en: 'The book is on the table.', wrong: ['A', 'Os', 'As'] },
            { s: '[A] vida é bela!', en: 'Life is beautiful!', wrong: ['O', 'Os', 'As'] },
            { s: '[Os] alunos estão indo para a escola.', en: 'The students are going to school.', wrong: ['O', 'A', 'As'] },
            { s: '[As] praias estão cheias de óleo bruto.', en: 'The beaches are full of crude oil.', wrong: ['Os', 'A', 'O'] },
            { s: '[A] mãe cuida das crianças.', en: 'The mother tends the children.', wrong: ['O', 'Os', 'As'] },
            { s: '[O] céu é azul.', en: 'The sky is blue.', wrong: ['A', 'Os', 'As'] },
            { s: '[As] árvores melhoram a qualidade do ar.', en: 'Trees improve air quality.', wrong: ['Os', 'A', 'O'] },
            { s: '[Os] ladrões limparam a casa.', en: 'The thieves cleaned out the house.', wrong: ['As', 'O', 'A'] },
          ],
          related: ['contractions'],
        },
        {
          id: 'ser-estar',
          title: 'Ser and estar: two kinds of "to be"',
          level: 'A1',
          summary: 'Ser for what something is; estar for where it is and how it is now.',
          rule: [
            '**Ser** says what or who something is, and what it is like by nature: *O leão é o rei da selva*. Forms: **sou, és, é, somos, são**.',
            '**Estar** says where something is and how it is at the moment: *O livro está na mesa*, *O jantar está pronto*. Forms: **estou, estás, está, estamos, estão**.',
            '*Você* and *vocês* ("you") take the third person: *você é*, *vocês são*. Estar also makes the "-ing" form: *está bebendo* in Brazil, *está a beber* in Portugal.',
          ],
          tables: [
            {
              columns: ['', 'ser', 'estar'],
              rows: [
                ['eu', 'sou', 'estou'],
                ['tu', 'és', 'estás'],
                ['ele, ela, você', 'é', 'está'],
                ['nós', 'somos', 'estamos'],
                ['eles, elas, vocês', 'são', 'estão'],
              ],
            },
          ],
          compare: {
            title: 'Ser or estar',
            sides: [
              { label: 'Ser: what it is', points: ['identity, a noun after it', 'what it is like by nature'], example: { s: 'O leão é o rei da selva.', en: 'The lion is the king of the jungle.' } },
              { label: 'Estar: where and how now', points: ['place', 'a state that can change'], example: { s: 'O jantar está pronto.', en: 'Dinner is ready.' } },
            ],
          },
          why: 'Ser for what something is; estar for where it is and how it is right now.',
          tags: [],
          items: [
            { s: 'Eu [sou] corredor.', en: "I'm a runner.", wrong: ['estou', 'é', 'somos'], base: 'ser', cue: 'eu' },
            { s: 'João [é] uma pessoa séria.', en: 'João is a serious person.', wrong: ['está', 'são', 'sou'], base: 'ser', cue: 'ele' },
            { s: 'João e Maria [são] meus amigos.', en: 'John and Mary are my friends.', wrong: ['estão', 'é', 'somos'], base: 'ser', cue: 'eles' },
            { s: 'Eles [são] cegos.', en: 'They are blind.', wrong: ['estão', 'é', 'sou'], base: 'ser', cue: 'eles' },
            { s: 'Nós [estamos] aqui.', en: 'We are here.', wrong: ['somos', 'estão', 'está'], base: 'estar', cue: 'nós' },
            { s: 'Onde [estão] as chaves?', en: 'Where are the keys?', wrong: ['são', 'está', 'estamos'], base: 'estar', cue: 'elas' },
            { s: 'O livro [está] na mesa.', en: 'The book is on the table.', wrong: ['é', 'estão', 'estou'], base: 'estar', cue: 'ele' },
            { s: 'Ele [está] bebendo água.', en: 'He is drinking water.', wrong: ['é', 'estão', 'estou'], base: 'estar', cue: 'ele' },
          ],
          related: ['present'],
        },
        {
          id: 'present',
          title: 'The present tense',
          level: 'A1',
          summary: 'Verbs in -ar, -er and -ir: one stem, an ending for each person.',
          rule: [
            'Drop **-ar**, **-er** or **-ir** and add the ending: *morar* → **moro, moras, mora, moramos, moram**.',
            '-er and -ir verbs share their endings except for *nós*: *comemos*, *partimos*.',
            '*Você* takes the same form as *ele* and *ela*, and *vocês* the same as *eles*. The ending shows the person, so *eu* is often left out.',
          ],
          tables: [
            {
              columns: ['', 'morar', 'comer', 'partir'],
              rows: [
                ['eu', 'moro', 'como', 'parto'],
                ['tu', 'moras', 'comes', 'partes'],
                ['ele, ela, você', 'mora', 'come', 'parte'],
                ['nós', 'moramos', 'comemos', 'partimos'],
                ['eles, elas, vocês', 'moram', 'comem', 'partem'],
              ],
            },
          ],
          why: 'Present endings: -ar → o, as, a, amos, am; -er → o, es, e, emos, em; -ir → o, es, e, imos, em.',
          tags: ['present indicative'],
          items: [
            { s: 'Eu sempre [como] carne no almoço.', en: 'I always eat meat at lunch.', wrong: ['come', 'comes', 'comem'], base: 'comer', cue: 'eu' },
            { s: 'Eu [moro] na rua da Igreja.', en: 'I live on Church Street.', wrong: ['mora', 'moram', 'moras'], base: 'morar', cue: 'eu' },
            { s: 'A mãe [cuida] das crianças.', en: 'The mother tends the children.', wrong: ['cuido', 'cuidam', 'cuidas'], base: 'cuidar', cue: 'ela' },
            { s: 'Eles [brincam] de esconde-esconde.', en: 'They play hide-and-seek.', wrong: ['brinca', 'brinco', 'brincamos'], base: 'brincar', cue: 'eles' },
            { s: 'As árvores [melhoram] a qualidade do ar.', en: 'Trees improve air quality.', wrong: ['melhora', 'melhoro', 'melhoramos'], base: 'melhorar', cue: 'elas' },
            { s: 'Aquele pássaro [voa] tão rápido.', en: 'That bird flies so fast.', wrong: ['voo', 'voam', 'voas'], base: 'voar', cue: 'ele' },
            { s: 'O evento [termina] às três e meia.', en: 'The event ends at half past three.', wrong: ['termino', 'terminam', 'terminas'], base: 'terminar', cue: 'ele' },
            { s: 'O céu nublado [promete] chuva.', en: 'The cloudy sky promises rain', wrong: ['prometo', 'prometem', 'prometes'], base: 'prometer', cue: 'ele' },
          ],
          related: ['ser-estar', 'preterite'],
        },
        {
          id: 'contractions',
          title: 'Contractions: no, na, do, ao, à',
          level: 'A1',
          summary: 'em, de and a merge with "the" into one word.',
          rule: [
            'The prepositions **em** (in, on), **de** (of, from) and **a** (to) join a following article: *em + o* = **no**, *em + a* = **na**, *de + o* = **do**, *de + a* = **da**, *a + o* = **ao**.',
            '**a + a** becomes **à**, with a grave accent (the *crase*): *Acordei às sete*, "I woke up at seven".',
            'They take the plural too (**nos, nas, dos, das, aos, às**), and **por + o** becomes **pelo**.',
          ],
          tables: [
            {
              columns: ['', 'o', 'a', 'os', 'as'],
              rows: [
                ['em', 'no', 'na', 'nos', 'nas'],
                ['de', 'do', 'da', 'dos', 'das'],
                ['a', 'ao', 'à', 'aos', 'às'],
                ['por', 'pelo', 'pela', 'pelos', 'pelas'],
              ],
            },
          ],
          watch: '"Em o" and "de a" are never written before a noun; the joined form is the only one.',
          why: 'em, de, a and por join the article: na mesa, do gato, ao banco, às sete.',
          tags: [],
          items: [
            { s: 'O livro está [na] mesa.', en: 'The book is on the table.', wrong: ['em a', 'no', 'nas'] },
            { s: 'Fiquei esperando [no] carro.', en: 'I waited in the car.', wrong: ['em o', 'na', 'nos'] },
            { s: 'Saí [da] piscina.', en: 'I got out of the swimming pool.', wrong: ['de a', 'do', 'das'] },
            { s: 'Preciso cortar o pelo [do] meu gato.', en: 'I need to cut my cat’s hair.', wrong: ['de o', 'da', 'dos'] },
            { s: 'Fui [ao] banco tomar meu dinheiro.', en: 'I went to the bank to get my money.', wrong: ['a o', 'à', 'aos'] },
            { s: 'Acordei [às] sete da manhã.', en: 'I woke up at seven in the morning.', wrong: ['as', 'aos', 'ao'] },
            { s: 'Esqueci-me [das] chaves!', en: 'I forgot the keys!', wrong: ['de as', 'dos', 'da'] },
            { s: 'Os terroristas fugiram [da] cadeia.', en: 'The terrorists ran away from jail.', wrong: ['de a', 'do', 'dos'] },
          ],
          related: ['articles'],
        },
      ],
    },
    {
      title: 'Past and future',
      topics: [
        {
          id: 'preterite',
          title: 'The preterite: what happened',
          level: 'A2',
          summary: 'The past of finished events: falei, comeu, partiram.',
          rule: [
            'The **pretérito perfeito** tells what happened and is over: *Nosso time perdeu*, "our team lost".',
            'Endings for -ar: **-ei, -aste, -ou, -amos, -aram**; for -er: **-i, -este, -eu, -emos, -eram**; for -ir: **-i, -iste, -iu, -imos, -iram**.',
            'It also covers "have done" in English: *Nunca vi esse filme*, "I have never seen this film".',
          ],
          tables: [
            {
              columns: ['', 'falar', 'beber', 'partir'],
              rows: [
                ['eu', 'falei', 'bebi', 'parti'],
                ['tu', 'falaste', 'bebeste', 'partiste'],
                ['ele, ela, você', 'falou', 'bebeu', 'partiu'],
                ['nós', 'falamos', 'bebemos', 'partimos'],
                ['eles, elas, vocês', 'falaram', 'beberam', 'partiram'],
              ],
              note: 'In Portugal the nós form of -ar verbs is written falámos, to tell it from the present.',
            },
          ],
          why: 'Preterite endings: -ar → ei, ou, aram; -er → i, eu, eram; -ir → i, iu, iram.',
          tags: ['preterite indicative'],
          items: [
            { s: 'Os pássaros [voaram] até nós.', en: 'The birds flew towards us.', wrong: ['voou', 'voei', 'voamos'], base: 'voar', cue: 'eles' },
            { s: 'Nosso time [perdeu].', en: 'Our team lost.', wrong: ['perdi', 'perderam', 'perdemos'], base: 'perder', cue: 'ele' },
            { s: '[Dormimos] o dia inteiro.', en: 'We slept the whole day.', wrong: ['Dormi', 'Dormiram', 'Dormiu'], base: 'dormir', cue: 'nós' },
            { s: 'Os cruzados [tomaram] Jerusalém.', en: 'The crusaders took Jerusalem.', wrong: ['tomou', 'tomei', 'tomamos'], base: 'tomar', cue: 'eles' },
            { s: 'Quanto leite você [bebeu]?', en: 'How much milk did you drink?', wrong: ['bebi', 'beberam', 'bebeste'], base: 'beber', cue: 'você' },
            { s: 'Ele [escreveu] à caneta.', en: 'He wrote in pen.', wrong: ['escrevi', 'escreveram', 'escrevemos'], base: 'escrever', cue: 'ele' },
            { s: 'O homem forte [levantou] o carro.', en: 'The strong man lifted the car.', wrong: ['levantei', 'levantaram', 'levantamos'], base: 'levantar', cue: 'ele' },
            { s: 'Eu não [encontrei] nenhum.', en: "I didn't find any.", wrong: ['encontrou', 'encontraram', 'encontramos'], base: 'encontrar', cue: 'eu' },
          ],
          related: ['imperfect'],
        },
        {
          id: 'imperfect',
          title: 'The imperfect: how things were',
          level: 'A2',
          summary: 'For descriptions, what was going on and what used to happen.',
          rule: [
            'The **pretérito imperfeito** describes the past as a scene: *O tempo estava frio*, "the weather was cold".',
            'Endings for -ar: **-ava, -avas, -ava, -ávamos, -avam**; for -er and -ir: **-ia, -ias, -ia, -íamos, -iam**.',
            '**Ser** is irregular: **era, eras, era, éramos, eram**. *A gente* ("we", informal) takes the third-person singular: *a gente puxava*.',
          ],
          tables: [
            {
              columns: ['', 'estar', 'saber', 'ser'],
              rows: [
                ['eu', 'estava', 'sabia', 'era'],
                ['tu', 'estavas', 'sabias', 'eras'],
                ['ele, ela, você', 'estava', 'sabia', 'era'],
                ['nós', 'estávamos', 'sabíamos', 'éramos'],
                ['eles, elas, vocês', 'estavam', 'sabiam', 'eram'],
              ],
            },
          ],
          compare: {
            title: 'Imperfect or preterite',
            sides: [
              { label: 'Imperfect: the scene', points: ['how things were', 'what was going on', 'habits'], example: { s: 'O tempo estava frio.', en: 'The weather was cold (at that moment).' } },
              { label: 'Preterite: the event', points: ['something that happened', 'and is over'], example: { s: 'Nosso time perdeu.', en: 'Our team lost.' } },
            ],
          },
          why: 'The imperfect sets the scene: -ava, -ia; ser → era.',
          tags: ['imperfect indicative'],
          items: [
            { s: 'O tempo [estava] frio.', en: 'The weather was cold (at that moment).', wrong: ['estavam', 'estávamos', 'estavas'], base: 'estar', cue: 'ele' },
            { s: 'Nem eu [sabia] disso.', en: 'Not even I knew this.', wrong: ['sabiam', 'sabíamos', 'sabias'], base: 'saber', cue: 'eu' },
            { s: 'Um tal de John [estava] te procurando.', en: 'Some John guy was looking for you.', wrong: ['estavam', 'estávamos', 'estavas'], base: 'estar', cue: 'ele' },
            { s: 'Onde é que você [estava], hein?', en: 'Where were you?', wrong: ['estavam', 'estávamos', 'estavas'], base: 'estar', cue: 'você' },
            { s: 'A gente [puxava] briga com qualquer um.', en: 'We initiated fights with anyone.', wrong: ['puxavam', 'puxavas', 'puxei'], base: 'puxar', cue: 'a gente' },
            { s: 'O cabelo dela [era] louro.', en: 'Her hair colour was blonde.', wrong: ['eram', 'éramos', 'eras'], base: 'ser', cue: 'ele' },
          ],
          related: ['preterite'],
        },
        {
          id: 'ir-future',
          title: 'Going to: ir + infinitive',
          level: 'A1',
          summary: 'Vou ficar: the everyday way to talk about the future.',
          rule: [
            'The present of **ir** plus an infinitive says what is going to happen: *Eu vou contar um conto*, "I will tell a story".',
            'Ir is irregular: **vou, vais, vai, vamos, vão**. Only *ir* changes; the infinitive stays as it is.',
            'In speech this is the usual future; the one-word future (*contarei*) is mostly written.',
          ],
          tables: [
            {
              title: 'ir, present',
              rows: [
                ['eu', 'vou'],
                ['tu', 'vais'],
                ['ele, ela, você', 'vai'],
                ['nós', 'vamos'],
                ['eles, elas, vocês', 'vão'],
              ],
            },
          ],
          why: 'Future: vou, vais, vai, vamos, vão + infinitive.',
          tags: [],
          items: [
            { s: 'Eu [vou] ficar rico.', en: 'I’ll get rich.', wrong: ['vai', 'vamos', 'vão'], base: 'ir', cue: 'eu' },
            { s: 'Eu [vou] contar um conto.', en: 'I will tell a story.', wrong: ['vai', 'vais', 'vão'], base: 'ir', cue: 'eu' },
            { s: 'Só [vou] tirar uma soneca.', en: "I'm just going to take a nap.", wrong: ['vai', 'vamos', 'vão'], base: 'ir', cue: 'eu' },
            { s: 'O meu irmão mais velho [vai] casar-se.', en: 'My older brother is getting married.', wrong: ['vou', 'vão', 'vamos'], base: 'ir', cue: 'ele' },
            { s: 'Hoje o dia [vai] ser punk.', en: 'Today is going to be complicated.', wrong: ['vou', 'vão', 'vamos'], base: 'ir', cue: 'ele' },
          ],
          related: ['present'],
        },
      ],
    },
  ],
};

export default grammar;
