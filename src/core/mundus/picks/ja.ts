import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'ちびまる子ちゃん', en: 'Chibi Maruko-chan', year: 1990, level: 'A2', why: 'Everyday family and school life in simple, natural Japanese.' },
    { title: '深夜食堂', en: 'Midnight Diner: Tokyo Stories', year: 2016, level: 'B1', why: 'Quiet stories round one small restaurant; calm, clear talk.', on: ['netflix'] },
    { title: 'テラスハウス', en: 'Terrace House', level: 'B1', why: 'Unscripted housemates: real casual conversation, subtitled.', on: ['netflix'] },
    { title: '孤独のグルメ', en: 'Solitary Gourmet', year: 2012, level: 'B1', why: 'One man, one meal, his thoughts aloud: food words galore.' },
    { title: 'SPY×FAMILY', year: 2022, level: 'B1', why: 'A spy, an assassin and a telepathic child; clear anime dialogue.', on: ['crunchyroll'] },
  ],
  films: [
    { title: 'となりのトトロ', en: 'My Neighbor Totoro', by: '宮崎駿', year: 1988, level: 'A2', why: 'Children’s simple speech and countryside life. On Netflix in most countries.', on: ['netflix'] },
    { title: '魔女の宅急便', en: 'Kiki’s Delivery Service', by: '宮崎駿', year: 1989, level: 'B1', why: 'Polite shop Japanese and everyday errands. On Netflix in most countries.', on: ['netflix'] },
    { title: '千と千尋の神隠し', en: 'Spirited Away', by: '宮崎駿', year: 2001, level: 'B1', why: 'A story you may know; clear voices throughout. On Netflix in most countries.', on: ['netflix'] },
    { title: '君の名は。', en: 'Your Name', by: '新海誠', year: 2016, level: 'B2', why: 'Teenagers’ casual speech, Tokyo and country dialect side by side.' },
    { title: '万引き家族', en: 'Shoplifters', by: '是枝裕和', year: 2018, level: 'B2', why: 'A family drama of soft, everyday conversation.' },
  ],
  books: [
    { title: 'にほんご多読ブックス', en: 'Japanese Graded Readers', level: 'A1', why: 'Graded readers from absolute beginner up, with furigana.' },
    { title: 'よつばと！', en: 'Yotsuba&!', by: 'あずまきよひこ', level: 'A2', why: 'A manga about a curious little girl: everyday speech, with furigana.' },
    { title: '魔女の宅急便', en: 'Kiki’s Delivery Service', by: '角野栄子', year: 1985, level: 'B1', why: 'The children’s novel behind the film; gentle and clear.' },
    { title: 'キッチン', en: 'Kitchen', by: '吉本ばなな', year: 1988, level: 'B2', why: 'A short novel in simple, modern prose.' },
    { title: 'ノルウェイの森', en: 'Norwegian Wood', by: '村上春樹', year: 1987, level: 'C1', why: 'Murakami’s plainest novel: a long read once you’re ready.' },
  ],
  games: [
    { title: 'ポケットモンスター スカーレット・バイオレット', en: 'Pokémon Scarlet and Violet', by: 'Game Freak', year: 2022, level: 'A2', why: 'Choose hiragana-only text: perfect before you know kanji.', url: 'https://scarletviolet.pokemon.com/' },
    { title: 'Animal Crossing: New Horizons', by: 'Nintendo', year: 2020, level: 'A2', why: 'Everyday Japanese with furigana on the kanji.', url: 'https://animal-crossing.com/new-horizons/' },
    { title: 'Persona 5 Royal', by: 'Atlus', year: 2022, level: 'B2', why: 'A long school-life story with Japanese voices.' },
    { title: 'Yakuza 0', by: 'Ryu Ga Gotoku Studio', year: 2018, level: 'C1', why: 'Japanese voices and Tokyo street speech.' },
  ],
  podcasts: [
    { title: 'Nihongo con Teppei', by: 'Teppei', level: 'A2', why: 'Short episodes in easy, natural Japanese; a version for beginners too.' },
    { title: 'YUYUの日本語Podcast', level: 'B1', why: 'Topics of daily life explained in clear Japanese.' },
    { title: 'Learn Japanese with Noriko', level: 'B1', why: 'Japanese culture and life, spoken slowly.' },
    { title: 'JapanesePod101', level: 'A1', why: 'Structured lessons from the start.' },
  ],
  youtube: [
    { title: 'Comprehensible Japanese', level: 'A1', why: 'Japanese you can follow from zero, with pictures.' },
    { title: 'Easy Japanese', level: 'A2', why: 'Street interviews in Japan with subtitles.' },
    { title: 'Japanese Ammo with Misa', level: 'A2', why: 'Grammar explained clearly and thoroughly.' },
    { title: '日本語の森', en: 'Nihongo no Mori', level: 'B1', why: 'JLPT grammar and vocabulary, taught in Japanese.' },
  ],
  dictionaries: [
    { title: 'Jisho', level: 'A1', why: 'Words, kanji and examples, with readings.', url: 'https://jisho.org/' },
    { title: 'Takoboto', level: 'A1', why: 'A dictionary with conjugations and example sentences.', url: 'https://takoboto.jp/' },
    { title: 'Weblio', level: 'B2', why: 'Japanese–Japanese dictionaries in one search.', url: 'https://www.weblio.jp/' },
  ],
};

export default picks;
