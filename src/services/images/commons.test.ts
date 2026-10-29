import { describe, expect, it } from 'vitest';
import { parseCommons } from './commons';

const page = (title: string, licence: string, mime = 'image/jpeg', artist = '<a href="x">Ana</a> &amp; Co') => ({
  title,
  imageinfo: [{ thumburl: `https://upload.wikimedia.org/${title}.jpg`, descriptionurl: `https://commons.wikimedia.org/wiki/${title}`, mime, extmetadata: { LicenseShortName: { value: licence }, Artist: { value: artist } } }],
});

describe('Commons results', () => {
  it('keeps free pictures with their licence and author, and strips the markup', () => {
    const out = parseCommons({ query: { pages: { 1: page('File:Casa.jpg', 'CC BY-SA 4.0'), 2: page('File:Dom.jpg', 'Public domain'), 3: page('File:Haus.jpg', 'CC0') } } });
    expect(out.map((p) => p.title)).toEqual(['Casa', 'Dom', 'Haus']);
    expect(out[0]).toMatchObject({ licence: 'CC BY-SA 4.0', author: 'Ana & Co', page: 'https://commons.wikimedia.org/wiki/File:Casa.jpg' });
  });

  it('leaves out what is not free, not a picture, or has no copy to show', () => {
    const out = parseCommons({ query: { pages: { 1: page('File:A.jpg', 'All rights reserved'), 2: page('File:B.ogg', 'CC BY 4.0', 'audio/ogg'), 3: { title: 'File:C.jpg', imageinfo: [{}] }, 4: page('File:D.png', 'CC BY 2.0', 'image/png', '') } } });
    expect(out.map((p) => p.title)).toEqual(['D']);
    expect(out[0].author).toBe('Unknown author');
    expect(parseCommons({})).toEqual([]);
  });
});
