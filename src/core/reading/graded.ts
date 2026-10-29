import type { Text } from '@/data/types';
import { foldKey } from '@/core/text/normalize';

export const READING_GENRES = ['story', 'fable', 'poem', 'essay', 'speech', 'history', 'travel', 'recipe', 'dialogue', 'other'] as const;
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
  es: ['cuento', 'fábula', 'poema', 'ensayo', 'discurso', 'historia', 'viaje', 'receta', 'diálogo', 'literatura'],
  fr: ['conte', 'fable', 'poème', 'essai', 'discours', 'histoire', 'voyage', 'recette', 'dialogue', 'littérature'],
  de: ['Erzählung', 'Fabel', 'Gedicht', 'Essay', 'Rede', 'Geschichte', 'Reise', 'Rezept', 'Dialog', 'Literatur'],
  ru: ['рассказ', 'басня', 'стихотворение', 'очерк', 'речь', 'история', 'путешествие', 'рецепт', 'диалог', 'литература'],
  ar: ['قصة', 'حكاية', 'قصيدة', 'مقال', 'خطبة', 'تاريخ', 'رحلة', 'وصفة', 'حوار', 'أدب'],
  zh: ['故事', '寓言', '诗', '散文', '演讲', '历史', '旅行', '食谱', '对话', '文学'],
};
