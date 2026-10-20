import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Το Νησί', en: 'The Island', year: 2010, level: 'B2', why: 'Greece’s most-watched series, from the novel about Spinalonga; clear, dramatic Greek.', on: ['ert'] },
    { title: 'Maestro', en: 'Maestro in Blue', by: 'Χριστόφορος Παπακαλιάτης', year: 2022, level: 'B2', why: 'A summer on Paxos: island life and natural conversation.', on: ['netflix'] },
    { title: 'Άγριες Μέλισσες', en: 'Wild Bees', year: 2019, level: 'B2', why: 'A drama in 1950s rural Greece, slow and clear.' },
  ],
  films: [
    { title: 'Πολίτικη Κουζίνα', en: 'A Touch of Spice', year: 2003, level: 'B1', why: 'Food, family and memory, in warm everyday Greek.' },
    { title: 'Νύφες', en: 'Brides', year: 2004, level: 'B1', why: 'A love story aboard a ship of brides; gentle and clear.' },
    { title: 'Μικρά Αγγλία', en: 'Little England', year: 2013, level: 'B2', why: 'Andros between the wars: a family drama with careful dialogue.' },
    { title: 'Ο Κυνόδοντας', en: 'Dogtooth', by: 'Γιώργος Λάνθιμος', year: 2009, level: 'B2', why: 'Lanthimos’s strange world: short, deliberate lines.' },
  ],
  books: [
    { title: 'Greek Short Stories for Beginners', by: 'Olly Richards', level: 'A2', why: 'Graded stories with summaries and word lists.' },
    { title: 'Ο Μικρός Πρίγκιπας', en: 'The Little Prince', by: 'Αντουάν ντε Σεντ-Εξιπερί', level: 'B1', why: 'A story you know, in simple Greek.' },
    { title: 'Αστερίξ', en: 'Asterix', by: 'Goscinny & Uderzo', level: 'B1', why: 'Comics: the pictures carry you through every line.' },
    { title: 'Βίος και πολιτεία του Αλέξη Ζορμπά', en: 'Zorba the Greek', by: 'Νίκος Καζαντζάκης', year: 1946, level: 'C1', why: 'The Greek classic, for when you’re ready for a long read.' },
  ],
  games: [
    { title: 'Minecraft', by: 'Mojang', year: 2011, level: 'A2', why: 'Set it to Ελληνικά: short, practical words for everything you build.', url: 'https://www.minecraft.net/' },
  ],
  podcasts: [
    { title: 'Easy Greek', level: 'A2', why: 'Conversations about life in Greece, with transcripts for members.' },
    { title: 'GreekPod101', level: 'A1', why: 'Short structured lessons from the start.' },
  ],
  youtube: [
    { title: 'Easy Greek', level: 'A2', why: 'Street interviews in Greece with subtitles in both languages.' },
    { title: 'GreekPod101', level: 'A1', why: 'Short lessons on words and grammar.' },
    { title: 'ΕΡΤ', en: 'ERT', level: 'B2', why: 'The public broadcaster’s news and documentaries.', search: 'ΕΡΤ Ελληνική Ραδιοφωνία Τηλεόραση' },
  ],
  dictionaries: [
    { title: 'WordReference', level: 'A1', why: 'Greek–English with examples.', url: 'https://www.wordreference.com/gren/' },
    { title: 'Πύλη για την ελληνική γλώσσα', en: 'Portal for the Greek Language', level: 'B1', why: 'The official dictionary of Standard Modern Greek, with every form.', url: 'https://www.greek-language.gr/' },
    { title: 'Wiktionary', level: 'A2', why: 'Full tables of every form, with stress.', url: 'https://en.wiktionary.org/wiki/Category:Greek_language' },
  ],
  notes: { games: 'Few games are made in Greek; most come with Greek menus at best. Minecraft is fully translated.' },
};

export default picks;
