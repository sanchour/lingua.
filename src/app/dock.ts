import { useLayout } from '@/design/hooks/useLayout';
import { MINI_PLAYER_SPACE } from '@/features/sonus/MiniPlayer';
import { usePlayer } from '@/services/audio/engine';

/** Where a floating action bar sits: above the tab bar (and the mini player) on phones. */
export function useDockBottom(): number | string {
  const { layout } = useLayout();
  const playing = usePlayer((st) => st.media !== null);
  return layout === 'wide' ? (playing ? 96 : 24) : `calc(max(10px, env(safe-area-inset-bottom) - 10px) + ${84 + (playing ? MINI_PLAYER_SPACE : 0)}px)`;
}
