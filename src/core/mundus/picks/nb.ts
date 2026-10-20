import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Skam', by: 'Julie Andem', year: 2015, level: 'B1', why: 'Oslo teenagers in short scenes: everyday spoken Norwegian and slang.', on: ['nrk'] },
    { title: 'Rådebank', year: 2020, level: 'B2', why: 'A comedy in the dialect of Norway’s west: hear how Norwegian varies.', on: ['nrk'] },
    { title: 'Lykkeland', en: 'State of Happiness', year: 2018, level: 'B2', why: 'Stavanger and the oil boom of 1969, told in clear period drama.', on: ['nrk'] },
    { title: 'Hjem til jul', en: 'Home for Christmas', year: 2019, level: 'B1', why: 'A light Christmas romcom full of family talk.', on: ['netflix'] },
    { title: 'Ragnarok', year: 2020, level: 'B1', why: 'Norse gods in a fjord town; short, simple dialogue.', on: ['netflix'] },
  ],
  films: [
    { title: 'Flåklypa Grand Prix', en: 'Pinchcliffe Grand Prix', year: 1975, level: 'A2', why: 'Norway’s beloved stop-motion film, slow and clear.' },
    { title: 'Trolljegeren', en: 'Troll Hunter', year: 2010, level: 'B1', why: 'A mock documentary: natural, unscripted-sounding speech.' },
    { title: 'Kongens nei', en: 'The King’s Choice', year: 2016, level: 'B2', why: 'April 1940 and a king’s decision; measured, formal Norwegian.' },
    { title: 'Verdens verste menneske', en: 'The Worst Person in the World', by: 'Joachim Trier', year: 2021, level: 'B2', why: 'Oslo life in twelve chapters, in modern everyday Norwegian.' },
  ],
  books: [
    { title: 'Karius og Baktus', by: 'Thorbjørn Egner', year: 1949, level: 'A2', why: 'A short children’s classic about two tooth trolls.' },
    { title: 'Naiv. Super.', by: 'Erlend Loe', year: 1996, level: 'B1', why: 'Short, plain sentences and a narrator who lists his thoughts.' },
    { title: 'Doppler', by: 'Erlend Loe', year: 2004, level: 'B1', why: 'A man moves into the forest with an elk; simple, funny prose.' },
    { title: 'Sofies verden', en: 'Sophie’s World', by: 'Jostein Gaarder', year: 1991, level: 'B2', why: 'Philosophy as a mystery novel, in clear Bokmål.' },
  ],
  games: [{ title: 'Minecraft', by: 'Mojang', year: 2011, level: 'A2', why: 'Set it to Norsk bokmål: short, practical words for all you build.', url: 'https://www.minecraft.net/' }],
  podcasts: [
    { title: 'Klar Tale', level: 'A2', why: 'The news in easy Norwegian, from the paper made for learners.' },
    { title: 'NorwegianClass101', level: 'A1', why: 'Short structured lessons from the start.' },
  ],
  youtube: [
    { title: 'NRK Super', level: 'A2', why: 'The public broadcaster’s children’s channel: clear, simple speech.' },
    { title: 'NorwegianClass101', level: 'A1', why: 'Short lessons on words and grammar.' },
    { title: 'NRK', level: 'B2', why: 'Clips, sketches and news from Norwegian public television.', search: 'NRK Norsk rikskringkasting' },
  ],
  dictionaries: [
    { title: 'Ordbøkene', level: 'A2', why: 'The official Bokmål and Nynorsk dictionaries, with every form.', url: 'https://ordbokene.no/' },
    { title: 'Naob', level: 'B2', why: 'The large Norwegian Academy dictionary.', url: 'https://naob.no/' },
    { title: 'Glosbe', level: 'A1', why: 'Norwegian–English with example sentences.', url: 'https://glosbe.com/nb/en' },
  ],
  notes: { games: 'Few games come in Norwegian; Minecraft is fully translated.' },
};

export default picks;
