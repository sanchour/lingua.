// YouTube links for Visio (5.2-4): the video's id from the many shapes of address, and where its title and picture come from.

const ID = /^[\w-]{11}$/;
const HOSTS = /^(www\.|m\.|music\.)?youtube(-nocookie)?\.com$/i;

/** The 11-character id from a watch, share, embed, shorts or live address; null for anything else. */
export function youtubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (/^(www\.)?youtu\.be$/i.test(url.hostname)) {
    const id = url.pathname.split('/')[1] ?? '';
    return ID.test(id) ? id : null;
  }
  if (!HOSTS.test(url.hostname)) return null;
  const v = url.searchParams.get('v');
  if (v && ID.test(v)) return v;
  const [, kind, id = ''] = url.pathname.split('/');
  return ['embed', 'shorts', 'live', 'v'].includes(kind) && ID.test(id) ? id : null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const youtubeOembed = (id: string) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeWatchUrl(id))}`;
