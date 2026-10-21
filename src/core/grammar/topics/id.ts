import type { Grammar } from '../types';

// Indonesian (tier 2: a short map of the first topics). Sentences: the Indonesian pack's
// Wiktionary examples. Rules checked against Wikipedia's "Indonesian grammar" (negation with
// tidak and bukan, aspect markers, the di- passive).

const grammar: Grammar = {
  lang: 'id',
  sources: [{ name: 'Wikipedia: Indonesian grammar', url: 'https://en.wikipedia.org/wiki/Indonesian_grammar' }],
  notes:
    'Tier 2, kept short. Left out for now: the meN- prefix and its sound changes, -kan and -i, reduplication, ter- and ber-, and yang (the pack has too few short sentences for them).',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'tidak-bukan',
          title: 'Not: tidak or bukan',
          level: 'A1',
          summary: 'Tidak for verbs and adjectives, bukan for nouns.',
          rule: [
            '**Tidak** negates verbs and adjectives: *Kami tidak tahu*, "we don\'t know"; *Buku itu tidak mahal*, "that book is not expensive".',
            '**Bukan** negates nouns and pronouns: *Dia bukan seorang dokter*, "he is not a doctor". It also makes tag questions: *…, bukan?*',
            '**Jangan** is "don\'t!" in commands, and **belum** is "not yet".',
          ],
          compare: {
            title: 'Tidak or bukan',
            sides: [
              { label: 'Tidak', points: ['verbs', 'adjectives'], example: { s: 'Buku itu tidak mahal.', en: 'That book is not expensive.' } },
              { label: 'Bukan', points: ['nouns', 'pronouns'], example: { s: 'Dia bukan seorang dokter.', en: 'He is not a doctor.' } },
            ],
          },
          why: 'Tidak before a verb or adjective; bukan before a noun.',
          tags: [],
          items: [
            { s: 'Kami [tidak] tahu.', en: 'We do not know.', wrong: ['bukan', 'jangan', 'tanpa'] },
            { s: 'Buku itu [tidak] mahal.', en: 'That book is not expensive.', wrong: ['bukan', 'jangan', 'tanpa'] },
            { s: 'Dia [bukan] seorang dokter.', en: 'He is not a doctor.', wrong: ['tidak', 'jangan', 'tanpa'] },
            { s: 'Saya [tidak] mengerti kata itu.', en: "I can't understand that word.", wrong: ['bukan', 'jangan', 'tanpa'] },
            { s: 'Saya [tidak] enak badan.', en: 'I am not feeling well.', wrong: ['bukan', 'jangan', 'tanpa'] },
            { s: 'Sembarangan! Jawabannya jelas [bukan] itu.', en: 'No! The answer is clearly not that.', wrong: ['tidak', 'jangan', 'tanpa'] },
            { s: 'Tolong mundur sedikit, saya [tidak] bisa lewat.', en: "Please step back a little, I can't get through.", wrong: ['bukan', 'jangan', 'tanpa'] },
          ],
          related: ['aspect'],
        },
        {
          id: 'aspect',
          title: 'Time words: sudah, belum, sedang, akan',
          level: 'A1',
          summary: 'Verbs never change for tense; small words before them do the work.',
          rule: [
            'An Indonesian verb has one form for every time and person. Time comes from words like *besok* (tomorrow) and from four small words before the verb:',
            '**akan**: will, going to (*Saya akan pergi*); **sedang**: in the middle of doing (*Saya sedang membuat ikan goreng*); **sudah** (or **telah**): already, has done (*Dia sudah menikah*); **belum**: not yet (*mereka belum datang*).',
            'Without them, the context decides: *Saya makan* can be "I eat", "I ate" or "I\'m eating".',
          ],
          tables: [
            {
              columns: ['word', 'meaning', 'example'],
              rows: [
                ['akan', 'will', 'akan pergi'],
                ['sedang', 'is …-ing', 'sedang belajar'],
                ['sudah', 'already', 'sudah menikah'],
                ['belum', 'not yet', 'belum datang'],
              ],
            },
          ],
          why: 'Akan = will, sedang = is doing, sudah = already, belum = not yet.',
          tags: [],
          items: [
            { s: 'Saya [akan] pergi ke kebun.', en: 'I will go to the garden.', wrong: ['sudah', 'sedang', 'belum'] },
            { s: 'Mereka [akan] mengunjungi rumah kita.', en: 'They will visit our house.', wrong: ['sudah', 'sedang', 'belum'] },
            { s: 'Besok tokonya [akan] buka.', en: 'Tomorrow the shop will open.', wrong: ['sudah', 'sedang', 'belum'] },
            { s: 'Saya [sedang] membuat ikan goreng.', en: "I'm making fried fish.", wrong: ['akan', 'sudah', 'belum'] },
            { s: 'Aku [sedang] belajar mengemudi.', en: "I'm learning how to drive.", wrong: ['akan', 'sudah', 'belum'] },
            { s: 'Kami [sedang] memikirkan proyek sekolah.', en: 'We are thinking about the school project.', wrong: ['akan', 'sudah', 'belum'] },
            { s: 'Dia [sudah] menikah.', en: 'He/She is already married.', wrong: ['akan', 'sedang', 'belum'] },
            { s: 'Ini sudah siang, tapi mereka [belum] datang.', en: "It's already noon, but they have not come yet.", wrong: ['sudah', 'sedang', 'akan'] },
          ],
          related: ['tidak-bukan', 'passive'],
        },
        {
          id: 'passive',
          title: 'The passive: di-',
          level: 'A2',
          summary: 'Ditulis, dimakan: "is written", "is eaten".',
          rule: [
            'Put **di-** before the root of a verb to make it passive: *tulis* → **ditulis**, "is written"; *makan* → **dimakan**, "is eaten".',
            'The doer, if named, follows with **oleh**: *Buku ini ditulis oleh Pak Bambang*.',
            'The active form usually takes **meN-**: *menulis*, *membuat*, *membawa*. Indonesian uses the passive much more than English, especially when the thing acted on is the topic.',
          ],
          tables: [
            {
              columns: ['root', 'active', 'passive'],
              rows: [
                ['tulis', 'menulis', 'ditulis'],
                ['buat', 'membuat', 'dibuat'],
                ['bawa', 'membawa', 'dibawa'],
              ],
            },
          ],
          why: 'di- + root makes the passive; the doer follows with oleh.',
          tags: [],
          items: [
            { s: 'Buku ini [ditulis] oleh Pak Bambang sendiri.', en: 'This book is written by Mr. Bambang himself.', wrong: ['menulis', 'tulis', 'penulis'], base: 'tulis' },
            { s: 'Ikan [dimakan] oleh ibu.', en: 'The fish is eaten by mother.', wrong: ['memakan', 'makan', 'pemakan'], base: 'makan' },
            { s: 'Kesalahan itu sengaja [dibuat] olehnya.', en: 'The mistake was intentionally made by him.', wrong: ['membuat', 'buat', 'pembuat'], base: 'buat' },
            { s: 'Tadi belanjaanya [dibawa] oleh saya.', en: 'The shopping was carried by me.', wrong: ['membawa', 'bawa', 'pembawa'], base: 'bawa' },
          ],
          related: ['aspect'],
        },
      ],
    },
  ],
};

export default grammar;
