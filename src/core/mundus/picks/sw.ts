import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Akili and Me', by: 'Ubongo', level: 'A1', why: 'Tanzanian cartoon for small children: slow, clear Swahili; free on YouTube.', on: ['youtube'], search: 'Akili and Me Kiswahili' },
    { title: 'Ubongo Kids', by: 'Ubongo', level: 'A2', why: 'Maths and science cartoons from Tanzania in simple Swahili.', on: ['youtube'], search: 'Ubongo Kids Kiswahili' },
  ],
  films: [
    { title: 'Supa Modo', year: 2018, level: 'B1', why: 'A Kenyan village makes a sick girl’s superhero dream come true; Swahili and Kikuyu.' },
    { title: 'Nairobi Half Life', year: 2012, level: 'B2', why: 'Nairobi’s streets in Swahili, English and Sheng slang.' },
  ],
  books: [
    { title: 'African Storybook', level: 'A1', why: 'Free illustrated stories in Kiswahili, sorted by reading level.', url: 'https://www.africanstorybook.org/' },
    { title: 'Kusadikika', by: 'Shaaban Robert', year: 1951, level: 'B2', why: 'A short allegory by the great Swahili writer of Tanzania.' },
    { title: 'Rosa Mistika', by: 'Euphrase Kezilahabi', year: 1971, level: 'C1', why: 'A classic Tanzanian novel read in schools.' },
  ],
  games: [],
  podcasts: [
    { title: 'SwahiliPod101', level: 'A1', why: 'Short structured lessons from the start.' },
    { title: 'BBC Swahili', level: 'B2', why: 'Radio news in standard Swahili from the BBC.', search: 'BBC Swahili' },
  ],
  youtube: [
    { title: 'Ubongo Kids', level: 'A2', why: 'Educational cartoons in clear Tanzanian Swahili.' },
    { title: 'BBC News Swahili', level: 'B2', why: 'News reports with clear, standard Swahili.' },
    { title: 'SwahiliPod101', level: 'A1', why: 'Short lessons on words and grammar.' },
  ],
  dictionaries: [
    { title: 'Glosbe', level: 'A1', why: 'Swahili–English with example sentences.', url: 'https://glosbe.com/sw/en' },
    { title: 'Wiktionary', level: 'A2', why: 'Noun classes and verb forms for many Swahili words.', url: 'https://en.wiktionary.org/wiki/Category:Swahili_language' },
  ],
  notes: {
    series: 'Swahili series reach few streaming services; the best free ones are on YouTube.',
    games: 'Games in Swahili are rare. Set your phone to Kiswahili instead: Android offers it.',
  },
};

export default picks;
