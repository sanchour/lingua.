import { useApp } from '@/app/context';
import { HomeClassic } from './HomeClassic';
import { HomeToday } from './HomeToday';

/** Home: Today (5.1-2c), or the layout before it (Settings › Preferences › Home layout). */
export default function HomePage() {
  const { settings } = useApp();
  return settings.ui.homeLayout === 'classic' ? <HomeClassic /> : <HomeToday />;
}
