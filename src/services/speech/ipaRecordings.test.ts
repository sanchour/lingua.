import { afterEach, describe, expect, it, vi } from 'vitest';
import { soundRecording } from './ipaRecordings';
import type { Consonant } from '@/core/sounds';

afterEach(() => vi.unstubAllGlobals());

const dental: Consonant = { kind: 'consonant', ipa: 't', place: 'dental', manner: 'stop', voiced: false, words: [], note: '' };
const page = (title: string, speaker: string) => ({ title, imageinfo: [{ url: `https://upload.example/${title}`, descriptionurl: `https://commons.example/${title}`, extmetadata: { Artist: { value: `<a href="x">${speaker}</a>` }, LicenseShortName: { value: 'CC BY-SA 3.0' } } }] });

describe('soundRecording', () => {
  it('takes the first name that exists, in the order asked, and credits the speaker', async () => {
    // Commons lists the alveolar file only: the dental name is missing.
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ query: { pages: { 1: page('File:Voiceless alveolar plosive.ogg', 'Peter Isotalo'), '-1': { title: 'File:Voiceless dental plosive.ogg' } } } })));
    vi.stubGlobal('fetch', fetchMock);
    const r = await soundRecording(dental);
    expect(r).toMatchObject({ speaker: 'Peter Isotalo', licence: 'CC BY-SA 3.0' });
    expect(r?.url).toContain('alveolar');
    expect(decodeURIComponent((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('File:Voiceless dental plosive.ogg|File:Voiceless alveolar plosive.ogg');
  });
  it('is null with no name to look for, with nothing found, and offline', async () => {
    expect(await soundRecording({ kind: 'tone', ipa: 'á', contour: [3, 5], words: [], note: '' })).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await soundRecording({ ...dental, ipa: 'd', voiced: true })).toBeNull();
  });
});
