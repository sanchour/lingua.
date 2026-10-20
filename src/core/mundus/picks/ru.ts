import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Маша и Медведь', en: 'Masha and the Bear', year: 2009, level: 'A1', why: 'Short cartoons with few, simple words; on YouTube for free.', on: ['youtube'] },
    { title: 'Смешарики', en: 'Kikoriki', year: 2004, level: 'A2', why: 'A gentle children’s series in clear, slow Russian.', on: ['youtube'] },
    { title: 'Кухня', en: 'The Kitchen', year: 2012, level: 'B1', why: 'A sitcom set in a Moscow restaurant: everyday talk and jokes.' },
    { title: 'Эпидемия', en: 'To the Lake', year: 2019, level: 'B2', why: 'A survival drama with short, tense dialogue.', on: ['netflix'] },
    { title: 'Слово пацана', en: 'The Boy’s Word', year: 2023, level: 'C1', why: '1980s Kazan street gangs: slang and fast speech.' },
  ],
  films: [
    { title: 'Ирония судьбы, или С лёгким паром!', en: 'The Irony of Fate', by: 'Эльдар Рязанов', year: 1975, level: 'B1', why: 'The New Year’s Eve classic every Russian knows by heart.', on: ['youtube'] },
    { title: 'Москва слезам не верит', en: 'Moscow Does Not Believe in Tears', year: 1980, level: 'B1', why: 'Clear, warm Soviet Russian; free with subtitles on Mosfilm’s channel.', on: ['youtube'] },
    { title: 'Служебный роман', en: 'Office Romance', year: 1977, level: 'B1', why: 'A comedy of office life with plenty of polite, everyday phrases.', on: ['youtube'] },
    { title: 'Брат', en: 'Brother', by: 'Алексей Балабанов', year: 1997, level: 'B2', why: 'A 1990s cult film; spare, memorable lines.' },
    { title: 'Движение вверх', en: 'Going Vertical', year: 2017, level: 'B1', why: 'A sports drama with a clear, simple story.' },
  ],
  books: [
    { title: 'Russian Short Stories for Beginners', by: 'Olly Richards', level: 'A2', why: 'Graded stories with summaries and word lists.' },
    { title: 'Денискины рассказы', en: 'Deniska’s Stories', by: 'Виктор Драгунский', year: 1959, level: 'B1', why: 'A boy’s funny stories, short and full of everyday words.' },
    { title: 'Маленький принц', en: 'The Little Prince', by: 'Антуан де Сент-Экзюпери', level: 'B1', why: 'A story you know, in simple sentences.' },
    { title: 'Пиковая дама', en: 'The Queen of Spades', by: 'Александр Пушкин', year: 1834, level: 'B2', why: 'Pushkin’s short, sharp story: a classic you can finish.' },
    { title: 'Метро 2033', by: 'Дмитрий Глуховский', year: 2005, level: 'B2', why: 'A modern page-turner in the Moscow metro.' },
    { title: 'Мастер и Маргарита', en: 'The Master and Margarita', by: 'Михаил Булгаков', year: 1967, level: 'C1', why: 'The best-loved Russian novel, funny and strange.' },
  ],
  games: [
    { title: 'Metro Exodus', by: '4A Games', year: 2019, level: 'B2', why: 'Choose the Russian voices: a whole world of spoken Russian.' },
    { title: 'Atomic Heart', by: 'Mundfish', year: 2023, level: 'B2', why: 'Made with Russian voices first; a retro-Soviet setting.' },
    { title: 'Pathologic 2', by: 'Ice-Pick Lodge', year: 2019, level: 'C1', why: 'A text-heavy Russian-made game: rich, literary language.' },
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Everyday words in a Russian translation, at your own pace.', url: 'https://animal-crossing.com/new-horizons/' },
  ],
  podcasts: [
    { title: 'Russian Podcast', level: 'B1', why: 'Natural conversations about life and culture, with transcripts.', search: 'Russian Podcast russianpodcast.eu' },
    { title: 'Slow Russian', level: 'A2', why: 'Short topics read slowly.' },
    { title: 'Russian with Max', level: 'B1', why: 'Max talks about Russian life and language.' },
    { title: 'Arzamas', level: 'C1', why: 'Lectures on Russian culture and history.' },
  ],
  youtube: [
    { title: 'Russian with Max', level: 'B1', why: 'Interesting topics in clear, natural Russian.' },
    { title: 'Be Fluent in Russian', level: 'A2', why: 'Grammar and pronunciation explained by Fedor.' },
    { title: 'Easy Russian', level: 'A2', why: 'Street interviews with subtitles in both languages.' },
    { title: 'Редакция', level: 'C1', why: 'Documentaries about today’s Russia, in fast natural speech.', search: 'Редакция Пивоваров' },
    { title: 'Мосфильм', en: 'Mosfilm', level: 'B1', why: 'Soviet film classics, free, many with English subtitles.' },
  ],
  dictionaries: [
    { title: 'OpenRussian', level: 'A1', why: 'Words with stress marks, declensions and examples.', url: 'https://en.openrussian.org/' },
    { title: 'Multitran', level: 'B1', why: 'A huge dictionary of phrases and specialist terms.', url: 'https://www.multitran.com/' },
    { title: 'Грамота.ру', en: 'Gramota.ru', level: 'B2', why: 'Russian–Russian dictionaries and spelling help.', url: 'https://gramota.ru/' },
    { title: 'Wiktionary', level: 'A2', why: 'Full tables of every form, with stress.', url: 'https://en.wiktionary.org/wiki/Category:Russian_language' },
  ],
};

export default picks;
