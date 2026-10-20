import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Bogyó és Babóca', en: 'Berry and Dolly', by: 'M. Tóth Géza', year: 2010, level: 'A1', why: 'Five-minute cartoons for small children: simple words, gentle and slow.' },
    { title: 'Szomszédok', en: 'Neighbours', by: 'Horváth Ádám', year: 1987, level: 'B1', why: 'Life on a Budapest housing estate, 1987–1999: calm, everyday family talk.', on: ['mediaklikk'] },
    { title: 'Terápia', year: 2012, level: 'B2', why: 'A therapist and one patient per episode: two voices, clear speech and nothing else.', on: ['max'] },
    { title: 'A mi kis falunk', year: 2017, level: 'B2', why: 'A comedy set in a small village: country characters, rural speech and running jokes.' },
    { title: 'A besúgó', en: 'The Informant', by: 'Szentgyörgyi Bálint', year: 2022, level: 'B2', why: 'Students and the secret police in 1985 Budapest; tense, well-spoken dialogue.' },
    { title: 'Aranyélet', en: 'Golden Life', year: 2015, level: 'C1', why: 'A Budapest family drifts into crime: fast, rough street Hungarian and plenty of swearing.', on: ['max'] },
  ],
  films: [
    { title: 'Vuk', en: 'The Little Fox', by: 'Dargay Attila', year: 1981, level: 'A2', why: 'A fox cub grows up: a classic cartoon with simple, clear lines.' },
    { title: 'Macskafogó', en: 'Cat City', by: 'Ternovszky Béla', year: 1986, level: 'B1', why: 'An animated spy spoof full of puns and lines every Hungarian can quote.' },
    { title: 'Mindenki', en: 'Sing', by: 'Deák Kristóf', year: 2016, level: 'B1', why: 'An Oscar-winning short about a school choir: children’s clear, simple speech.' },
    { title: 'Testről és lélekről', en: 'On Body and Soul', by: 'Enyedi Ildikó', year: 2017, level: 'B2', why: 'Two shy colleagues share the same dream each night: quiet scenes, sparse dialogue.' },
    { title: 'A tanú', en: 'The Witness', by: 'Bacsó Péter', year: 1969, level: 'B2', why: 'A satire of the 1950s, shelved for a decade, whose lines became everyday sayings.' },
    { title: 'Kontroll', by: 'Antal Nimród', year: 2003, level: 'C1', why: 'Ticket inspectors in the Budapest metro: quick banter and street slang.' },
  ],
  books: [
    { title: 'Bogyó és Babóca', en: 'Berry and Dolly', by: 'Bartos Erika', level: 'A1', why: 'Picture books for small children: a few short sentences on each page.' },
    { title: 'A kis herceg', en: 'The Little Prince', by: 'Antoine de Saint-Exupéry', level: 'B1', why: 'A story you probably know, in simple Hungarian: guess words from what you remember.' },
    { title: 'Vuk', by: 'Fekete István', year: 1965, level: 'B1', why: 'The novel behind the cartoon: a fox cub’s life, rich in words for nature.' },
    { title: 'A Pál utcai fiúk', en: 'The Paul Street Boys', by: 'Molnár Ferenc', year: 1906, level: 'B2', why: 'Schoolboys fight for a Budapest vacant lot; the book every Hungarian reads at school.' },
    { title: 'Egyperces novellák', en: 'One Minute Stories', by: 'Örkény István', year: 1968, level: 'B2', why: 'Dry, absurd stories that fit on a page: finish one in a single sitting.' },
    { title: 'Abigél', en: 'Abigail', by: 'Szabó Magda', year: 1970, level: 'B2', why: 'A girl sent to a strict boarding school in wartime: a gripping, easy-flowing read.' },
    { title: 'Egri csillagok', en: 'Eclipse of the Crescent Moon', by: 'Gárdonyi Géza', year: 1899, level: 'C1', why: 'The siege of Eger in 1552: the national adventure novel, rich in old words.' },
  ],
  games: [
    { title: 'Minecraft', by: 'Mojang', year: 2011, level: 'A2', why: 'Set it to Magyar: short, practical words for everything you build.', url: 'https://www.minecraft.net/' },
    { title: 'Stardew Valley', by: 'ConcernedApe', year: 2016, level: 'B1', why: 'Farm life in a full Hungarian translation, with daily words and village small talk.' },
    { title: 'The Witcher 3: Wild Hunt', by: 'CD Projekt Red', year: 2015, level: 'B2', why: 'Hungarian subtitles and menus throughout: hours of rich, story-heavy reading.' },
  ],
  podcasts: [
    { title: 'Hungarian with Patrik', by: 'Patrik', level: 'A2', why: 'A teacher talks slowly and naturally about everyday topics.' },
    { title: 'Hungarian with Sziszi', level: 'B1', why: 'Colloquial Hungarian at a natural pace, from a teacher, with topics sorted by level.' },
    { title: 'Telex Podcast', by: 'Telex', level: 'C1', why: 'Current affairs from the news site Telex, in clear, journalistic Hungarian.' },
    { title: 'Friderikusz Podcast', by: 'Friderikusz Sándor', level: 'C1', why: 'Long interviews by a veteran TV host, in polished, unhurried Hungarian.' },
  ],
  youtube: [
    { title: 'HungarianPod101', level: 'A1', why: 'Short structured lessons on words and grammar.' },
    { title: 'Hungarian by Heart', level: 'A2', why: 'Lilla teaches through comprehensible input: simple Hungarian you can follow.' },
    { title: 'Hungarian with Sziszi', level: 'B1', why: 'Everyday stories in real spoken Hungarian, sorted by level.' },
    { title: 'Telex', level: 'B2', why: 'News reports and explainers from one of Hungary’s most-read news sites.', search: 'Telex.hu' },
    { title: 'PamKutya', level: 'C1', why: 'Two brothers’ song parodies, packed with slang and Hungarian in-jokes.' },
  ],
  dictionaries: [
    { title: 'SZTAKI Szótár', level: 'A1', why: 'The best-known free Hungarian–English dictionary, with phrases and examples.', url: 'https://szotar.sztaki.hu/' },
    { title: 'Glosbe', level: 'A2', why: 'Words shown in real sentences from translated texts.', url: 'https://glosbe.com/hu/en' },
    { title: 'Wiktionary', level: 'A2', why: 'Full case and conjugation tables for every word: Hungarian’s endings laid out.', url: 'https://en.wiktionary.org/wiki/Category:Hungarian_language' },
    { title: 'Helyesírási tanácsadó portál', en: 'Spelling Advice Portal', level: 'B1', why: 'The linguistics institute’s official spelling help: check a word and how it is split or joined.', url: 'https://helyesiras.mta.hu/' },
  ],
  notes: { games: 'Hardly any games are voiced in Hungarian; these have their text fully translated.' },
};

export default picks;
