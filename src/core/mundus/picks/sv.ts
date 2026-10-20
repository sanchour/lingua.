import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Bron/Broen', en: 'The Bridge', year: 2011, level: 'B2', why: 'Swedish and Danish detectives side by side; hear how close the languages are.', on: ['svt'] },
    { title: 'Young Royals', year: 2021, level: 'B1', why: 'A boarding-school drama in today’s Swedish, short and clear.', on: ['netflix'] },
    { title: 'Störst av allt', en: 'Quicksand', year: 2019, level: 'B2', why: 'A courtroom drama with careful, formal Swedish.', on: ['netflix'] },
    { title: 'Bonusfamiljen', en: 'The Bonus Family', year: 2017, level: 'B1', why: 'A blended family’s everyday life and squabbles.', on: ['svt'] },
    { title: 'Kärlek & anarki', en: 'Love & Anarchy', year: 2020, level: 'B2', why: 'A Stockholm office comedy, modern and quick.', on: ['netflix'] },
  ],
  films: [
    { title: 'En man som heter Ove', en: 'A Man Called Ove', year: 2015, level: 'B1', why: 'A grumpy neighbour, clear speech and a lot of heart.' },
    { title: 'Låt den rätte komma in', en: 'Let the Right One In', year: 2008, level: 'B1', why: 'Quiet, sparse dialogue in a Stockholm suburb.' },
    { title: 'Så som i himmelen', en: 'As It Is in Heaven', year: 2004, level: 'B1', why: 'A village choir: warm and easy to follow.' },
    { title: 'Ronja Rövardotter', en: 'Ronia, the Robber’s Daughter', year: 1984, level: 'A2', why: 'Astrid Lindgren’s story, in simple spoken Swedish.' },
  ],
  books: [
    { title: 'Pippi Långstrump', by: 'Astrid Lindgren', year: 1945, level: 'A2', why: 'Short, funny chapters every Swede grew up with.' },
    { title: 'Bröderna Lejonhjärta', en: 'The Brothers Lionheart', by: 'Astrid Lindgren', year: 1973, level: 'B1', why: 'A beloved adventure in clear, simple prose.' },
    { title: 'En man som heter Ove', en: 'A Man Called Ove', by: 'Fredrik Backman', year: 2012, level: 'B1', why: 'Short chapters, everyday words and plenty of humour.' },
    { title: 'Nils Holgerssons underbara resa', en: 'The Wonderful Adventures of Nils', by: 'Selma Lagerlöf', year: 1906, level: 'B2', why: 'A journey over Sweden on a goose’s back.' },
    { title: 'Män som hatar kvinnor', en: 'The Girl with the Dragon Tattoo', by: 'Stieg Larsson', year: 2005, level: 'B2', why: 'A thriller that keeps the pages turning.' },
  ],
  games: [
    { title: 'Minecraft', by: 'Mojang', year: 2011, level: 'A2', why: 'Made in Stockholm; set it to Svenska.', url: 'https://www.minecraft.net/' },
    { title: 'Valheim', by: 'Iron Gate', year: 2021, level: 'B1', why: 'A Swedish-made Viking survival game you can play in Swedish.' },
  ],
  podcasts: [
    { title: 'Klartext', by: 'Sveriges Radio', level: 'A2', why: 'The news in easy Swedish, every weekday.' },
    { title: 'Say It In Swedish', level: 'A2', why: 'Everyday Swedish in short, friendly episodes.' },
    { title: 'P3 Dokumentär', by: 'Sveriges Radio', level: 'C1', why: 'Sweden’s favourite documentary podcast.' },
  ],
  youtube: [
    { title: 'Easy Swedish', level: 'A2', why: 'Street interviews with subtitles in both languages.' },
    { title: 'SwedishPod101', level: 'A1', why: 'Short structured lessons.' },
    { title: 'SVT', level: 'B2', why: 'Clips and news from Swedish public television.', search: 'SVT Sveriges Television' },
  ],
  dictionaries: [
    { title: 'Svenska Akademiens ordböcker', level: 'B1', why: 'The Swedish Academy’s dictionaries in one search.', url: 'https://svenska.se/' },
    { title: 'Folkets lexikon', level: 'A1', why: 'A free Swedish–English dictionary with recordings.', url: 'https://folkets-lexikon.csc.kth.se/folkets/' },
    { title: 'Lexin', level: 'A2', why: 'Made for newcomers to Sweden: simple definitions and pictures.', url: 'https://lexin.nada.kth.se/lexin/' },
    { title: 'Tyda', level: 'A1', why: 'Quick Swedish–English lookups.', url: 'https://tyda.se/' },
  ],
};

export default picks;
