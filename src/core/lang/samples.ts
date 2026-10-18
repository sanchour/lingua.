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
  nl: {
    title: 'De leeszaal',
    paragraphs: [
      'Elke avond opent Anna een boek en leest ze één bladzijde. Sommige woorden zijn nieuw, en dat is goed. Ze tikt op een woord, leert wat het betekent en leest verder.',
      'Beetje bij beetje worden de bladzijden makkelijker. Op een dag merkt ze dat ze bijna alles begrijpt. Elke dag een beetje lezen is als wandelen: elke stap brengt je verder.',
    ],
  },
  nb: {
    title: 'Lesesalen',
    paragraphs: [
      'Hver kveld åpner Anna en bok og leser én side. Noen ord er nye, og det er bra. Hun trykker på et ord, lærer hva det betyr, og leser videre.',
      'Litt etter litt blir sidene lettere. En dag merker hun at hun forstår nesten alt. Å lese litt hver dag er som å gå: hvert skritt tar deg lenger.',
    ],
  },
  tr: {
    title: 'Okuma Salonu',
    paragraphs: [
      'Anna her akşam bir kitap açıp bir sayfa okur. Bazı kelimeler yenidir ve bu iyidir. Bir kelimeye dokunur, anlamını öğrenir ve okumaya devam eder.',
      'Sayfalar yavaş yavaş kolaylaşır. Bir gün neredeyse her şeyi anladığını fark eder. Her gün biraz okumak yürümek gibidir: her adım seni biraz daha ileri götürür.',
    ],
  },
  id: {
    title: 'Ruang Baca',
    paragraphs: [
      'Setiap malam, Anna membuka sebuah buku dan membaca satu halaman. Beberapa kata masih baru, dan itu bagus. Dia mengetuk sebuah kata, mempelajari artinya, lalu terus membaca.',
      'Sedikit demi sedikit, halaman-halamannya menjadi lebih mudah. Suatu hari dia sadar bahwa dia memahami hampir semuanya. Membaca sedikit setiap hari seperti berjalan: setiap langkah membawamu lebih jauh.',
    ],
  },
  sw: {
    title: 'Chumba cha Kusomea',
    paragraphs: [
      'Kila jioni, Anna hufungua kitabu na kusoma ukurasa mmoja. Baadhi ya maneno ni mapya, na hilo ni jambo zuri. Hugusa neno, hujifunza maana yake, na kuendelea kusoma.',
      'Kidogo kidogo, kurasa zinakuwa rahisi zaidi. Siku moja anagundua kwamba anaelewa karibu kila kitu. Kusoma kidogo kila siku ni kama kutembea: kila hatua inakupeleka mbali zaidi.',
    ],
  },
  la: {
    title: 'Bibliotheca',
    paragraphs: [
      'Cotidie vesperi Anna librum aperit et unam paginam legit. Quaedam verba nova sunt, et hoc bonum est. Verbum tangit, significationem eius discit, et legere pergit.',
      'Paulatim paginae faciliores fiunt. Aliquando animadvertit se paene omnia intellegere. Paulum cotidie legere est sicut ambulare: quisque gradus te longius ducit.',
    ],
  },
  ar: {
    title: 'غرفة القراءة',
    paragraphs: [
      'كل مساء تفتح آنا كتابًا وتقرأ صفحة واحدة. بعض الكلمات جديدة، وهذا أمر جيد. تلمس كلمة، وتتعلم معناها، ثم تواصل القراءة.',
      'شيئًا فشيئًا تصبح الصفحات أسهل. وفي يوم من الأيام تلاحظ أنها تفهم كل شيء تقريبًا. القراءة قليلًا كل يوم مثل المشي: كل خطوة تأخذك أبعد.',
    ],
  },
  zh: {
    title: '阅览室',
    paragraphs: [
      '每天晚上，安娜打开一本书，读一页。有些词是新的，这很好。她点一下一个词，学会它的意思，然后继续读下去。',
      '慢慢地，书页变得越来越容易。有一天，她发现自己几乎什么都看得懂了。每天读一点就像走路：每一步都带你走得更远。',
    ],
  },
  ja: {
    title: '読書室',
    paragraphs: [
      '毎晩、アンナは本を開いて一ページ読みます。知らない言葉もありますが、それでいいのです。言葉をタップして意味を覚え、また読み続けます。',
      '少しずつ、ページは易しくなっていきます。ある日、ほとんど全部わかることに気づきます。毎日少しずつ読むのは歩くことに似ています。一歩一歩が、遠くへ連れて行ってくれます。',
    ],
  },
  ko: {
    title: '열람실',
    paragraphs: [
      '매일 저녁 안나는 책을 펴고 한 페이지를 읽습니다. 모르는 단어도 있지만 괜찮습니다. 단어를 눌러 뜻을 배우고 계속 읽습니다.',
      '조금씩 페이지가 쉬워집니다. 어느 날 안나는 거의 모든 것을 이해한다는 것을 알게 됩니다. 매일 조금씩 읽는 것은 걷는 것과 같습니다. 한 걸음 한 걸음이 더 멀리 데려가 줍니다.',
    ],
  },
};
