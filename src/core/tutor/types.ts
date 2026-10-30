// Types for 6-15: The tutor, in context.
export type TutorContextKind =
  | 'word'
  | 'sentence'
  | 'grammar'
  | 'exercise'
  | 'card'
  | 'correction'
  | 'general';

export interface TutorContext {
  kind: TutorContextKind;
  lang: string;
  word?: string;
  sentence?: string;
  translation?: string;
  topicId?: string;
  topicTitle?: string;
  userAnswer?: string;
  correctAnswer?: string;
  initialQuestion?: string;
  room?: string;
}

export type TutorActionKind =
  | 'explain_nuance'      // F0957: Explain vocabulary nuances
  | 'grammar_simple'     // F0956: Explain grammar in simple terms
  | 'more_examples'      // F0958, F0968: Generate examples on demand
  | 'idiom_slang'        // F0960, F0961: Explain idioms & slang
  | 'compare_words'      // F0962: Compare similar words
  | 'pronunciation'      // F0963: Explain pronunciation & stress
  | 'regional_cultural'  // F0964, F0965: Explain regional differences & cultural references
  | 'why_incorrect'      // F0967: Explain why an answer was incorrect
  | 'give_hint'          // F0984: Provide hints without giving away the answer
  | 'analogy'            // F0981: Create analogies for difficult grammar
  | 'simplify'           // F0970: Simplify difficult material
  | 'connections'        // F1012: Explain connections between different lessons
  | 'custom_question';   // F0955, F0222: Ask any language question

export interface TutorResponse {
  title: string;
  summary: string;
  explanation: string;
  analogy?: string;
  nuances?: string[];
  examples: Array<{
    target: string;
    translation: string;
    note?: string;
  }>;
  comparison?: {
    itemA: string;
    itemB: string;
    difference: string;
    table?: Array<{ feature: string; a: string; b: string }>;
  };
  pronunciation?: {
    ipa: string;
    tips: string;
    stressPattern?: string;
  };
  culturalNote?: string;
  regionalNote?: string;
  matchedGrammarTopicIds?: string[];
  hint?: {
    level1: string;
    level2: string;
  };
  whyIncorrect?: string;
  encouragement: string;
}

export interface LearnerContextSnapshot {
  knownWordsCount: number;
  studiedTopicTitles: string[];
  recentMistakeCategories: string[];
  interests: string[];
}
