// Cursus, the course (Lingua 5): one outline for the six core languages, twelve units from A1 to B1,
// each named by what you can do after it (the CEFR's can-do lists, in everyday words). Each
// language fills the units with its own words, phrases and grammar (`content/*.ts`).

export type CourseLevel = 'A1' | 'A2' | 'B1';

export const UNIT_IDS = ['hello', 'me', 'family', 'cafe', 'day', 'town', 'shopping', 'home', 'weekend', 'health', 'plans', 'opinions'] as const;
export type UnitId = (typeof UNIT_IDS)[number];

export interface UnitOutline {
  id: UnitId;
  level: CourseLevel;
  /** What you can do after it: the unit's name. */
  title: string;
  /** A word or two for tight places. */
  short: string;
  /** The can-do lines, ticked when the unit is done. */
  canDo: string[];
  /** The writing task, in English. */
  write: string;
  /** What to talk about in the speaking lesson's last, open turn. */
  speak: string;
}

export const OUTLINE: UnitOutline[] = [
  {
    id: 'hello',
    level: 'A1',
    title: 'Say hello and introduce yourself',
    short: 'Hello',
    canDo: ['Say hello and goodbye', 'Say your name and ask someone theirs', 'Ask how someone is, and answer'],
    write: 'Write a short message to a new classmate: say hello, give your name and ask theirs.',
    speak: 'Greet someone, say your name and ask how they are.',
  },
  {
    id: 'me',
    level: 'A1',
    title: 'Talk about yourself',
    short: 'About me',
    canDo: ['Say where you are from and where you live', 'Say which languages you speak', 'Say what you do and how old you are'],
    write: 'Introduce yourself in three or four sentences: where you are from, where you live, what you do and which languages you speak.',
    speak: 'Say where you are from, where you live and what you do.',
  },
  {
    id: 'family',
    level: 'A1',
    title: 'Describe your family',
    short: 'Family',
    canDo: ['Name the people in your family', 'Say what they are like', 'Say whether you have brothers, sisters or children'],
    write: 'Describe your family, or a family you know: who they are and what they are like.',
    speak: 'Tell someone about two people in your family.',
  },
  {
    id: 'cafe',
    level: 'A1',
    title: 'Order food and drink',
    short: 'Café',
    canDo: ['Order something to eat and drink', 'Say what you like and don’t like', 'Ask what something costs, and pay'],
    write: 'Write what you would order in a café, and say what you like to eat and drink.',
    speak: 'Order a drink and something to eat, then ask for the bill.',
  },
  {
    id: 'day',
    level: 'A1',
    title: 'Talk about your day',
    short: 'My day',
    canDo: ['Tell the time', 'Describe your usual day', 'Say what you do on which day'],
    write: 'Describe a usual weekday: when you get up, what you do and when you go to bed.',
    speak: 'Describe your morning, from getting up to leaving the house.',
  },
  {
    id: 'town',
    level: 'A1',
    title: 'Find your way around town',
    short: 'Town',
    canDo: ['Ask where a place is', 'Understand simple directions', 'Say what there is in your town'],
    write: 'Describe your town or neighbourhood: what there is and how you get around.',
    speak: 'Ask the way to the station and repeat the directions.',
  },
  {
    id: 'shopping',
    level: 'A2',
    title: 'Go shopping',
    short: 'Shopping',
    canDo: ['Ask for something in a shop', 'Talk about sizes, colours and prices', 'Compare two things and choose'],
    write: 'Write about something you bought recently: what it is, its colour and price, and why you chose it.',
    speak: 'Ask for a shirt in another size and colour, and say which one you take.',
  },
  {
    id: 'home',
    level: 'A2',
    title: 'Describe your home',
    short: 'Home',
    canDo: ['Describe your home and its rooms', 'Say where things are', 'Say what you like about where you live'],
    write: 'Describe your home: its rooms, what is in them, and your favourite place in it.',
    speak: 'Describe your favourite room and where things are in it.',
  },
  {
    id: 'weekend',
    level: 'A2',
    title: 'Say what you did',
    short: 'The weekend',
    canDo: ['Say what you did yesterday and last weekend', 'Ask someone what they did', 'Tell a short story in the past'],
    write: 'Write about last weekend: where you went, what you did and with whom.',
    speak: 'Tell someone what you did last weekend.',
  },
  {
    id: 'health',
    level: 'A2',
    title: 'Say how you feel',
    short: 'Health',
    canDo: ['Say how you feel and what hurts', 'Explain a problem at the doctor’s or the pharmacy', 'Give and understand simple advice'],
    write: 'Write a message to say you are ill and can’t come: what is wrong and what you are doing about it.',
    speak: 'Explain to a doctor what hurts and since when.',
  },
  {
    id: 'plans',
    level: 'B1',
    title: 'Make plans and travel',
    short: 'Plans',
    canDo: ['Say what you are going to do and will do', 'Invite someone, and accept or decline', 'Book a room and deal with a problem on a trip'],
    write: 'Write to a friend about your plans for the next holiday, and invite them to come along.',
    speak: 'Invite a friend to do something on Saturday and agree on a time.',
  },
  {
    id: 'opinions',
    level: 'B1',
    title: 'Give your opinion',
    short: 'Opinions',
    canDo: ['Say what you think and why', 'Agree and disagree politely', 'Compare two options and recommend one'],
    write: 'Give your opinion on living in a city or in the countryside, with two reasons.',
    speak: 'Say what you think of social media, and why.',
  },
];

export const unitOutline = (id: string): UnitOutline | undefined => OUTLINE.find((u) => u.id === id);

/** The lessons of every unit, in order. Each has one objective. */
export const LESSON_IDS = ['words', 'phrases', 'grammar', 'speak', 'write', 'check'] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export const LESSONS: Record<LessonId, { title: string; aim: string }> = {
  words: { title: 'Words', aim: 'Learn the words of the unit' },
  phrases: { title: 'Phrases', aim: 'Understand and build the key phrases' },
  grammar: { title: 'Grammar', aim: 'The grammar the phrases use' },
  speak: { title: 'Speak', aim: 'Say the phrases aloud' },
  write: { title: 'Write', aim: 'Write it yourself' },
  check: { title: 'Unit check', aim: 'Show what you can do' },
};

/** The share of first tries right that passes a unit check. */
export const CHECK_PASS = 0.8;
