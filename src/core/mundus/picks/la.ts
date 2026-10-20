import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Barbaren', en: 'Barbarians', year: 2020, level: 'B2', why: 'The battle of the Teutoburg Forest; the Romans speak Latin throughout.', on: ['netflix'] },
    { title: 'Romulus', year: 2020, level: 'C1', why: 'The founding of Rome, spoken entirely in a reconstructed archaic Latin.' },
  ],
  films: [{ title: 'Il primo re', en: 'The First King', year: 2019, level: 'C1', why: 'Romulus and Remus in a proto-Latin language, subtitled.' }],
  books: [
    { title: 'Familia Romana', by: 'Hans Ørberg', level: 'A1', why: 'Lingua Latina per se illustrata: learn Latin from Latin alone, chapter by chapter.' },
    { title: 'Fabulae Faciles', by: 'Francis Ritchie', level: 'A2', why: 'Perseus, Hercules and the Argonauts retold in easy Latin.' },
    { title: 'Winnie Ille Pu', by: 'Alexander Lenard', year: 1958, level: 'B1', why: 'Winnie-the-Pooh in Latin: a story you know, in gentle prose.' },
    { title: 'Harrius Potter et Philosophi Lapis', by: 'Peter Needham', level: 'B2', why: 'A familiar plot to carry you through a long Latin book.' },
    { title: 'Commentarii de Bello Gallico', by: 'Iulius Caesar', level: 'B2', why: 'Caesar’s plain, orderly prose: the classic first real author.' },
    { title: 'Metamorphoses', by: 'Ovidius', level: 'C1', why: 'Myths in Ovid’s verse, once the prose feels easy.' },
  ],
  games: [{ title: 'Minecraft', by: 'Mojang', year: 2011, level: 'B1', why: 'Java Edition can be set to Latin: blocks and menus in Lingua Latina.', url: 'https://www.minecraft.net/' }],
  podcasts: [
    { title: 'Quomodo Dicitur?', level: 'B1', why: 'Three friends chat entirely in spoken Latin.' },
    { title: 'Latinitium', by: 'Daniel Pettersson', level: 'B1', why: 'Spoken Latin, readings and talks.' },
  ],
  youtube: [
    { title: 'ScorpioMartianus', by: 'Luke Ranieri', level: 'B1', why: 'Latin spoken with restored pronunciation, readings and dialogues.' },
    { title: 'Latinitium', level: 'A2', why: 'Comprehensible Latin stories and lessons, with Latin subtitles.' },
    { title: 'Polymathy', by: 'Luke Ranieri', level: 'B2', why: 'Talks on Latin and Greek, much of it in the languages.' },
  ],
  dictionaries: [
    { title: 'Logeion', level: 'A2', why: 'Lewis & Short and other great Latin dictionaries in one search.', url: 'https://logeion.uchicago.edu/' },
    { title: 'Whitaker’s Words', level: 'A1', why: 'Type any form and it tells you what it is.', url: 'https://archives.nd.edu/words.html' },
    { title: 'Latin is Simple', level: 'A1', why: 'Words with every form laid out.', url: 'https://www.latin-is-simple.com/' },
  ],
  notes: { series: 'Little is filmed in Latin; these are the best of what there is.', games: 'Only a few games offer Latin; Minecraft is the best known.' },
};

export default picks;
