import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: '家有儿女', en: 'Home with Kids', year: 2005, level: 'B1', why: 'A family sitcom in clear, everyday Beijing Mandarin.' },
    { title: '爱情公寓', en: 'iPartment', year: 2009, level: 'B1', why: 'Young flatmates in Shanghai: casual talk and jokes.' },
    { title: '琅琊榜', en: 'Nirvana in Fire', year: 2015, level: 'C1', why: 'A celebrated palace drama; formal, literary speech. Free on its official YouTube channel.', on: ['youtube'] },
    { title: '隐秘的角落', en: 'The Bad Kids', year: 2020, level: 'B2', why: 'A tight twelve-episode thriller with natural dialogue.', on: ['iqiyi'] },
    { title: '我們與惡的距離', en: 'The World Between Us', year: 2019, level: 'B2', why: 'A Taiwanese drama (Traditional characters) in Taiwan’s softer Mandarin.' },
  ],
  films: [
    { title: '你好，李焕英', en: 'Hi, Mom', year: 2021, level: 'B1', why: 'A comedy about a mother and daughter; warm, simple dialogue.' },
    { title: '流浪地球', en: 'The Wandering Earth', year: 2019, level: 'B2', why: 'Chinese science fiction on a grand scale.', on: ['netflix'] },
    { title: '饮食男女', en: 'Eat Drink Man Woman', by: '李安', year: 1994, level: 'B1', why: 'A Taipei family round the dinner table; calm, clear speech.' },
    { title: '让子弹飞', en: 'Let the Bullets Fly', year: 2010, level: 'C1', why: 'A fast, witty western full of wordplay.' },
  ],
  books: [
    { title: 'Mandarin Companion', level: 'A2', why: 'Graded readers that retell classics in about 300 characters.' },
    { title: 'Chinese Breeze', level: 'A2', why: 'Graded readers from 300 to 2,000 words, with pinyin help.' },
    { title: '小王子', en: 'The Little Prince', level: 'B1', why: 'A story you know, in simple Mandarin.' },
    { title: '城南旧事', en: 'Memories of Peking: South Side Stories', by: '林海音', year: 1960, level: 'B2', why: 'Old Beijing through a child’s eyes, in gentle prose.' },
    { title: '活着', en: 'To Live', by: '余华', year: 1993, level: 'B2', why: 'A short, plainly written novel that stays with you.' },
    { title: '三体', en: 'The Three-Body Problem', by: '刘慈欣', year: 2006, level: 'C1', why: 'The great Chinese science-fiction novel.' },
  ],
  games: [
    { title: '黑神话：悟空', en: 'Black Myth: Wukong', by: 'Game Science', year: 2024, level: 'C1', why: 'Journey to the West, voiced in Mandarin with classical flavour.' },
    { title: '原神', en: 'Genshin Impact', by: 'HoYoverse', year: 2020, level: 'B1', why: 'Play with Chinese voices and text: hours of dialogue.', url: 'https://genshin.hoyoverse.com/' },
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Simplified Chinese text, everyday words, no hurry.', url: 'https://animal-crossing.com/new-horizons/' },
  ],
  podcasts: [
    { title: 'Lazy Chinese', level: 'B1', why: 'Everyday topics in natural Mandarin, slowed a little.' },
    { title: '慢速中文', en: 'Slow Chinese', level: 'A2', why: 'Short topics read slowly, with transcripts.' },
    { title: 'ChinesePod', level: 'A1', why: 'Lessons for every level, from the very start.' },
  ],
  youtube: [
    { title: 'Mandarin Corner', level: 'B1', why: 'Real conversations and vlogs with Chinese and pinyin subtitles.' },
    { title: 'Easy Mandarin', level: 'A2', why: 'Street interviews in Taiwan with subtitles.' },
    { title: 'Chinese Zero to Hero', level: 'A1', why: 'Structured courses for HSK levels.' },
    { title: 'Grace Mandarin Chinese', level: 'A2', why: 'Everyday Mandarin explained clearly.' },
  ],
  dictionaries: [
    { title: 'Pleco', level: 'A1', why: 'The dictionary app every learner uses: handwriting, flashcards, readers.', url: 'https://www.pleco.com/' },
    { title: 'MDBG', level: 'A1', why: 'A quick Chinese–English dictionary with pinyin and stroke order.', url: 'https://www.mdbg.net/chinese/dictionary' },
    { title: 'Chinese Grammar Wiki', level: 'A2', why: 'Grammar points by level, with examples.', url: 'https://resources.allsetlearning.com/chinese/grammar/' },
  ],
};

export default picks;
