import { expect, it, vi } from 'vitest';
vi.mock('./pdf', () => ({ parsePdf: vi.fn() }));
vi.mock('./epub', () => ({ parseEpub: vi.fn() }));
import { parseRichTextChapters } from './importers';
it('retains SRT and VTT cue ranges in imported paragraph data, not only their text', () => {
  for (const source of ['1\n00:00:01,000 --> 00:00:03,000\nHola.\n', 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHola.\n']) {
    const parsed = parseRichTextChapters(source, 'Timed text');
    expect(parsed.kind).toBe('transcript');
    expect(parsed.chapters[0].blocks[0]).toMatchObject({ t: 'p', text: 'Hola.', cue: 0, startMs: 1000, endMs: 3000 });
  }
});
