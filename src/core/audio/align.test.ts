import { describe, expect, it } from 'vitest';
import type { Cue } from '@/data/types';
import { alignToBook } from './align';

type Word = NonNullable<Cue['words']>[number];

/** Reads words aloud: longer words take longer, and a sentence's end leaves a pause. Whisper's words start with a space. */
function speak(text: string, from: number): Word[] {
  const out: Word[] = [];
  let t = from;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const length = 180 + 45 * w.replace(/[^\p{L}]/gu, '').length;
    out.push({ w: ` ${w}`, startMs: t, endMs: t + length });
    t += length + (/[.!?]$/.test(w) ? 650 : 70);
  }
  return out;
}

/** Whisper-like segments of the given sizes (they cut across sentences); only every other one has word times. */
function segments(words: Word[], sizes: number[]): Cue[] {
  const cues: Cue[] = [];
  for (let at = 0, k = 0; at < words.length; at += sizes[k % sizes.length], k++) {
    const part = words.slice(at, at + sizes[k % sizes.length]);
    const cue: Cue = { startMs: part[0].startMs, endMs: part[part.length - 1].endMs, text: part.map((w) => w.w).join('').trim() };
    cues.push(k % 2 ? cue : { ...cue, words: part });
  }
  return cues;
}

const book = [
  'El pueblo estaba al pie de una montaña muy alta. Cada mañana los campesinos subían por el camino de piedra con sus mulas. Nadie recordaba quién había construido el viejo puente sobre el río. Los niños jugaban junto al agua hasta que caía la tarde.',
  'Una noche de invierno llegó al pueblo un viajero desconocido. Llevaba un abrigo gris y una maleta pequeña de cuero marrón. Pidió una habitación en la posada y se sentó cerca del fuego sin decir nada. La dueña le sirvió una sopa caliente y un vaso de vino tinto. Al día siguiente, el viajero ya no estaba en su cuarto.',
  'Durante semanas la gente habló de aquel hombre misterioso. Algunos decían que era un soldado que volvía de la guerra. Otros pensaban que buscaba a una mujer que había perdido hace muchos años. Cuando volvieron a buscarlo, el viajero ya no estaba en ninguna parte. Pero nadie supo nunca la verdad.',
];
const partTwo = [
  'Una noche de invierno llegó al pueblo un viajero desconocido.',
  'Llevaba un abrigo gris y una maleta pequeña de cuero marrón.',
  'Pidió una habitación en la posada y se sentó cerca del fuego sin decir nada.',
  'La dueña le sirvió una sopa caliente y un vaso de vino tinto.',
  'Al día siguiente, el viajero ya no estaba en su cuarto.',
];
const intro = 'Esta es una grabación de LibriVox. Todas las grabaciones de LibriVox son de dominio público.';
// What Whisper heard: the second paragraph, with a few words wrong.
const heard =
  'Una noche de invierno llegó al pueblo un viajero desconocido. Llevaba un abrigo gris y una mala pequeña de cuero marrón. Pidió una habitación en la posada y se sentó cerca de fuego sin decir nada. La dueña le sirvió una sopa caliente y un baso de vino tinto. Al día siguiente, el viajero ya no estaba en su cuatro.';

