import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Check, Copy, ExternalLink, LogOut, Music2 } from 'lucide-react';
import type { Settings } from '@/data/settings';
import { patchSetting } from '@/data/settings';
import { Badge, Button, Segmented } from '@/design/primitives';
import { disconnectSpotify, spotifyRedirectUri, startSpotifySignIn } from '@/services/cantus/spotify';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';

/** Cantus: the translation under each lyric line, and your own Spotify app for liked songs. */
export function MusicSection({ cantus, spotify, youtubeKey }: { cantus: Settings['cantus']; spotify: Settings['spotify']; youtubeKey: string }) {
  const translateUi = useUi();
  return (
    <SettingsSection id="music" icon={Music2} title={translateUi('Music')} description={translateUi('How songs in Sonus show their lyrics, where more lyrics come from, and your Spotify liked songs in the language you’re learning.')}>
      <div>
        <p className="mb-2 text-[15px] font-semibold"><UiText source={'English under each line'} /></p>
        <Segmented
          label={translateUi('English under each line')}
          value={cantus.translation}
          onChange={(translation) => void patchSetting('cantus', { translation })}
          block
          options={[
            { value: 'show', label: translateUi('Shown') },
            { value: 'blur', label: translateUi('Blurred') },
            { value: 'hide', label: translateUi('Hidden') },
          ]}
        />
        <p data-hint="" className="mt-2 text-[13px] text-ink-soft"><UiText source={'Blurred lines clear when you tap them: try the song first, then check.'} /></p>
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[15px] font-semibold"><UiText source={'Where lyrics come from'} /></p>
        <p data-hint="" className="mt-1 text-[13px] leading-relaxed text-ink-soft"><UiText source={'LRCLIB first, often timed line by line to the music; then lyrics.ovh. For a song neither has, its page links to Genius: copy the words there and paste them in. Lyrics without timings are shown whole, to read along as you listen.'} /></p>
      </div>
      <YouTubeKey value={youtubeKey} />
      <SpotifySetup spotify={spotify} />
    </SettingsSection>
  );
}

function SpotifySetup({ spotify }: { spotify: Settings['spotify'] }) {
  const translateUi = useUi();
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
      await startSpotifySignIn(clientId, '/sonus?tab=music');
    } catch (e) {
      setBusy(false);
      toast(e instanceof Error ? e.message : 'Spotify couldn’t connect.', { tone: 'error' });
    }
  };

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[15px] font-semibold"><UiText source={'Spotify liked songs'} /></p>
        {connected ? <Badge tone="sage"><UiText source={'Connected{0}'} values={[spotify.user ? ` as ${spotify.user}` : '']} /></Badge> : <Badge><UiText source={'Not connected'} /></Badge>}
      </div>
      {connected ? (
        <>
          <p data-hint="" className="mt-1 text-[13px] text-ink-soft"><UiText source={'Sonus › Music shows your liked songs sung in the language you’re learning, and finds each song on Spotify so its lyrics follow Spotify’s player.'} /></p>
          <Button className="mt-3" variant="secondary" size="sm" icon={LogOut} onClick={() => void disconnectSpotify().then(() => toast('Spotify is disconnected.'))}><UiText source={'Disconnect'} /></Button>
        </>
      ) : (
        <>
          <p data-hint="" className="mt-1 text-[13px] leading-relaxed text-ink-soft"><UiText source={'Spotify lets apps read your library only through an app of your own. It’s free, takes two minutes, and only you use it. Lingua never sees your password; the sign-in stays on this device.'} /></p>
          <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-[14px] leading-snug marker:font-semibold marker:text-ink-faint">
            <li><UiText source={'Open the{0}{1}{2}and sign in with your Spotify account.'} values={[' ', <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="hit inline-flex items-center gap-0.5 font-semibold text-accent-text hover:underline"><UiText source={'Spotify developer dashboard {0}'} values={[<ExternalLink size={12} aria-hidden />]} /></a>, ' ']} /></li>
            <li><UiText source={'Choose “Create app”. Any name and description will do, for example “My Lingua”.'} /></li>
            <li><UiText source={'Under “Redirect URIs”, add this address exactly:{0}'} values={[<span className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 rounded-lg bg-sunken px-2.5 py-1.5 text-[12.5px] break-all">{redirect}</code>
                <Button size="sm" variant="ghost" icon={copied ? Check : Copy} onClick={() => void copy()}>
                  {copied ? translateUi('Copied') : translateUi('Copy')}
                </Button>
              </span>]} /></li>
            <li><UiText source={'Tick “Web API”, agree to the terms and save.'} /></li>
            <li><UiText source={'Open the app’s settings, copy its “Client ID” and paste it here:'} /></li>
          </ol>
          <div className="mt-3 flex gap-2">
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value.trim())}
              placeholder={translateUi('Client ID (32 letters and numbers)')}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={translateUi('Spotify Client ID')}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raised px-3.5 font-mono text-[14px]"
            />
            <Button onClick={() => void connect()} loading={busy} disabled={!clientId}><UiText source={'Connect'} /></Button>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-faint"><UiText source={'Without Spotify, every song still plays from a YouTube or Spotify link, or along with music playing anywhere else.'} /></p>
        </>
      )}
    </div>
  );
}

/** Optional: the learner's own YouTube key, for finding whole songs straight from YouTube. */
function YouTubeKey({ value }: { value: string }) {
  const translateUi = useUi();
  const [key, setKey] = useDraft(value, (v) => void patchSetting('apiKeys', { youtube: v.trim() }), 400);
  return (
    <div className="mt-6 border-t border-line pt-5">
      <label htmlFor="youtube-key" className="text-[15px] font-semibold"><UiText source={'Whole songs: your YouTube key (optional)'} /></label>
      <p data-hint="" className="mt-1 text-[13px] leading-relaxed text-ink-soft"><UiText source={'Apple and Spotify play 30 seconds unless you’re signed in, so Cantus finds each song’s whole recording on YouTube by itself. Without a key it asks the public Piped and Invidious servers, which are sometimes busy. With your own free YouTube Data API key (Google Cloud › YouTube Data API v3) it asks YouTube directly. The key stays on this device and travels only in a request header.'} /></p>
      <input
        id="youtube-key"
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={translateUi('Paste your key')}
        className="mt-3 h-11 w-full rounded-xl border border-line bg-raised px-3.5 font-mono text-[14px] transition-colors hover:border-line-strong"
      />
    </div>
  );
}
