// Melody and stress (6-10): the same words as a statement and as a question, and which word of an answer carries the stress. Hand-made
// for the six core languages. `measurable` is true where a yes/no question really rises at the end, so the learner's own recording can be checked
// for it; Russian and Mandarin do it another way, and are only heard.
export interface IntonationItem {
  text: string;
  kind: 'statement' | 'question';
}

export interface Intonation {
  rule: string;
  measurable: boolean;
  items: IntonationItem[];
}

export interface StressItem {
  question: string;
  answer: string;
  /** The word of the answer that carries the stress: the one that answers the question. */
  stressed: string;
}

const pair = (statement: string, question: string): IntonationItem[] => [
  { text: statement, kind: 'statement' },
  { text: question, kind: 'question' },
];

export const INTONATION: Record<string, Intonation> = {
  es: {
    rule: 'A statement falls at the end. A yes/no question rises on its last stressed syllable and stays up. There is no change of word order: only the melody (and the ¿ ?) tells them apart.',
    measurable: true,
    items: [...pair('Vienes mañana.', '¿Vienes mañana?'), ...pair('Tienes hermanos.', '¿Tienes hermanos?'), ...pair('Hace frío.', '¿Hace frío?'), ...pair('Está en casa.', '¿Está en casa?')],
  },
  fr: {
    rule: 'A statement falls at the end of the sentence. A yes/no question rises at the end, and often is the same words with only the melody changed (the written form adds a space and “?”).',
    measurable: true,
    items: [...pair('Tu viens demain.', 'Tu viens demain ?'), ...pair('Il a un frère.', 'Il a un frère ?'), ...pair('C’est loin.', 'C’est loin ?'), ...pair('Vous parlez anglais.', 'Vous parlez anglais ?')],
  },
  de: {
    rule: 'A statement falls at the end. A yes/no question rises at the end, whether it is said with the word order of a statement or with the verb first (Kommst du morgen?).',
    measurable: true,
    items: [...pair('Du kommst morgen.', 'Du kommst morgen?'), ...pair('Er hat einen Bruder.', 'Er hat einen Bruder?'), ...pair('Es ist weit.', 'Es ist weit?'), ...pair('Sie sprechen Englisch.', 'Sie sprechen Englisch?')],
  },
  ar: {
    rule: 'A statement falls at the end. A yes/no question rises at the end, with or without the word هل at the start.',
    measurable: true,
    items: [...pair('أنت تأتي غداً.', 'أنت تأتي غداً؟'), ...pair('هذا بعيد.', 'هذا بعيد؟'), ...pair('عندك أخ.', 'عندك أخ؟')],
  },
  ru: {
    rule: 'A statement falls. A yes/no question does not rise at the end: the voice jumps up on the stressed syllable of the word you are asking about, and falls after it. Listen for the peak, not for the end.',
    measurable: false,
    items: [...pair('Ты придёшь завтра.', 'Ты придёшь завтра?'), ...pair('У тебя есть брат.', 'У тебя есть брат?'), ...pair('Это далеко.', 'Это далеко?')],
  },
  zh: {
    rule: 'The tones stay as they are in a question; what marks it is usually the particle 吗 at the end, and the whole sentence sits a little higher. Do not change the tones to make a question.',
    measurable: false,
    items: [...pair('你明天来。', '你明天来吗？'), ...pair('他有哥哥。', '他有哥哥吗？'), ...pair('很远。', '很远吗？')],
  },
};

export const STRESS: Record<string, StressItem[]> = {
  es: [
    { question: '¿Quién compró el pan?', answer: 'Juan compró el pan.', stressed: 'Juan' },
    { question: '¿Qué compró Juan?', answer: 'Juan compró pan.', stressed: 'pan' },
    { question: '¿Cuándo llegó Ana?', answer: 'Ana llegó ayer.', stressed: 'ayer' },
  ],
  fr: [
    { question: 'Qui a acheté le pain ?', answer: 'Paul a acheté le pain.', stressed: 'Paul' },
    { question: 'Qu’a acheté Paul ?', answer: 'Paul a acheté du pain.', stressed: 'pain' },
    { question: 'Quand Anne est-elle arrivée ?', answer: 'Anne est arrivée hier.', stressed: 'hier' },
  ],
  de: [
    { question: 'Wer hat das Brot gekauft?', answer: 'Paul hat das Brot gekauft.', stressed: 'Paul' },
    { question: 'Was hat Paul gekauft?', answer: 'Paul hat Brot gekauft.', stressed: 'Brot' },
    { question: 'Wann ist Anna angekommen?', answer: 'Anna ist gestern angekommen.', stressed: 'gestern' },
  ],
  ru: [
    { question: 'Кто купил хлеб?', answer: 'Хлеб купил Павел.', stressed: 'Павел' },
    { question: 'Что купил Павел?', answer: 'Павел купил хлеб.', stressed: 'хлеб' },
    { question: 'Когда приехала Анна?', answer: 'Анна приехала вчера.', stressed: 'вчера' },
  ],
  ar: [
    { question: 'من اشترى الخبز؟', answer: 'اشترى أحمد الخبز.', stressed: 'أحمد' },
    { question: 'ماذا اشترى أحمد؟', answer: 'اشترى أحمد الخبز.', stressed: 'الخبز' },
    { question: 'متى وصلت منى؟', answer: 'وصلت منى أمس.', stressed: 'أمس' },
  ],
  zh: [
    { question: '谁买了面包？', answer: '小王买了面包。', stressed: '小王' },
    { question: '小王买了什么？', answer: '小王买了面包。', stressed: '面包' },
    { question: '小李什么时候到的？', answer: '小李昨天到的。', stressed: '昨天' },
  ],
};

export const intonationOf = (lang: string): Intonation | undefined => INTONATION[lang];
export const stressOf = (lang: string): StressItem[] => STRESS[lang] ?? [];

/** The words of an answer as the learner picks them: split on spaces, punctuation off the edges (Mandarin: the stressed word's characters are found in the sentence, so it is cut around it). */
export function answerWords(item: StressItem): string[] {
  if (!/\s/.test(item.answer)) {
    const at = item.answer.indexOf(item.stressed);
    const rest = [item.answer.slice(0, at), item.stressed, item.answer.slice(at + item.stressed.length)];
    return rest.filter(Boolean);
  }
  return item.answer.split(/\s+/);
}

/** Whether a picked word of the answer is the stressed one (punctuation and case do not count). */
export const isStressed = (picked: string, item: StressItem): boolean => picked.replace(/[.,!?؟。，、]/g, '').toLocaleLowerCase() === item.stressed.toLocaleLowerCase();
