export interface WritingTask {
  id: string;
  title: string;
  brief: string;
  minWords: number;
  maxWords: number;
}

export const WRITING_TASKS: WritingTask[] = [
  { id: 'picture', title: 'Describe a picture', brief: 'Choose a picture you can see. Describe its people, setting and small details, then imagine what happened just before it.', minWords: 60, maxWords: 120 },
  { id: 'story', title: 'A short story', brief: 'A visitor leaves something unexpected at your door. Write a beginning, a turning point and an ending.', minWords: 120, maxWords: 250 },
  { id: 'dialogue', title: 'A dialogue', brief: 'Two people need to change a plan. Give each a different reason, and let them reach an agreement.', minWords: 80, maxWords: 160 },
  { id: 'email', title: 'An email', brief: 'Email a friend about a plan for the weekend. Explain where, when and why, and ask a question.', minWords: 60, maxWords: 120 },
  { id: 'formal-letter', title: 'A formal letter', brief: 'Write to a local organisation asking for information about a course. Introduce yourself, make two requests and close politely.', minWords: 120, maxWords: 200 },
  { id: 'message', title: 'An informal message', brief: 'Tell a friend you will be late. Explain briefly, suggest a new time and keep the tone friendly.', minWords: 30, maxWords: 60 },
  { id: 'review', title: 'A review', brief: 'Review a café, film or product you know. Describe it, give specific strengths and weaknesses, and say who would enjoy it.', minWords: 100, maxWords: 180 },
  { id: 'book-review', title: 'A book review', brief: 'Review a book you have read. Introduce its subject without spoiling the ending, discuss one detail and give your recommendation.', minWords: 120, maxWords: 220 },
  { id: 'opinion', title: 'An opinion', brief: 'Should a town centre have fewer cars? State your view, support it with two reasons and address one objection.', minWords: 100, maxWords: 180 },
  { id: 'persuasion', title: 'A persuasive piece', brief: 'Persuade your neighbours to share a community garden. Explain the benefits, answer a concern and end with a concrete invitation.', minWords: 150, maxWords: 250 },
  { id: 'for-against', title: 'For and against', brief: 'Discuss working from home. Give two advantages and two disadvantages, then a balanced conclusion.', minWords: 150, maxWords: 250 },
  { id: 'travel', title: 'A travel journal', brief: 'Recall or imagine a day in a new place. Include a journey, a person you met and a sensory detail.', minWords: 100, maxWords: 200 },
  { id: 'biography', title: 'A biography', brief: 'Introduce someone you admire. Describe their early life, one important event and why their work matters to you.', minWords: 120, maxWords: 220 },
  { id: 'imagined-conversation', title: 'An imagined conversation', brief: 'Imagine meeting a character from a book. Ask about a decision they made, and write their reply and your reaction.', minWords: 100, maxWords: 200 },
  { id: 'process', title: 'Explain a process', brief: 'Explain how to make a dish or do a familiar task. Put the steps in order and explain one common mistake.', minWords: 80, maxWords: 160 },
  { id: 'memory', title: 'A memory', brief: 'Describe a small moment you remember clearly. Set the scene, say what happened and explain why it stayed with you.', minWords: 100, maxWords: 200 },
  { id: 'post', title: 'A social post', brief: 'Share something you learned today. Make it clear to someone new to the subject, and invite a response.', minWords: 40, maxWords: 80 },
  { id: 'work', title: 'A work message', brief: 'Update a colleague about a project. Say what is finished, what is delayed and what you need from them.', minWords: 60, maxWords: 120 },
  { id: 'complaint', title: 'A complaint', brief: 'A booking was different from what was promised. Explain the facts calmly and ask for a specific remedy.', minWords: 100, maxWords: 180 },
  { id: 'apology', title: 'An apology', brief: 'Apologise for missing an important meeting. Take responsibility, explain briefly and offer a way to put it right.', minWords: 60, maxWords: 120 },
  { id: 'invitation', title: 'An invitation', brief: 'Invite someone to a small celebration. Include the occasion, place and time, and ask them to reply.', minWords: 40, maxWords: 80 },
  { id: 'news', title: 'A reply to the news', brief: 'Choose a news article. Summarise its main point in your own words, then give your response and one question it leaves.', minWords: 120, maxWords: 220 },
  { id: 'grammar', title: 'Rewrite with a structure', brief: 'Choose a short paragraph and a grammar structure you are practising. Rewrite it using that structure while keeping its meaning.', minWords: 60, maxWords: 120 },
  { id: 'required-words', title: 'Use your new words', brief: 'Choose five words you have saved. Write a connected scene using all five naturally, rather than five separate example sentences.', minWords: 80, maxWords: 160 },
  { id: 'continue-story', title: 'Continue a story', brief: 'Continue this opening: “The last train had gone, but someone was still waiting.” Include three newly learned words and give the scene an ending.', minWords: 100, maxWords: 200 },
  { id: 'notes', title: 'Rebuild from notes', brief: 'Choose notes from something you read or heard. Turn them into connected paragraphs without looking at the original, then compare.', minWords: 100, maxWords: 200 },
];

export function writingTaskPrompt(task: WritingTask, details: string): string {
  return `${task.brief}\nAim for ${task.minWords}–${task.maxWords} words.${details.trim() ? `\n\nYour material:\n${details.trim()}` : ''}`;
}

export const writingTimerMs = (elapsed: number, startedAt: number | null, now: number) => elapsed + (startedAt === null ? 0 : Math.max(0, now - startedAt));
