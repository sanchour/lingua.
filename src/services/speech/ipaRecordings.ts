// The reference recording of a sound (6-10, F0704), from the IPA recordings on Wikimedia Commons. Asked of Commons' own API (it allows any site),
// with the speaker and licence for the credit; the audio plays from Commons. Needs the internet; with none there is simply no recording.
import { ipaFileNames } from '@/core/sounds/ipaAudio';
import type { Sound } from '@/core/sounds';

export interface SoundRecording {
  url: string;
  speaker: string;
  licence: string;
  page: string;
}

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const kept = new Map<string, Promise<SoundRecording | null>>();

type Page = { title: string; imageinfo?: Array<{ url: string; descriptionurl: string; extmetadata?: Record<string, { value?: string }> }> };

async function ask(names: string[]): Promise<SoundRecording | null> {
  const titles = names.map((n) => `File:${n}`).join('|');
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiextmetadatafilter=LicenseShortName|Artist&titles=${encodeURIComponent(titles)}`);
  if (!res.ok) return null;
  const pages = Object.values(((await res.json()) as { query?: { pages?: Record<string, Page> } }).query?.pages ?? {});
  // Commons answers in any order: the first name that exists, in the order they were asked for.
  for (const name of names) {
    const info = pages.find((p) => p.title === `File:${name}`)?.imageinfo?.[0];
    if (info) return { url: info.url, speaker: plain(info.extmetadata?.Artist?.value ?? '') || 'a Wikimedia Commons contributor', licence: plain(info.extmetadata?.LicenseShortName?.value ?? ''), page: info.descriptionurl };
  }
  return null;
}

/** The recording of a sound, or null (no recording of it, or offline). A failure is not remembered, so it is asked again next time. */
export function soundRecording(sound: Sound): Promise<SoundRecording | null> {
  const names = ipaFileNames(sound);
  if (!names.length) return Promise.resolve(null);
  const key = names.join('|');
  let hit = kept.get(key);
  if (!hit) {
    hit = ask(names).catch(() => null);
    void hit.then((r) => r || kept.delete(key));
    kept.set(key, hit);
  }
  return hit;
}
