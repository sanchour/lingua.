import { getLanguage } from '@/core/lang/languages';

// Mundus › Beyond the app (Lingua 3.0-7): small, playful challenges that take the language out of
// the app and into the day. General ones are written once with the language's name filled in; a
// few belong to one language (a café phrase, a tongue twister, a custom worth knowing).

export type TipIcon =
  | 'phone'
  | 'apps'
  | 'game'
  | 'keyboard'
  | 'voice'
  | 'labels'
  | 'cook'
  | 'walk'
  | 'song'
  | 'spotify'
  | 'list'
  | 'sun'
  | 'film'
  | 'wiki'
  | 'trip'
  | 'radio'
  | 'cafe'
  | 'meal'
  | 'count'
  | 'mic'
  | 'people'
  | 'lock'
  | 'pen'
  | 'smile';

export interface TipAction {
  label: string;
  /** A route inside Lingua. */
  to?: string;
  /** An address outside it. */
  href?: string;
}

export interface Tip {
  id: string;
  icon: TipIcon;
  title: string;
  /** The front of the card: what the challenge is, in a line. */
  teaser: string;
  /** The back: how to do it. */
  steps?: string[];
  /** Steps per device or app, shown as tabs on the back. */
  platforms?: Array<{ name: string; steps: string[] }>;
  action?: TipAction;
  /** Something to do again and again (each day it's done counts); else done once. */
  habit?: boolean;
}

interface LanguageTipData {
  /** Wikipedia's subdomain. */
  wiki: string;
  dish: string;
  /** What to search for the recipe, in the language. */
  recipe: string;
  /** Ordering a coffee: the phrase and what it means. */
  cafe: [string, string];
  /** Said before (or after) a meal. */
  meal: [string, string];
  /** Whether Siri speaks it. */
  siri?: boolean;
  /** A keyboard worth adding (none for English and Latin). */
  keyboard?: string;
  extras?: Tip[];
}

