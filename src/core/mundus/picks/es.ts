import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'La casa de papel', en: 'Money Heist', by: 'Álex Pina', year: 2017, level: 'B2', why: 'Castilian Spanish at full speed; the tension keeps you watching while your ear catches up.', on: ['netflix'] },
    { title: 'El Ministerio del Tiempo', en: 'The Ministry of Time', year: 2015, level: 'B2', why: 'Agents travel through Spain’s history: clear speech, and every era’s Spanish side by side.', on: ['rtve'] },
    { title: 'Las chicas del cable', en: 'Cable Girls', year: 2017, level: 'B1', why: 'A period drama with careful, well-articulated dialogue and plenty of everyday phrases.', on: ['netflix'] },
    { title: 'Club de Cuervos', en: 'Club of Crows', year: 2015, level: 'B2', why: 'Mexican comedy about a football club: colloquial Mexican Spanish and its slang.', on: ['netflix'] },
    { title: 'Cuéntame cómo pasó', en: 'Tell Me How It Happened', year: 2001, level: 'B1', why: 'A family through Spain’s recent past; calm, everyday conversation at home.', on: ['rtve'] },
    { title: 'Élite', en: 'Elite', year: 2018, level: 'B2', why: 'Teenagers at a Madrid school: today’s slang and fast, natural talk.', on: ['netflix'] },
  ],
  films: [
    { title: 'Coco', by: 'Pixar', year: 2017, level: 'A2', why: 'The Mexican Spanish version: family words, songs and a story you can follow on the pictures alone.', on: ['disney'] },
    { title: 'Ocho apellidos vascos', en: 'Spanish Affair', year: 2014, level: 'B1', why: 'A comedy built on Spain’s regional accents: Andalusian meets Basque.' },
    { title: 'Roma', by: 'Alfonso Cuarón', year: 2018, level: 'B2', why: 'Quiet scenes of Mexico City life with short, clear dialogue.', on: ['netflix'] },
    { title: 'La sociedad de la nieve', en: 'Society of the Snow', by: 'J. A. Bayona', year: 2023, level: 'B2', why: 'Uruguayan Spanish, told mostly by one calm narrating voice.', on: ['netflix'] },
    { title: 'El laberinto del fauno', en: 'Pan’s Labyrinth', by: 'Guillermo del Toro', year: 2006, level: 'B2', why: 'A fairy tale in post-war Spain: measured, almost theatrical speech.' },
    { title: 'Relatos salvajes', en: 'Wild Tales', year: 2014, level: 'B2', why: 'Six short Argentine stories: rioplatense voseo in bite-sized pieces.' },
  ],
  books: [
    { title: 'Short Stories in Spanish for Beginners', by: 'Olly Richards', level: 'A2', why: 'Graded stories with a summary and word list after each chapter.' },
    { title: 'Manolito Gafotas', by: 'Elvira Lindo', year: 1994, level: 'B1', why: 'A Madrid boy tells his own story: short chapters, funny, everyday Spanish.' },
    { title: 'El principito', en: 'The Little Prince', by: 'Antoine de Saint-Exupéry', level: 'B1', why: 'A story you probably know, in simple sentences: guess words from what you remember.' },
    { title: 'Harry Potter y la piedra filosofal', by: 'J. K. Rowling', level: 'B1', why: 'A familiar plot carries you through a full-length novel.' },
    { title: 'Como agua para chocolate', en: 'Like Water for Chocolate', by: 'Laura Esquivel', year: 1989, level: 'B2', why: 'Twelve chapters, each built round a Mexican recipe; rich kitchen vocabulary.' },
    { title: 'La sombra del viento', en: 'The Shadow of the Wind', by: 'Carlos Ruiz Zafón', year: 2001, level: 'B2', why: 'A page-turner set in Barcelona; the plot pulls you past the words you don’t know.' },
    { title: 'Cien años de soledad', en: 'One Hundred Years of Solitude', by: 'Gabriel García Márquez', year: 1967, level: 'C1', why: 'The great Latin American novel, once long sentences no longer scare you.' },
  ],
  games: [
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Everyday words, short friendly dialogue, and no hurry to read it.', url: 'https://animal-crossing.com/new-horizons/' },
    { title: 'Pokémon Escarlata y Púrpura', en: 'Pokémon Scarlet and Violet', by: 'Game Freak', year: 2022, level: 'A2', why: 'Simple, repetitive text set in a world modelled on Spain.', url: 'https://scarletviolet.pokemon.com/' },
    { title: 'The Legend of Zelda: Breath of the Wild', by: 'Nintendo', year: 2017, level: 'B1', why: 'Fully voiced in Spanish; choose Spain’s or Latin America’s version.', url: 'https://zelda.nintendo.com/breath-of-the-wild/' },
    { title: 'Stardew Valley', by: 'ConcernedApe', year: 2016, level: 'B1', why: 'Farm life in a Spanish translation full of daily words and small talk.' },
  ],
  podcasts: [
    { title: 'Español con Juan', by: 'Juan Fernández', level: 'A2', why: 'A friendly teacher from Spain talks slowly about daily life and culture.' },
    { title: 'Coffee Break Spanish', by: 'Coffee Break Languages', level: 'A1', why: 'Short structured lessons that start from zero.' },
    { title: 'Hoy Hablamos', level: 'B1', why: 'A short episode every day, in clear Spanish from Spain, with transcripts.' },
    { title: 'Duolingo Spanish Podcast', level: 'B1', why: 'True stories told in easy Spanish with a little English to bridge the gaps.' },
    { title: 'Radio Ambulante', by: 'NPR', level: 'C1', why: 'Award-winning Latin American stories, in every accent of the continent.' },
  ],
  youtube: [
    { title: 'Dreaming Spanish', level: 'A1', why: 'Comprehensible input from absolute zero: videos sorted by level.' },
    { title: 'Easy Spanish', level: 'A2', why: 'Street interviews in Mexico and Spain, with Spanish and English subtitles.' },
    { title: 'Butterfly Spanish', level: 'A2', why: 'Clear explanations of grammar and everyday phrases.' },
    { title: 'Why Not Spanish?', level: 'B1', why: 'Two hosts chatting about culture in natural, slowed-down Spanish.' },
    { title: 'Luisito Comunica', level: 'B2', why: 'A Mexican travel vlogger: fast, funny, real Spanish.' },
  ],
  dictionaries: [
    { title: 'WordReference', level: 'A1', why: 'Translations plus a forum where native speakers explain the tricky ones.', url: 'https://www.wordreference.com/esen/' },
    { title: 'SpanishDict', level: 'A1', why: 'Clear examples and every verb conjugated.', url: 'https://www.spanishdict.com/' },
    { title: 'Diccionario de la lengua española (RAE)', level: 'B2', why: 'The Royal Academy’s own Spanish–Spanish dictionary.', url: 'https://dle.rae.es/' },
    { title: 'Reverso Context', level: 'A2', why: 'Words in real sentences from films and documents.', url: 'https://context.reverso.net/translation/spanish-english/' },
  ],
};

export default picks;
