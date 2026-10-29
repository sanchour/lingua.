// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { selectedText } from './ReferenceHelp';
afterEach(() => { document.body.innerHTML = ''; });
it('takes an input selection but excludes password and revealed API-key fields', () => {
  const input = document.createElement('input');
  input.value = 'some reference'; document.body.append(input); input.focus(); input.setSelectionRange(5, 14);
  expect(selectedText()).toBe('reference');
  input.id = 'ai-key'; input.value = 'test-not-a-real-key'; input.setSelectionRange(0, 19);
  expect(selectedText()).toBe(''); input.id = ''; input.type = 'password'; expect(selectedText()).toBe('');
});
