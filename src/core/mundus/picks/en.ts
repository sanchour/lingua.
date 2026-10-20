import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Bluey', year: 2018, level: 'A2', why: 'Australian family life in short episodes, clear and funny.', on: ['disney'] },
    { title: 'Friends', year: 1994, level: 'B1', why: 'American everyday talk; the scripts are easy to find.', on: ['max'] },
    { title: 'Ted Lasso', year: 2020, level: 'B2', why: 'American and British English side by side, full of warmth.', on: ['appletv'] },
    { title: 'Stranger Things', year: 2016, level: 'B2', why: 'American teenagers’ talk with a strong story to pull you along.', on: ['netflix'] },
    { title: 'Sherlock', year: 2010, level: 'C1', why: 'Fast, clever British English.' },
  ],
  films: [
    { title: 'Paddington', year: 2014, level: 'A2', why: 'Gentle British English and a bear who is very polite.' },
    { title: 'Toy Story', year: 1995, level: 'A2', why: 'Clear American voices and a story everyone knows.', on: ['disney'] },
    { title: 'Notting Hill', year: 1999, level: 'B1', why: 'British and American English in a gentle romcom.' },
    { title: 'The King’s Speech', year: 2010, level: 'B2', why: 'Careful, formal British English, spoken slowly on purpose.' },
  ],
  books: [
    { title: 'Penguin Readers', level: 'A1', why: 'Graded readers at every level, with audio.' },
    { title: 'Charlotte’s Web', by: 'E. B. White', year: 1952, level: 'A2', why: 'Short chapters in simple, beautiful American English.' },
    { title: 'Harry Potter and the Philosopher’s Stone', by: 'J. K. Rowling', year: 1997, level: 'B1', why: 'British English in a story you may already know.' },
    { title: 'Of Mice and Men', by: 'John Steinbeck', year: 1937, level: 'B1', why: 'A short American classic, mostly dialogue.' },
    { title: 'The Curious Incident of the Dog in the Night-Time', by: 'Mark Haddon', year: 2003, level: 'B2', why: 'A plain-spoken narrator and short chapters.' },
    { title: 'The Great Gatsby', by: 'F. Scott Fitzgerald', year: 1925, level: 'C1', why: 'Rich, rhythmic prose; short enough to finish.' },
  ],
  games: [
    { title: 'Stardew Valley', by: 'ConcernedApe', year: 2016, level: 'B1', why: 'Everyday small talk with dozens of villagers.' },
    { title: 'Life is Strange', by: 'Dontnod', year: 2015, level: 'B2', why: 'Teenage American English, fully voiced, every choice a conversation.' },
    { title: 'Disco Elysium', by: 'ZA/UM', year: 2019, level: 'C1', why: 'A huge, witty text adventure for advanced readers.' },
  ],
  podcasts: [
    { title: '6 Minute English', by: 'BBC Learning English', level: 'A2', why: 'Six minutes on one topic, with the key words explained.' },
    { title: 'The English We Speak', by: 'BBC Learning English', level: 'B1', why: 'One everyday phrase a week, in three minutes.' },
    { title: 'Luke’s English Podcast', by: 'Luke Thompson', level: 'B2', why: 'Long, funny episodes in natural British English.' },
    { title: 'All Ears English', level: 'B1', why: 'American English for real conversations.' },
  ],
  youtube: [
    { title: 'BBC Learning English', level: 'A2', why: 'Short lessons, news and pronunciation, in British English.' },
    { title: 'English with Lucy', level: 'B1', why: 'British English grammar, vocabulary and pronunciation.' },
    { title: 'Rachel’s English', level: 'B1', why: 'American pronunciation, sound by sound.' },
    { title: 'Easy English', level: 'A2', why: 'Street interviews with subtitles.' },
    { title: 'TED-Ed', level: 'B2', why: 'Short animated lessons on everything, clearly narrated.' },
  ],
  dictionaries: [
    { title: 'Cambridge Dictionary', level: 'A1', why: 'Learner definitions, with British and American audio.', url: 'https://dictionary.cambridge.org/' },
    { title: 'Oxford Learner’s Dictionaries', level: 'A1', why: 'Definitions written for learners, with CEFR levels.', url: 'https://www.oxfordlearnersdictionaries.com/' },
    { title: 'Merriam-Webster', level: 'B2', why: 'The American reference dictionary.', url: 'https://www.merriam-webster.com/' },
    { title: 'YouGlish', level: 'A2', why: 'Hear any word said in real YouTube videos.', url: 'https://youglish.com/' },
  ],
};

export default picks;
