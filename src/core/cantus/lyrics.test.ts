import { describe, expect, it } from 'vitest';
import { detectLanguage } from '@/core/lang/detect';
import { isTimed, linesToCues, parseLrc, parsePlain } from './lyrics';

describe('lyrics', () => {
  it('reads timed LRC, repeated lines and an offset', () => {
    const lines = parseLrc('[ar:Someone]\n[offset:+500]\n[00:12.30] Hola, ¿qué tal?\n[00:15.00]\n[00:16.5][01:02.00] Coro otra vez\n[00:20.120]<00:20.12> Palabra <00:21.00>por palabra');
    expect(lines).toEqual([
      { startMs: 11_800, text: 'Hola, ¿qué tal?' },
      { startMs: 14_500, text: '' },
      { startMs: 16_000, text: 'Coro otra vez' },
      { startMs: 19_620, text: 'Palabra por palabra' },
      { startMs: 61_500, text: 'Coro otra vez' },
    ]);
    expect(isTimed(lines)).toBe(true);
  });

  it('keeps one break between verses of plain lyrics', () => {
    expect(parsePlain('\nUno\ndos\n\n\nTres\n\n')).toEqual([{ text: 'Uno' }, { text: 'dos' }, { text: '' }, { text: 'Tres' }]);
  });

  it('turns timed lines into cues that last until the next line', () => {
    const cues = linesToCues(parseLrc('[00:01.00] a\n[00:03.00] b'), 10_000);
    expect(cues.map((c) => [c.startMs, c.endMs])).toEqual([
      [1000, 3000],
      [3000, 10_000],
    ]);
  });
});

describe('detectLanguage', () => {
  const cases: Array<[string, string]> = [
    ['Sí, sabes que ya llevo un rato mirándote, tengo que bailar contigo hoy', 'es'],
    ['Eu sei que vou te amar, por toda a minha vida eu vou te amar', 'pt'],
    ['Non, je ne regrette rien, ni le bien qu’on m’a fait, ni le mal', 'fr'],
    ['Ich will nicht, dass du gehst, ich bin noch hier und warte auf dich', 'de'],
    ['Nel blu dipinto di blu, felice di stare lassù, e volavo volavo', 'it'],
    ['Jag vill inte att du går, det är så mycket kvar som vi kan göra', 'sv'],
    ['Szeretlek, mert nem tudok nélküled élni, és ez így van már régen', 'hu'],
    ['Я люблю тебя, и ты это знаешь, мы будем вместе', 'ru'],
    ['Σ’ αγαπώ, και θα σ’ αγαπώ για πάντα, όσο ζω', 'el'],
    ['I just called to say I love you, and I mean it from the bottom of my heart', 'en'],
    ['Ik weet niet wat ik moet doen, maar ik wil bij jou zijn voor altijd', 'nl'],
    ['Jeg vet ikke hva jeg skal si, men jeg vil bare være her med deg', 'nb'],
    ['Seni çok seviyorum ama sen beni hiç anlamıyorsun, neden böyle', 'tr'],
    ['Aku tak bisa hidup tanpa kamu, karena cinta ini hanya untukmu', 'id'],
    ['Nakupenda sana mpenzi wangu, wewe ni moyo wangu kweli', 'sw'],
    ['Pater noster, qui es in caelis, sanctificetur nomen tuum, adveniat regnum tuum', 'la'],
    ['أحبك من كل قلبي، وأنت كل حياتي يا حبيبي', 'ar'],
    ['我爱你，你是我心中最美的风景，永远不会改变', 'zh'],
    ['君のことが好きだよ、ずっとそばにいてほしい', 'ja'],
    ['사랑해요, 당신이 없으면 나는 살 수 없어요', 'ko'],
  ];
  it.each(cases)('%s', (text, lang) => {
    expect(detectLanguage(text)?.lang).toBe(lang);
  });

  it('says nothing about a line too short to tell', () => {
    expect(detectLanguage('Oh')).toBeNull();
  });
});
