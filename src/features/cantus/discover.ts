// Cantus › Discover: artists and styles picked by hand for each language, with a word on why
// they're good to learn with. Tapping one searches Apple's catalogue for their songs.

export interface PickedArtist {
  name: string;
  /** What they sound like and why they help. */
  why: string;
  /** Roughly how hard the lyrics are to follow. */
  ease: 'clear' | 'medium' | 'fast';
}

export interface Discover {
  artists: PickedArtist[];
  /** Styles to explore: [label, search term]. */
  styles: Array<[string, string]>;
}

export const DISCOVER: Record<string, Discover> = {
  es: {
    artists: [
      { name: 'Natalia Lafourcade', why: 'Gentle Mexican folk-pop, sung slowly and clearly', ease: 'clear' },
      { name: 'Jesse & Joy', why: 'Warm pop with everyday words and big choruses', ease: 'clear' },
      { name: 'Pablo Alborán', why: 'Spanish ballads, every word easy to hear', ease: 'clear' },
      { name: 'Julieta Venegas', why: 'Bright Mexican pop with simple, repeated lines', ease: 'clear' },
      { name: 'Juanes', why: 'Colombian pop-rock, clear and singable', ease: 'medium' },
      { name: 'Manu Chao', why: 'Short lines that come back again and again', ease: 'clear' },
      { name: 'Aitana', why: 'Spain’s pop of today, everyday vocabulary', ease: 'medium' },
      { name: 'Mon Laferte', why: 'Chilean bolero and rock, full of feeling', ease: 'medium' },
      { name: 'Carlos Vives', why: 'Colombian vallenato: rhythm and storytelling', ease: 'medium' },
      { name: 'Rosalía', why: 'Flamenco meets pop; slang and Andalusian sounds', ease: 'fast' },
      { name: 'Bad Bunny', why: 'Puerto Rican reggaeton: fast, full of slang', ease: 'fast' },
    ],
    styles: [['Bachata', 'bachata'], ['Bolero', 'bolero'], ['Flamenco', 'flamenco'], ['Cumbia', 'cumbia'], ['Rock en español', 'rock en español'], ['Reggaeton', 'reggaeton']],
  },
  pt: {
    artists: [
      { name: 'Marisa Monte', why: 'Brazilian MPB with a calm, perfectly clear voice', ease: 'clear' },
      { name: 'Tiago Iorc', why: 'Soft Brazilian pop, simple everyday words', ease: 'clear' },
      { name: 'Antônio Carlos Jobim', why: 'Bossa nova: slow, gentle and poetic', ease: 'clear' },
      { name: 'Vanessa da Mata', why: 'Sunny pop with easy, repeated choruses', ease: 'clear' },
      { name: 'Ana Carolina', why: 'Rich voice, clear Brazilian diction', ease: 'medium' },
      { name: 'Caetano Veloso', why: 'A legend of Brazilian song; beautiful wordplay', ease: 'medium' },
      { name: 'Seu Jorge', why: 'Samba and soul, relaxed and warm', ease: 'medium' },
      { name: 'Mariza', why: 'Fado in European Portuguese, slow and dramatic', ease: 'medium' },
      { name: 'Anitta', why: 'Brazil’s biggest pop star; fast funk and slang', ease: 'fast' },
    ],
    styles: [['Bossa nova', 'bossa nova'], ['Samba', 'samba'], ['MPB', 'mpb'], ['Sertanejo', 'sertanejo'], ['Fado', 'fado'], ['Forró', 'forró']],
  },
  fr: {
    artists: [
      { name: 'Zaz', why: 'Joyful chanson with clear, everyday French', ease: 'clear' },
      { name: 'Louane', why: 'Soft pop, slow and easy to follow', ease: 'clear' },
      { name: 'Vianney', why: 'Acoustic songs, every word clear', ease: 'clear' },
      { name: 'Édith Piaf', why: 'Classic chanson, slow and unforgettable', ease: 'clear' },
      { name: 'Christophe Maé', why: 'Warm pop with simple stories', ease: 'clear' },
      { name: 'Angèle', why: 'Belgian pop, witty and modern', ease: 'medium' },
      { name: 'Indila', why: 'Dramatic pop with long, clear lines', ease: 'medium' },
      { name: 'Cœur de pirate', why: 'Québec piano pop, a softer accent', ease: 'medium' },
      { name: 'Jacques Brel', why: 'The great Belgian chansonnier; rich and fast', ease: 'fast' },
      { name: 'Stromae', why: 'Clever wordplay over dance beats', ease: 'fast' },
    ],
    styles: [['Chanson', 'chanson française'], ['Variété', 'variété française'], ['Rap français', 'rap français'], ['Québec', 'pop québécoise']],
  },
  de: {
    artists: [
      { name: 'Tim Bendzko', why: 'Clear pop, sung slowly and simply', ease: 'clear' },
      { name: 'Max Giesinger', why: 'Gentle Deutschpop with everyday words', ease: 'clear' },
      { name: 'Wincent Weiss', why: 'Easy choruses, very clear German', ease: 'clear' },
      { name: 'Namika', why: 'Pop with a little rap, short lines', ease: 'medium' },
      { name: 'Mark Forster', why: 'Upbeat pop full of common phrases', ease: 'medium' },
      { name: 'Silbermond', why: 'Pop-rock with clear, honest lyrics', ease: 'clear' },
      { name: 'Nena', why: 'The 80s classics, simple and catchy', ease: 'clear' },
      { name: 'AnnenMayKantereit', why: 'Raw, deep voice; real spoken German', ease: 'medium' },
      { name: 'Herbert Grönemeyer', why: 'A German classic; poetic and dense', ease: 'fast' },
      { name: 'Clueso', why: 'Relaxed pop and rap from Erfurt', ease: 'medium' },
    ],
    styles: [['Deutschpop', 'deutschpop'], ['Schlager', 'schlager'], ['Liedermacher', 'liedermacher'], ['Deutschrap', 'deutschrap']],
  },
  it: {
    artists: [
      { name: 'Laura Pausini', why: 'Big ballads with clear, simple Italian', ease: 'clear' },
      { name: 'Eros Ramazzotti', why: 'Romantic pop, easy to sing along', ease: 'clear' },
      { name: 'Tiziano Ferro', why: 'Emotional pop with everyday vocabulary', ease: 'clear' },
      { name: 'Elisa', why: 'Gentle pop, slow and clear', ease: 'clear' },
      { name: 'Marco Mengoni', why: 'Soulful voice, long clear lines', ease: 'medium' },
      { name: 'Lucio Battisti', why: 'The classic cantautore; simple, beautiful songs', ease: 'medium' },
      { name: 'Annalisa', why: 'Bright Italian pop of today', ease: 'medium' },
      { name: 'Jovanotti', why: 'Energetic, wordy, full of life', ease: 'fast' },
      { name: 'Mahmood', why: 'Modern pop with urban slang', ease: 'fast' },
      { name: 'Måneskin', why: 'Rock with attitude (some songs in English)', ease: 'medium' },
    ],
    styles: [['Cantautori', 'cantautori'], ['Pop italiano', 'pop italiano'], ['Sanremo', 'sanremo'], ['Canzone napoletana', 'canzone napoletana']],
  },
  ru: {
    artists: [
      { name: 'Кино', why: 'Viktor Tsoi’s rock: short, simple, iconic lines', ease: 'clear' },
      { name: 'Земфира', why: 'Russian rock-pop with a clear voice', ease: 'medium' },
      { name: 'Сплин', why: 'Poetic rock, sung calmly', ease: 'medium' },
      { name: 'Би-2', why: 'Melodic rock, easy to follow', ease: 'medium' },
      { name: 'Полина Гагарина', why: 'Big pop ballads, every word clear', ease: 'clear' },
      { name: 'Ёлка', why: 'Light pop with everyday Russian', ease: 'clear' },
      { name: 'Мумий Тролль', why: 'Playful rock with unusual words', ease: 'medium' },
      { name: 'Монеточка', why: 'Witty modern pop', ease: 'medium' },
      { name: 'Звери', why: 'Simple, catchy pop-rock', ease: 'clear' },
      { name: 'Баста', why: 'Rap and ballads; fast in places', ease: 'fast' },
    ],
    styles: [['Русский рок', 'русский рок'], ['Поп', 'русская поп музыка'], ['Бардовская песня', 'бардовская песня'], ['Романс', 'романс']],
  },
  el: {
    artists: [
      { name: 'Ελεωνόρα Ζουγανέλη', why: 'Clear, warm voice; modern laiko and pop', ease: 'clear' },
      { name: 'Μελίνα Ασλανίδου', why: 'Gentle ballads, slow and clear', ease: 'clear' },
      { name: 'Κωνσταντίνος Αργυρός', why: 'Greek pop of today, easy choruses', ease: 'clear' },
      { name: 'Γιάννης Χαρούλης', why: 'Cretan and folk-rock, heartfelt', ease: 'medium' },
      { name: 'Άλκηστις Πρωτοψάλτη', why: 'Classic Greek pop, beautifully sung', ease: 'medium' },
      { name: 'Χάρις Αλεξίου', why: 'A great voice of laiko and entechno', ease: 'medium' },
      { name: 'Νίκος Πορτοκάλογλου', why: 'Thoughtful songwriting', ease: 'medium' },
      { name: 'Μίκης Θεοδωράκης', why: 'Timeless songs to great poems', ease: 'medium' },
      { name: 'Παντελής Παντελίδης', why: 'Modern laiko, everyday words', ease: 'medium' },
    ],
    styles: [['Λαϊκά', 'λαϊκά'], ['Έντεχνο', 'έντεχνο'], ['Ρεμπέτικο', 'ρεμπέτικο'], ['Ελληνική ποπ', 'ελληνική ποπ']],
  },
  sv: {
    artists: [
      { name: 'Veronica Maggio', why: 'Swedish pop with clear, everyday lyrics', ease: 'clear' },
      { name: 'Lars Winnerbäck', why: 'Calm singer-songwriter, every word heard', ease: 'clear' },
      { name: 'Laleh', why: 'Gentle pop, slow and clear', ease: 'clear' },
      { name: 'Molly Sandén', why: 'Big voice, simple choruses', ease: 'clear' },
      { name: 'Håkan Hellström', why: 'Gothenburg indie, full of feeling', ease: 'medium' },
      { name: 'Miriam Bryant', why: 'Modern pop in Swedish and English', ease: 'medium' },
      { name: 'Kent', why: 'Sweden’s great rock band', ease: 'medium' },
      { name: 'Lisa Ekdahl', why: 'Soft jazz-pop, slow and gentle', ease: 'clear' },
      { name: 'Ted Gärdestad', why: '70s classics, simple and sunny', ease: 'clear' },
      { name: 'Petter', why: 'Swedish hip-hop; fast', ease: 'fast' },
    ],
    styles: [['Svensk pop', 'svensk pop'], ['Visor', 'visa'], ['Dansband', 'dansband'], ['Svensk hiphop', 'svensk hiphop']],
  },
  hu: {
    artists: [
      { name: 'Halott Pénz', why: 'Melodic pop with clear, modern Hungarian', ease: 'clear' },
      { name: 'Wellhello', why: 'Catchy pop, easy choruses', ease: 'clear' },
      { name: 'Bagossy Brothers Company', why: 'Folk-rock from Transylvania, warm and clear', ease: 'clear' },
      { name: 'Zorán', why: 'Calm classic songs, slow and poetic', ease: 'clear' },
      { name: 'Republic', why: 'Much-loved rock, singable lines', ease: 'medium' },
      { name: 'Quimby', why: 'Poetic, playful alternative rock', ease: 'medium' },
      { name: 'Ákos', why: 'Pop-rock, clear diction', ease: 'medium' },
      { name: 'Kowalsky meg a Vega', why: 'Upbeat rock with everyday words', ease: 'medium' },
      { name: 'Azahriah', why: 'Today’s biggest Hungarian pop star', ease: 'fast' },
      { name: 'Follow The Flow', why: 'Pop with rap parts; fast in places', ease: 'fast' },
    ],
    styles: [['Magyar pop', 'magyar pop'], ['Magyar rock', 'magyar rock'], ['Népzene', 'népzene'], ['Magyar rap', 'magyar rap']],
  },
  en: {
    artists: [
      { name: 'Ed Sheeran', why: 'Clear pop with everyday words', ease: 'clear' },
      { name: 'Adele', why: 'Slow ballads, every word heard', ease: 'clear' },
      { name: 'The Beatles', why: 'Simple, timeless lines', ease: 'clear' },
      { name: 'Taylor Swift', why: 'Storytelling pop', ease: 'medium' },
      { name: 'Coldplay', why: 'Big, singable choruses', ease: 'clear' },
      { name: 'Billie Eilish', why: 'Soft, close voice; modern words', ease: 'medium' },
    ],
    styles: [['Pop', 'pop'], ['Folk', 'folk'], ['Soul', 'soul'], ['Rock', 'rock']],
  },
};

export const EASE_LABEL: Record<PickedArtist['ease'], string> = { clear: 'Clear', medium: 'Medium', fast: 'Fast' };
