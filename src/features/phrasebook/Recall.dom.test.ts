// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import * as record from '@/data/learner';
import { RecallRun } from './Recall';
import type { ExerciseSpec } from '@/core/contracts/exercise';
it('requires a self-rating and records a revealed notebook answer as assisted exactly once', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = vi.spyOn(record, 'recordEvidence').mockResolvedValue({} as Awaited<ReturnType<typeof record.recordEvidence>>);
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const spec: ExerciseSpec = { key: 'n:0', kind: 'translate', lang: 'es', instruction: 'Recall', body: { task: 'fix', given: [], translation: 'Which example?' }, check: { rule: 'self', modelAnswer: 'la casa' }, trains: { skill: 'reading', item: { type: 'pattern', patternId: 'notebook:n' } } };
  const click = async (label: string) => { const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.trim() === label)!; expect(b).toBeTruthy(); await act(async () => b.click()); };
  try {
    await act(async () => root.render(createElement(RecallRun, { specs: [spec], room: 'diarium', onDone: () => {} })));
    await click('Show answer and self-rate'); expect(save).not.toHaveBeenCalled();
    await click('I recalled it'); expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({ room: 'diarium', assisted: true, outcome: 'right', expected: 'la casa' });
    expect(container.textContent).toContain('Recalled.');
  } finally { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); }
});
