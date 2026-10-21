import type { Grammar } from '../types';

// Latin (tier 2: a short map of the first topics). Sentences: the Latin pack's Wiktionary
// examples, many of them quotations; vowel length is marked in some and not in others, as in
// the pack. Rules checked against Wikipedia's "Latin conjugation" (sum and the present endings).

const grammar: Grammar = {
  lang: 'la',
  sources: [{ name: 'Wikipedia: Latin conjugation', url: 'https://en.wikipedia.org/wiki/Latin_conjugation' }],
  notes:
    'Tier 2, kept very short: the pack has few short sentences. Left out for now: the cases (declensions), the imperfect and perfect, the infinitive constructions and the subjunctive.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'esse',
          title: 'Sum, es, est: to be',
          level: 'A1',
          summary: 'The verb "to be", irregular as in most languages.',
          rule: [
            '**Esse** is "to be": **sum, es, est, sumus, estis, sunt**. The ending already shows the person, so *ego* (I) is usually left out: *Cīvis Rōmānus sum*.',
            'The verb often comes last in the sentence: *Cibus super mēnsam est*, "the food is on the table".',
            'Its past (imperfect) is **eram, erās, erat, erāmus, erātis, erant**.',
          ],
          tables: [
            {
              title: 'esse, present',
              rows: [
                ['ego', 'sum'],
                ['tū', 'es'],
                ['is, ea, id', 'est'],
                ['nōs', 'sumus'],
                ['vōs', 'estis'],
                ['eī, eae, ea', 'sunt'],
              ],
            },
          ],
          why: 'Sum, es, est, sumus, estis, sunt.',
          tags: [],
          items: [
            { s: 'Cīvis Rōmānus [sum].', en: 'I am a Roman citizen.', wrong: ['es', 'est', 'sunt'], base: 'esse', cue: 'ego' },
            { s: 'E Gallia oriundus [sum].', en: 'I am from Gaul', wrong: ['es', 'est', 'sumus'], base: 'esse', cue: 'ego' },
            { s: 'Duo et duo [sunt] quattuor.', en: 'Two plus two equals four.', wrong: ['est', 'sum', 'sumus'], base: 'esse', cue: 'eī' },
            { s: 'Cibus super mēnsam [est].', en: 'The food is on the table.', wrong: ['sunt', 'sum', 'es'], base: 'esse', cue: 'is' },
            { s: 'Domus mea prope lacum [est].', en: 'My house is near the lake.', wrong: ['sunt', 'sum', 'es'], base: 'esse', cue: 'ea' },
            { s: 'A et B litterae [sunt]. C quoque littera est.', en: 'A and B are letters. C is also a letter.', wrong: ['est', 'sum', 'estis'], base: 'esse', cue: 'eae' },
            { s: 'Ex omnibus rēbus, ācerrimī bellō Rōmānī [sunt].', en: 'Out of all peoples, Romans are the fiercest warriors.', wrong: ['est', 'sum', 'es'], base: 'esse', cue: 'eī' },
            { s: 'Num Sparta īnsula [est]? — Nōn est īnsula.', en: "Sparta is not an island, is it? — It's not an island.", wrong: ['sunt', 'sum', 'es'], base: 'esse', cue: 'ea' },
          ],
          related: ['present'],
        },
        {
          id: 'present',
          title: 'The present tense',
          level: 'A1',
          summary: 'One set of endings: -ō, -s, -t, -mus, -tis, -nt.',
          rule: [
            'Latin verbs add the person to the stem: **-ō** (I), **-s** (you), **-t** (he, she, it), **-mus** (we), **-tis** (you all), **-nt** (they).',
            'The stem vowel depends on the conjugation: **-ā-** in the first (*habitat*, *cūrant*), **-ē-** in the second (*sedet*), and a short **-i-**, **-u-** in the third (*currit*, *currunt*). In the first person the vowel merges: *habitō*.',
            'A plural subject takes **-nt**, even when it is a group of things: *Rōmānī templa cūrant*.',
          ],
          tables: [
            {
              columns: ['', 'habitāre (1)', 'sedēre (2)', 'currere (3)'],
              rows: [
                ['ego', 'habitō', 'sedeō', 'currō'],
                ['tū', 'habitās', 'sedēs', 'curris'],
                ['is, ea', 'habitat', 'sedet', 'currit'],
                ['nōs', 'habitāmus', 'sedēmus', 'currimus'],
                ['vōs', 'habitātis', 'sedētis', 'curritis'],
                ['eī, eae', 'habitant', 'sedent', 'currunt'],
              ],
            },
          ],
          why: 'Present endings: -ō, -s, -t, -mus, -tis, -nt.',
          tags: [],
          items: [
            { s: 'Titus cum familiā [habitat].', en: 'Titus lives with his family.', wrong: ['habitō', 'habitās', 'habitant'], base: 'habitāre', cue: 'is' },
            { s: 'Tempus omnia vulnera [sānat].', en: 'Time heals all wounds.', wrong: ['sānō', 'sānās', 'sānant'], base: 'sānāre', cue: 'id' },
            { s: 'Rōmānī templa deōrum magnā diligentiā [cūrant].', en: 'The Romans care for the temples of the gods with great diligence.', wrong: ['cūrat', 'cūrō', 'cūrās'], base: 'cūrāre', cue: 'eī' },
            { s: 'Dii mecum [militant].', en: 'The gods fight with me.', wrong: ['militat', 'milito', 'militas'], base: 'militāre', cue: 'eī' },
            { s: 'Tum Caecilius in horto [sedet].', en: 'Then Caecilius sits in the garden.', wrong: ['sedeo', 'sedes', 'sedent'], base: 'sedēre', cue: 'is' },
            { s: 'Multum [currit], quō validior fīat.', en: 'He runs a lot to become healthier.', wrong: ['currō', 'curris', 'currunt'], base: 'currere', cue: 'is' },
          ],
          related: ['esse'],
        },
      ],
    },
  ],
};

export default grammar;
