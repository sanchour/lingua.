// The commonest words whose dictionary meaning comes out wrong for a reader, checked by hand while
// reviewing each new language's 200 commonest words (Lingua 3.0-1). Wiktionary lists meanings by
// history and gives particles and pronoun forms as grammar notes; a tap should say what the word
// means in the sentence. build.ts puts these first, for the word and for its tap.
//
// Keys are normalised forms (as in the pack); values the short gloss, most usual meaning first.

export const GLOSS_FIXES: Record<string, Record<string, string>> = {
  nl: {
    niet: 'not', heeft: 'has', hebt: 'have, has', aan: 'on; to; at', n: 'a, an (’n)', zijn: 'to be; his', was: 'was; to wash',
    er: 'there', die: 'that, those; who', ze: 'they; she; them', 'm': 'him (’m)', s: '’s (is, des)',
  },
  nb: {
    i: 'in', ham: 'him', går: 'goes, walks; yesterday', få: 'to get; few', du: 'you', kan: 'can', det: 'it; that; the',
    den: 'it; that; the', vil: 'want(s) to; will', er: 'is, are, am', var: 'was, were', ok: 'OK', seg: 'oneself, himself, herself, themselves',
  },
  tr: {
    şey: 'thing', tamam: 'okay; complete', en: 'most (makes the superlative)', mı: 'question particle (…?)', mi: 'question particle (…?)',
    mu: 'question particle (…?)', mü: 'question particle (…?)', için: 'for; in order to', kadar: 'as … as; until; about', o: 'he, she, it; that',
    ya: 'or; yes, well (emphasis)', hey: 'hey', a: 'ah, oh', ın: 'of (genitive ending)',
  },
  id: {
    akan: 'will (future)', sudah: 'already', adalah: 'is, are', apakah: 'question word (is it…?)', kasih: 'to give; love', menjadi: 'to become',
    melihat: 'to see', tak: 'not', dia: 'he, she', di: 'in, at, on', anda: 'you (polite)', saja: 'just, only', yang: 'which, who, that',
    pernah: 'ever, once', hari: 'day', dari: 'from; of', oh: 'oh', hei: 'hey', yeah: 'yeah', lakukan: 'to do', tahu: 'to know',
  },
  ko: {
    내가: 'I (subject)', 난: 'I (topic)', 거야: 'it’s …, it is …', 할: 'to do (will do)', 게: 'thing (것이)', 해: 'do (to do); sun', 넌: 'you (topic)',
    날: 'me (나를); day', 건: 'thing (topic, 것은)', 전: 'I (topic, polite); before', 걸: 'thing (object, 것을)', 네가: 'you (subject)',
    우린: 'we (topic)', 나는: 'I (topic)', 그건: 'that (topic, 그것은)', 이건: 'this (topic, 이것은)', 거예요: 'it is … (polite)', 다: 'all; everything',
    수: 'way, means (-ㄹ 수 있다: can)', 이런: 'such, like this', 하고: 'and; with', 나도: 'me too, I also', 제가: 'I (polite, subject)',
    있어: 'there is; to have', 좀: 'a little; please', 저: 'I (polite); that', 제: 'my (polite)', 알아: 'I know; to know', 오: 'oh; five',
    거: 'thing (것)', 그래: 'yes, right; like that', 있어요: 'there is; to have (polite)', 있는: 'that is, that has', 못: 'cannot', 돼: 'to become; okay, it works',
  },
  la: {
    se: 'himself, herself, itself, themselves', post: 'after; behind', dominus: 'lord, master', domini: 'of the lord; lords', maria: 'Mary; seas',
    te: 'you (object)', mihi: 'to me, for me', anno: 'in the year', dies: 'day', natus: 'born; son', eius: 'his, her, its', eum: 'him',
    eos: 'them', ei: 'to him, to her', eorum: 'their', est: 'is', esse: 'to be', sunt: 'are', erat: 'was', fuit: 'was', es: 'you are',
    sum: 'I am', qua: 'where; as', quae: 'who, which', thomas: 'Thomas (name)',
  },
  sw: {
    ya: 'of (class 9, 6)', za: 'of (class 10)', la: 'of (class 5)', cha: 'of (class 7)', vya: 'of (class 8)', wa: 'of (class 1, 2, 3); to be',
    ni: 'is, are; me', yake: 'his, her, its', wake: 'his, her', yao: 'their', huu: 'this', huo: 'that', wote: 'all', kuna: 'there is, there are',
    kwenye: 'on; in; at', watu: 'people', ilikuwa: 'it was', alikuwa: 'he, she was', ambayo: 'which, that', ambao: 'who, which', kuwa: 'to be; that',
    kati: 'between; in the middle', hata: 'even; until', sababu: 'reason; because', na: 'and; with; by', kwa: 'for; with; by; to',
  },
  ar: {
    يجب: 'must; it is necessary', لك: 'for you; to you', قد: 'may; has already', أجل: 'yes, indeed; for the sake of', لي: 'to me, for me',
    إنه: 'he is, it is', انه: 'he is, it is', أنه: 'that he, that it', إنها: 'she is, it is', لقد: 'indeed (stresses what happened)',
    هل: 'question word (is it…?)', لم: 'did not', ما: 'what; not', كنت: 'I was; you were', ليس: 'is not', عليك: 'you must; on you',
    مثل: 'like, as', أعرف: 'I know', أريد: 'I want', أعتقد: 'I think, I believe', يكون: 'to be (is, will be)', الأمر: 'the matter, the thing',
    لن: 'will not', إن: 'indeed; if', ان: 'that; if', لا: 'no; not', و: 'and',
  },
  zh: {
    但: 'but; only', 着: '(ongoing action: -ing); to touch', 里: 'inside, in', 得: '(links a verb to how it is done); to have to', 呀: 'ah, oh (softens a sentence)',
    去: 'to go', 都: 'all; even; already', 别: 'don’t; other', 要: 'to want; will; must', 特: 'special, very', 会: 'can; will', 就: 'then; right away; just',
    个: '(measure word for people and things)', 对: 'right, correct; to, towards', 把: '(puts the object before the verb); to hold', 给: 'to give; for; to',
    过: 'to pass; (have done) before', 上: 'up; on; above; last (time)', 点: 'o’clock; a little; point', 一下: 'a moment, a bit', 和: 'and; with',
    让: 'to let; to make (someone do)', 被: '(passive) by', 到: 'to arrive; to; until', 呢: '(question or softening particle)', 吧: '(suggestion) let’s; …, right?',
    了: '(action done; something changed)', 的: '’s; of (links a describing word)', 吗: '(yes/no question particle)', 嘛: '(stresses the obvious)', 哦: 'oh; I see',
    时: 'time; when; hour', 斯: '(in names) si', 克: '(in names) ke; gram', 德: '(in names) de; virtue', 尔: '(in names) er', 在: 'in, at; (doing) now; to be at',
  },
};
