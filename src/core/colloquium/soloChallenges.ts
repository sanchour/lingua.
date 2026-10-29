import type { Level } from '@/core/lang/levels';

export type SoloCategory =
  | 'prompt30'
  | 'monologue60'
  | 'storytelling'
  | 'picture'
  | 'explain'
  | 'debate'
  | 'repeat'
  | 'personalized';

export interface SoloChallenge {
  id: string;
  category: SoloCategory;
  title: string;
  prompt: string;
  hints: string[];
  targetSeconds: number;
  prepSeconds: number;
  level: Level;
  imageUrl?: string;
  imageCaption?: string;
  audioPhrase?: string;
}

export const CATEGORY_LABELS: Record<SoloCategory, { label: string; detail: string }> = {
  prompt30: { label: '30s Prompts', detail: 'Spontaneous rapid-fire answers' },
  monologue60: { label: '1-Min Monologues', detail: 'Sustained speech with clear structure' },
  storytelling: { label: 'Storytelling', detail: 'Narrate events with past tenses and sequencing' },
  picture: { label: 'Picture Tasks', detail: 'Describe details, positions, and atmosphere' },
  explain: { label: 'Explain a Concept', detail: 'Break down an idea clearly for an outsider' },
  debate: { label: 'Impromptu Debate', detail: 'Take a stand and justify your arguments' },
  repeat: { label: 'Listen & Repeat', detail: 'Shadow native phrases with natural cadence' },
  personalized: { label: 'Personalized', detail: 'Built from your words due and weak spots' },
};

