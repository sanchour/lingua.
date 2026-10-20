import type { Picks } from '../types';

const picks: Picks = {
  series: [
    { title: 'افتح يا سمسم', en: 'Iftah Ya Simsim', year: 1979, level: 'A1', why: 'The Arabic Sesame Street, in simple Modern Standard Arabic.' },
    { title: 'ما وراء الطبيعة', en: 'Paranormal', year: 2020, level: 'B2', why: 'A 1960s horror mystery in Egyptian Arabic, the dialect most widely understood.', on: ['netflix'] },
    { title: 'مدرسة الروابي للبنات', en: 'AlRawabi School for Girls', year: 2021, level: 'B1', why: 'A Jordanian school drama in clear Levantine Arabic.', on: ['netflix'] },
    { title: 'جن', en: 'Jinn', year: 2019, level: 'B1', why: 'Teenagers in Petra; everyday Jordanian Arabic.', on: ['netflix'] },
    { title: 'باب الحارة', en: 'Bab Al-Hara', year: 2006, level: 'B2', why: 'Old Damascus in Syrian (Levantine) Arabic; hugely popular across the Arab world.' },
  ],
  films: [
    { title: 'وجدة', en: 'Wadjda', year: 2012, level: 'B1', why: 'A girl in Riyadh wants a bicycle; Saudi (Gulf) Arabic, gentle and clear.' },
    { title: 'ذيب', en: 'Theeb', year: 2014, level: 'B1', why: 'A Bedouin boy in the desert: few words, spoken slowly.' },
    { title: 'كفرناحوم', en: 'Capernaum', year: 2018, level: 'B2', why: 'Beirut’s streets in Lebanese Arabic.' },
    { title: 'أصحاب ولا أعز', en: 'Perfect Strangers', year: 2022, level: 'B2', why: 'Friends at one dinner in Beirut: quick Levantine conversation.', on: ['netflix'] },
  ],
  books: [
    { title: 'Arabic Stories for Language Learners', by: 'Hezi Brosh', level: 'A2', why: 'Traditional tales in Arabic and English, with vowel marks and audio.' },
    { title: 'الأمير الصغير', en: 'The Little Prince', level: 'B1', why: 'A story you know, in Modern Standard Arabic.' },
    { title: 'كليلة ودمنة', en: 'Kalila and Dimna', by: 'ابن المقفع', level: 'B2', why: 'Classic animal fables: short tales in fine, old Arabic prose.' },
    { title: 'عائد إلى حيفا', en: 'Returning to Haifa', by: 'غسان كنفاني', year: 1969, level: 'B2', why: 'A short novella, a good first real book.' },
    { title: 'زقاق المدق', en: 'Midaq Alley', by: 'نجيب محفوظ', year: 1947, level: 'C1', why: 'Cairo life by the Nobel laureate, in Standard Arabic.' },
  ],
  games: [
    { title: 'Assassin’s Creed Mirage', by: 'Ubisoft', year: 2023, level: 'B2', why: 'Ninth-century Baghdad with an Arabic voice option and Arabic text.' },
    { title: 'Minecraft', by: 'Mojang', year: 2011, level: 'A2', why: 'Set it to Arabic: short, practical words for everything you build.', url: 'https://www.minecraft.net/' },
  ],
  podcasts: [
    { title: 'ArabicPod101', level: 'A1', why: 'Short structured lessons from the start.' },
    { title: 'فنجان', en: 'Fnjan', by: 'ثمانية', level: 'C1', why: 'Long, popular Saudi conversations: natural spoken Arabic.' },
    { title: 'Sowt', en: 'صوت', level: 'B2', why: 'Arabic storytelling podcasts from Amman.', search: 'Sowt podcast' },
  ],
  youtube: [
    { title: 'Learn Arabic with Maha', level: 'A1', why: 'Lessons in Modern Standard Arabic and dialects, clear and friendly.' },
    { title: 'ArabicPod101', level: 'A1', why: 'Short lessons on words and grammar.' },
    { title: 'Spacetoon', en: 'سبيستون', level: 'A2', why: 'Cartoons dubbed in Standard Arabic, which many learners grew up on.' },
    { title: 'Al Jazeera Arabic', level: 'C1', why: 'News in formal Modern Standard Arabic.', search: 'الجزيرة' },
  ],
  dictionaries: [
    { title: 'Almaany', level: 'A2', why: 'Arabic–English and Arabic–Arabic, with examples.', url: 'https://www.almaany.com/' },
    { title: 'Hans Wehr (ejtaal)', level: 'B1', why: 'The classic Hans Wehr dictionary, searchable by root.', url: 'https://ejtaal.net/aa/' },
    { title: 'Living Arabic', level: 'A2', why: 'Dialect dictionaries: Levantine, Egyptian and more.', url: 'https://www.livingarabic.com/' },
  ],
};

export default picks;
