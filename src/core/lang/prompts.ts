// Curated Diarium writing prompts, used offline or without an AI key. Three bands by level; each
// prompt is in the language being learned, with an English line underneath.
import type { Level } from './levels';

export interface WritingPrompt {
  text: string;
  en: string;
}

type Band = 'start' | 'middle' | 'high';
const BAND: Record<Level, Band> = { A0: 'start', A1: 'start', A2: 'start', B1: 'middle', B2: 'middle', C1: 'high' };

const EN: Record<Band, string[]> = {
  start: [
    'Describe your morning today.',
    'What did you eat today? Did you like it?',
    'Write about a person in your family.',
    'What is the weather like, and what are you doing today?',
    'Describe your room or your favourite place at home.',
  ],
  middle: [
    'Tell the story of a trip you remember well.',
    'What would you change about your city, and why?',
    'Describe a book, film or series you liked recently.',
    'Write about a habit you would like to start.',
    'What did you learn this week, inside or outside lessons?',
  ],
  high: [
    'Is technology making us more or less connected? Argue your view.',
    'Describe a moment that changed how you see something.',
    'Which tradition from your culture would you explain to a stranger, and how?',
    'Write a short letter to yourself ten years from now.',
  ],
};

const PROMPTS: Record<string, Record<Band, string[]>> = {
  en: {
    start: ['Describe your morning today.', 'What did you eat today? Did you like it?', 'Write about a person in your family.', 'What is the weather like, and what are you doing today?', 'Describe your room or your favourite place at home.'],
    middle: ['Tell the story of a trip you remember well.', 'What would you change about your city, and why?', 'Describe a book, film or series you liked recently.', 'Write about a habit you would like to start.', 'What did you learn this week, inside or outside lessons?'],
    high: ['Is technology making us more or less connected? Argue your view.', 'Describe a moment that changed how you see something.', 'Which tradition from your culture would you explain to a stranger, and how?', 'Write a short letter to yourself ten years from now.'],
  },
  es: {
    start: ['Describe tu mañana de hoy.', '¿Qué has comido hoy? ¿Te ha gustado?', 'Escribe sobre una persona de tu familia.', '¿Qué tiempo hace y qué haces hoy?', 'Describe tu habitación o tu lugar favorito de casa.'],
    middle: ['Cuenta la historia de un viaje que recuerdas bien.', '¿Qué cambiarías de tu ciudad y por qué?', 'Describe un libro, una película o una serie que te gustó hace poco.', 'Escribe sobre un hábito que te gustaría empezar.', '¿Qué has aprendido esta semana, en clase o fuera de ella?'],
    high: ['¿La tecnología nos acerca o nos aleja? Defiende tu opinión.', 'Describe un momento que cambió tu forma de ver algo.', '¿Qué tradición de tu cultura le explicarías a un desconocido, y cómo?', 'Escríbete una carta breve para dentro de diez años.'],
  },
  pt: {
    start: ['Descreve a tua manhã de hoje.', 'O que comeste hoje? Gostaste?', 'Escreve sobre uma pessoa da tua família.', 'Como está o tempo e o que vais fazer hoje?', 'Descreve o teu quarto ou o teu sítio preferido em casa.'],
    middle: ['Conta a história de uma viagem de que te lembras bem.', 'O que mudarias na tua cidade, e porquê?', 'Descreve um livro, um filme ou uma série de que gostaste recentemente.', 'Escreve sobre um hábito que gostavas de começar.', 'O que aprendeste esta semana, nas aulas ou fora delas?'],
    high: ['A tecnologia aproxima-nos ou afasta-nos? Defende a tua opinião.', 'Descreve um momento que mudou a forma como vês alguma coisa.', 'Que tradição da tua cultura explicarias a um desconhecido, e como?', 'Escreve uma pequena carta a ti mesmo daqui a dez anos.'],
  },
  fr: {
    start: ['Décris ta matinée d’aujourd’hui.', 'Qu’est-ce que tu as mangé aujourd’hui ? Tu as aimé ?', 'Écris sur une personne de ta famille.', 'Quel temps fait-il, et que fais-tu aujourd’hui ?', 'Décris ta chambre ou ton endroit préféré à la maison.'],
    middle: ['Raconte un voyage dont tu te souviens bien.', 'Que changerais-tu dans ta ville, et pourquoi ?', 'Décris un livre, un film ou une série que tu as aimé récemment.', 'Écris sur une habitude que tu aimerais prendre.', 'Qu’as-tu appris cette semaine, en cours ou ailleurs ?'],
    high: ['La technologie nous rapproche-t-elle ou nous éloigne-t-elle ? Défends ton point de vue.', 'Décris un moment qui a changé ta façon de voir quelque chose.', 'Quelle tradition de ta culture expliquerais-tu à un inconnu, et comment ?', 'Écris une courte lettre à toi-même dans dix ans.'],
  },
  it: {
    start: ['Descrivi la tua mattina di oggi.', 'Che cosa hai mangiato oggi? Ti è piaciuto?', 'Scrivi di una persona della tua famiglia.', 'Che tempo fa e che cosa fai oggi?', 'Descrivi la tua camera o il tuo posto preferito in casa.'],
    middle: ['Racconta un viaggio che ricordi bene.', 'Che cosa cambieresti della tua città, e perché?', 'Descrivi un libro, un film o una serie che ti è piaciuto di recente.', 'Scrivi di un’abitudine che vorresti iniziare.', 'Che cosa hai imparato questa settimana, a lezione o fuori?'],
    high: ['La tecnologia ci avvicina o ci allontana? Difendi la tua opinione.', 'Descrivi un momento che ha cambiato il tuo modo di vedere qualcosa.', 'Quale tradizione della tua cultura spiegheresti a uno sconosciuto, e come?', 'Scrivi una breve lettera a te stesso tra dieci anni.'],
  },
  de: {
    start: ['Beschreib deinen Morgen heute.', 'Was hast du heute gegessen? Hat es dir geschmeckt?', 'Schreib über eine Person aus deiner Familie.', 'Wie ist das Wetter, und was machst du heute?', 'Beschreib dein Zimmer oder deinen Lieblingsort zu Hause.'],
    middle: ['Erzähl von einer Reise, an die du dich gut erinnerst.', 'Was würdest du an deiner Stadt ändern, und warum?', 'Beschreib ein Buch, einen Film oder eine Serie, die dir neulich gefallen hat.', 'Schreib über eine Gewohnheit, die du gern anfangen würdest.', 'Was hast du diese Woche gelernt, im Unterricht oder außerhalb?'],
    high: ['Bringt uns die Technik näher zusammen oder entfernt sie uns? Begründe deine Meinung.', 'Beschreib einen Moment, der deinen Blick auf etwas verändert hat.', 'Welche Tradition deiner Kultur würdest du einem Fremden erklären, und wie?', 'Schreib dir selbst einen kurzen Brief in zehn Jahren.'],
  },
  sv: {
    start: ['Beskriv din morgon i dag.', 'Vad har du ätit i dag? Tyckte du om det?', 'Skriv om en person i din familj.', 'Hur är vädret, och vad gör du i dag?', 'Beskriv ditt rum eller din favoritplats hemma.'],
    middle: ['Berätta om en resa som du minns väl.', 'Vad skulle du ändra i din stad, och varför?', 'Beskriv en bok, en film eller en serie som du gillade nyligen.', 'Skriv om en vana som du skulle vilja börja med.', 'Vad har du lärt dig den här veckan, på lektionen eller utanför?'],
    high: ['För tekniken oss närmare varandra eller längre ifrån varandra? Argumentera för din åsikt.', 'Beskriv ett ögonblick som förändrade hur du ser på något.', 'Vilken tradition från din kultur skulle du förklara för en främling, och hur?', 'Skriv ett kort brev till dig själv om tio år.'],
  },
  ru: {
    start: ['Опиши своё сегодняшнее утро.', 'Что ты сегодня ел? Тебе понравилось?', 'Напиши о человеке из твоей семьи.', 'Какая сегодня погода и что ты делаешь?', 'Опиши свою комнату или любимое место дома.'],
    middle: ['Расскажи о поездке, которую ты хорошо помнишь.', 'Что бы ты изменил в своём городе и почему?', 'Опиши книгу, фильм или сериал, который тебе недавно понравился.', 'Напиши о привычке, которую ты хотел бы завести.', 'Чему ты научился на этой неделе — на уроках или вне их?'],
    high: ['Технологии сближают нас или отдаляют? Аргументируй свою точку зрения.', 'Опиши момент, который изменил твой взгляд на что-то.', 'Какую традицию своей культуры ты объяснил бы незнакомцу и как?', 'Напиши короткое письмо себе через десять лет.'],
  },
  el: {
    start: ['Περίγραψε το σημερινό σου πρωινό.', 'Τι έφαγες σήμερα; Σου άρεσε;', 'Γράψε για ένα άτομο από την οικογένειά σου.', 'Τι καιρό κάνει και τι κάνεις σήμερα;', 'Περίγραψε το δωμάτιό σου ή το αγαπημένο σου μέρος στο σπίτι.'],
    middle: ['Διηγήσου ένα ταξίδι που θυμάσαι καλά.', 'Τι θα άλλαζες στην πόλη σου και γιατί;', 'Περίγραψε ένα βιβλίο, μια ταινία ή μια σειρά που σου άρεσε πρόσφατα.', 'Γράψε για μια συνήθεια που θα ήθελες να ξεκινήσεις.', 'Τι έμαθες αυτή την εβδομάδα, στο μάθημα ή έξω από αυτό;'],
    high: ['Η τεχνολογία μάς φέρνει πιο κοντά ή μας απομακρύνει; Υποστήριξε την άποψή σου.', 'Περίγραψε μια στιγμή που άλλαξε τον τρόπο που βλέπεις κάτι.', 'Ποια παράδοση του πολιτισμού σου θα εξηγούσες σε έναν άγνωστο και πώς;', 'Γράψε ένα σύντομο γράμμα στον εαυτό σου σε δέκα χρόνια.'],
  },
  hu: {
    start: ['Írd le, milyen volt a reggeled ma.', 'Mit ettél ma? Ízlett?', 'Írj a családod egyik tagjáról.', 'Milyen az idő, és mit csinálsz ma?', 'Írd le a szobádat vagy a kedvenc helyedet otthon.'],
    middle: ['Mesélj el egy utazást, amelyre jól emlékszel.', 'Mit változtatnál meg a városodban, és miért?', 'Írj egy könyvről, filmről vagy sorozatról, amely nemrég tetszett.', 'Írj egy szokásról, amelyet szívesen elkezdenél.', 'Mit tanultál ezen a héten, órán vagy azon kívül?'],
    high: ['Közelebb hoz minket a technológia, vagy eltávolít? Érvelj a véleményed mellett.', 'Írj egy pillanatról, amely megváltoztatta, hogyan látsz valamit.', 'Melyik hagyományodat magyaráznád el egy idegennek, és hogyan?', 'Írj egy rövid levelet önmagadnak tíz év múlva.'],
  },
};

/** Today's offline prompt: the same all day, a different one tomorrow. */
export function curatedPrompt(lang: string, level: Level, day = new Date()): WritingPrompt {
  const band = BAND[level];
  const list = PROMPTS[lang]?.[band] ?? PROMPTS.en[band];
  const dayNumber = Math.floor(day.getTime() / 86_400_000);
  const i = dayNumber % list.length;
  return { text: list[i], en: EN[band][i] };
}

/** Another prompt than the given one (the "different prompt" button). */
export function otherPrompt(lang: string, level: Level, current: string): WritingPrompt {
  const band = BAND[level];
  const list = PROMPTS[lang]?.[band] ?? PROMPTS.en[band];
  const at = list.indexOf(current);
  const i = (at + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  return { text: list[i], en: EN[band][i] };
}
