// Open pictures from Wikimedia Commons for a card (6-3b), always the learner's choice and never automatic. Each keeps its licence and
// author, so the card can say where the picture came from. Only free licences are offered.
export interface CommonsPicture {
  title: string;
  /** A medium-size copy to keep on the card. */
  thumb: string;
  /** The file's page on Commons (for the credit link). */
  page: string;
  licence: string;
  author: string;
}

const FREE = /^(CC[ -]|Public domain|PD|CC0)/i;
const plain = (html: string | undefined) => (html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

interface CommonsReply {
  query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; descriptionurl?: string; mime?: string; extmetadata?: Record<string, { value?: string } | undefined> }> }> };
}

/** The pictures a search answered with, free ones only (and only pictures, not sounds or documents). */
export function parseCommons(reply: CommonsReply): CommonsPicture[] {
  return Object.values(reply.query?.pages ?? {}).flatMap((p) => {
    const info = p.imageinfo?.[0];
    const licence = plain(info?.extmetadata?.LicenseShortName?.value);
    if (!info?.thumburl || !info.descriptionurl || !p.title || !/^image\/(jpeg|png|webp|gif)/.test(info.mime ?? '') || !FREE.test(licence)) return [];
    return [{ title: p.title.replace(/^File:/, '').replace(/\.\w+$/, ''), thumb: info.thumburl, page: info.descriptionurl, licence, author: plain(info.extmetadata?.Artist?.value) || 'Unknown author' }];
  });
}

export async function searchCommons(query: string, limit = 12): Promise<CommonsPicture[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: String(limit), prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '640', format: 'json', origin: '*' });
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error('Wikimedia Commons could not be reached.');
  return parseCommons((await res.json()) as CommonsReply);
}

/** A picture's bytes, from a result's address. */
export async function fetchPicture(thumb: string): Promise<Blob> {
  const res = await fetch(thumb, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error('The picture could not be downloaded.');
  return res.blob();
}

/** A picture scaled down to at most `max` pixels on its long side, as a JPEG: cards keep many, and a phone photo is several megabytes. */
export async function shrinkPicture(blob: Blob, max = 1000): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && blob.size < 400_000) return blob;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return (await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))) ?? blob;
  } catch {
    return blob;
  }
}
