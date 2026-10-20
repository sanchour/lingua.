import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'L’amica geniale', en: 'My Brilliant Friend', year: 2018, level: 'B2', why: 'Naples after the war; Italian with Neapolitan woven in, subtitled even for Italians.', on: ['max', 'raiplay'] },
    { title: 'Il commissario Montalbano', en: 'Inspector Montalbano', year: 1999, level: 'B2', why: 'A Sicilian detective: slow-paced episodes and a lovely accent.', on: ['raiplay'] },
    { title: 'Mare fuori', en: 'The Sea Beyond', year: 2020, level: 'B2', why: 'Teenagers in a Naples youth prison; hugely popular in Italy.', on: ['raiplay'] },
    { title: 'Summertime', year: 2020, level: 'B1', why: 'A summer romance on the Adriatic coast, simple everyday talk.', on: ['netflix'] },
    { title: 'Suburra', year: 2017, level: 'C1', why: 'Rome’s underworld: Roman slang at speed.', on: ['netflix'] },
  ],
  films: [
    { title: 'La vita è bella', en: 'Life Is Beautiful', by: 'Roberto Benigni', year: 1997, level: 'B1', why: 'Clear, expressive Italian and a story you won’t forget.' },
    { title: 'Nuovo Cinema Paradiso', en: 'Cinema Paradiso', year: 1988, level: 'B1', why: 'A Sicilian village and its cinema, in gentle, clear dialogue.' },
    { title: 'Perfetti sconosciuti', en: 'Perfect Strangers', year: 2016, level: 'B2', why: 'Friends at one dinner table: real, quick conversation.' },
    { title: 'Luca', by: 'Pixar', year: 2021, level: 'A2', why: 'Set on the Italian Riviera; watch the Italian version.', on: ['disney'] },
    { title: 'La grande bellezza', en: 'The Great Beauty', year: 2013, level: 'C1', why: 'Rome in all its beauty, and witty Roman talk.' },
  ],
  books: [
    { title: 'Short Stories in Italian for Beginners', by: 'Olly Richards', level: 'A2', why: 'Graded stories with summaries and word lists.' },
    { title: 'Le avventure di Pinocchio', by: 'Carlo Collodi', year: 1883, level: 'B1', why: 'Short chapters, lively and funny, in Tuscan Italian.' },
    { title: 'Marcovaldo', by: 'Italo Calvino', year: 1963, level: 'B1', why: 'Twenty short stories, one per season, in Calvino’s clear prose.' },
    { title: 'Io non ho paura', en: 'I’m Not Scared', by: 'Niccolò Ammaniti', year: 2001, level: 'B2', why: 'A gripping short novel told by a child.' },
    { title: 'L’amica geniale', en: 'My Brilliant Friend', by: 'Elena Ferrante', year: 2011, level: 'B2', why: 'The first of the Neapolitan novels; once begun, hard to stop.' },
    { title: 'Se questo è un uomo', en: 'If This Is a Man', by: 'Primo Levi', year: 1947, level: 'C1', why: 'Precise, unforgettable Italian.' },
  ],
  games: [
    { title: 'Assassin’s Creed II', by: 'Ubisoft', year: 2009, level: 'B1', why: 'Renaissance Florence and Venice, with a full Italian dub.' },
    { title: 'The Legend of Zelda: Breath of the Wild', by: 'Nintendo', year: 2017, level: 'B1', why: 'Fully voiced and translated into Italian.', url: 'https://zelda.nintendo.com/breath-of-the-wild/' },
    { title: 'Stardew Valley', by: 'ConcernedApe', year: 2016, level: 'B1', why: 'Farm life in Italian, full of everyday words.' },
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Everyday words and short friendly dialogue.', url: 'https://animal-crossing.com/new-horizons/' },
  ],
  podcasts: [
    { title: 'Podcast Italiano', by: 'Davide Gemello', level: 'B1', why: 'Episodes in clear Italian on language and culture, with transcripts.' },
    { title: 'Italiano Automatico', by: 'Alberto Arrighini', level: 'B1', why: 'Learning Italian naturally, talked about in Italian.' },
    { title: 'Coffee Break Italian', by: 'Coffee Break Languages', level: 'A1', why: 'Structured lessons from the start.' },
    { title: 'News in Slow Italian', level: 'A2', why: 'The week’s news, read slowly.' },
    { title: 'Morning', by: 'Il Post', level: 'C1', why: 'The day’s newspapers in twenty minutes, as Italians hear them.' },
  ],
  youtube: [
    { title: 'Easy Italian', level: 'A2', why: 'Street interviews with Italian and English subtitles.' },
    { title: 'Learn Italian with Lucrezia', level: 'A2', why: 'Everyday Italian explained clearly and cheerfully.' },
    { title: 'Podcast Italiano', level: 'B1', why: 'Davide’s videos on Italian language and culture.' },
    { title: 'Italiano Automatico', level: 'B1', why: 'Natural Italian about learning and life.' },
    { title: 'Geopop', level: 'B2', why: 'Science and the world explained in Italian.' },
  ],
  dictionaries: [
    { title: 'WordReference', level: 'A1', why: 'Translations plus native speakers’ forum answers.', url: 'https://www.wordreference.com/iten/' },
    { title: 'Treccani', level: 'B2', why: 'The great Italian–Italian dictionary and encyclopedia.', url: 'https://www.treccani.it/vocabolario/' },
    { title: 'Reverso Context', level: 'A2', why: 'Words in real sentences.', url: 'https://context.reverso.net/translation/italian-english/' },
  ],
};

export default picks;
