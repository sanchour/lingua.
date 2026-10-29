export const FEEDBACK_KINDS = ['register', 'formality', 'higher-level', 'idiom', 'precision', 'unnatural', 'literal-translation', 'alternative'] as const;
export const WRITING_RUBRIC = ['Task completion', 'Organisation', 'Register and tone', 'Language choices'] as const;
export interface WritingFeedback {
  suggestions: Array<{ kind: typeof FEEDBACK_KINDS[number]; original: string; suggestion: string; why: string }>;
  rubric: Array<{ criterion: typeof WRITING_RUBRIC[number]; score: number; reason: string }>;
}

export function parseWritingFeedback(value: unknown, text: string): WritingFeedback | undefined {
  if (!value || typeof value !== 'object') return;
  const raw = value as Record<string, unknown>;
  const suggestions: WritingFeedback['suggestions'] = [];
  for (const item of Array.isArray(raw.suggestions) ? raw.suggestions.slice(0, 24) : []) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    if (!FEEDBACK_KINDS.includes(s.kind as typeof FEEDBACK_KINDS[number]) || typeof s.original !== 'string' || !s.original.trim() || !text.includes(s.original) || typeof s.suggestion !== 'string' || !s.suggestion.trim() || typeof s.why !== 'string') continue;
    suggestions.push({ kind: s.kind as typeof FEEDBACK_KINDS[number], original: s.original, suggestion: s.suggestion, why: s.why });
  }
  const rubric: WritingFeedback['rubric'] = [];
  for (const criterion of WRITING_RUBRIC) {
    const r = (Array.isArray(raw.rubric) ? raw.rubric : []).find((r) => r && typeof r === 'object' && r.criterion === criterion);
    if (r && typeof r.score === 'number' && Number.isFinite(r.score) && r.score >= 0 && r.score <= 4 && typeof r.reason === 'string') rubric.push({ criterion, score: r.score, reason: r.reason });
  }
  return { suggestions, rubric };
}
