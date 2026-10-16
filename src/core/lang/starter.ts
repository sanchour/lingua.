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

export interface StarterTheme {
  id: string;
  name: string;
  /** One line for the deck card. */
  blurb: string;
}

export const STARTER_THEMES: StarterTheme[] = [
  { id: 'basics', name: 'Basics', blurb: 'Greetings, questions and the words every conversation needs' },
  { id: 'verbs', name: 'Essential verbs', blurb: 'Sixty everyday actions' },
  { id: 'connectors', name: 'Connectors', blurb: 'And, but, because: the glue of sentences' },
  { id: 'animals', name: 'Animals', blurb: 'From cats and dogs to whales and owls' },
  { id: 'food', name: 'Food & drink', blurb: 'The market, the kitchen and the table' },
  { id: 'people', name: 'Family & people', blurb: 'Relatives, friends and everyone else' },
  { id: 'home', name: 'Home & everyday objects', blurb: 'Rooms, furniture, clothes and things at hand' },
  { id: 'time', name: 'Numbers, time & dates', blurb: 'Counting, days, months and seasons' },
  { id: 'describe', name: 'Colours & adjectives', blurb: 'Colours, sizes and qualities' },
  { id: 'body', name: 'Body & health', blurb: 'From head to toe, and a visit to the doctor' },
  { id: 'travel', name: 'Travel & places', blurb: 'Getting around town and around the world' },
  { id: 'nature', name: 'Weather & nature', blurb: 'Sky, seasons, plants and landscapes' },
  { id: 'feelings', name: 'Feelings', blurb: 'Saying how you feel' },
  { id: 'work', name: 'School & work', blurb: 'Classes, offices and getting things done' },
];

export const getTheme = (id: string) => STARTER_THEMES.find((t) => t.id === id);