const DATA: Record<string, LanguageTipData> = {
  en: { wiki: 'en', dish: 'pancakes', recipe: 'pancake recipe', cafe: ['Could I get a flat white, please?', 'a flat white, please'], meal: ['Enjoy your meal!', 'enjoy your meal'], siri: true },
  es: {
    wiki: 'es', dish: 'tortilla de patatas', recipe: 'receta tortilla de patatas', cafe: ['Un café con leche, por favor.', 'a white coffee, please'], meal: ['¡Buen provecho!', 'enjoy your meal'], siri: true, keyboard: 'Spanish',
    extras: [{ id: 'es-time', icon: 'sun', habit: true, title: 'Dime la hora', teaser: 'Say the time in Spanish every time you look at your phone today.', steps: ['Es la una, son las dos y media, son las tres menos cuarto.', 'Add “de la mañana”, “de la tarde” or “de la noche”.', 'By evening the numbers come by themselves.'] }],
  },
  fr: {
    wiki: 'fr', dish: 'crêpes', recipe: 'recette crêpes', cafe: ['Un petit crème, s’il vous plaît.', 'a small white coffee, please'], meal: ['Bon appétit !', 'enjoy your meal'], siri: true, keyboard: 'French',
    extras: [{ id: 'fr-bd', icon: 'pen', title: 'Une BD en français', teaser: 'Read one comic album in French: Astérix, Tintin or Le Petit Nicolas.', steps: ['Pictures carry the story when a word escapes you.', 'Add it to Codex as a comic and tap the bubbles you don’t know.'], action: { label: 'Codex', to: '/codex' } }],
  },
  de: {
    wiki: 'de', dish: 'Käsespätzle', recipe: 'Rezept Käsespätzle', cafe: ['Einen Cappuccino, bitte.', 'a cappuccino, please'], meal: ['Guten Appetit!', 'enjoy your meal'], siri: true, keyboard: 'German',
    extras: [{ id: 'de-verb-last', icon: 'list', habit: true, title: 'Verb ans Ende', teaser: 'Write today’s to-do list the German way, with the verb at the end.', steps: ['Wäsche waschen, Mama anrufen, Brot kaufen.', 'It’s how German infinitive phrases work, and how you’ll hear them.'] }],
  },
  it: {
    wiki: 'it', dish: 'pasta alla carbonara', recipe: 'ricetta carbonara', cafe: ['Un caffè, per favore.', 'an espresso, please'], meal: ['Buon appetito!', 'enjoy your meal'], siri: true, keyboard: 'Italian',
    extras: [{ id: 'it-gestures', icon: 'smile', title: 'Parla con le mani', teaser: 'Learn five Italian hand gestures and what they mean.', steps: ['Ma che vuoi? (fingers pinched together, hand bobbing)', 'Perfetto (thumb and finger in a circle, hand drawn sideways)', 'Look them up on YouTube, then catch them in the next Italian film you watch.'], action: { label: 'YouTube', href: 'https://www.youtube.com/results?search_query=gesti+italiani' } }],
  },
  pt: {
    wiki: 'pt', dish: 'brigadeiro', recipe: 'receita brigadeiro', cafe: ['Um cafezinho, por favor.', 'a little coffee, please (in Lisbon: “uma bica”)'], meal: ['Bom apetite!', 'enjoy your meal'], siri: true, keyboard: 'Portuguese',
  },
  ru: {
    wiki: 'ru', dish: 'борщ', recipe: 'рецепт борща', cafe: ['Капучино, пожалуйста.', 'a cappuccino, please'], meal: ['Приятного аппетита!', 'enjoy your meal'], siri: true, keyboard: 'Russian',
    extras: [{ id: 'ru-name', icon: 'pen', title: 'Твоё имя по-русски', teaser: 'Write your name, your street and your city in Cyrillic.', steps: ['Sound by sound: Anna → Анна, Peter → Питер.', 'Then the names of your family and friends.'] }],
  },
  el: {
    wiki: 'el', dish: 'μουσακάς', recipe: 'συνταγή μουσακάς', cafe: ['Έναν φρέντο εσπρέσο, παρακαλώ.', 'an iced espresso, please'], meal: ['Καλή όρεξη!', 'enjoy your meal'], keyboard: 'Greek',
    extras: [{ id: 'el-nameday', icon: 'people', title: 'Χρόνια πολλά', teaser: 'Find whose name day it is today and wish them “Χρόνια πολλά”.', steps: ['Greeks celebrate the saint’s day of their name, often more than birthdays.', 'Search “εορτολόγιο” to see today’s names.'], action: { label: 'Today’s names', href: 'https://www.google.com/search?q=%CE%B5%CE%BF%CF%81%CF%84%CE%BF%CE%BB%CF%8C%CE%B3%CE%B9%CE%BF+%CF%83%CE%AE%CE%BC%CE%B5%CF%81%CE%B1' } }],
  },
  sv: {
    wiki: 'sv', dish: 'kanelbullar', recipe: 'recept kanelbullar', cafe: ['En kaffe och en kanelbulle, tack.', 'a coffee and a cinnamon bun, thanks'], meal: ['Smaklig måltid!', 'enjoy your meal'], siri: true, keyboard: 'Swedish',
    extras: [{ id: 'sv-fika', icon: 'cafe', habit: true, title: 'Fika på svenska', teaser: 'Take a proper fika break and talk (or think) in Swedish through it.', steps: ['Coffee, something sweet, and no screens.', 'Describe what you’re eating and what you did this morning.'] }],
  },
  hu: {
    wiki: 'hu', dish: 'gulyásleves', recipe: 'gulyásleves recept', cafe: ['Egy kávét kérek.', 'a coffee, please'], meal: ['Jó étvágyat!', 'enjoy your meal'], keyboard: 'Hungarian',
    extras: [{ id: 'hu-twister', icon: 'mic', title: 'Mit sütsz, kis szűcs?', teaser: 'Master Hungary’s favourite tongue twister, then say it three times fast.', steps: ['Mit sütsz, kis szűcs? Sós húst sütsz, kis szűcs?', '“What are you baking, little furrier? Salty meat?”', 'It trains sz, s and ü, ű all at once.'] }],
  },
  nl: {
    wiki: 'nl', dish: 'stamppot', recipe: 'stamppot recept', cafe: ['Een koffie, alstublieft.', 'a coffee, please'], meal: ['Eet smakelijk!', 'enjoy your meal'], siri: true, keyboard: 'Dutch',
    extras: [{ id: 'nl-stay', icon: 'people', habit: true, title: 'Mag het in het Nederlands?', teaser: 'When someone switches to English for you, ask to keep going in Dutch.', steps: ['Say: “Mag het in het Nederlands? Ik ben aan het oefenen.”', 'Most people are happy to slow down once they know.'] }],
  },
  nb: {
    wiki: 'no', dish: 'vafler', recipe: 'oppskrift vafler', cafe: ['En kaffe, takk.', 'a coffee, thanks'], meal: ['Takk for maten!', 'thanks for the food (said after the meal)'], siri: true, keyboard: 'Norwegian',
  },
  tr: {
    wiki: 'tr', dish: 'menemen', recipe: 'menemen tarifi', cafe: ['Bir çay, lütfen.', 'a tea, please'], meal: ['Afiyet olsun!', 'enjoy your meal'], siri: true, keyboard: 'Turkish',
    extras: [{ id: 'tr-kolay', icon: 'smile', habit: true, title: 'Kolay gelsin', teaser: 'Say “Kolay gelsin” to someone at work today: may it come easy.', steps: ['Turks say it to anyone working: a shopkeeper, a colleague, someone carrying boxes.', 'The answer is usually “Sağ ol”.'] }],
  },
  id: {
    wiki: 'id', dish: 'nasi goreng', recipe: 'resep nasi goreng', cafe: ['Es teh manis satu, ya.', 'one sweet iced tea, please'], meal: ['Selamat makan!', 'enjoy your meal'], keyboard: 'Indonesian',
    extras: [{ id: 'id-selamat', icon: 'sun', habit: true, title: 'Selamat pagi, siang, sore, malam', teaser: 'Greet everyone today with the right “selamat” for the hour.', steps: ['pagi until about 11, siang until 3, sore until dusk, malam after dark.', 'Answer with the same one back.'] }],
  },
  sw: {
    wiki: 'sw', dish: 'chapati', recipe: 'jinsi ya kupika chapati', cafe: ['Chai moja, tafadhali.', 'one tea, please'], meal: ['Karibu chakula!', 'come and eat with us'], keyboard: 'Swahili',
    extras: [{ id: 'sw-shikamoo', icon: 'people', title: 'Shikamoo', teaser: 'Learn how to greet an elder: “Shikamoo”, and the answer, “Marahaba”.', steps: ['A young person greets an older one first, with respect.', 'Then the everyday “Habari?” and “Nzuri!”.'] }],
  },
  la: {
    wiki: 'la', dish: 'libum, Cato’s cheese cake', recipe: 'Cato libum recipe', cafe: ['Caldam, quaeso!', 'a hot drink, please, as Romans drank it'], meal: ['Bene sapiat!', 'enjoy your meal'],
    extras: [
      { id: 'la-date', icon: 'pen', habit: true, title: 'Ante diem', teaser: 'Write today’s date the Roman way, counting to the Kalends, Nones or Ides.', steps: ['19 October is a.d. XIV Kal. Nov.: fourteen days, counted inclusively, before 1 November.', 'The Nones are the 5th (7th in March, May, July, October), the Ides the 13th (15th).'] },
      { id: 'la-around', icon: 'walk', title: 'Latin all around', teaser: 'Find five Latin words or mottos in your town: buildings, coins, crests, shops.', steps: ['Translate each one; most are short and proud.', 'Note the ones you liked in Diarium.'] },
    ],
  },
  ar: {
    wiki: 'ar', dish: 'حمص', recipe: 'طريقة عمل الحمص', cafe: ['قهوة من فضلك.', 'a coffee, please (qahwa min faḍlak)'], meal: ['صحتين!', 'to your health (ṣaḥtēn, Levantine)'], siri: true, keyboard: 'Arabic',
    extras: [{ id: 'ar-name', icon: 'pen', title: 'اسمك بالعربية', teaser: 'Write your name, joined up, in Arabic letters: right to left.', steps: ['Long vowels are letters (ا و ي); short ones usually aren’t written.', 'Then your city and your street.'] }],
  },
  zh: {
    wiki: 'zh', dish: '番茄炒蛋', recipe: '番茄炒蛋 做法', cafe: ['我要一杯拿铁，谢谢。', 'a latte, please (wǒ yào yì bēi nátiě, xièxie)'], meal: ['开动了！', 'let’s eat (kāidòng le)'], siri: true, keyboard: 'Chinese (Simplified) – Pinyin',
    extras: [{ id: 'zh-hands', icon: 'smile', title: 'Count on one hand', teaser: 'Learn the Chinese hand signs for 6 to 10, used at markets everywhere.', steps: ['六 is thumb and little finger out; 八 is thumb and index finger.', 'Practise with prices you see today.'], action: { label: 'YouTube', href: 'https://www.youtube.com/results?search_query=chinese+number+hand+gestures' } }],
  },
  ja: {
    wiki: 'ja', dish: '親子丼', recipe: '親子丼 レシピ', cafe: ['ホットコーヒーをひとつください。', 'one hot coffee, please'], meal: ['いただきます。', 'said before eating (and ごちそうさまでした after)'], siri: true, keyboard: 'Japanese – Kana or Romaji',
    extras: [{ id: 'ja-date', icon: 'pen', habit: true, title: '今日の日付', teaser: 'Write today’s date the Japanese way: 年, 月, 日 and the weekday.', steps: ['2026年10月19日（月）', 'Dates have their own readings: 一日 ついたち, 二十日 はつか.'] }],
  },
  ko: {
    wiki: 'ko', dish: '김치찌개', recipe: '김치찌개 레시피', cafe: ['아이스 아메리카노 한 잔 주세요.', 'one iced americano, please'], meal: ['잘 먹겠습니다!', 'said before eating (and 잘 먹었습니다 after)'], siri: true, keyboard: 'Korean – 2-Set Korean',
    extras: [{ id: 'ko-date', icon: 'pen', habit: true, title: '오늘 날짜', teaser: 'Write today’s date in Korean: 년, 월, 일 and the weekday.', steps: ['2026년 10월 19일 월요일', 'Months use Sino-Korean numbers: 시월 for October (not 십월).'] }],
  },
};

