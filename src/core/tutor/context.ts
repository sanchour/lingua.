// Context gathering and prompt chip suggestions for 6-15 (The tutor, in context).
import { db } from '@/data/db';
import { getGrammarBookmarks, getGrammarNotesMap } from '@/data/grammarUserData';
import type { Settings } from '@/data/settings';
import type { LearnerContextSnapshot, TutorActionKind, TutorContext } from './types';

export async function getLearnerSnapshot(lang: string, settings: Settings): Promise<LearnerContextSnapshot> {
  let knownWordsCount = 0;
  try {
    knownWordsCount = await db.notes.where('lang').equals(lang).count();
  } catch {
    // fallback if db unavailable
  }

  const studiedTopicTitles: string[] = [];
  try {
    const bookmarks = await getGrammarBookmarks(lang);
    for (const b of bookmarks) studiedTopicTitles.push(b);
    const notes = await getGrammarNotesMap(lang);
    for (const k of Object.keys(notes)) {
      if (!studiedTopicTitles.includes(k)) studiedTopicTitles.push(k);
    }
  } catch {
    // fallback
  }

  const recentMistakeCategories: string[] = [];
  try {
    const wrong = await db.evidence.where('lang').equals(lang).limit(30).toArray();
    const counts = new Map<string, number>();
    for (const r of wrong) {
      if (r.outcome === 'wrong' && r.category) {
        counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
      }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cat] of sorted.slice(0, 4)) {
      recentMistakeCategories.push(cat);
    }
  } catch {
    // fallback
  }

  return {
    knownWordsCount,
    studiedTopicTitles: studiedTopicTitles.slice(0, 8),
    recentMistakeCategories,
    interests: settings.tutor?.interests ?? ['culture', 'literature', 'travel'],
  };
}

export interface TutorActionChip {
  action: TutorActionKind;
  label: string;
}

export function suggestTutorActions(context: TutorContext): TutorActionChip[] {
  switch (context.kind) {
    case 'word':
      return [
        { action: 'explain_nuance', label: 'Nuance & register' },
        { action: 'more_examples', label: 'More examples' },
        { action: 'compare_words', label: 'Compare similar words' },
        { action: 'idiom_slang', label: 'Idioms & slang' },
        { action: 'pronunciation', label: 'Pronunciation & stress' },
        { action: 'regional_cultural', label: 'Cultural / regional note' },
      ];
    case 'grammar':
      return [
        { action: 'grammar_simple', label: 'Explain in simple terms' },
        { action: 'analogy', label: 'Real-world analogy' },
        { action: 'connections', label: 'Connections to other lessons' },
        { action: 'more_examples', label: 'Clear examples' },
        { action: 'simplify', label: 'Make it even simpler' },
      ];
    case 'exercise':
    case 'card':
      return [
        { action: 'give_hint', label: 'Give me a hint' },
        { action: 'why_incorrect', label: 'Why is this wrong?' },
        { action: 'grammar_simple', label: 'Underlying grammar' },
        { action: 'more_examples', label: 'Show other examples' },
      ];
    case 'correction':
      return [
        { action: 'why_incorrect', label: 'Why was this corrected?' },
        { action: 'explain_nuance', label: 'Nuance & tone difference' },
        { action: 'more_examples', label: 'Correct example sentences' },
      ];
    case 'sentence':
      return [
        { action: 'explain_nuance', label: 'Break down phrasing' },
        { action: 'idiom_slang', label: 'Check for idioms / slang' },
        { action: 'simplify', label: 'How to say it simpler' },
        { action: 'regional_cultural', label: 'Cultural context' },
        { action: 'more_examples', label: 'Similar patterns' },
      ];
    case 'general':
    default:
      return [
        { action: 'grammar_simple', label: 'Explain grammar rule' },
        { action: 'compare_words', label: 'Compare two words' },
        { action: 'idiom_slang', label: 'Common idioms & sayings' },
        { action: 'analogy', label: 'Memory analogy' },
      ];
  }
}
