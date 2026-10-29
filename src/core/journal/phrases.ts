export const PHRASE_FUNCTIONS = ['Opening', 'Adding', 'Contrasting', 'Giving a reason', 'An example', 'Concluding', 'A polite request'] as const;
export const WRITING_PHRASES: Record<string, string[]> = {
  es: ['Me gustaría hablar de…', 'Además, …', 'Sin embargo, …', 'Esto se debe a…', 'Por ejemplo, …', 'En conclusión, …', '¿Sería posible…?'],
  fr: ['Je voudrais parler de…', 'De plus, …', 'Cependant, …', 'Cela s’explique par…', 'Par exemple, …', 'En conclusion, …', 'Serait-il possible de… ?'],
  de: ['Ich möchte über … schreiben.', 'Außerdem …', 'Allerdings …', 'Der Grund dafür ist, dass …', 'Zum Beispiel …', 'Zusammenfassend lässt sich sagen, dass …', 'Wäre es möglich, …?'],
  ru: ['Я хочу рассказать о…', 'Кроме того, …', 'Однако…', 'Это связано с тем, что…', 'Например, …', 'В заключение…', 'Не могли бы вы…?'],
  ar: ['أودّ أن أتحدّث عن…', 'بالإضافة إلى ذلك، …', 'ومع ذلك، …', 'يرجع ذلك إلى…', 'على سبيل المثال، …', 'في الختام، …', 'هل من الممكن أن…؟'],
  zh: ['我想谈谈……', '此外，……', '然而，……', '这是因为……', '例如，……', '总之，……', '请问，可以……吗？'],
};