/** Wikipedia for a language (Norwegian Bokmål lives at no.wikipedia.org). */
export const wikipediaFor = (lang: string) => `https://${DATA[lang]?.wiki ?? 'en'}.wikipedia.org/`;

const yt = (term: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`;

/** The challenges for a language: the general ones, then its own. */
export function tipsFor(lang: string): Tip[] {
  const name = getLanguage(lang)?.name ?? 'the language';
  const data = DATA[lang];
  const tips: Tip[] = [
    {
      id: 'phone',
      icon: 'phone',
      title: `Your phone in ${name}`,
      teaser: `Switch your phone to ${name} for a week. You already know where everything is.`,
      platforms: [
        { name: 'iPhone', steps: ['Settings › General › Language & Region.', `Add Language…, choose ${name}, then “Use ${name}”.`, 'To switch back, drag English to the top of the list.'] },
        { name: 'Android', steps: ['Settings › System › Languages.', `Add a language, choose ${name}, and drag it to the top.`] },
        { name: 'Windows', steps: ['Settings › Time & language › Language & region.', `Add a language (${name}, with its language pack).`, 'Choose it as the Windows display language, then sign out and in.'] },
        { name: 'Mac', steps: ['System Settings › General › Language & Region.', `Press + under Preferred Languages, choose ${name}, and restart when asked.`] },
      ],
    },
    {
      id: 'app',
      icon: 'apps',
      title: 'One app at a time',
      teaser: `Not ready for the whole phone? Put the one app you open most into ${name}.`,
      platforms: [
        { name: 'iPhone', steps: ['Settings › Apps › the app › Language (or Settings › the app on older iOS).', `Choose ${name}; only that app changes.`] },
        { name: 'Android', steps: ['Settings › System › Languages › App languages.', `Pick the app and choose ${name}.`] },
        { name: 'Netflix', steps: ['Profile › Manage profiles › your profile › Display language.', `While watching: Audio & Subtitles › ${name}.`] },
        { name: 'YouTube', steps: ['On the web: your picture › Language.', 'In the app it follows the phone’s language.'] },
      ],
    },
    {
      id: 'game',
      icon: 'game',
      title: `Play in ${name}`,
      teaser: `Switch a game you know well to ${name}. Quests and menus you remember are the easiest reading there is.`,
      platforms: [
        { name: 'Steam', steps: ['Right-click the game › Properties › General › Language.', `Choose ${name} if it’s listed; Steam downloads it.`] },
        { name: 'Switch', steps: ['System Settings › System › Language.', 'Games follow the console’s language.'] },
        { name: 'PlayStation', steps: ['Settings › System › Language.', 'Many games follow it; some have their own setting inside.'] },
        { name: 'Xbox', steps: ['Settings › System › Language & location.'] },
      ],
      action: { label: 'Games in Mundus', to: '/mundus?kind=games' },
    },
    {
      id: 'labels',
      icon: 'labels',
      title: 'Label your home',
      teaser: `Put sticky notes on twenty things at home with their ${name} names.`,
      steps: ['The fridge, the mirror, the kettle, the door, the window…', 'Write the article or gender with each noun.', 'Each time you touch one, say the word aloud. Take them down once you know them.'],
    },
    {
      id: 'cook',
      icon: 'cook',
      title: `Cook ${data?.dish ?? 'a dish'}`,
      teaser: `Cook a dish from a recipe written or filmed in ${name}.`,
      steps: ['Find a recipe video in the language and cook along.', 'Ingredients and verbs (cut, stir, fry, add) are words you’ll use again.', 'Save the ones you didn’t know as cards.'],
      action: data ? { label: 'Recipe videos', href: yt(data.recipe) } : undefined,
    },
    {
      id: 'walk',
      icon: 'walk',
      habit: true,
      title: 'Think aloud on a walk',
      teaser: `Ten minutes outside, describing what you see in ${name}.`,
      steps: ['I see a dog, the man is running, it’s cold, the tram is late…', 'Keep it in the present tense; simple is fine.', 'Note the words you were missing and look them up at home.'],
    },
    {
      id: 'song',
      icon: 'song',
      habit: true,
      title: 'One song, all week',
      teaser: `Pick one ${name} song and play it every day for a week.`,
      steps: ['Read the lyrics with it the first two days.', 'Mid-week, play the song games in Sonus.', 'By Sunday, sing the chorus without the lyrics.'],
      action: { label: 'Find a song', to: '/sonus?tab=music' },
    },
    {
      id: 'spotify',
      icon: 'spotify',
      title: 'Steer your Spotify',
      teaser: `Teach Spotify you listen in ${name}: its suggestions follow what you play.`,
      steps: ['Spotify’s home follows your country, but you can steer it.', `Follow a ${name}-speaking country’s Top 50 and two or three playlists in ${name}.`, 'Listen to them for a week; Discover Weekly and your mixes start to follow.'],
      action: { label: 'Spotify', href: `https://open.spotify.com/search/${encodeURIComponent(`Top 50 ${name}`)}/playlists` },
    },
    {
      id: 'list',
      icon: 'list',
      habit: true,
      title: 'Shopping list',
      teaser: `Write this week’s shopping list in ${name}.`,
      steps: ['Look up only what you can’t say yet.', 'In the shop, read the list aloud in your head.'],
    },
    {
      id: 'morning',
      icon: 'sun',
      habit: true,
      title: 'Narrate your morning',
      teaser: `Tell yourself what you’re doing as you do it: I get up, I make coffee…`,
      steps: ['Reflexive verbs, everyday nouns and time words, all in ten minutes.', 'Do it for three mornings and the sentences start to come by themselves.'],
    },
    {
      id: 'dub',
      icon: 'film',
      title: 'Something you know, dubbed',
      teaser: `Rewatch a favourite film or series with ${name} audio and ${name} subtitles.`,
      steps: ['You know the story, so your ears can focus on the words.', 'On Netflix: Audio & Subtitles while it plays.', 'Animated films are often the most carefully dubbed.'],
    },
    {
      id: 'wiki',
      icon: 'wiki',
      habit: true,
      title: 'Your hobby on Wikipedia',
      teaser: `Read the ${name} Wikipedia page about something you love.`,
      steps: ['You know the topic, so you can guess a lot.', 'Paste a section into Codex to read it with lookups.'],
      action: { label: 'Wikipedia', href: wikipediaFor(lang) },
    },
    {
      id: 'trip',
      icon: 'trip',
      title: 'Plan an imaginary trip',
      teaser: `Pick a city where ${name} is spoken and plan a weekend there, on local sites.`,
      steps: ['A train or bus timetable, a hotel, a museum’s opening hours, a restaurant menu.', 'All in the language: real reading with a purpose.', 'Who knows, you might book it.'],
    },
    {
      id: 'radio',
      icon: 'radio',
      habit: true,
      title: 'Radio while you cook',
      teaser: `Leave a ${name} station on in the background while you cook or clean.`,
      steps: ['You don’t need to follow it all: the rhythm and sounds settle in.', 'Sonus › Radio has stations by language.'],
      action: { label: 'Radio', to: '/sonus?tab=radio' },
    },
    ...(data
      ? [
          {
            id: 'cafe',
            icon: 'cafe' as const,
            title: 'Order in the language',
            teaser: `Next coffee, order it in ${name}: “${data.cafe[0]}”`,
            steps: [`“${data.cafe[0]}”: ${data.cafe[1]}.`, `If there’s a ${name}-speaking café near you, try it for real. Otherwise, say it to whoever makes your coffee at home.`],
          },
          {
            id: 'meal',
            icon: 'meal' as const,
            habit: true,
            title: 'Table words',
            teaser: `This week, say “${data.meal[0]}” at every meal.`,
            steps: [`“${data.meal[0]}”: ${data.meal[1]}.`, 'Small rituals stick: soon it will feel odd not to say it.'],
          },
        ]
      : []),
    {
      id: 'count',
      icon: 'count',
      habit: true,
      title: 'Count everything',
      teaser: `Count in ${name} all day: stairs, steps, change at the till, minutes on the clock.`,
      steps: ['Numbers are the first thing to go when you’re nervous.', 'One day of counting makes them automatic.'],
    },
    {
      id: 'memo',
      icon: 'mic',
      habit: true,
      title: 'A voice note a day',
      teaser: `Record a one-minute voice memo in ${name} each evening: what happened today.`,
      steps: ['Don’t stop to correct yourself.', 'On Sunday, listen to the week. You’ll hear yourself improve.'],
    },
    {
      id: 'partner',
      icon: 'people',
      title: 'Find a language partner',
      teaser: `Swap half an hour of your language for half an hour of ${name} with a speaker.`,
      steps: ['Apps such as Tandem or HelloTalk pair learners who teach each other.', 'Agree on 15 minutes in each language. Bring three questions.', 'Lingua has no community of its own: these live outside it.'],
    },
    {
      id: 'lock',
      icon: 'lock',
      habit: true,
      title: 'A word on your lock screen',
      teaser: 'Put one new word on your lock screen each morning.',
      steps: ['Write it in Notes and screenshot it, or use a widget.', 'You’ll see it fifty times by evening without trying.'],
    },
  ];
  if (data?.keyboard) {
    tips.splice(3, 0, {
      id: 'keyboard',
      icon: 'keyboard',
      title: `A ${name} keyboard`,
      teaser: `Add the ${data.keyboard} keyboard: typing, autocorrect and suggestions in ${name}.`,
      platforms: [
        { name: 'iPhone', steps: ['Settings › General › Keyboard › Keyboards › Add New Keyboard…', `Choose ${data.keyboard}.`, 'Switch with the globe key.'] },
        { name: 'Android', steps: ['Gboard: Settings › Languages › Add keyboard.', `Choose ${data.keyboard}; switch with the globe or space bar.`] },
        { name: 'Windows', steps: [`Settings › Time & language › Language & region › ${name} › Language options › Add a keyboard.`, 'Switch with Windows key + Space.'] },
      ],
    });
  }
  if (data?.siri) {
    tips.splice(4, 0, {
      id: 'siri',
      icon: 'voice',
      title: `Ask Siri in ${name}`,
      teaser: `Set Siri to ${name} and ask it the weather, a timer and a joke.`,
      steps: [`Settings › Siri (Apple Intelligence & Siri on newer iPhones) › Language › ${name}.`, 'If Siri understands you, your pronunciation is getting there.', 'Switch it back when you’re done.'],
    });
  }
  return [...tips, ...(data?.extras ?? [])];
}

/** Today’s challenge for Home: one not done yet, a different one each day. */
export function tipOfTheDay(tips: Tip[], doneIds: ReadonlySet<string>, day = Math.floor(Date.now() / 86_400_000)): Tip | undefined {
  const open = tips.filter((t) => t.habit || !doneIds.has(t.id));
  if (!open.length) return undefined;
  return open[day % open.length];
}
