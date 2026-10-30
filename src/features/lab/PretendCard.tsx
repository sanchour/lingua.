import { useUi } from '@/design/i18n/UiText';
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
  const translateUi = useUi();
  const { meta } = useApp().settings;
  const pretend = migratePlan(meta).pretend;
  return (
    <LabCard
      icon={Gem}
      title={translateUi('Pretend a plan')}
      description={translateUi('Lingua acts as this plan on this device. Now: {0}{1}.{2}', [NAME[planOf(meta)], pretend ? ' (pretend)' : '', TEST_MODE ? ' Purchases are in test mode, so nothing is charged anywhere.' : ''])}
    >
      <Segmented<Choice>
        label={translateUi('Pretend')}
        value={pretend ?? 'real'}
        onChange={(choice) => void pretendPlan(meta, choice === 'real' ? null : choice)}
        options={[
          { value: 'free', label: translateUi('Free') },
          { value: 'plus', label: translateUi('Lingua+') },
          { value: 'max', label: translateUi('Max') },
          { value: 'real', label: translateUi('Real') },
        ]}
      />
    </LabCard>
  );
}
