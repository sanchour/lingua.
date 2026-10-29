export interface ImmersionPrompt { title: string; text: string; english: string; taskId: string }
const ENGLISH = ['Describe five things around you. Say where they are and what they are like. Use the language you are learning.', 'Narrate your day in five sentences: what happened first, then, and finally. Add one feeling or opinion.'];
const TASKS: Record<string, [string, string]> = {
  es: ['Describe cinco cosas que tienes a tu alrededor. Di dónde están y cómo son.', 'Cuenta tu día en cinco frases: qué pasó primero, después y al final. Añade una emoción o una opinión.'],
  fr: ['Décris cinq choses autour de toi. Dis où elles sont et comment elles sont.', 'Raconte ta journée en cinq phrases : ce qui s’est passé au début, ensuite et à la fin. Ajoute une émotion ou une opinion.'],
  de: ['Beschreibe fünf Dinge in deiner Umgebung. Sage, wo sie sind und wie sie aussehen.', 'Erzähle deinen Tag in fünf Sätzen: Was ist zuerst, dann und zuletzt passiert? Ergänze ein Gefühl oder eine Meinung.'],
  ru: ['Опиши пять предметов вокруг тебя. Скажи, где они находятся и какие они.', 'Расскажи о своём дне в пяти предложениях: что было сначала, потом и в конце. Добавь чувство или мнение.'],
  zh: ['描述你周围的五样东西。说说它们在哪里，是什么样的。', '用五句话讲讲你的一天：先发生了什么，然后呢，最后呢？加上一个感受或看法。'],
  ar: ['صِف خمسة أشياء من حولك. قل أين توجد وما صفاتها.', 'احكِ عن يومك في خمس جمل: ماذا حدث أولًا، ثم بعد ذلك، وأخيرًا؟ أضف شعورًا أو رأيًا.'],
};
export function immersionPrompts(lang: string): ImmersionPrompt[] {
  const texts = TASKS[lang] ?? ENGLISH;
  return texts.map((text, i) => ({ title: i ? 'Narrate your day' : 'Describe your surroundings', text, english: ENGLISH[i], taskId: i ? 'daily-narration' : 'surroundings' }));
}
export const MEDIA_KINDS = ['short', 'speech', 'live', 'other'] as const;
export type ImmersionMediaKind = typeof MEDIA_KINDS[number];
