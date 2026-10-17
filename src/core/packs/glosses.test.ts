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
