import { useEffect } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Navigate } from 'react-router';
import type { Feature } from '@/data/plan';
import { useUI } from '@/state/ui';
import { useCan } from './usePlan';

/**
 * A full-screen page a plan opens (a lesson, Sonus+, a chat): without it, back to its room with
 * the plans open on the right plan, rather than a locked page with no way around.
 */
export function PlanRoute({ feature, fallback, children }: { feature: Feature; fallback: string; children: ReactNode }) {
  const ok = useCan(feature);
  const openPlans = useUI((s) => s.openPlans);
  useEffect(() => {
    if (!ok) openPlans(feature);
  }, [ok, feature, openPlans]);
  return ok ? <>{children}</> : <Navigate to={fallback} replace />;
}

/** For a link or button into a locked feature: null when open, else a click handler that opens the plans instead. */
export function useGate(feature: Feature): ((event?: MouseEvent) => void) | null {
  const ok = useCan(feature);
  const openPlans = useUI((s) => s.openPlans);
  if (ok) return null;
  return (event) => {
    event?.preventDefault();
    openPlans(feature);
  };
}
