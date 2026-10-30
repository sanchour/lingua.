/** Interface wording and its literal values stay separate from learner content. */
export interface UiMessage { source: string; values?: readonly (string | UiMessage)[] }
