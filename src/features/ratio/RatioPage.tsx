import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChartNoAxesColumn, Route, Table2 } from 'lucide-react';
import { PageHeader } from '@/app/PageHeader';
import { Segmented } from '@/design/primitives';
import { fade } from '@/design/motion';
import { Iter } from './iter/Iter';
import { Overview } from './Overview';
import { Tabula } from './tabula/Tabula';

type Tab = 'overview' | 'tabula' | 'iter';

/** Ratio: honest numbers (Overview), every language you speak (Tabula), and the road so far (Iter). */
export default function RatioPage() {
  const [params, setParams] = useSearchParams();
  const picked = params.get('tab');
  const tab: Tab = picked === 'tabula' || picked === 'iter' ? picked : 'overview';
  return (
    <>
      <PageHeader title="Ratio" />
      <div className="-mt-2 mb-7">
        <Segmented<Tab>
          label="Ratio"
          value={tab}
          onChange={(next) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true })}
          options={[
            { value: 'overview', label: 'Overview', icon: ChartNoAxesColumn },
            { value: 'tabula', label: 'Tabula', icon: Table2 },
            { value: 'iter', label: 'Iter', icon: Route },
          ]}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={fade}>
          {tab === 'overview' && <Overview />}
          {tab === 'tabula' && <Tabula />}
          {tab === 'iter' && <Iter />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
