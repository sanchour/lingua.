import type { Grammar } from '../types';

// Korean (tier 2: a short map of the first topics). Sentences: the Korean pack's Wiktionary
// examples. Rules checked against Wikipedia's "Korean particles" (은/는, 을/를 and the batchim
// rule) and "Korean verbs" (the polite past -았어요/-었어요). Where another particle would also
// be right in a gap (을 or 은 for contrast, 에 with 다니다), it is never offered as wrong.

const grammar: Grammar = {
  lang: 'ko',
  sources: [
    { name: 'Wikipedia: Korean particles', url: 'https://en.wikipedia.org/wiki/Korean_particles' },
    { name: 'Wikipedia: Korean verbs', url: 'https://en.wikipedia.org/wiki/Korean_verbs' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: 이/가 versus 은/는 (often both are right), the speech levels beyond -요, the present tense as a topic of its own, and irregular verbs beyond 듣다.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'eun-neun',
          title: 'The topic: 은 or 는',
          level: 'A1',
          summary: '은 after a consonant, 는 after a vowel.',
          rule: [
            'The topic particle marks what the sentence is about: *오늘은 4월 3일입니다*, "today is April the third".',
            'It has two forms. After a syllable ending in a consonant (a *batchim*) use **은**: *사람은*, *그림은*. After a vowel use **는**: *나는*, *엄마는*.',
            'Korean particles always come **after** the word they mark.',
          ],
          tables: [
            {
              columns: ['last sound', 'particle', 'example'],
              rows: [
                ['consonant', '은', '사람은, 학생은'],
                ['vowel', '는', '나는, 그녀는'],
              ],
            },
          ],
          why: '은 after a consonant, 는 after a vowel.',
          tags: [],
          items: [
            { s: '사람[은] 짐승이 아니다.', en: 'People are not beasts.', wrong: ['는', '을', '를'] },
            { s: '나[는] 걔 이름을 몰라.', en: "I don't know his name.", wrong: ['은', '을', '를'] },
            { s: '엄마[는] 바구니를 들고 있습니다.', en: 'Mum is carrying a basket.', wrong: ['은', '을', '를'] },
            { s: '그녀[는] 나에게 어떻게 수영하는지를 가르쳤다.', en: 'She taught me how to swim.', wrong: ['은', '을', '를'] },
            { s: '학생[은] 학교에서 나왔어요.', en: 'The student came out of school.', wrong: ['는', '을', '를'] },
            { s: '그림[은] 모두 네 개입니다.', en: 'There are four pictures in total.', wrong: ['는', '을', '를'] },
            { s: '그들[은] 들판 한복판에 있다.', en: 'They are in the center of the open field.', wrong: ['는', '을', '를'] },
            { s: '너[는] 이 가수를 왜 좋아해?', en: 'Why do you like this singer?', wrong: ['은', '을', '를'] },
          ],
          related: ['eul-reul'],
        },
        {
          id: 'eul-reul',
          title: 'The object: 을 or 를',
          level: 'A1',
          summary: '을 after a consonant, 를 after a vowel.',
          rule: [
            'The object particle follows the thing the verb acts on: *이야기를 읽었어요*, "I read a story".',
            'After a consonant use **을**: *이름을*, *문을*. After a vowel use **를**: *바구니를*, *컴퓨터를*.',
            'The verb comes **last**, so a sentence runs topic 은/는, object 을/를, verb.',
          ],
          tables: [
            {
              columns: ['last sound', 'particle', 'example'],
              rows: [
                ['consonant', '을', '이름을, 문을'],
                ['vowel', '를', '바구니를, 학교를'],
              ],
            },
          ],
          why: '을 after a consonant, 를 after a vowel.',
          tags: [],
          items: [
            { s: '나는 걔 이름[을] 몰라.', en: "I don't know his name.", wrong: ['를', '가', '는'] },
            { s: '엄마는 바구니[를] 들고 있습니다.', en: 'Mum is carrying a basket.', wrong: ['을', '이', '은'] },
            { s: '우리는 함께 학교[를] 다녔어요.', en: 'We went to school together.', wrong: ['을', '이', '은'] },
            { s: '어제 흥미로운 이야기[를] 읽었어요.', en: 'Yesterday I read an interesting story.', wrong: ['을', '이', '은'] },
            { s: '이 가게는 몇 시에 문[을] 열어요?', en: 'What time does this shop/store open?', wrong: ['를', '가', '는'] },
            { s: '내 생일 선물로 부모님에게서 컴퓨터[를] 받았다.', en: 'I got a computer from my parents for my birthday.', wrong: ['을', '이', '은'] },
            { s: '나는 많은 노력[을] 기울였다.', en: 'I made a great effort.', wrong: ['를', '가', '는'] },
            { s: '6시로 알람[을] 맞추었어요.', en: "I set the alarm for 6 o'clock", wrong: ['를', '가', '는'] },
          ],
          related: ['eun-neun', 'past'],
        },
      ],
    },
    {
      title: 'Verbs',
      topics: [
        {
          id: 'past',
          title: 'The polite past: -았어요 and -었어요',
          level: 'A2',
          summary: 'The ending follows the last vowel of the verb stem.',
          rule: [
            'The polite past adds **-았어요** if the last vowel of the stem is **ㅏ** or **ㅗ** (*놀다* → **놀았어요**), and **-었어요** otherwise (*읽다* → **읽었어요**). Verbs in **하다** take **했어요**: *방문했어요*.',
            'A stem ending in a vowel often merges with the ending: *타다* → **탔어요**, *다니다* → **다녔어요**; *맞추었어요* is also written *맞췄어요*.',
            'Some verbs change their stem: *듣다* (to hear) → **들었어요**.',
          ],
          tables: [
            {
              columns: ['verb', 'polite past'],
              rows: [
                ['놀다 (play)', '놀았어요'],
                ['읽다 (read)', '읽었어요'],
                ['하다 (do)', '했어요'],
                ['타다 (ride)', '탔어요'],
              ],
            },
          ],
          why: 'ㅏ or ㅗ → -았어요; other vowels → -었어요; 하다 → 했어요.',
          tags: [],
          items: [
            { s: '지난 주말에 친구들이랑 [놀았어요].', en: 'Last weekend, I hung out with my friends.', wrong: ['놀었어요', '놀아요', '놀았요'], base: '놀다' },
            { s: '어제 흥미로운 이야기를 [읽었어요].', en: 'Yesterday I read an interesting story.', wrong: ['읽았어요', '읽어요', '읽었요'], base: '읽다' },
            { s: '그는 사업차 서울을 다시 [방문했어요].', en: 'He visited Seoul again on business.', wrong: ['방문였어요', '방문해요', '방문했요'], base: '방문하다' },
            { s: '나도 형한테서 그 소문을 [들었어요].', en: 'I heard that rumor from my brother too.', wrong: ['듣었어요', '들어요', '들었요'], base: '듣다' },
            { s: '우리는 함께 학교를 [다녔어요].', en: 'We went to school together.', wrong: ['다녀요', '다녔요', '다니았어요'], base: '다니다' },
            { s: '이 꽃들은 아름다운 여인들을 위해서 [준비했어요].', en: 'I prepared these flowers for beautiful women.', wrong: ['준비해요', '준비였어요', '준비했요'], base: '준비하다' },
            { s: '차가 너무 막혀서 지하철을 [탔어요].', en: 'There was a bad traffic jam, so I took the subway.', wrong: ['타었어요', '타요', '탔요'], base: '타다' },
          ],
          related: ['eul-reul'],
        },
      ],
    },
  ],
};

export default grammar;
