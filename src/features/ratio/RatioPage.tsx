import { useUi } from '@/design/i18n/UiText';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChartNoAxesColumn, Table2 } from 'lucide-react';
import { PageHeader } from '@/app/PageHeader';
import { Segmented } from '@/design/primitives';
import { fade } from '@/design/motion';
import { Overview } from './Overview';
import { Tabula } from './tabula/Tabula';

type Tab = 'overview' | 'tabula';

/**
 * Ratio: honest numbers for the language you are learning (Overview), and every language you speak with its goals (Tabula).
 * Iter, the timeline, went in 5.2-9: its goals live in Tabula, and its old links open Tabula.
 */
export default function RatioPage() {
  const translateUi = useUi();
  const [params, setParams] = useSearchParams();
  const picked = params.get('tab');
  const tab: Tab = picked === 'tabula' || picked === 'iter' ? 'tabula' : 'overview';
  return (
    <>
      <PageHeader title={translateUi('Ratio')} englishTitle={'Ratio'} />
      <div className="-mt-2 mb-7">
        <Segmented<Tab>
          label={translateUi('Ratio')}
          value={tab}
          onChange={(next) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true })}
          options={[
            { value: 'overview', label: translateUi('Overview'), icon: ChartNoAxesColumn },
            { value: 'tabula', label: translateUi('Tabula'), icon: Table2 },
          ]}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={fade}>
          {tab === 'overview' && <Overview />}
          {tab === 'tabula' && <Tabula />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
