import type { Grammar } from '../types';

// Japanese (tier 2: a short map of the first topics). Sentences: the Japanese pack's Wiktionary
// examples. Rules checked against Wikipedia's "Japanese particles" (は, を, に, へ, で) and
// "Japanese grammar" (the polite -masu forms). Where は or と would also be right in a gap, they
// are never offered as wrong answers.

const grammar: Grammar = {
  lang: 'ja',
  sources: [
    { name: 'Wikipedia: Japanese particles', url: 'https://en.wikipedia.org/wiki/Japanese_particles' },
    { name: 'Wikipedia: Japanese grammar', url: 'https://en.wikipedia.org/wiki/Japanese_grammar' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: は versus が (often both are right, and the difference is about emphasis), plain forms, te-forms, adjectives, and counters.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'wa',
          title: 'は: "as for…"',
          level: 'A1',
          summary: 'は marks what the sentence is about; です says "is".',
          rule: [
            '**は** (written は, said *wa*) follows the topic of the sentence, what you are talking about: *これは犬です*, "this is a dog".',
            '**です** at the end makes a polite "is" or "are": *私はイギリス人です*, "I am British".',
            'Particles always come **after** the word they mark, never before it.',
          ],
          watch: 'The particle は is written with the kana for ha but read wa.',
          why: 'は follows the topic: X は Y です, "X is Y".',
          tags: [],
          items: [
            { s: 'これ[は]犬です。', en: 'This is a dog.', wrong: ['を', 'に', 'で'] },
            { s: '私[は]イギリス人です。', en: 'I am British.', wrong: ['を', 'に', 'で'] },
            { s: 'この車[は]緑です。', en: 'This car is green.', wrong: ['を', 'に', 'で'] },
            { s: '東京[は]日本の首都です。', en: 'Tokyo is the capital of Japan.', wrong: ['を', 'に', 'へ'] },
            { s: '鉄[は]有用な金属です。', en: 'Iron is a useful metal.', wrong: ['を', 'に', 'へ'] },
            { s: '私の趣味[は]盆栽です。', en: 'My hobby is bonsai.', wrong: ['を', 'に', 'へ'] },
            { s: '金[は]黄色いです。', en: 'Gold is yellow.', wrong: ['を', 'に', 'へ'] },
          ],
          related: ['o'],
        },
        {
          id: 'o',
          title: 'を: the object',
          level: 'A1',
          summary: 'を marks what the verb acts on: 本を読みます.',
          rule: [
            '**を** (said *o*) follows the direct object, the thing the verb acts on: *私は本をよく読みます*, "I read books a lot".',
            'The verb comes **last** in a Japanese sentence, so the order is: topic は, object を, verb.',
          ],
          watch: 'を is only ever used as this particle, and is pronounced o, like お.',
          why: 'を follows the object, the thing the verb acts on.',
          tags: [],
          items: [
            { s: '私は本[を]よく読みます。', en: 'I read books a lot.', wrong: ['に', 'で', 'へ'] },
            { s: '私は時々テニス[を]します。', en: 'I sometimes play tennis.', wrong: ['に', 'で', 'へ'] },
            { s: '雨なので傘[を]差します。', en: "Since it's raining, I put up an umbrella.", wrong: ['に', 'で', 'へ'] },
            { s: '猫三匹[を]飼っています。', en: 'I have three cats.', wrong: ['に', 'で', 'へ'] },
            { s: '朝ご飯のあとで、歯[を]磨きます。', en: 'After breakfast I brush my teeth.', wrong: ['に', 'で', 'へ'] },
            { s: '私は財布[を]なくしました。', en: 'I lost my wallet.', wrong: ['に', 'で', 'へ'] },
            { s: 'アイスランドではアイスランド語[を]話します。', en: 'They speak Icelandic in Iceland.', wrong: ['に', 'で', 'へ'] },
          ],
          related: ['wa', 'places'],
        },
        {
          id: 'places',
          title: 'に, へ and で: where',
          level: 'A1',
          summary: 'に and へ for where you go or are; で for where something happens and with what.',
          rule: [
            '**に** marks where someone goes or where something is, and also the time and the person you meet: *日本に住んでいます*, *友達に会いました*.',
            '**へ** (said *e*) marks the direction you go: *銀行へ行った*. With verbs of going, に and へ are both fine.',
            '**で** marks where an action happens and what you do it with: *ジムで泳ぎました*, "swam at the gym"; *英語で話す*, "speak in English".',
          ],
          compare: {
            title: 'に or で',
            sides: [
              { label: 'に: where you are or go', points: ['住む, いる, ある', '行く, 来る'], example: { s: '私は日本に住んでいます。', en: 'I live in Japan.' } },
              { label: 'で: where you do something', points: ['the place of an action', 'the means: in English, by train'], example: { s: '昨日、私はジムで５キロ泳ぎました。', en: 'Yesterday I swam 5 kilometers at the gym.' } },
            ],
          },
          why: 'に and へ for where you are or go; で for where you do something, or with what.',
          tags: [],
          items: [
            { s: '私は日本[に]住んでいます。', en: 'I live in Japan.', wrong: ['で', 'を', 'へ'] },
            { s: '彼はスーパー[に]行った。', en: 'He went to the supermarket.', wrong: ['で', 'を', 'が'] },
            { s: '私は一時に友達[に]会いました。', en: 'I met my friend at one o\'clock.', wrong: ['で', 'を', 'へ'] },
            { s: '銀行[へ]行った。', en: '[I] went to the bank.', wrong: ['で', 'を', 'が'] },
            { s: 'いつ日本[へ]来ましたか。', en: 'When did you come to Japan?', wrong: ['で', 'を', 'が'] },
            { s: '昨日、私はジム[で]５キロ泳ぎました。', en: 'Yesterday I swam 5 kilometers at the gym.', wrong: ['に', 'を', 'へ'] },
            { s: '私は英語[で]話すことが出来ます。', en: 'I can speak in English.', wrong: ['に', 'へ', 'と'] },
          ],
          related: ['o'],
        },
      ],
    },
    {
      title: 'Verbs',
      topics: [
        {
          id: 'masu',
          title: 'Polite verbs: ます, ません, ました',
          level: 'A2',
          summary: 'One stem, four polite endings for now, not, past and not in the past.',
          rule: [
            'Polite verbs end in **ます**: *寝ます*, "(I) sleep / will sleep". The same stem takes **ません** for "not", **ました** for the past and **ませんでした** for "didn\'t".',
            'Japanese has no separate future: *寝ます* covers "will sleep" too. The past is *寝ました*, "slept".',
            'The person is left out when it is clear: *昨日十二時ごろ寝ました*, "(I) went to sleep at about twelve yesterday".',
          ],
          tables: [
            {
              columns: ['', 'now / later', 'past'],
              rows: [
                ['yes', '会います', '会いました'],
                ['no', '会いません', '会いませんでした'],
              ],
            },
          ],
          why: 'ます now or later, ました in the past, ません and ませんでした for not.',
          tags: [],
          items: [
            { s: '昨日十二時ごろ[寝ました]。', en: "I went to sleep at about twelve o'clock yesterday.", wrong: ['寝ます', '寝ません', '寝ましょう'] },
            { s: '晩の内に雪が[降りました]。', en: 'Snow fell during the night.', wrong: ['降ります', '降りません', '降りましょう'] },
            { s: '私は財布を[なくしました]。', en: 'I lost my wallet.', wrong: ['なくします', 'なくしません', 'なくしましょう'] },
            { s: '昨日、私はジムで５キロ[泳ぎました]。', en: 'Yesterday I swam 5 kilometers at the gym.', wrong: ['泳ぎます', '泳ぎません', '泳ぎましょう'] },
            { s: '私は一時に友達に[会いました]。', en: "I met my friend at one o'clock.", wrong: ['会います', '会いません', '会いましょう'] },
            { s: '無事に[終わりました]。', en: 'It ended without incident.', wrong: ['終わります', '終わりません', '終わりましょう'] },
            { s: '知らないうちに１５年が[経ちました]。', en: 'Before I knew it, 15 years had passed.', wrong: ['経ちます', '経ちません', '経ちましょう'] },
          ],
          related: ['o'],
        },
      ],
    },
  ],
};

export default grammar;
