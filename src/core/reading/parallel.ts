import type { Chapter } from '@/data/types';
import type { Cefr } from '@/core/lang/levels';
export interface ParallelPassage { chapterIndex: number; source: string; text: string; lang: string; updatedAt: number }
export const PARALLEL_LIMIT = 4000;
export const parallelSource = (chapter: Pick<Chapter, 'blocks'>) => chapter.blocks.flatMap((b) => 'text' in b ? [b.text] : []).join('\n\n').slice(0, PARALLEL_LIMIT);
export function simplificationRequest(lang: string, source: string, level: Cefr, native: string) {
  if (source.trim().length < 40 || source.length > PARALLEL_LIMIT) throw new Error('Choose a passage of 40–4,000 characters.');
  return { lang, source, level, native, kind: 'simplified' as const };
}
