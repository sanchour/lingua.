import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: '슬기로운 의사생활', en: 'Hospital Playlist', year: 2020, level: 'B1', why: 'Five doctor friends: warm, everyday banter.', on: ['netflix'] },
    { title: '이상한 변호사 우영우', en: 'Extraordinary Attorney Woo', year: 2022, level: 'B2', why: 'A courtroom drama with careful, polite speech.', on: ['netflix'] },
    { title: '응답하라 1988', en: 'Reply 1988', year: 2015, level: 'B1', why: 'Neighbours in 1988 Seoul: family talk and friendly slang.' },
    { title: '킹덤', en: 'Kingdom', year: 2019, level: 'C1', why: 'Zombies in Joseon Korea; formal, historical speech.', on: ['netflix'] },
    { title: '오징어 게임', en: 'Squid Game', year: 2021, level: 'B2', why: 'Spare, tense dialogue you can follow with subtitles.', on: ['netflix'] },
  ],
  films: [
    { title: '기생충', en: 'Parasite', by: '봉준호', year: 2019, level: 'B2', why: 'Two families, two ways of speaking: politeness levels on show.' },
    { title: '부산행', en: 'Train to Busan', year: 2016, level: 'B1', why: 'Short, urgent lines on a zombie-filled train.' },
    { title: '써니', en: 'Sunny', year: 2011, level: 'B1', why: 'Schoolfriends then and now; funny, everyday Korean.' },
    { title: '헤어질 결심', en: 'Decision to Leave', by: '박찬욱', year: 2022, level: 'C1', why: 'A detective story where every word choice matters.' },
  ],
  books: [
    { title: 'Korean Short Stories for Beginners', by: 'Olly Richards', level: 'A2', why: 'Graded stories with summaries and word lists.' },
    { title: '어린 왕자', en: 'The Little Prince', level: 'B1', why: 'A story you know, in simple Korean.' },
    { title: '달러구트 꿈 백화점', en: 'The Dallergut Dream Department Store', by: '이미예', year: 2020, level: 'B1', why: 'A cosy best-seller in clear, modern prose.' },
    { title: '아몬드', en: 'Almond', by: '손원평', year: 2017, level: 'B2', why: 'A teenage narrator, short chapters, simple sentences.' },
    { title: '82년생 김지영', en: 'Kim Jiyoung, Born 1982', by: '조남주', year: 2016, level: 'B2', why: 'A short, plain-spoken novel about a woman’s everyday life.' },
    { title: '채식주의자', en: 'The Vegetarian', by: '한강', year: 2007, level: 'C1', why: 'The Nobel laureate’s best-known novel.' },
  ],
  games: [
    { title: 'Stellar Blade', by: 'Shift Up', year: 2024, level: 'B2', why: 'A Korean-made action game you can play with Korean voices.' },
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Korean text full of everyday words, at your own pace.', url: 'https://animal-crossing.com/new-horizons/' },
    { title: 'Stardew Valley', by: 'ConcernedApe', year: 2016, level: 'B1', why: 'Farm life in Korean, full of small talk.' },
  ],
  podcasts: [
    { title: 'Talk To Me In Korean', level: 'A1', why: 'The best-known Korean lessons, step by step.' },
    { title: 'KoreanClass101', level: 'A1', why: 'Structured lessons from the start.' },
  ],
  youtube: [
    { title: 'Talk To Me In Korean', level: 'A1', why: 'Lessons, real conversations and Korean-only videos.' },
    { title: 'Korean Unnie', level: 'A2', why: 'Everyday Korean and slang, explained warmly.' },
    { title: 'Go! Billy Korean', level: 'A1', why: 'Grammar explained clearly, with lots of examples.' },
    { title: 'Easy Korean', level: 'A2', why: 'Street interviews in Seoul with subtitles.' },
  ],
  dictionaries: [
    { title: 'Naver Dictionary', level: 'A1', why: 'Korea’s favourite dictionary: examples, audio, hanja.', url: 'https://en.dict.naver.com/' },
    { title: '한국어기초사전', en: 'Basic Korean Dictionary', level: 'A1', why: 'The National Institute’s learner dictionary, with English.', url: 'https://krdict.korean.go.kr/eng' },
  ],
};

export default picks;
