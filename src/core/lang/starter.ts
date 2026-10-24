// The ready-made deck library (Thesaurus › Starter decks). Shared by the pack builder
// (scripts/lang-data) and the app; the word lists themselves ship inside each language pack.

/**
 * Frequency milestones. Each deck holds the band between the previous milestone and this one
 * (Top 250 = words 201–250), so working up the path never repeats a word.
 */
export const FREQUENCY_MILESTONES = [100, 200, 250, 500, 1000, 2000, 5000, 10_000] as const;

export function frequencyBand(milestone: number): [from: number, to: number] {
  const i = FREQUENCY_MILESTONES.indexOf(milestone as (typeof FREQUENCY_MILESTONES)[number]);
  return [i > 0 ? FREQUENCY_MILESTONES[i - 1] + 1 : 1, milestone];
}

/** Each stop on the vocabulary journey, and what reaching it lets you do. */
export const JOURNEY_STAGES: Record<number, { name: string; lets: string }> = {
  100: { name: 'First words', lets: 'greet, ask and answer the simplest things' },
  200: { name: 'Finding your feet', lets: 'follow slow, simple sentences' },
  250: { name: 'Everyday basics', lets: 'get by in shops, cafés and trains' },
  500: { name: 'Small talk', lets: 'chat about yourself and your day' },
  1000: { name: 'Daily life', lets: 'understand most everyday conversation' },
  2000: { name: 'Real conversations', lets: 'follow series, podcasts and easy books' },
  5000: { name: 'Reading freely', lets: 'read novels and the news with few gaps' },
  10_000: { name: 'Fluent reader', lets: 'read almost anything with ease' },
};

/** Discover's shelves (5.1-3b). The path is the frequency milestones; computed decks need no word list of their own. */
export type ThemeGroup = 'everyday' | 'fun' | 'grammar' | 'computed';

export const THEME_GROUPS: Array<{ id: 'path' | ThemeGroup; name: string; blurb: string }> = [
  { id: 'path', name: 'Path', blurb: 'The most common words, band by band' },
  { id: 'everyday', name: 'Everyday', blurb: 'The words of daily life' },
  { id: 'fun', name: 'Fun', blurb: 'For the things you love' },
  { id: 'grammar', name: 'Grammar', blurb: 'The words that hold sentences together' },
  { id: 'computed', name: 'Made for you', blurb: 'Worked out from the language and from what you do' },
];

export interface StarterTheme {
  id: string;
  name: string;
  /** One line for the deck card. */
  blurb: string;
  group: ThemeGroup;
}

export const STARTER_THEMES: StarterTheme[] = [
  { id: 'basics', name: 'Basics', blurb: 'Greetings, questions and the words every conversation needs', group: 'everyday' },
  { id: 'food', name: 'Food & drink', blurb: 'The market, the kitchen and the table', group: 'everyday' },
  { id: 'people', name: 'Family & people', blurb: 'Relatives, friends and everyone else', group: 'everyday' },
  { id: 'time', name: 'Numbers, time & dates', blurb: 'Counting, days, months and seasons', group: 'everyday' },
  { id: 'describe', name: 'Colours & adjectives', blurb: 'Colours, sizes and qualities', group: 'everyday' },
  { id: 'home', name: 'Home & everyday objects', blurb: 'Rooms, furniture, clothes and things at hand', group: 'everyday' },
  { id: 'clothes', name: 'Clothes', blurb: 'What to wear, from hats to shoes', group: 'everyday' },
  { id: 'body', name: 'Body & health', blurb: 'From head to toe, and a visit to the doctor', group: 'everyday' },
  { id: 'health', name: 'Health', blurb: 'Doctors, medicine and feeling better', group: 'everyday' },
  { id: 'feelings', name: 'Feelings', blurb: 'Saying how you feel', group: 'everyday' },
  { id: 'animals', name: 'Animals', blurb: 'From cats and dogs to whales and owls', group: 'everyday' },
  { id: 'nature', name: 'Weather & nature', blurb: 'Sky, seasons, plants and landscapes', group: 'everyday' },
  { id: 'travel', name: 'Travel & places', blurb: 'Getting around town and around the world', group: 'everyday' },
  { id: 'city', name: 'In the city', blurb: 'Buildings, streets and getting about town', group: 'everyday' },
  { id: 'directions', name: 'Directions', blurb: 'Left, right and how to get there', group: 'everyday' },
  { id: 'shopping', name: 'Shopping', blurb: 'Prices, paying and the shops you need', group: 'everyday' },
  { id: 'restaurant', name: 'At the restaurant', blurb: 'Ordering, eating and paying the bill', group: 'everyday' },
  { id: 'hotel', name: 'At the hotel', blurb: 'Booking, staying and checking out', group: 'everyday' },
  { id: 'kitchen', name: 'In the kitchen', blurb: 'Pots, pans and how to cook', group: 'everyday' },
  { id: 'work', name: 'School & work', blurb: 'Classes, offices and getting things done', group: 'everyday' },
  { id: 'tech', name: 'Technology', blurb: 'Phones, computers and the internet', group: 'everyday' },
  { id: 'sport', name: 'Sport', blurb: 'Games, teams and staying fit', group: 'everyday' },
  { id: 'hobbies', name: 'Hobbies', blurb: 'Music, art and what you do for fun', group: 'everyday' },
  { id: 'cafe', name: 'Coffee shop', blurb: 'Coffee, cake and a seat by the window', group: 'fun' },
  { id: 'film', name: 'Film night', blurb: 'Actors, genres and popcorn', group: 'fun' },
  { id: 'football', name: 'Football', blurb: 'Goals, fans and the referee', group: 'fun' },
  { id: 'love', name: 'Love & dating', blurb: 'Romance, couples and weddings', group: 'fun' },
  { id: 'compliments', name: 'Compliments', blurb: 'Kind words to make someone’s day', group: 'fun' },
  { id: 'exclamations', name: 'Exclamations', blurb: 'Wow, oops, ouch and good luck', group: 'fun' },
  { id: 'festivals', name: 'Festivals', blurb: 'Celebrations, parades and fireworks', group: 'fun' },
  { id: 'sea', name: 'The sea', blurb: 'Coasts, creatures and a day at the beach', group: 'fun' },
  { id: 'space', name: 'Space', blurb: 'Planets, stars and astronauts', group: 'fun' },
  { id: 'fantasy', name: 'Fairy tales & fantasy', blurb: 'Dragons, witches, kings and castles', group: 'fun' },
  { id: 'verbs', name: 'Essential verbs', blurb: 'Sixty everyday actions', group: 'grammar' },
  { id: 'irregular', name: 'Irregular verbs', blurb: 'The common verbs that don’t follow the rules', group: 'grammar' },
  { id: 'connectors', name: 'Connectors', blurb: 'And, but, because: the glue of sentences', group: 'grammar' },
  { id: 'questions', name: 'Question words', blurb: 'Who, what, where, when, why and how', group: 'grammar' },
  { id: 'cognates', name: 'Words that look like English', blurb: 'Words you can almost read already', group: 'computed' },
  { id: 'heard', name: 'From songs and shows', blurb: 'The words you looked up while listening and watching', group: 'computed' },
];

/** Computed in the app, not shipped in the pack: the words looked up in songs, videos and audio. */
export const HEARD_THEME = 'heard';

export const getTheme = (id: string) => STARTER_THEMES.find((t) => t.id === id);
