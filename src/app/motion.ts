import { useApp } from './context';

/** True when the learner chose Full motion: richer page moves, animated reordering, longer settles. */
export function useFullMotion(): boolean {
  return useApp().settings.ui.motion === 'full';
}
