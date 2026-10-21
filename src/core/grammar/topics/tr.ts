import type { Grammar } from '../types';

// Turkish (tier 2: a short map of the first topics). Sentences: the Turkish pack's Wiktionary
// examples. Rules checked against Wikipedia's "Turkish grammar" (plural, locative, -iyor, -di,
// the question particle mi) and "Vowel harmony" (the Turkish two-way and four-way patterns).

const grammar: Grammar = {
  lang: 'tr',
  sources: [
    { name: 'Wikipedia: Turkish grammar', url: 'https://en.wikipedia.org/wiki/Turkish_grammar' },
    { name: 'Wikipedia: Vowel harmony (Turkish)', url: 'https://en.wikipedia.org/wiki/Vowel_harmony#Turkish' },
  ],
  notes:
    'Tier 2, kept short. Left out for now: the accusative and dative, possessive endings, the aorist (-ir), the future (-ecek) and the reported past (-miş). Words that break vowel harmony, like saat (saatte), are not drilled.',
  units: [
    {
      title: 'First steps',
      topics: [
        {
          id: 'plural',
          title: 'The plural: -lar or -ler',
          level: 'A1',
          summary: 'One ending, two forms, picked by the last vowel of the word.',
          rule: [
            'The plural adds **-lar** or **-ler**. Turkish endings follow **vowel harmony**: if the last vowel of the word is a back vowel (**a, ı, o, u**) the ending is **-lar**; if it is a front vowel (**e, i, ö, ü**) the ending is **-ler**.',
            '*kitap* → **kitaplar**, *yaprak* → **yapraklar**, *güvercin* → **güvercinler**, *geyik* → **geyikler**.',
            'After a number or a word like *çok* the noun stays singular: *iki kitap*, "two books".',
          ],
          tables: [
            {
              columns: ['last vowel', 'ending', 'example'],
              rows: [
                ['a, ı, o, u', '-lar', 'taş → taşlar'],
                ['e, i, ö, ü', '-ler', 'geyik → geyikler'],
              ],
            },
          ],
          why: 'Last vowel a, ı, o, u → -lar; e, i, ö, ü → -ler.',
          tags: [],
          items: [
            { s: 'Bu [kitaplar] benim.', en: 'These books are mine.', wrong: ['kitapler', 'kitap', 'kitaplır'] },
            { s: '[Yapraklar] hep sonbaharda düşer.', en: 'Leaves always fall in autumn.', wrong: ['Yaprakler', 'Yaprak', 'Yapraklır'] },
            { s: '[Taşlar] güneşten kızdı.', en: 'The stones got hot due to sun(light).', wrong: ['Taşler', 'Taş', 'Taşlır'] },
            { s: '[Güvercinler] ve kanaryalar birer kuştur.', en: 'Pigeons and canaries are birds.', wrong: ['Güvercinlar', 'Güvercin', 'Güvercinlir'] },
            { s: '[Geyikler] ormanda yaşarlar.', en: 'Deer live in forests.', wrong: ['Geyiklar', 'Geyik', 'Geyiklir'] },
            { s: 'Mutfakta sadece tahta [kaşıklar] vardı.', en: 'There were only wooden spoons in the kitchen.', wrong: ['kaşıkler', 'kaşık', 'kaşıklır'] },
          ],
          related: ['locative'],
        },
        {
          id: 'locative',
          title: 'In, at, on: -da, -de, -ta, -te',
          level: 'A1',
          summary: 'Where something is: evde, okulda, kitapta.',
          rule: [
            'The locative ending says where: **-da** after a back vowel, **-de** after a front vowel: *okul* → **okulda**, "at school"; *ev* → **evde**, "at home".',
            'After a voiceless consonant (**f, s, t, k, ç, ş, h, p**; remember *fıstıkçı şahap*) the d becomes **t**: *kitap* → **kitapta**, *mutfak* → **mutfakta**.',
            'Names take an apostrophe before the ending: *Hollanda\'da*.',
          ],
          tables: [
            {
              columns: ['', 'after a, ı, o, u', 'after e, i, ö, ü'],
              rows: [
                ['usually', '-da (okulda)', '-de (evde)'],
                ['after f, s, t, k, ç, ş, h, p', '-ta (kitapta)', '-te (sepette)'],
              ],
            },
          ],
          why: '-da/-de by vowel harmony; -ta/-te after a voiceless consonant.',
          tags: [],
          items: [
            { s: '[Kitapta] 150 sayfa yok.', en: "There aren't 150 pages in the book.", wrong: ['Kitapda', 'Kitapte', 'Kitaba'] },
            { s: '[Evde] çok kalıyorsun. Daha sık dışarı çık.', en: 'You stay home too much. Get out more often.', wrong: ['Evda', 'Evte', 'Eve'] },
            { s: '[Dünyada] kaç tane okyanus vardır?', en: 'How many oceans are there in the world?', wrong: ['Dünyade', 'Dünyata', 'Dünyaya'] },
            { s: 'Bugün [okulda] ne öğrendin?', en: 'What did you learn in school today?', wrong: ['okulde', 'okulta', 'okula'] },
            { s: 'Geyikler [ormanda] yaşarlar.', en: 'Deer live in forests.', wrong: ['ormande', 'ormanta', 'ormana'] },
            { s: '[Mutfakta] sadece tahta kaşıklar vardı.', en: 'There were only wooden spoons in the kitchen.', wrong: ['Mutfakda', 'Mutfakte', 'Mutfağa'] },
          ],
          related: ['plural'],
        },
        {
          id: 'question',
          title: 'Questions with mi',
          level: 'A1',
          summary: 'A yes/no question adds mi, mı, mu or mü after the word asked about.',
          rule: [
            'A yes/no question adds the particle **mi**, written as a separate word but following **four-way vowel harmony** with the word before it: after *a, ı* → **mı**; after *e, i* → **mi**; after *o, u* → **mu**; after *ö, ü* → **mü**.',
            'It goes right after the word in question: *Bu kitap senin **mi**?*, "is this book yours?"',
            'Personal endings attach to it in the present: *Seviyor **musun**?*, *Öğretmen **misin**?* In the past they stay on the verb: *Gittin **mi**?*',
          ],
          tables: [
            {
              columns: ['last vowel', 'particle', 'example'],
              rows: [
                ['a, ı', 'mı', 'yaptın mı?'],
                ['e, i', 'mi', 'gittin mi?'],
                ['o, u', 'mu', 'sordun mu?'],
                ['ö, ü', 'mü', 'gördün mü?'],
              ],
            },
          ],
          why: 'mı after a, ı; mi after e, i; mu after o, u; mü after ö, ü.',
          tags: [],
          items: [
            { s: 'Bugün okula gittin [mi]?', en: 'Did you go to school today?', wrong: ['mı', 'mu', 'mü'] },
            { s: 'Ödevini yaptın [mı]?', en: 'Did you do your homework?', wrong: ['mi', 'mu', 'mü'] },
            { s: 'Şeyimi gördün [mü]?', en: 'Did you see my thing?', wrong: ['mi', 'mı', 'mu'] },
            { s: 'Ona bu soruyu sordun [mu]?', en: 'Did you ask him/her this question?', wrong: ['mi', 'mı', 'mü'] },
            { s: 'Arabanı sattın [mı]?', en: 'Did you sell your car?', wrong: ['mi', 'mu', 'mü'] },
            { s: 'Bu kitap senin [mi]?', en: 'Is this book yours?', wrong: ['mı', 'mu', 'mü'] },
            { s: 'Beni seviyor [musun]?', en: 'Do you love me?', wrong: ['misin', 'mısın', 'müsün'] },
            { s: 'Öğretmen [misin]? — Hayır.', en: 'Are you a teacher? — No.', wrong: ['mısın', 'musun', 'müsün'] },
          ],
          related: ['present'],
        },
      ],
    },
    {
      title: 'Verbs',
      topics: [
        {
          id: 'present',
          title: 'The present: -iyor',
          level: 'A1',
          summary: 'What is happening now: geliyor, biliyorum.',
          rule: [
            'The present continuous adds **-iyor** to the stem, with the vowel by four-way harmony: **-ıyor, -iyor, -uyor, -üyor**: *gel* → **geliyor**, *bul* → **buluyor**. A stem ending in a vowel loses an *a* or *e*: *iste* → **istiyor**.',
            'Then comes the person: **-um** (I), **-sun** (you), nothing (he, she), **-uz** (we), **-sunuz** (you all), **-lar** (they): *biliyorum*, *istiyorsun*, *geliyor*.',
            'It is used for now and, in speech, for most present-time statements, including verbs like *bilmek* (to know) and *sevmek* (to love).',
          ],
          tables: [
            {
              columns: ['', 'gelmek', 'bulmak'],
              rows: [
                ['ben', 'geliyorum', 'buluyorum'],
                ['sen', 'geliyorsun', 'buluyorsun'],
                ['o', 'geliyor', 'buluyor'],
                ['biz', 'geliyoruz', 'buluyoruz'],
                ['siz', 'geliyorsunuz', 'buluyorsunuz'],
                ['onlar', 'geliyorlar', 'buluyorlar'],
              ],
            },
          ],
          why: 'Stem + -iyor + -um, -sun, –, -uz, -sunuz, -lar.',
          tags: [],
          items: [
            { s: 'Berker de bizimle [geliyor].', en: 'Berker is coming with us as well.', wrong: ['geliyorum', 'geliyorsun', 'geliyoruz'], base: 'gelmek', cue: 'o' },
            { s: 'Biraz Türkçe [biliyorum].', en: 'I know a little Turkish.', wrong: ['biliyor', 'biliyorsun', 'biliyoruz'], base: 'bilmek', cue: 'ben' },
            { s: 'Neden Türkçe öğrenmek [istiyorsun]?', en: 'Why do you want to learn Turkish?', wrong: ['istiyorum', 'istiyor', 'istiyoruz'], base: 'istemek', cue: 'sen' },
            { s: 'Bugün güzel [görünüyorsun].', en: 'You look beautiful today.', wrong: ['görünüyorum', 'görünüyor', 'görünüyoruz'], base: 'görünmek', cue: 'sen' },
            { s: 'Seni yakışıklı [buluyorum].', en: 'I find you handsome.', wrong: ['buluyor', 'buluyorsun', 'buluyoruz'], base: 'bulmak', cue: 'ben' },
            { s: 'Kadının sağlığı kötüye [gidiyor].', en: "The woman's health is deteriorating.", wrong: ['gidiyorum', 'gidiyorsun', 'gidiyoruz'], base: 'gitmek', cue: 'o' },
            { s: 'Başım çok [ağrıyor].', en: 'My head hurts too much.', wrong: ['ağrıyorum', 'ağrıyorsun', 'ağrıyoruz'], base: 'ağrımak', cue: 'o' },
          ],
          related: ['past', 'question'],
        },
        {
          id: 'past',
          title: 'The past: -di',
          level: 'A2',
          summary: 'What happened: yaptım, verdi, döndük.',
          rule: [
            'The past adds **-di** with four-way harmony: **-dı, -di, -du, -dü**, and **-tı, -ti, -tu, -tü** after a voiceless consonant: *ver* → **verdi**, *yap* → **yaptı**.',
            'The person endings are short: **-m** (I), **-n** (you), nothing (he, she), **-k** (we), **-nız** (you all), **-lar** (they): *yaptım*, *verdin*, *döndük*.',
            'This past is for things you saw or know happened; Turkish has a second past, *-miş*, for things you heard about.',
          ],
          tables: [
            {
              columns: ['', 'vermek', 'yapmak', 'dönmek'],
              rows: [
                ['ben', 'verdim', 'yaptım', 'döndüm'],
                ['sen', 'verdin', 'yaptın', 'döndün'],
                ['o', 'verdi', 'yaptı', 'döndü'],
                ['biz', 'verdik', 'yaptık', 'döndük'],
                ['siz', 'verdiniz', 'yaptınız', 'döndünüz'],
                ['onlar', 'verdiler', 'yaptılar', 'döndüler'],
              ],
            },
          ],
          why: 'Stem + -di (-tı after f, s, t, k, ç, ş, h, p) + -m, -n, –, -k, -nız, -lar.',
          tags: [],
          items: [
            { s: 'Sana kek [yaptım].', en: 'I made you a cake.', wrong: ['yaptın', 'yaptı', 'yapdım'], base: 'yapmak', cue: 'ben' },
            { s: 'Tüm gece [çalıştım].', en: 'I worked all night.', wrong: ['çalıştın', 'çalıştı', 'çalışdım'], base: 'çalışmak', cue: 'ben' },
            { s: 'Bu çocuk bana biraz para [verdi].', en: 'This kid gave me some money.', wrong: ['verdim', 'verdin', 'verdık'], base: 'vermek', cue: 'o' },
            { s: 'Bana bir çiçek [getirdi].', en: 'He brought me a flower.', wrong: ['getirdim', 'getirdin', 'getirtı'], base: 'getirmek', cue: 'o' },
            { s: "Ertesi gün aynı yoldan Bodrum'a [döndük].", en: 'The next day we returned to Bodrum via the same route.', wrong: ['döndüm', 'döndün', 'döndı'], base: 'dönmek', cue: 'biz' },
            { s: 'Dün, işten izin [aldım].', en: 'Yesterday I took a day off work.', wrong: ['aldın', 'aldı', 'aldim'], base: 'almak', cue: 'ben' },
            { s: 'Üşüdüğüm için mont [giydim].', en: 'I put on a coat because I was cold.', wrong: ['giydin', 'giydi', 'giytim'], base: 'giymek', cue: 'ben' },
            { s: 'Babam birdenbire bana [döndü].', en: 'My father suddenly turned to me.', wrong: ['döndüm', 'döndün', 'döndük'], base: 'dönmek', cue: 'o' },
          ],
          related: ['present'],
        },
      ],
    },
  ],
};

export default grammar;
