// Pronunciation drills (6-10): short things to say aloud, grouped by what they train. Hand-made for the six core languages; each item is
// said by a voice, then by the learner, who sees the shapes of the voice beside it (Say it, and see it).
export interface DrillItem {
  text: string;
  /** What to watch for, when it isn't obvious. */
  note?: string;
}

export interface DrillGroup {
  id: string;
  title: string;
  intro: string;
  items: DrillItem[];
}

const items = (...xs: Array<string | [string, string]>): DrillItem[] => xs.map((x) => (typeof x === 'string' ? { text: x } : { text: x[0], note: x[1] }));

export const DRILLS: Record<string, DrillGroup[]> = {
  es: [
    { id: 'clusters', title: 'Consonant clusters', intro: 'Two or three consonants together: keep each one, and never add an “e” in front of s + consonant.', items: items(['tres', 'the r is a tap, right after the t'], 'blusa', 'grande', 'plata', ['extranjero', 'x is “ks”, then a clear j'], 'construir', ['obstáculo', 'b and s both sounded']) },
    { id: 'syllables', title: 'Hard syllables and long words', intro: 'Say them slowly, syllable by syllable, then at speed.', items: items('murciélago', ['ferrocarril', 'one rolled rr in the middle, one tap-less r at the end'], 'desarrollo', 'otorrinolaringólogo', ['cigüeña', 'the ü means gu is sounded: “gwe”']) },
    { id: 'combos', title: 'Letter combinations', intro: 'Letters that behave in a set way.', items: items(['queso', 'qu is a plain k; the u is silent'], ['guerra', 'gu before e is a hard g; the u is silent'], ['pingüino', 'ü: the u is sounded'], ['llave', 'll like y in most places'], ['hijo', 'h is silent, j is a throaty “h”'], ['chico', 'ch as in “chair”']) },
    { id: 'twisters', title: 'Tongue twisters', intro: 'Slow first. Speed comes after the sounds are right.', items: items('Tres tristes tigres tragaban trigo en un trigal.', 'Pablito clavó un clavito.', 'Si Sansón no sazona su salsa con sal, le sale sosa.') },
  ],
  fr: [
    { id: 'clusters', title: 'Consonant clusters', intro: 'The r follows another consonant in one breath; do not add an “uh” between them.', items: items('trois', 'strict', 'structure', 'pleuvoir', 'exprès') },
    { id: 'syllables', title: 'Hard syllables and long words', intro: 'Lengthen nothing; keep the syllables even.', items: items(['grenouille', 'ouille is “oo-y”'], 'écureuil', ['arrière', 'the r after a vowel is made at the back of the throat'], 'feuille', ['huit', 'ü glides straight into i: “wit”']) },
    { id: 'combos', title: 'Letter combinations', intro: 'Letters that behave in a set way.', items: items(['eau', 'all three letters are one “o”'], ['oi', '“wa”'], ['gn', 'like “ny” in “canyon”: montagne'], ['ill', 'fille is “fee-y”, but ville is “veel”'], ['ch', '“sh”: chat']) },
    { id: 'nasal', title: 'Nasal vowels', intro: 'Air goes through the nose, and the n or m is not said. Say the vowel first without the nose, then let the air through.', items: items(['bon', 'on: lips rounded'], ['vin', 'in: lips spread'], ['vent', 'an: mouth open, at the back'], ['brun', 'un: often said like in today'], 'pain', 'blanc', 'long', 'lent') },
    { id: 'twisters', title: 'Tongue twisters', intro: 'Slow first. Speed comes after the sounds are right.', items: items('Les chaussettes de l’archiduchesse sont-elles sèches, archi-sèches ?', 'Un chasseur sachant chasser doit savoir chasser sans son chien.', 'Je veux et j’exige d’exquises excuses.') },
  ],
  de: [
    { id: 'clusters', title: 'Consonant clusters', intro: 'German packs consonants at the start of a word: say each one, with no vowel between.', items: items(['Strumpf', 'str, then mpf'], ['Pflanze', 'pf is one quick sound'], ['Zweig', 'zw: ts + v'], 'Schnee', ['Knie', 'the k is sounded'], 'Sprache') },
    { id: 'syllables', title: 'Hard syllables and long words', intro: 'Stress the first part of the word; the rest is lighter.', items: items(['Eichhörnchen', 'ch after i, then ö'], 'Brötchen', 'Zeitschrift', 'Geschwindigkeit', ['Streichholzschächtelchen', 'the long one: slowly, in parts']) },
    { id: 'combos', title: 'Letter combinations', intro: 'Letters that behave in a set way.', items: items(['sch', 'the “sh” of Schule'], ['ich', 'ch after i, e, ä, ö, ü, eu: a soft hiss, tongue high'], ['Bach', 'ch after a, o, u: from the back of the throat'], ['Spiel', 'sp at the start is “shp”'], ['Straße', 'st at the start is “sht”'], ['neu', 'eu is “oy”']) },
    { id: 'twisters', title: 'Tongue twisters', intro: 'Slow first. Speed comes after the sounds are right.', items: items('Fischers Fritz fischt frische Fische.', 'Blaukraut bleibt Blaukraut und Brautkleid bleibt Brautkleid.', 'Zwischen zwei Zwetschgenzweigen zwitschern zwei Schwalben.') },
  ],
  ru: [
    { id: 'clusters', title: 'Consonant clusters', intro: 'Russian allows long runs of consonants. Keep each, and do not slip a vowel in.', items: items(['здравствуйте', 'the first в is silent: “zdrastvuytye”'], 'взгляд', 'встреча', ['чувство', 'the в is silent: “chustvo”'], 'мгновение') },
    { id: 'syllables', title: 'Hard syllables and long words', intro: 'Put the stress on the right syllable, and reduce the vowels before it.', items: items(['подъезд', 'the hard sign ъ: a short break before е'], 'съёмка', 'расчёска', 'объявление', 'естественно') },
    { id: 'combos', title: 'Letter combinations', intro: 'Letters that behave in a set way.', items: items(['что', 'said “shto”'], ['сегодня', 'г is said as в in -ого and in сегодня'], ['учиться', '-ться is said “tsa”'], ['щи', 'щ is a long soft “sh”'], ['жизнь', 'ж is “zh”; ь softens the з']) },
    { id: 'soft', title: 'Hard and soft consonants', intro: 'The soft sign and a soft vowel raise the middle of the tongue to the palate. Hear the difference, then say it.', items: items(['мат', 'hard: swearing'], ['мать', 'soft: mother'], ['угол', 'hard: corner'], ['уголь', 'soft: coal'], ['брат', 'hard: brother'], ['брать', 'soft: to take'], ['лук', 'hard: onion'], ['люк', 'soft: hatch']) },
    { id: 'twisters', title: 'Tongue twisters', intro: 'Slow first. Speed comes after the sounds are right.', items: items('Карл у Клары украл кораллы, а Клара у Карла украла кларнет.', 'На дворе трава, на траве дрова.', 'Ехал Грека через реку.') },
  ],
  ar: [
    { id: 'syllables', title: 'Hard syllables and long words', intro: 'Arabic words begin with one consonant and a vowel. Keep the doubled letters doubled.', items: items(['مدرسة', 'a school: mad-ra-sa'], ['مكتبة', 'a library: mak-ta-ba'], ['استقلال', 'independence'], ['مستشفى', 'a hospital']) },
    { id: 'emphatic', title: 'The heavy (emphatic) letters', intro: 'ص ض ط ظ: the back of the tongue is drawn up and back, and the vowel next to them goes dark. Hear the plain letter, then the heavy one.', items: items(['سيف', 'plain س: a sword'], ['صيف', 'heavy ص: summer'], ['تين', 'plain ت: figs'], ['طين', 'heavy ط: mud'], ['درس', 'plain د: a lesson'], ['ضرس', 'heavy ض: a molar'], ['كلب', 'k: a dog'], ['قلب', 'q, further back: a heart']) },
    { id: 'combos', title: 'Throat letters', intro: 'Sounds English does not have.', items: items(['عين', 'ع: squeeze the throat, voiced'], ['غرفة', 'غ: a gargle, voiced'], ['خبز', 'خ: a scrape, not voiced'], ['حب', 'ح: a breathy h from the throat'], ['قمر', 'ق: from the very back; the moon']) },
  ],
  zh: [
    { id: 'tones', title: 'Tone production', intro: 'Say the four tones on one syllable, in a row: high and level, rising, dipping, falling. Keep the voice relaxed.', items: items(['妈', 'mā: tone 1, mum'], ['麻', 'má: tone 2, hemp'], ['马', 'mǎ: tone 3, horse'], ['骂', 'mà: tone 4, to scold'], ['书', 'shū: tone 1'], ['熟', 'shú: tone 2'], ['鼠', 'shǔ: tone 3'], ['树', 'shù: tone 4']) },
    { id: 'contrasts', title: 'Tonal contrasts', intro: 'Two words that differ only in tone. Hear both before you say them.', items: items(['买', 'mǎi: buy'], ['卖', 'mài: sell'], ['问', 'wèn: ask'], ['文', 'wén: writing'], ['睡', 'shuì: sleep'], ['水', 'shuǐ: water'], ['汤', 'tāng: soup'], ['糖', 'táng: sugar']) },
    { id: 'combos', title: 'Initials that are hard', intro: 'zh ch sh r are made with the tongue curled back; j q x with the tongue flat behind the lower teeth.', items: items(['知', 'zhī'], ['吃', 'chī'], ['师', 'shī'], ['日', 'rì'], ['鸡', 'jī'], ['七', 'qī'], ['西', 'xī'], ['绿', 'lǜ: ü, lips rounded as for “oo” and the tongue as for “ee”']) },
    { id: 'twisters', title: 'Tongue twisters', intro: 'Slow first. Speed comes after the sounds are right.', items: items('四是四，十是十，十四是十四，四十是四十。', '吃葡萄不吐葡萄皮，不吃葡萄倒吐葡萄皮。') },
  ],
};

export const drillsOf = (lang: string): DrillGroup[] => DRILLS[lang] ?? [];

/** A random test: `n` different items from all the drills of a language. */
export function randomTest(lang: string, n: number, rng: () => number = Math.random): string[] {
  const all = drillsOf(lang).flatMap((g) => g.items.map((i) => i.text));
  const picked: string[] = [];
  while (picked.length < Math.min(n, all.length)) {
    const [one] = all.splice(Math.floor(rng() * all.length), 1);
    picked.push(one);
  }
  return picked;
}
