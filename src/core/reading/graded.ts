import type { Text } from '@/data/types';
import { foldKey } from '@/core/text/normalize';

export const READING_GENRES = ['story', 'fable', 'poem', 'essay', 'speech', 'history', 'travel', 'recipe', 'dialogue', 'other', 'excerpt', 'fairy-tale', 'myth', 'biography', 'opinion', 'message', 'letter', 'post', 'instructions', 'academic', 'philosophy', 'spiritual', 'document', 'children'] as const;
export const READING_GENRE_LABELS: Record<typeof READING_GENRES[number], string> = { story: 'Short story', fable: 'Fable', poem: 'Poem', essay: 'Essay', speech: 'Speech', history: 'History', travel: 'Travel guide', recipe: 'Recipe', dialogue: 'Dialogue', other: 'Other', excerpt: 'Literary excerpt', 'fairy-tale': 'Fairy tale', myth: 'Myth or legend', biography: 'Biography', opinion: 'Opinion piece', message: 'Everyday message', letter: 'Email or letter', post: 'Social post', instructions: 'Instructions', academic: 'Academic text', philosophy: 'Philosophy', spiritual: 'Religious or spiritual text', document: 'Historical document', children: 'Children’s literature' };
export const MEASURED_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export interface GradedFilter { query: string; genre: string; level: string; maxWords: number; minKnown: number }
export const GRADED_FILTER: GradedFilter = { query: '', genre: '', level: '', maxWords: 0, minKnown: 0 };
export function gradedTexts(texts: Text[], lang: string, filter: GradedFilter, hasWordData = true): Text[] {
  const levelOf = (t: Text) => hasWordData ? t.stats?.level : undefined;
  const q = foldKey(filter.query.trim(), lang);
  return texts.filter((t) => t.lang === lang && !t.deletedAt && t.kind !== 'shelfItem'
    && (!q || foldKey(`${t.readingTopic ?? ''} ${t.title} ${t.author ?? ''}`, lang).includes(q))
    && (!filter.genre || t.readingGenre === filter.genre)
    && (!filter.level || (filter.level === 'unknown' ? !levelOf(t) : levelOf(t) === filter.level))
    && (!filter.maxWords || t.wordCount <= filter.maxWords)
    && (!filter.minKnown || (t.stats?.knownShare ?? -1) >= filter.minKnown))
    .sort((a, b) => (levelOf(a) ? MEASURED_LEVELS.indexOf(levelOf(a)!) : 6) - (levelOf(b) ? MEASURED_LEVELS.indexOf(levelOf(b)!) : 6) || a.title.localeCompare(b.title, lang));
}
export const SOURCE_QUERIES: Record<string, string[]> = {
  es: ['cuento', 'fábula', 'poema', 'ensayo', 'discurso', 'historia', 'viaje', 'receta', 'diálogo', 'literatura', 'fragmento', 'cuento de hadas', 'mitología', 'biografía', 'opinión', 'mensaje', 'carta', 'publicación', 'manual', 'ciencia', 'filosofía', 'religión', 'documento', 'literatura infantil'],
  fr: ['conte', 'fable', 'poème', 'essai', 'discours', 'histoire', 'voyage', 'recette', 'dialogue', 'littérature', 'extrait', 'conte de fées', 'mythologie', 'biographie', 'opinion', 'message', 'lettre', 'publication', 'manuel', 'science', 'philosophie', 'religion', 'document', 'littérature jeunesse'],
  de: ['Erzählung', 'Fabel', 'Gedicht', 'Essay', 'Rede', 'Geschichte', 'Reise', 'Rezept', 'Dialog', 'Literatur', 'Auszug', 'Märchen', 'Mythologie', 'Biografie', 'Meinung', 'Nachricht', 'Brief', 'Beitrag', 'Anleitung', 'Wissenschaft', 'Philosophie', 'Religion', 'Urkunde', 'Kinderliteratur'],
  ru: ['рассказ', 'басня', 'стихотворение', 'очерк', 'речь', 'история', 'путешествие', 'рецепт', 'диалог', 'литература', 'отрывок', 'сказка', 'мифология', 'биография', 'мнение', 'сообщение', 'письмо', 'публикация', 'руководство', 'наука', 'философия', 'религия', 'документ', 'детская литература'],
  ar: ['قصة', 'حكاية', 'قصيدة', 'مقال', 'خطبة', 'تاريخ', 'رحلة', 'وصفة', 'حوار', 'أدب', 'مقتطف', 'حكاية خرافية', 'أساطير', 'سيرة', 'رأي', 'رسالة قصيرة', 'رسالة', 'منشور', 'دليل', 'علم', 'فلسفة', 'دين', 'وثيقة', 'أدب الأطفال'],
  zh: ['故事', '寓言', '诗', '散文', '演讲', '历史', '旅行', '食谱', '对话', '文学', '节选', '童话', '神话', '传记', '评论', '短信', '书信', '帖子', '指南', '学术', '哲学', '宗教', '文献', '儿童文学'],
};
