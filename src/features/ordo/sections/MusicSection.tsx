import { useState } from 'react';
import { Check, Copy, ExternalLink, LogOut, Music2 } from 'lucide-react';
import type { Settings } from '@/data/settings';
import { patchSetting } from '@/data/settings';
import { Badge, Button, Segmented } from '@/design/primitives';
import { disconnectSpotify, spotifyRedirectUri, startSpotifySignIn } from '@/services/cantus/spotify';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

/** Cantus: the translation under each lyric line, and your own Spotify app for liked songs. */
export function MusicSection({ cantus, spotify }: { cantus: Settings['cantus']; spotify: Settings['spotify'] }) {
  return (
    <SettingsSection id="music" icon={Music2} title="Music" description="How songs in Sonus show their lyrics, where more lyrics come from, and your Spotify liked songs in the language you’re learning.">
      <div>
        <p className="mb-2 text-[15px] font-semibold">English under each line</p>
        <Segmented
          label="English under each line"
          value={cantus.translation}
          onChange={(translation) => void patchSetting('cantus', { translation })}
          block
          options={[
            { value: 'show', label: 'Shown' },
            { value: 'blur', label: 'Blurred' },
            { value: 'hide', label: 'Hidden' },
          ]}
        />
        <p className="mt-2 text-[13px] text-ink-soft">Blurred lines clear when you tap them: try the song first, then check.</p>
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[15px] font-semibold">Where lyrics come from</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
          LRCLIB first, often timed line by line to the music; then lyrics.ovh. For a song neither has, its page links to Genius: copy the words there and paste them in. Lyrics without timings are shown whole, to read along as you listen.
        </p>
      </div>
      <SpotifySetup spotify={spotify} />
    </SettingsSection>
  );
}

function SpotifySetup({ spotify }: { spotify: Settings['spotify'] }) {
  const [clientId, setClientId] = useState(spotify.clientId);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const connected = Boolean(spotify.refreshToken);
  const redirect = spotifyRedirectUri();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(redirect);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Copying isn’t allowed here; select the address and copy it.');
    }
  };
  const connect = async () => {
    setBusy(true);
    try {
      await startSpotifySignIn(clientId, '/sonus');
    } catch (e) {
      setBusy(false);
      toast(e instanceof Error ? e.message : 'Spotify couldn’t connect.', { tone: 'error' });
    }
  };

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[15px] font-semibold">Spotify liked songs</p>
        {connected ? <Badge tone="sage">Connected{spotify.user ? ` as ${spotify.user}` : ''}</Badge> : <Badge>Not connected</Badge>}
      </div>
      {connected ? (
        <>
          <p className="mt-1 text-[13px] text-ink-soft">Sonus › Music shows your liked songs sung in the language you’re learning, and finds each song on Spotify so its lyrics follow Spotify’s player.</p>
          <Button className="mt-3" variant="secondary" size="sm" icon={LogOut} onClick={() => void disconnectSpotify().then(() => toast('Spotify is disconnected.'))}>
            Disconnect
          </Button>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Spotify lets apps read your library only through an app of your own. It’s free, takes two minutes, and only you use it. Lingua never sees your password; the sign-in stays on this device.
          </p>
          <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-[14px] leading-snug marker:font-semibold marker:text-ink-faint">
            <li>
              Open the{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="hit inline-flex items-center gap-0.5 font-semibold text-accent-text hover:underline">
                Spotify developer dashboard <ExternalLink size={12} aria-hidden />
              </a>{' '}
              and sign in with your Spotify account.
            </li>
            <li>Choose “Create app”. Any name and description will do, for example “My Lingua”.</li>
            <li>
              Under “Redirect URIs”, add this address exactly:
              <span className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 rounded-lg bg-sunken px-2.5 py-1.5 text-[12.5px] break-all">{redirect}</code>
                <Button size="sm" variant="ghost" icon={copied ? Check : Copy} onClick={() => void copy()}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </span>
            </li>
            <li>Tick “Web API”, agree to the terms and save.</li>
            <li>Open the app’s settings, copy its “Client ID” and paste it here:</li>
          </ol>
          <div className="mt-3 flex gap-2">
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value.trim())}
              placeholder="Client ID (32 letters and numbers)"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Spotify Client ID"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raised px-3.5 font-mono text-[14px]"
            />
            <Button onClick={() => void connect()} loading={busy} disabled={!clientId}>
              Connect
            </Button>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-faint">Without Spotify, every song still plays from a YouTube or Spotify link, or along with music playing anywhere else.</p>
        </>
      )}
    </div>
  );
}
