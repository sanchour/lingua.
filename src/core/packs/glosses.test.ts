// What the built dictionaries say for common words: the short gloss a tap shows must lead with (or
// contain) the everyday meaning. Guards the pack builder's choices (scripts/lang-data/build.ts).
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PACK_VERSION } from './format';

/** form → a pattern its short gloss must match. */
const CHECKS: Record<string, Record<string, RegExp>> = {
  es: {
    la: /^the\b/, los: /^the\b/, mi: /^my\b/, tu: /^your\b/, tus: /^your\b/, ellos: /^they\b/, ni: /^nor\b/, al: /\b(?:to|at) the\b/,
    muy: /^very\b/, hay: /\bthere\b/, nos: /\bus\b/, les: /\bthem\b/, me: /^me\b/, yo: /^I\b/, perro: /^dog\b/, casa: /^house\b/,
    agua: /^water\b/, chica: /^girl\b/, peor: /^worse\b/, estos: /^these\b/, esos: /^those\b/, muchos: /^many\b/, he: /\bhave\b/,
    eres: /\bare\b/, estoy: /\bam\b/,
  },
  pt: {
    o: /^the\b/, as: /^the\b/, você: /^you\b/, obrigado: /\bthank/, casa: /^house\b/, tempo: /^time\b/, ir: /\bgo\b/, vai: /\bgo\b/,
    ela: /^she\b/, eles: /^they\b/, mim: /^me\b/, essa: /^that\b/, boa: /^good\b/, do: /\bof the\b/, sim: /^yes\b/, nos: /^us\b/,
    melhor: /^better\b/, amigo: /^friend\b/, quer: /\bwant\b/, esposa: /^wife\b/, não: /^not\b/, aqui: /^here\b/, esses: /^those\b/,
  },
  de: {
    ich: /^I\b/, das: /^the\b/, die: /^the\b/, der: /^the\b/, du: /^you\b/, nicht: /^not\b/, ja: /^yes\b/, mir: /^me\b/, mich: /^me\b/,
    uns: /^us\b/, ein: /\ban?\b/, für: /^for\b/, war: /^was\b/, nein: /^no\b/, noch: /^still\b/, gut: /^good\b/, zeit: /^time\b/,
    haus: /^house\b/, danke: /^thank/, keine: /^no\b/,
  },
  fr: {
    je: /^I\b/, le: /^the\b/, la: /^the\b/, les: /^the\b/, pas: /^not\b/, vous: /^you\b/, il: /^he\b/, ne: /^not\b/, une: /\ban?\b/,
    "qu'": /^that\b/, a: /^to have\b/, me: /^me\b/, mon: /^my\b/, bien: /^well\b/, oui: /^yes\b/, non: /^no\b/, merci: /\bthank/,
    temps: /^time\b/, homme: /^man\b/, tête: /^head\b/,
  },
  it: {
    e: /^and\b/, non: /^not\b/, il: /^the\b/, la: /^the\b/, io: /^I\b/, so: /\bknow\b/, sono: /\bam\b/, sì: /^yes\b/, lui: /^he\b/,
    lei: /^she\b/, grazie: /\bthank/, casa: /^house\b/, tempo: /^time\b/, ad: /^to\b/, ed: /^and\b/,
  },
  ru: {
    я: /^I\b/, не: /^not\b/, что: /^what\b/, и: /^and\b/, ты: /^you\b/, он: /^he\b/, мы: /^we\b/, да: /^yes\b/, нет: /^no\b/,
    меня: /^me\b/, нас: /^us\b/, ему: /^him\b/, кого: /^whom\b/, спасибо: /\bthank/, время: /^time\b/, дом: /^house\b/,
  },
  el: {
    το: /^the\b/, δεν: /^not\b/, και: /^and\b/, όχι: /^no\b/, ναι: /^yes\b/, εγώ: /^I\b/, εσύ: /^you\b/, αυτόν: /^him\b/,
    αυτοί: /^they\b/, αυτήν: /^her\b/, σπίτι: /^house\b/, είναι: /\bis\b/,
  },
  sv: {
    jag: /^I\b/, är: /\b(?:is|am|are)\b/, du: /^you\b/, inte: /^not\b/, och: /^and\b/, i: /^in\b/, ett: /\ban?\b/, hej: /\b(?:hey|hi|hello)\b/,
    vill: /\bwant\b/, vet: /\bknow/, mer: /^more\b/, bättre: /^better\b/, far: /^father\b/, fru: /^wife\b/, går: /\bgo\b/, tack: /\bthank/,
    honom: /^him\b/, henne: /^her\b/, dem: /^them\b/, många: /^many\b/,
  },
  hu: {
    a: /^the\b/, nem: /\bnot?\b/, hogy: /^that\b/, és: /^and\b/, van: /\bbe\b/, igen: /^yes\b/, engem: /^me\b/, minket: /^us\b/,
    őket: /^them\b/, nekem: /\bme\b/, neked: /\byou\b/, ezek: /^these\b/, azok: /^those\b/, megy: /\bgo\b/, mit: /^what\b/,
    több: /^more\b/, legjobb: /^best\b/, köszönöm: /\bthank/, ma: /^today\b/, várj: /\bwait\b/, hiszem: /\bbelieve\b/,
  },
  // Lingua 3.0-1: the ten new languages.
  nl: {
    ik: /^I\b/, je: /^you\b/, het: /^the\b/, niet: /^not\b/, en: /^and\b/, van: /^of\b/, wat: /^what\b/, maar: /^but\b/, heeft: /^has\b/,
    ja: /^yes\b/, nee: /^no\b/, goed: /^good\b/, hier: /^here\b/, nu: /^now\b/, mijn: /^my\b/, hem: /^him\b/, ons: /^us\b/,
  },
  nb: {
    jeg: /^I\b/, ikke: /^not\b/, og: /^and\b/, i: /^in\b/, ham: /^him\b/, ja: /^yes\b/, nei: /^no\b/, hva: /^what\b/, men: /^but\b/,
    du: /^you\b/, her: /^here\b/, nå: /^now\b/, med: /^with\b/, vi: /^we\b/, oss: /^us\b/,
  },
  tr: {
    bu: /^this\b/, ne: /^what\b/, ve: /^and\b/, şey: /^thing\b/, evet: /^yes\b/, hayır: /^no\b/, ben: /^I\b/, tamam: /^okay\b/,
    ama: /^but\b/, değil: /^not\b/, iyi: /^good\b/, şimdi: /^now\b/, burada: /^here\b/, neden: /^why\b/,
  },
  id: {
    aku: /^I\b/, tidak: /^not\b/, ini: /^this\b/, itu: /^that\b/, dan: /^and\b/, akan: /^will\b/, sudah: /^already\b/, apa: /^what\b/,
    tapi: /^but\b/, sekarang: /^now\b/, sini: /^here\b/, melihat: /^to see\b/, adalah: /^is\b/,
  },
  ko: {
    내가: /^I\b/, 나: /^I\b/, 네: /^yes\b/, 왜: /^why\b/, 우리: /^we\b/, 안: /^not\b/, 지금: /^now\b/, 여기: /^here\b/, 그리고: /^and\b/,
  },
  la: {
    et: /^and\b/, non: /^not\b/, est: /^is\b/, sed: /^but\b/, se: /^himself\b/, ego: /^I\b/, cum: /^with\b/, quid: /^what\b/, post: /^after\b/,
  },
  sw: {
    na: /^and\b/, ya: /^of\b/, ni: /^is\b/, watu: /^people\b/, lakini: /^but\b/, sasa: /^now\b/, sana: /^very\b/, kuna: /^there is\b/,
  },
  ar: {
    لا: /^no\b/, في: /^in\b/, أنا: /^I\b/, نعم: /^yes\b/, يجب: /^must\b/, هنا: /^here\b/, الآن: /^now\b/, لكن: /^but\b/, ماذا: /^what\b/,
  },
  zh: {
    我: /^I\b/, 你: /^you\b/, 是: /\bbe\b/, 不: /^no/, 好: /^good\b/, 还: /^still\b/, 但: /^but\b/, 去: /^to go\b/, 现在: /^now\b/,
    什么: /^what\b/, 我们: /^we\b/, 听: /\blisten\b/, 吗: /question/,
  },
};

