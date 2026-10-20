import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'Lupin', by: 'George Kay', year: 2021, level: 'B1', why: 'A gentleman thief in Paris: clear, modern French and a plot that carries you.', on: ['netflix'] },
    { title: 'Dix pour cent', en: 'Call My Agent!', year: 2015, level: 'B2', why: 'Talent agents and real French stars: quick, witty office French.', on: ['netflix', 'francetv'] },
    { title: 'Le Bureau des légendes', en: 'The Bureau', year: 2015, level: 'C1', why: 'A spy drama of quiet conversations, precise and formal.' },
    { title: 'En thérapie', en: 'In Therapy', year: 2021, level: 'B2', why: 'Each episode is one conversation in a therapist’s room: slow, clear, emotional.', on: ['arte'] },
    { title: 'Plan cœur', en: 'The Hook Up Plan', year: 2018, level: 'B1', why: 'A light Paris romcom full of everyday slang among friends.', on: ['netflix'] },
    { title: 'Kaamelott', by: 'Alexandre Astier', year: 2005, level: 'C1', why: 'King Arthur as a sitcom; much-quoted French humour, once you’re ready.' },
  ],
  films: [
    { title: 'Le Fabuleux Destin d’Amélie Poulain', en: 'Amélie', by: 'Jean-Pierre Jeunet', year: 2001, level: 'B1', why: 'A narrator explains everything you see, in calm, precise French.' },
    { title: 'Intouchables', en: 'The Intouchables', year: 2011, level: 'B1', why: 'Two worlds of French, from banlieue slang to the Parisian upper class.' },
    { title: 'Bienvenue chez les Ch’tis', en: 'Welcome to the Sticks', year: 2008, level: 'B2', why: 'A comedy about the northern accent: hear how French varies.' },
    { title: 'Les Choristes', en: 'The Chorus', year: 2004, level: 'B1', why: 'A gentle school story with clear dialogue and songs.' },
    { title: 'Le Dîner de cons', en: 'The Dinner Game', year: 1998, level: 'B2', why: 'A classic farce in one flat: lots of talk, all of it funny.' },
  ],
  books: [
    { title: 'Short Stories in French for Beginners', by: 'Olly Richards', level: 'A2', why: 'Graded stories with summaries and word lists.' },
    { title: 'Le Petit Nicolas', by: 'René Goscinny', year: 1959, level: 'B1', why: 'A schoolboy’s funny short stories, each a few pages long.' },
    { title: 'Le Petit Prince', by: 'Antoine de Saint-Exupéry', year: 1943, level: 'B1', why: 'Written in French: short chapters, simple sentences, deep ideas.' },
    { title: 'Astérix', by: 'Goscinny et Uderzo', level: 'B1', why: 'Comics: pictures help with every line, and the puns reward you later.' },
    { title: 'L’Étranger', en: 'The Stranger', by: 'Albert Camus', year: 1942, level: 'B2', why: 'Famously plain, short sentences: a classic within reach.' },
    { title: 'Les Misérables', by: 'Victor Hugo', year: 1862, level: 'C1', why: 'The great French novel, when you want a long companion.' },
  ],
  games: [
    { title: 'Clair Obscur: Expedition 33', by: 'Sandfall Interactive', year: 2025, level: 'B2', why: 'Made in France and voiced in French; a story worth following closely.' },
    { title: 'A Plague Tale: Innocence', by: 'Asobo Studio', year: 2019, level: 'B1', why: 'Set in medieval France, with a French voice cast to choose.' },
    { title: 'Detroit: Become Human', by: 'Quantic Dream', year: 2018, level: 'B2', why: 'A French studio’s choice-driven story: every conversation matters.' },
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Everyday words and short friendly dialogue, at your own pace.', url: 'https://animal-crossing.com/new-horizons/' },
  ],
  podcasts: [
    { title: 'innerFrench', by: 'Hugo Cotton', level: 'B1', why: 'Interesting topics in clear, natural French for intermediate learners.' },
    { title: 'Coffee Break French', by: 'Coffee Break Languages', level: 'A1', why: 'Structured lessons from the very start.' },
    { title: 'Journal en français facile', by: 'RFI', level: 'B1', why: 'Ten minutes of world news a day in simpler French, with transcripts.' },
    { title: 'Duolingo French Podcast', level: 'B1', why: 'True stories in easy French, with a little English.' },
    { title: 'Français Authentique', by: 'Johan Tekfak', level: 'B1', why: 'Everyday French and how people really say things.' },
  ],
  youtube: [
    { title: 'innerFrench', level: 'B1', why: 'Videos in slow, clear French about culture and learning.' },
    { title: 'Easy French', level: 'A2', why: 'Street interviews in France with French and English subtitles.' },
    { title: 'Français avec Pierre', level: 'A2', why: 'Grammar and vocabulary explained entirely in French.' },
    { title: 'Comme une Française', level: 'B1', why: 'Real spoken French: what textbooks leave out.' },
    { title: 'HugoDécrypte', level: 'B2', why: 'The news explained for young people, quick and clear.' },
  ],
  dictionaries: [
    { title: 'WordReference', level: 'A1', why: 'Translations plus native speakers’ forum answers.', url: 'https://www.wordreference.com/fren/' },
    { title: 'Larousse', level: 'A2', why: 'French–English and French–French, with pronunciation.', url: 'https://www.larousse.fr/dictionnaires/francais-anglais' },
    { title: 'CNRTL', level: 'B2', why: 'Definitions, synonyms and etymology from France’s research centre.', url: 'https://www.cnrtl.fr/' },
    { title: 'Reverso Context', level: 'A2', why: 'Words in real sentences.', url: 'https://context.reverso.net/translation/french-english/' },
  ],
};

export default picks;
