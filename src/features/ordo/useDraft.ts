import { useEffect, useRef, useState } from 'react';

/**
 * Local value for fast controls (sliders): the UI follows every movement instantly,
 * while the saved setting is written once the user pauses.
 */
export function useDraft<T>(saved: T, commit: (value: T) => void, delay = 200): [T, (value: T) => void] {
  const [draft, setDraft] = useState(saved);
  const timer = useRef<number | undefined>(undefined);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  // Follow outside changes (e.g. a restored backup) when not mid-edit.
  useEffect(() => {
    if (timer.current === undefined) setDraft(saved);
  }, [saved]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const update = (value: T) => {
    setDraft(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      commitRef.current(value);
    }, delay);
  };
  return [draft, update];
}
