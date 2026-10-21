import { Gem } from 'lucide-react';
import { useApp } from '@/app/context';
import { migratePlan, planOf, pretendPlan } from '@/data/plan';
import type { PlanKind } from '@/data/plan';
import { Segmented } from '@/design/primitives';
import { TEST_MODE } from '@/services/licence/config';
import { LabCard } from './LabCard';

type Choice = PlanKind | 'real';

const NAME: Record<PlanKind, string> = { free: 'Free', plus: 'Lingua+', max: 'Lingua+ Max' };

/** Act as Free, Lingua+ or Max on this device (5.1-2a), to check every lock; "Real" is what was bought. */
export function PretendCard() {
  const { meta } = useApp().settings;
  const pretend = migratePlan(meta).pretend;
  return (
    <LabCard
      icon={Gem}
      title="Pretend a plan"
      description={`Lingua acts as this plan on this device. Now: ${NAME[planOf(meta)]}${pretend ? ' (pretend)' : ''}.${TEST_MODE ? ' Purchases are in test mode, so nothing is charged anywhere.' : ''}`}
    >
      <Segmented<Choice>
        label="Pretend"
        value={pretend ?? 'real'}
        onChange={(choice) => void pretendPlan(meta, choice === 'real' ? null : choice)}
        options={[
          { value: 'free', label: 'Free' },
          { value: 'plus', label: 'Lingua+' },
          { value: 'max', label: 'Max' },
          { value: 'real', label: 'Real' },
        ]}
      />
    </LabCard>
  );
}