/** Predefined challenges across levels and categories. */
export const SOLO_CHALLENGES: SoloChallenge[] = [
  // 30s Prompts (F0608)
  {
    id: 'p30-morning',
    category: 'prompt30',
    title: 'Your morning ritual',
    prompt: 'Describe what you did in the first 30 minutes after waking up this morning.',
    hints: ['Wake up & getting out of bed', 'Breakfast or coffee', 'First thought or feeling'],
    targetSeconds: 30,
    prepSeconds: 10,
    level: 'A1',
  },
  {
    id: 'p30-comfort-food',
    category: 'prompt30',
    title: 'Comfort food',
    prompt: 'What is your favourite comfort meal, and when do you usually crave it?',
    hints: ['Name of the dish & ingredients', 'Why it brings comfort', 'Where you first had it'],
    targetSeconds: 30,
    prepSeconds: 10,
    level: 'A2',
  },
  {
    id: 'p30-recommendation',
    category: 'prompt30',
    title: 'Quick city tip',
    prompt: 'A visitor has only two hours in your favourite town or city. Where must they go?',
    hints: ['One specific landmark or café', 'What makes it unique', 'How to get there'],
    targetSeconds: 30,
    prepSeconds: 10,
    level: 'B1',
  },
  {
    id: 'p30-superpower',
    category: 'prompt30',
    title: 'An unexpected superpower',
    prompt: 'If you could instantly understand all animal languages for one day, what would you do?',
    hints: ['Which animal would you question first', 'What secret you hope to learn', 'A funny consequence'],
    targetSeconds: 30,
    prepSeconds: 10,
    level: 'B2',
  },

  // 1-Min Monologues (F0609)
  {
    id: 'm60-journey',
    category: 'monologue60',
    title: 'A journey that went wrong',
    prompt: 'Tell the story of a travel trip or commute that was disrupted, and how you coped.',
    hints: ['Where you were going & the delay', 'The unexpected detour or obstacle', 'How things eventually resolved'],
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'B1',
  },
  {
    id: 'm60-language-habit',
    category: 'monologue60',
    title: 'How learning languages changes you',
    prompt: 'Speak for one full minute on how acquiring a new language shapes your perspective.',
    hints: ['Cultural insights or new ways of thinking', 'A specific word that has no direct translation', 'Personal growth'],
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'B2',
  },
  {
    id: 'm60-childhood-place',
    category: 'monologue60',
    title: 'A place from your childhood',
    prompt: 'Describe a house, park, or neighbourhood where you spent significant time as a child.',
    hints: ['Sensory details (sounds, smells, colours)', 'Activities you loved doing there', 'How it feels to remember it'],
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'A2',
  },
  {
    id: 'm60-future-city',
    category: 'monologue60',
    title: 'Cities 50 years from now',
    prompt: 'How will urban life, transportation, and daily living look five decades in the future?',
    hints: ['Green spaces & autonomous transport', 'Digital connectivity vs community', 'One challenge cities will overcome'],
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'C1',
  },

  // Storytelling (F0610)
  {
    id: 'story-blackout',
    category: 'storytelling',
    title: 'The sudden blackout',
    prompt: 'Begin with: “At eight in the evening, all the lights in the building flickered and died…” and narrate what happened next.',
    hints: ['Immediate reaction & darkness', 'Searching for a flashlight or phone', 'An amusing or eerie discovery'],
    targetSeconds: 90,
    prepSeconds: 20,
    level: 'B1',
  },
  {
    id: 'story-encounter',
    category: 'storytelling',
    title: 'A coincidental encounter',
    prompt: 'Narrate a chance meeting with someone in an improbable setting (e.g. an airport abroad or a mountain trail).',
    hints: ['The setting and atmosphere', 'The moment of recognition', 'The conversation that unfolded'],
    targetSeconds: 90,
    prepSeconds: 20,
    level: 'B2',
  },
  {
    id: 'story-lost-key',
    category: 'storytelling',
    title: 'The antique key',
    prompt: 'You find a heavy, ornate brass key inside an old library book. Where does it lead?',
    hints: ['Where the book was found', 'Finding the matching lock or door', 'What lay behind the door'],
    targetSeconds: 90,
    prepSeconds: 20,
    level: 'A2',
  },

  // Picture description (F0611)
  {
    id: 'pic-market',
    category: 'picture',
    title: 'Vibrant outdoor market',
    prompt: 'Describe this bustling morning market scene. Mention foreground goods, people, and the ambient atmosphere.',
    hints: ['Foreground stalls with fresh fruit, spices, and flowers', 'Merchants calling out and shoppers bargaining', 'Lighting, scents, and time of day'],
    imageCaption: 'A sunny Mediterranean morning market overflowing with fresh citrus, woven baskets, and lively vendors.',
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'A2',
  },
  {
    id: 'pic-cafe-rain',
    category: 'picture',
    title: 'A café window in the rain',
    prompt: 'Describe the atmosphere inside and outside a cosy coffee shop during a sudden autumn rainstorm.',
    hints: ['Raindrops on the glass & wet cobblestones', 'Customers reading, writing, and steaming mugs', 'Contrast between the chilly outside and warm interior'],
    imageCaption: 'Steamy glass windows overlooking a wet stone alleyway where pedestrians hurry under umbrellas.',
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'B1',
  },
  {
    id: 'pic-workshop',
    category: 'picture',
    title: 'An artisan’s workshop',
    prompt: 'Describe a carpenter’s or bookbinder’s traditional atelier in detail.',
    hints: ['Tools on the workbench (chisels, brushes, leather, wood shavings)', 'The craftsman focused on delicate work', 'The timeless smell of timber and resin'],
    imageCaption: 'A sunlit woodcraft studio filled with chisels, measuring squares, and unfinished furniture pieces.',
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'B2',
  },

  // Explain a concept (F0612)
  {
    id: 'exp-photosynthesis',
    category: 'explain',
    title: 'How plants turn sunlight into life',
    prompt: 'Explain the basic idea of photosynthesis clearly as if explaining it to a curious child.',
    hints: ['Sunlight, water, and air', 'Making sugar or food for the plant', 'Giving off the oxygen we breathe'],
    targetSeconds: 60,
    prepSeconds: 20,
    level: 'B1',
  },
  {
    id: 'exp-jetlag',
    category: 'explain',
    title: 'Why jet lag happens',
    prompt: 'Explain to a friend why crossing several time zones causes physical exhaustion and confusion.',
    hints: ['The internal biological clock (circadian rhythm)', 'Mismatch between local daylight and body time', 'Tips for readjusting quickly'],
    targetSeconds: 60,
    prepSeconds: 20,
    level: 'B2',
  },
  {
    id: 'exp-inflation',
    category: 'explain',
    title: 'Inflation explained simply',
    prompt: 'Explain why prices rise over time and what that means for people’s savings and daily expenses.',
    hints: ['The basket of common goods', 'Supply, demand, and money supply', 'Why moderate inflation is standard'],
    targetSeconds: 90,
    prepSeconds: 20,
    level: 'C1',
  },

  // Impromptu debate (F0613)
  {
    id: 'deb-remote-work',
    category: 'debate',
    title: 'Remote work vs the office',
    prompt: 'Choose one side: “Working from home is fundamentally superior to office working” or the opposite, and defend your stance.',
    hints: ['Flexibility & commute vs spontaneous collaboration', 'Work-life boundaries', 'Final conclusion'],
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'B1',
  },
  {
    id: 'deb-paper-books',
    category: 'debate',
    title: 'Physical books vs e-readers',
    prompt: 'Argue why printed paper books will never be obsolete—or conversely, why digital readers are the superior choice.',
    hints: ['Tactile experience vs portability and storage', 'Screen fatigue vs font customisation', 'Preserving cultural heritage'],
    targetSeconds: 60,
    prepSeconds: 15,
    level: 'B2',
  },
  {
    id: 'deb-space-exploration',
    category: 'debate',
    title: 'Deep space exploration funding',
    prompt: 'Debate whether governments should spend billions on interplanetary missions when major problems remain on Earth.',
    hints: ['Technological spin-offs and human curiosity', 'Urgent climate and social priorities', 'Balancing short and long term'],
    targetSeconds: 90,
    prepSeconds: 20,
    level: 'C1',
  },

  // Listen and repeat / Shadowing (F0487)
  {
    id: 'rep-conversational-rhythm',
    category: 'repeat',
    title: 'Natural conversational cadence',
    prompt: 'Listen to the sentence, observe the pauses and liaison, and repeat it out loud with identical intonation.',
    audioPhrase: 'Si hubiera sabido que venías a la ciudad, te habría preparado una cena especial.',
    hints: ['Notice where the tone rises before the comma', 'Pronounce the vowel liaison smoothly', 'Match the tempo'],
    targetSeconds: 20,
    prepSeconds: 5,
    level: 'B1',
  },
  {
    id: 'rep-polite-request',
    category: 'repeat',
    title: 'Polite inquiry with soft intonation',
    prompt: 'Listen and repeat this polite question, paying special attention to soft pitch and courteous rhythm.',
    audioPhrase: 'Excusez-moi, auriez-vous l’amabilité de m’indiquer la voie pour le prochain train ?',
    hints: ['Gentle stress on the final syllables', 'Clean nasal vowel articulation', 'Natural breath pause'],
    targetSeconds: 20,
    prepSeconds: 5,
    level: 'A2',
  },
  {
    id: 'rep-colloquial-idiom',
    category: 'repeat',
    title: 'Colloquial flow & reduction',
    prompt: 'Repeat this natural expression keeping the relaxed spoken tempo and connected vowels.',
    audioPhrase: 'Das kommt überhaupt nicht in die Tüte, darüber müssen wir gar nicht erst diskutieren.',
    hints: ['Stress on “überhaupt” and “Tüte”', 'Clear German short vowels', 'Convincing spoken conviction'],
    targetSeconds: 20,
    prepSeconds: 5,
    level: 'B2',
  },
];

