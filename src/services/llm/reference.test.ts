import { expect, it, vi } from 'vitest';
import { explainReference } from './reference';
it('uses an injected model, keeps quoted text as data and rejects missing uncertainty or oversized input', async () => {
  const complete = vi.fn(async (_request: { user: string }) => ({ meaning: 'Time after a meal', explanation: 'The context suggests conversation at the table.', uncertainty: 'Other senses exist; check the surrounding sentence.', example: 'Seguimos de sobremesa.' }));
  const result = await explainReference('es', 'sobremesa', 'A family meal', { name: 'fake-model', complete });
  expect(result.model).toBe('fake-model'); expect(complete.mock.calls[0][0].user).toContain('A family meal');
  await expect(explainReference('es', 'x'.repeat(3001), '', { name: 'fake', complete })).rejects.toThrow('3,000');
  await expect(explainReference('es', 'x', '', { name: 'fake', complete: async () => ({ meaning: 'x' }) })).rejects.toThrow('could not be read');
});
