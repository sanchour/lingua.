import { useEffect } from 'react';
import { useApp } from '@/app/context';
import { can, planOf, pretendPlan } from '@/data/plan';
import type { Feature, PlanKind } from '@/data/plan';
import { TEST_MODE } from '@/services/licence/config';
import { refreshMax } from '@/services/licence/store';
import { toast } from '@/state/ui';

/** The plan in force, live. */
export function usePlan(): PlanKind {
  return planOf(useApp().settings.meta);
}

/** Whether the plan in force opens a feature. */
export function useCan(feature: Feature): boolean {
  return can(feature, usePlan());
}

/**
 * Once per start: Max fetches its newest paid-until date. In test mode an install from before the
 * plans (nothing chosen yet) acts as Max, so nothing the learner used disappears.
 */
export function usePlanUpkeep(): void {
  const { meta } = useApp().settings;
  const untouched = meta.plan === null && meta.onboardedAt !== null;
  useEffect(() => {
    if (TEST_MODE && untouched) {
      void pretendPlan(meta, 'max').then(() => toast('Plans are in test mode: Lingua+ Max is on, so everything stays open. Settings › Lab can act as another plan.', { duration: 9000 }));
    }
    // Only on start: the meta object changes with every setting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [untouched]);
  useEffect(() => {
    void refreshMax();
  }, []);
}