/** Retrieve challenges filtered by category and level. */
export function getSoloChallenges(_lang: string, category?: SoloCategory, level?: Level): SoloChallenge[] {
  let list = SOLO_CHALLENGES;
  if (category && category !== 'personalized') {
    list = list.filter((c) => c.category === category);
  }
  if (level) {
    const rank: Record<Level, number> = { A0: 1, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };
    list = list.filter((c) => Math.abs(rank[c.level] - rank[level]) <= 1);
  }
  return list;
}

/** Construct a personalized challenge based on the learner's vocabulary memory and topic (F0607). */
export function buildPersonalizedChallenge(_lang: string, level: Level, words: string[], topic?: string): SoloChallenge {
  const chosenWords = words.slice(0, 4);
  const wordsStr = chosenWords.length > 0 ? chosenWords.join(', ') : 'recent study vocabulary';
  const topicStr = topic ? `focused on ${topic}` : 'reflecting on what you learned this week';

  return {
    id: `personalized-${Date.now()}`,
    category: 'personalized',
    title: topic ? `Speaking drill: ${topic}` : 'Your weekly vocabulary in speech',
    prompt: `Deliver a 60-second spontaneous talk ${topicStr}. Try to naturally weave in these target words: ${wordsStr}.`,
    hints: [
      `Introduce your main idea clearly`,
      `Incorporate: ${wordsStr}`,
      `Conclude with a personal takeaway or prediction`,
    ],
    targetSeconds: 60,
    prepSeconds: 15,
    level,
  };
}
