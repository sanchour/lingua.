import { describe, expect, it } from 'vitest';
import { deinflect, furigana, readingOf, segmentJapanese, toHiragana } from './japanese';
import type { JapaneseLexicon } from './japanese';

describe('deinflect', () => {
  const finds = (form: string, base: string) => expect(deinflect(form), form).toContain(base);
  it('takes conjugations back to the dictionary form', () => {
    finds('食べました', '食べる');
    finds('食べません', '食べる');
    finds('食べている', '食べる');
    finds('食べていました', '食べる');
    finds('食べなかった', '食べる');
    finds('食べられる', '食べる');
    finds('食べたい', '食べる');
    finds('食べたくない', '食べる');
    finds('行きました', '行く');
    finds('行った', '行く');
    finds('行かない', '行く');
    finds('行こう', '行く');
    finds('行けば', '行く');
    finds('読んで', '読む');
    finds('読んでいる', '読む');
    finds('読める', '読む');
    finds('読ませる', '読む');
    finds('書いた', '書く');
    finds('泳いで', '泳ぐ');
    finds('話して', '話す');
    finds('待って', '待つ');
    finds('買った', '買う');
    finds('しました', 'する');
    finds('している', 'する');
    finds('来ました', '来る');
    finds('高かった', '高い');
    finds('高くない', '高い');
    finds('でした', 'です');
    finds('だった', 'だ');
    finds('食べちゃった', '食べる');
  });
  it('leaves dictionary forms alone', () => {
    expect(deinflect('食べる')).not.toContain('食べる');
  });
});

describe('segmentJapanese', () => {
  const ranks = ['の', 'は', 'に', 'を', 'が', 'た', 'て', 'です', 'する', 'いる', '私', '今日', '行く', '食べる', '学生', '寿司', '昨日', 'ます', '日本語', '勉強', '本', '読む', '窓辺', '雪', '静か', 'こんにちは'];
  const extra = ['今日は', 'まし', '食べ'];
  const lex: JapaneseLexicon = {
    has: (w) => ranks.includes(w) || extra.includes(w),
    cost: (w) => (ranks.includes(w) ? Math.log(ranks.indexOf(w) + 2) : 11.5),
  };
  const words = (s: string) => segmentJapanese(s, lex).map((w) => s.slice(w.start, w.end));
  it('keeps conjugated verbs whole and particles apart', () => {
    expect(words('昨日は寿司を食べました')).toEqual(['昨日', 'は', '寿司', 'を', '食べました']);
    expect(words('私は学生です')).toEqual(['私', 'は', '学生', 'です']);
    expect(words('今日は日本語を勉強しています')).toEqual(['今日', 'は', '日本語', 'を', '勉強', 'しています']);
  });
  it('gives the dictionary form of a conjugated word', () => {
    const [w] = segmentJapanese('食べました', lex);
    expect(w.base).toBe('食べる');
  });
  it('keeps an unknown katakana run together', () => {
    expect(words('私はマリアです')).toEqual(['私', 'は', 'マリア', 'です']);
  });
});

describe('readings', () => {
  it('reads a conjugated form from its dictionary form', () => {
    expect(readingOf('食べました', '食べる', 'たべる')).toBe('たべました');
    expect(readingOf('行かない', '行く', 'いく')).toBe('いかない');
    expect(readingOf('学生', '学生', 'がくせい')).toBe('がくせい');
  });
  it('puts kana over the kanji only', () => {
    expect(furigana('食べました', 'たべました')).toEqual([['食', 'た'], ['べました']]);
    expect(furigana('お茶', 'おちゃ')).toEqual([['お'], ['茶', 'ちゃ']]);
    expect(furigana('取り扱い', 'とりあつかい')).toEqual([['取', 'と'], ['り'], ['扱', 'あつか'], ['い']]);
    expect(furigana('学生', 'がくせい')).toEqual([['学生', 'がくせい']]);
    expect(furigana('すし', 'すし')).toBeNull();
  });
  it('compares katakana readings as hiragana', () => {
    expect(toHiragana('コーヒー')).toBe('こーひー');
  });
});
