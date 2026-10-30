// The same short passage to read aloud every week (6-10: the pronunciation diary). One for each core language, in everyday words, about
// twenty seconds long, with the sounds the language is known for.
export const PASSAGES: Record<string, string> = {
  es: 'Me llamo Ana y vivo en una casa pequeña cerca del mar. Por la mañana tomo café con leche y paso por el mercado. Allí compro pan, queso y naranjas para mi familia. Después camino a la escuela, donde trabajo con mis alumnos.',
  fr: 'Je m’appelle Louise et j’habite dans une petite maison près de la rue du marché. Le matin, je bois un café et je mange du pain avec du beurre. Ensuite je prends le train pour aller travailler, et le soir je rentre chez moi.',
  de: 'Ich heiße Anna und wohne in einer kleinen Wohnung in der Stadt. Morgens trinke ich Tee und esse ein Brötchen mit Käse. Dann fahre ich mit dem Zug zur Arbeit, und am Abend lese ich gern ein gutes Buch.',
  ru: 'Меня зовут Анна, и я живу в маленьком доме недалеко от реки. Утром я пью чай и иду на работу пешком. Вечером я читаю книгу или разговариваю с моими друзьями по телефону.',
  ar: 'اسمي أنا وأسكن في بيت صغير قرب البحر. في الصباح أشرب القهوة وأذهب إلى السوق. أشتري الخبز والجبن لأسرتي، ثم أمشي إلى المدرسة.',
  zh: '我叫安娜，住在海边的一个小房子里。早上我喝茶，然后去市场买面包和水果。下午我去学校工作，晚上我喜欢看书。',
};

export const passageOf = (lang: string): string | undefined => PASSAGES[lang];
