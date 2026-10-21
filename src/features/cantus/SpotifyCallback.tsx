import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { finishSpotifySignIn } from '@/services/cantus/spotify';
import { toast } from '@/state/ui';

/** Where Spotify sends you back after signing in: finishes the sign-in and returns to where you were. */
export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    finishSpotifySignIn(location.search)
      .then((to) => {
        toast('Spotify is connected. Your liked songs are in Sonus › Music.', { tone: 'success' });
        navigate(to, { replace: true });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Spotify couldn’t connect.'));
  }, [navigate]);

  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      {error ? (
        <div className="max-w-sm">
          <p className="font-serif text-xl font-semibold">Spotify isn’t connected</p>
          <p className="mt-2 text-[14.5px] text-ink-soft">{error}</p>
          <Link to="/settings/music" className="mt-5 inline-block font-semibold text-accent-text">
            Back to the Spotify settings
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-ink-soft">
          <LoaderCircle size={18} className="animate-spin" aria-hidden /> Connecting Spotify…
        </p>
      )}
    </div>
  );
}
