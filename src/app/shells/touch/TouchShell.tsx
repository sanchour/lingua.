import type { ReactNode } from 'react';
import { MINI_PLAYER_SPACE } from '@/features/sonus/MiniPlayer';
import { usePlayer } from '@/services/audio/engine';
import { TopBar } from './TopBar';

export function TouchShell({ children }: { children: ReactNode }) {
  // Room for the mini player at the bottom while something is loaded.
  const playing = usePlayer((s) => s.media !== null);
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main
        className="mx-auto w-full max-w-2xl pt-3"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${32 + (playing ? MINI_PLAYER_SPACE : 0)}px)`,
        }}
      >
        {children}
      </main>
    </div>
  );
}
