// Open production (Cursus, part 4): tasks that ask for your own words rather than a choice. After
// reading, listening or watching, retell it or carry it on; in the course, the unit's task, a scene
// to describe, or one of its questions to answer. Pure: the panels (features/production) show them.
import type { UnitOutline } from '@/core/course/outline';
import type { UnitContent } from '@/core/course/types';
import { plain } from '@/core/grammar/types';
import type { Level } from '@/core/lang/levels';

export interface OwnTask {
  id: 'retell' | 'next' | 'scene' | 'keep' | 'task' | 'reply';
  /** A word or two for the switch between tasks. */
  label: string;
  /** What to do, in English; the AI check is given it as the prompt. */
  task: string;
  /** A line in the language the task is about (the question to answer). */
  quote?: string;
}

export type Lane = 'read' | 'listen' | 'watch';

const LOW = new Set<Level>(['A0', 'A1', 'A2']);

/** After a text, an episode or a video: retell it, and a second task that fits what it was. */
export function afterTasks(lane: Lane, title: string, level: Level): OwnTask[] {
  const low = LOW.has(level);
  const what = lane === 'read' ? 'read' : lane === 'listen' ? 'heard' : 'watched';
  const retell: OwnTask = {
    id: 'retell',
    label: 'Retell it',
    task: low
      ? `Retell what you ${what} in “${title}” in three short sentences: who, where, and what happens.`
      : `Retell what you ${what} in “${title}” in your own words, in five or six sentences, and say what you thought of it.`,
  };
  const second: OwnTask =
    lane === 'read'
      ? {
          id: 'next',
          label: 'Write what comes next',
          task: low ? `Write the next line of “${title}”: one or two sentences that could come next.` : `Carry “${title}” on: write the next few lines, as the author might have.`,
        }
      : lane === 'watch'
        ? { id: 'scene', label: 'Describe a scene', task: `Describe one scene from “${title}” you remember: where it is, who is in it, and what happens.` }
        : { id: 'keep', label: 'One thing to keep', task: `Write down one thing you heard in “${title}” that you want to remember, and why.` };
  return [retell, second];
}

const QUESTION = /[?？؟]\s*$/;

/** The course's Write lesson: the unit's task, its scene, and (when it has one) a question from its phrases to answer. */
export function courseTasks(unit: UnitOutline, content: UnitContent): OwnTask[] {
  const tasks: OwnTask[] = [
    { id: 'task', label: 'The task', task: unit.write },
    { id: 'scene', label: 'Describe a scene', task: `In your own words, describe ${unit.scene[0].toLowerCase()}${unit.scene.slice(1)}` },
  ];
  const question = content.phrases.map((p) => plain(p.s)).find((s) => QUESTION.test(s));
  if (question) tasks.push({ id: 'reply', label: 'Answer a question', task: 'Answer this question in your own words, in two or three sentences.', quote: question });
  return tasks;
}

/** The prompt the AI check is given: the task, with the line it is about. */
export const taskPrompt = (t: OwnTask) => (t.quote ? `${t.task} “${t.quote}”` : t.task);
