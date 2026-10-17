// Spotify through the learner's own free developer app: sign in with PKCE (no secret, nothing goes
// through a server of ours), then read liked songs and find a song's Spotify track. The app ID and
// the sign-in stay on this device. Playback itself is Spotify's own embedded player.
import { getSettings, patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';

const AUTH = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';
const SCOPES = 'user-library-read';
const PENDING = 'lingua:spotify-pkce';

export class SpotifyError extends Error {
  constructor(
    message: string,
    readonly code: 'not-connected' | 'denied' | 'expired' | 'network' | 'state',
  ) {
    super(message);
  }
}

/** The address Spotify sends you back to; it must be added to the app's Redirect URIs exactly. */
export const spotifyRedirectUri = () => `${location.origin}${import.meta.env.BASE_URL}cantus/spotify`;

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = (n: number) => base64url(crypto.getRandomValues(new Uint8Array(n))).slice(0, n);

/** Starts signing in: remembers the verifier for the way back and goes to Spotify. */
export async function startSpotifySignIn(clientId: string, returnTo: string): Promise<void> {
  const id = clientId.trim();
  if (!/^[0-9a-f]{32}$/i.test(id)) throw new SpotifyError('That doesn’t look like a Spotify Client ID: 32 letters and numbers, from your app’s settings.', 'state');
  const verifier = randomString(64);
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const state = randomString(16);
  sessionStorage.setItem(PENDING, JSON.stringify({ verifier, state, returnTo, clientId: id }));
  await patchSetting('spotify', { clientId: id });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: id,
    scope: SCOPES,
    redirect_uri: spotifyRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });
  location.assign(`${AUTH}/authorize?${params}`);
}

async function tokenRequest(body: Record<string, string>): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  let res: Response;
  try {
    res = await fetch(`${AUTH}/api/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  } catch {
    throw new SpotifyError('Spotify couldn’t be reached. Check the connection.', 'network');
  }
  if (!res.ok) throw new SpotifyError('Spotify didn’t accept the sign-in. Connect again from Ordo › Music.', 'expired');
  return res.json();
}

/** Finishes signing in on the way back from Spotify. Returns where to go next. */
export async function finishSpotifySignIn(search: string): Promise<string> {
  const params = new URLSearchParams(search);
  const pending = JSON.parse(sessionStorage.getItem(PENDING) ?? 'null') as { verifier: string; state: string; returnTo: string; clientId: string } | null;
  sessionStorage.removeItem(PENDING);
  if (params.get('error')) throw new SpotifyError(params.get('error') === 'access_denied' ? 'Spotify wasn’t connected: the request was declined.' : 'Spotify couldn’t connect.', 'denied');
  if (!pending || params.get('state') !== pending.state || !params.get('code')) throw new SpotifyError('This sign-in didn’t start here. Connect again from Ordo › Music.', 'state');
  const token = await tokenRequest({
    grant_type: 'authorization_code',
    code: params.get('code')!,
    redirect_uri: spotifyRedirectUri(),
    client_id: pending.clientId,
    code_verifier: pending.verifier,
  });
  await saveToken(token);
  const me = await spotifyGet<{ display_name?: string; id: string }>('/me').catch(() => null);
  if (me) await patchSetting('spotify', { user: me.display_name || me.id });
  return pending.returnTo || '/sonus';
}

async function saveToken(t: { access_token: string; refresh_token?: string; expires_in: number }, current?: Settings['spotify']) {
  await patchSetting('spotify', {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? current?.refreshToken ?? '',
    expiresAt: Date.now() + t.expires_in * 1000,
  });
}

let refreshing: Promise<string> | null = null;

/** A working access token, refreshed when it is about to expire. */
async function accessToken(): Promise<string> {
  const { spotify } = await getSettings();
  if (!spotify.clientId || !spotify.refreshToken) throw new SpotifyError('Spotify isn’t connected.', 'not-connected');
  if (spotify.accessToken && spotify.expiresAt > Date.now() + 60_000) return spotify.accessToken;
  refreshing ??= tokenRequest({ grant_type: 'refresh_token', refresh_token: spotify.refreshToken, client_id: spotify.clientId })
    .then(async (t) => {
      await saveToken(t, spotify);
      return t.access_token;
    })
    .finally(() => (refreshing = null));
  return refreshing;
}

export async function spotifyGet<T>(path: string): Promise<T> {
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(path.startsWith('http') ? path : `${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new SpotifyError('Spotify couldn’t be reached. Check the connection.', 'network');
  }
  if (res.status === 401) {
    await patchSetting('spotify', { accessToken: '', expiresAt: 0 });
    throw new SpotifyError('The Spotify sign-in expired. Connect again from Ordo › Music.', 'expired');
  }
  if (!res.ok) throw new SpotifyError('Spotify didn’t answer. Try again in a moment.', 'network');
  return res.json() as Promise<T>;
}

export async function disconnectSpotify(): Promise<void> {
  await patchSetting('spotify', { accessToken: '', refreshToken: '', expiresAt: 0, user: '' });
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album?: { name?: string; images?: Array<{ url: string; width?: number }>; release_date?: string };
  duration_ms?: number;
}

/** A page of liked songs, newest first. */
export async function likedTracks(offset = 0, limit = 50): Promise<{ tracks: SpotifyTrack[]; total: number }> {
  const page = await spotifyGet<{ items: Array<{ track: SpotifyTrack | null }>; total: number }>(`/me/tracks?limit=${limit}&offset=${offset}`);
  return { tracks: page.items.map((i) => i.track).filter((t): t is SpotifyTrack => Boolean(t?.id)), total: page.total };
}

/** The Spotify track for a title and artist, when signed in. */
export async function findSpotifyTrack(title: string, artist: string): Promise<string | null> {
  const q = `track:${title.replace(/["()]/g, ' ')} artist:${artist.split(/,|&| feat/i)[0].trim()}`;
  const res = await spotifyGet<{ tracks?: { items?: SpotifyTrack[] } }>(`/search?type=track&limit=5&q=${encodeURIComponent(q)}`);
  return res.tracks?.items?.[0]?.id ?? null;
}

/** open.spotify.com/track/… links and spotify:track: URIs. */
export function spotifyTrackId(input: string): string | null {
  const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})/i.exec(input) ?? /^spotify:track:([A-Za-z0-9]{22})$/.exec(input.trim());
  return m ? m[1] : null;
}
