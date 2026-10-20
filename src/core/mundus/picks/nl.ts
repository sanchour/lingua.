import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Het Klokhuis', year: 1988, level: 'A2', why: 'Children’s show that explains how things work, slowly and clearly, in short episodes.', on: ['npo'] },
    { title: 'De Luizenmoeder', year: 2018, level: 'B1', why: 'A primary-school comedy: parents’ small talk at the school gate and very Dutch awkwardness.', on: ['npo'] },
    { title: 'Thuis', year: 1995, level: 'B1', why: 'Flemish soap since 1995: kitchen-table talk in the Dutch people in Flanders really speak.', on: ['vrt'] },
    { title: 'Undercover', year: 2019, level: 'B2', why: 'A drugs sting on a campsite: Flemish and Netherlands Dutch side by side, often in one scene.', on: ['netflix'] },
    { title: 'De Twaalf', en: 'The Twelve', by: 'Sanne Nuyens, Bert Van Dael', year: 2019, level: 'B2', why: 'Flemish courtroom drama: careful legal speech, then twelve jurors’ everyday lives at home.', on: ['vrt'] },
    { title: 'Mocro Maffia', year: 2018, level: 'C1', why: 'Amsterdam crime drama thick with straattaal, the street slang built from Dutch, Arabic and Sranan.', on: ['videoland'] },
  ],
  films: [
    { title: 'Pluk van de Petteflet', by: 'Ben Sombogaart', year: 2004, level: 'A2', why: 'Annie M.G. Schmidt’s children’s story: simple dialogue and a plot you can follow on the pictures.' },
    { title: 'Alles is liefde', en: 'Love Is All', by: 'Joram Lürsen', year: 2007, level: 'B1', why: 'A Dutch romcom in the weeks round Sinterklaas: everyday conversation and a festive tradition.' },
    { title: 'Oorlogswinter', en: 'Winter in Wartime', by: 'Martin Koolhoven', year: 2008, level: 'B1', why: 'A boy in the occupied Netherlands: short, clear lines, and Jan Terlouw’s novel to read after.' },
    { title: 'Zwartboek', en: 'Black Book', by: 'Paul Verhoeven', year: 2006, level: 'B2', why: 'A resistance thriller in wartime Holland, with German and English woven through the Dutch.' },
    { title: 'Loft', by: 'Erik Van Looy', year: 2008, level: 'B2', why: 'A Flemish thriller about five friends and one shared flat: quick, natural Flemish banter.' },
    { title: 'Rundskop', en: 'Bullhead', by: 'Michaël R. Roskam', year: 2011, level: 'C1', why: 'Flemish: a dark farm drama in thick Limburg dialect, a real test for the ear.' },
  ],
  books: [
    { title: 'Nijntje', en: 'Miffy', by: 'Dick Bruna', year: 1955, level: 'A1', why: 'Four rhyming lines and one picture a page: the first book of nearly every Dutch child.' },
    { title: 'Short Stories in Dutch for Beginners', by: 'Olly Richards', year: 2019, level: 'A2', why: 'Eight graded stories, each with a word list and comprehension questions.' },
    { title: 'Jip en Janneke', by: 'Annie M.G. Schmidt', level: 'A2', why: 'Two small neighbours in tiny stories: short sentences every Dutch reader grew up with.' },
    { title: 'Het Achterhuis', en: 'The Diary of a Young Girl', by: 'Anne Frank', year: 1947, level: 'B1', why: 'Anne Frank’s diary in her own Dutch: short dated entries in a lively, personal voice.' },
    { title: 'De brief voor de koning', en: 'The Letter for the King', by: 'Tonke Dragt', year: 1962, level: 'B1', why: 'A young knight’s quest written for young readers: clear prose and a plot that pulls you on.' },
    { title: 'Het diner', en: 'The Dinner', by: 'Herman Koch', year: 2009, level: 'B2', why: 'One restaurant meal, course by course: modern Dutch prose with a sharp, chatty narrator.' },
    { title: 'Het verdriet van België', en: 'The Sorrow of Belgium', by: 'Hugo Claus', year: 1983, level: 'C1', why: 'The great Flemish novel: wartime Flanders through a boy’s eyes, dense and rich in dialect.' },
  ],
  games: [
    { title: 'Minecraft', by: 'Mojang', year: 2011, level: 'A2', why: 'Set it to Nederlands: blocks, tools and menus in plain everyday words.', url: 'https://www.minecraft.net/' },
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Fully translated into Dutch: everyday words and short, friendly island chat.', url: 'https://animal-crossing.com/new-horizons/' },
    { title: 'De Sims 4', en: 'The Sims 4', by: 'Maxis', year: 2014, level: 'B1', why: 'Daily life in Dutch menus and texts; the Sims speak Simlish, so it’s all reading.', search: 'The Sims 4' },
    { title: 'The Legend of Zelda: Breath of the Wild', by: 'Nintendo', year: 2017, level: 'B1', why: 'All its text in Dutch while the voices stay English: a huge world to read your way through.', url: 'https://zelda.nintendo.com/breath-of-the-wild/' },
  ],
  podcasts: [
    { title: 'Easy Dutch', level: 'A2', why: 'Two hosts chat about life in the Netherlands and explain the tricky words as they go.' },
    { title: 'Een Beetje Nederlands', by: 'Robin van der Markt', level: 'B1', why: 'Slow, clear Dutch about Dutch life and culture, with a transcript for every episode.' },
    { title: 'Echt Gebeurd', by: 'Paulien Cornelisse, Micha Wertheim', level: 'B2', why: 'True stories told live on a small stage: natural spoken Dutch, laughter and all.' },
    { title: 'De Universiteit van Vlaanderen Podcast', level: 'B2', why: 'Flemish: short lectures by researchers from Flanders’ universities, one clear question each.' },
    { title: 'NOS Met het Oog op Morgen', by: 'NOS', level: 'C1', why: 'Radio 1’s late-night news hour: interviews and tomorrow’s papers, at full native speed.' },
  ],
  youtube: [
    { title: 'DutchPod101', level: 'A1', why: 'Short structured lessons on words, grammar and pronunciation.', search: 'Learn Dutch with DutchPod101' },
    { title: 'Easy Dutch', level: 'A2', why: 'Street interviews in the Netherlands with Dutch and English subtitles.' },
    { title: 'NOS Jeugdjournaal', level: 'B1', why: 'The daily news made for children: simple Dutch, clear voices and pictures to help.' },
    { title: 'Karrewiet', level: 'B1', why: 'Flemish: Ketnet’s daily children’s news, clearly told by Flemish presenters.', search: 'Karrewiet van Ketnet' },
    { title: 'Enzo Knol', level: 'B2', why: 'One of the biggest Dutch vloggers: fast, casual Dutch with friends and family.', search: 'Enzoknol' },
  ],
  dictionaries: [
    { title: 'Linguee', level: 'A1', why: 'Dutch–English lookups with each word shown in real translated sentences.', url: 'https://www.linguee.com/english-dutch/' },
    { title: 'Reverso Context', level: 'A2', why: 'Words in real sentences from films and documents.', url: 'https://context.reverso.net/translation/dutch-english/' },
    { title: 'Algemeen Nederlands Woordenboek', level: 'B2', why: 'A free Dutch–Dutch dictionary from the Dutch Language Institute, with examples.', url: 'https://anw.ivdnt.org/' },
    { title: 'Van Dale', level: 'B2', why: 'The best-known Dutch dictionary, with a free online version for quick lookups.', url: 'https://www.vandale.nl/' },
  ],
  notes: { games: 'Few games are made in Dutch and Dutch voices are rare; big titles often come with Dutch text and menus.' },
};

export default picks;
