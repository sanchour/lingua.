import { describe, expect, it } from 'vitest';
import { loadCourse } from '@/core/course/load';
import { OUTLINE } from '@/core/course/outline';
import { afterTasks, courseTasks, taskPrompt } from './tasks';

describe('open production tasks', () => {
  it('asks to retell, then carry a text on, describe a scene or keep one thing', () => {
    expect(afterTasks('read', 'Niebla', 'A1').map((t) => t.id)).toEqual(['retell', 'next']);
    expect(afterTasks('watch', 'Film', 'B1').map((t) => t.id)).toEqual(['retell', 'scene']);
    expect(afterTasks('listen', 'Podcast', 'B2').map((t) => t.id)).toEqual(['retell', 'keep']);
  });

  it('asks less of a beginner', () => {
    expect(afterTasks('read', 'Niebla', 'A1')[0].task).toContain('three short sentences');
    expect(afterTasks('read', 'Niebla', 'B2')[0].task).toContain('five or six sentences');
    expect(afterTasks('read', 'Niebla', 'A2')[1].task).toContain('next line');
  });

  it('gives every unit of every course its task, its scene and a question to answer', async () => {
    for (const lang of ['es', 'fr', 'de', 'ru', 'ar', 'zh']) {
      const course = (await loadCourse(lang))!;
      for (const unit of OUTLINE) {
        const tasks = courseTasks(unit, course.units[unit.id]);
        expect(tasks.map((t) => t.id).slice(0, 2), `${lang} ${unit.id}`).toEqual(['task', 'scene']);
        expect(unit.scene.length).toBeGreaterThan(30);
        const reply = tasks.find((t) => t.id === 'reply');
        if (reply) {
          expect(reply.quote, `${lang} ${unit.id}`).toMatch(/[?？؟]$/);
          expect(reply.quote).not.toContain('[');
          expect(taskPrompt(reply)).toContain(reply.quote!);
        }
      }
    }
  });
});
