// A short original welcome text per language, so the reader can be tried before importing anything.

export interface SampleText {
  title: string;
  paragraphs: string[];
}

export const SAMPLES: Record<string, SampleText> = {
  en: {
    title: 'The Reading Room',
    paragraphs: [
      'Every evening, Anna opens a book and reads one page. Some words are new, and that is good. She taps a word, learns its meaning, and keeps reading.',
      'Little by little, the pages become easier. One day she notices that she understands almost everything. Reading a little every day is like walking: each step takes you further.',
    ],
  },
  es: {
    title: 'La sala de lectura',
    paragraphs: [
      'Cada tarde, Ana abre un libro y lee una página. Algunas palabras son nuevas, y eso está bien. Toca una palabra, aprende su significado y sigue leyendo.',
      'Poco a poco, las páginas se vuelven más fáciles. Un día se da cuenta de que lo entiende casi todo. Leer un poco cada día es como caminar: cada paso te lleva más lejos.',
    ],
  },
  ru: {
    title: 'Читальный зал',
    paragraphs: [
      'Каждый вечер Анна открывает книгу и читает одну страницу. Некоторые слова новые, и это хорошо. Она нажимает на слово, узнаёт его значение и читает дальше.',
      'Понемногу страницы становятся легче. Однажды она замечает, что понимает почти всё. Читать понемногу каждый день — как идти пешком: каждый шаг ведёт тебя дальше.',
    ],
  },
  pt: {
    title: 'A sala de leitura',
    paragraphs: [
      'Toda noite, Ana abre um livro e lê uma página. Algumas palavras são novas, e tudo bem. Ela toca em uma palavra, aprende o significado e continua lendo.',
      'Pouco a pouco, as páginas ficam mais fáceis. Um dia, ela percebe que entende quase tudo. Ler um pouco todo dia é como caminhar: cada passo leva você mais longe.',
    ],
  },
  fr: {
    title: 'La salle de lecture',
    paragraphs: [
      'Chaque soir, Anna ouvre un livre et lit une page. Certains mots sont nouveaux, et c’est très bien. Elle touche un mot, apprend son sens et continue à lire.',
      'Peu à peu, les pages deviennent plus faciles. Un jour, elle remarque qu’elle comprend presque tout. Lire un peu chaque jour, c’est comme marcher : chaque pas vous mène plus loin.',
    ],
  },
  el: {
    title: 'Η αίθουσα ανάγνωσης',
    paragraphs: [
      'Κάθε βράδυ, η Άννα ανοίγει ένα βιβλίο και διαβάζει μία σελίδα. Μερικές λέξεις είναι καινούργιες, και αυτό είναι καλό. Αγγίζει μια λέξη, μαθαίνει τη σημασία της και συνεχίζει το διάβασμα.',
      'Σιγά σιγά, οι σελίδες γίνονται πιο εύκολες. Μια μέρα παρατηρεί ότι καταλαβαίνει σχεδόν τα πάντα. Το να διαβάζεις λίγο κάθε μέρα είναι σαν το περπάτημα: κάθε βήμα σε πηγαίνει πιο μακριά.',
    ],
  },
  de: {
    title: 'Der Lesesaal',
    paragraphs: [
      'Jeden Abend öffnet Anna ein Buch und liest eine Seite. Manche Wörter sind neu, und das ist gut so. Sie tippt auf ein Wort, lernt seine Bedeutung und liest weiter.',
      'Nach und nach werden die Seiten leichter. Eines Tages merkt sie, dass sie fast alles versteht. Jeden Tag ein wenig zu lesen ist wie Wandern: Jeder Schritt bringt dich weiter.',
    ],
  },
  it: {
    title: 'La sala di lettura',
    paragraphs: [
      'Ogni sera, Anna apre un libro e legge una pagina. Alcune parole sono nuove, e va bene così. Tocca una parola, impara il suo significato e continua a leggere.',
      'A poco a poco, le pagine diventano più facili. Un giorno si accorge di capire quasi tutto. Leggere un po’ ogni giorno è come camminare: ogni passo ti porta più lontano.',
    ],
  },
  sv: {
    title: 'Läsesalen',
    paragraphs: [
      'Varje kväll öppnar Anna en bok och läser en sida. Vissa ord är nya, och det är bra. Hon trycker på ett ord, lär sig vad det betyder och fortsätter läsa.',
      'Lite i taget blir sidorna lättare. En dag märker hon att hon förstår nästan allt. Att läsa lite varje dag är som att promenera: varje steg tar dig längre.',
    ],
  },
  hu: {
    title: 'Az olvasóterem',
    paragraphs: [
      'Anna minden este kinyit egy könyvet, és elolvas egy oldalt. Néhány szó új, és ez így van jól. Rákoppint egy szóra, megtanulja a jelentését, és tovább olvas.',
      'Lassan az oldalak egyre könnyebbek lesznek. Egy nap észreveszi, hogy szinte mindent ért. Ha minden nap olvasol egy kicsit, az olyan, mint a séta: minden lépés egyre messzebb visz.',
    ],
  },
};