describe('alignToBook', () => {
  const introWords = speak(intro, 400);
  const words = speak(heard, introWords[introWords.length - 1].endMs + 1500);
  // The intro is two segments of its own, then segments of 10 words.
  const transcript = [...segments(introWords, [6, 9]), ...segments(words, [10])];
  const spanStart = transcript[0].startMs;
  const spanEnd = transcript[transcript.length - 1].endMs;

  it('times the book’s own sentences of the part read, and only those', () => {
    const cues = alignToBook(transcript, book, 'es');
    expect(cues?.map((c) => c.text)).toEqual(partTwo);
    // The intro matches nothing: the first sentence starts when "Una" is heard.
    expect(cues![0].startMs).toBe(words[0].startMs);
    for (const [i, cue] of cues!.entries()) {
      expect(cue.startMs).toBeGreaterThanOrEqual(spanStart);
      expect(cue.endMs).toBeLessThanOrEqual(spanEnd);
      expect(cue.endMs).toBeGreaterThan(cue.startMs);
      if (i) expect(cue.startMs).toBeGreaterThanOrEqual(cues![i - 1].endMs);
    }
  });

  it('starts each sentence close to when it was heard', () => {
    const cues = alignToBook(transcript, book, 'es')!;
    const said = words.map((w) => w.w.trim());
    for (const [i, first] of ['Una', 'Llevaba', 'Pidió', 'La', 'Al'].entries()) {
      const heardAt = words[said.indexOf(first)].startMs;
      expect(Math.abs(cues[i].startMs - heardAt)).toBeLessThan(300);
    }
  });

  it('gives every word of a sentence a time, in order, inside the sentence', () => {
    const cues = alignToBook(transcript, book, 'es')!;
    for (const cue of cues) {
      expect(cue.words?.map((w) => w.w).join(' ')).toBe(cue.text.replace(/[.,]/g, ''));
      for (const [k, w] of cue.words!.entries()) {
        expect(w.startMs).toBeGreaterThanOrEqual(cue.startMs);
        expect(w.endMs).toBeLessThanOrEqual(cue.endMs);
        expect(w.endMs).toBeGreaterThanOrEqual(w.startMs);
        if (k) expect(w.startMs).toBeGreaterThanOrEqual(cue.words![k - 1].startMs);
      }
    }
    // A word heard right keeps the time it was heard at.
    const sopa = cues[3].words!.find((w) => w.w === 'sopa')!;
    expect(sopa.startMs).toBe(words.find((w) => w.w === ' sopa')!.startMs);
  });

  it('keeps the words of a part that stops mid-sentence inside the audio', () => {
    // The file ends after "cerca de", in the middle of the third sentence.
    const cut = words.slice(0, words.findIndex((w) => w.w === ' fuego'));
    const short = segments(cut, [10]);
    const end = short[short.length - 1].endMs;
    const cues = alignToBook(short, book, 'es')!;
    expect(cues.map((c) => c.text)).toEqual(partTwo.slice(0, 3));
    for (const cue of cues) {
      expect(cue.endMs).toBeLessThanOrEqual(end + 1000);
      for (const w of cue.words!) expect(w.startMs).toBeLessThanOrEqual(cue.endMs);
    }
  });

  it('is null for a transcript of another text, or one too short', () => {
    const other = speak(
      'Mi abuela vivía en una casa blanca cerca del mar. Todos los veranos íbamos a verla en tren. Ella cocinaba pescado frito y nos contaba historias de marineros. Por las noches mirábamos las estrellas desde el balcón.',
      0,
    );
    expect(alignToBook(segments(other, [8]), book, 'es')).toBeNull();
    expect(alignToBook(segments(words.slice(0, 6), [6]), book, 'es')).toBeNull();
    expect(alignToBook(transcript, [], 'es')).toBeNull();
  });

  it('matches an unspaced language by characters', () => {
    const japanese = [
      '山のふもとに小さな村がありました。村の人々は毎朝早く起きて畑へ行きました。川のそばには古い橋がありました。',
      'ある冬の夜、見知らぬ旅人が村にやって来ました。旅人は灰色のコートを着て、小さな茶色のかばんを持っていました。宿屋の主人は温かいスープと赤いワインを出しました。次の朝、旅人の部屋にはもう誰もいませんでした。',
      'それから何週間も、村の人々はその男の話をしました。戦争から帰ってきた兵士だと言う人もいました。本当のことは誰にも分かりませんでした。',
    ];
    // An intro, then the second paragraph with two words heard differently; segments without word times.
    const lines = [
      'これはリブリボックスの録音です。',
      'ある冬の夜、見知らぬ旅人が村にやって来ました。',
      '旅人は灰色のコートを着て、小さな茶色のカバンを持っていました。',
      '宿屋の主人は暖かいスープと赤いワインを出しました。',
      '次の朝、旅人の部屋にはもう誰もいませんでした。',
    ];
    let t = 0;
    const cues: Cue[] = lines.map((text) => {
      const cue = { startMs: t, endMs: t + 160 * text.length, text };
      t = cue.endMs + 500;
      return cue;
    });
    const out = alignToBook(cues, japanese, 'ja');
    expect(out?.map((c) => c.text)).toEqual(lines.slice(1).map((line) => line.replace('カバン', 'かばん').replace('暖かい', '温かい')));
    for (const [i, cue] of out!.entries()) {
      expect(cue.words).toBeUndefined();
      expect(cue.startMs).toBeGreaterThanOrEqual(cues[1].startMs - 300);
      expect(cue.endMs).toBeLessThanOrEqual(t);
      if (i) expect(cue.startMs).toBeGreaterThan(out![i - 1].startMs);
    }
  });
});