/** The reading over common words (Mandarin pinyin; Japanese kana): the usual one, not a rare one. */
const READINGS: Record<string, Record<string, string>> = {
  zh: { 我: 'wǒ', 的: 'de', 还: 'hái', 听: 'tīng', 现在: 'xiànzài', 吗: 'ma' },
};

const packFile = (lang: string) => new URL(`../../../public/packs/${lang}.v${PACK_VERSION}.json.gz`, import.meta.url);

describe.each(Object.keys(CHECKS))('the %s dictionary', (lang) => {
  const file = packFile(lang);
  it.skipIf(!existsSync(file))('glosses common words by their everyday meaning', () => {
    const pack = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as { forms: Array<[string, number[], string, string]> };
    const gloss = new Map(pack.forms.map((f) => [f[0], f[2]]));
    const wrong = Object.entries(CHECKS[lang])
      .filter(([form, pattern]) => !pattern.test(gloss.get(form) ?? ''))
      .map(([form]) => `${form} = ${gloss.get(form) ?? 'MISSING'}`);
    expect(wrong).toEqual([]);
  });
});

describe.each(Object.keys(READINGS))('the %s readings', (lang) => {
  const file = packFile(lang);
  it.skipIf(!existsSync(file))('read common words the usual way', () => {
    const pack = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as { forms: Array<[string, number[], string, string, string?]> };
    const reading = new Map(pack.forms.map((f) => [f[0], f[4]]));
    const wrong = Object.entries(READINGS[lang])
      .filter(([form, r]) => reading.get(form) !== r)
      .map(([form]) => `${form} = ${reading.get(form) ?? 'MISSING'}`);
    expect(wrong).toEqual([]);
  });
});
