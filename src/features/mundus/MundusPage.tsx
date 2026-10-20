import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { usePicks } from './hooks';
import { NoPicks, PicksView } from './PicksView';
import { TipsView } from './TipsView';

type Tab = 'picks' | 'beyond';

/**
 * Mundus (Lingua 3.0-7): the world of the language beyond Lingua. Picks: series, films, books,
 * music, podcasts, YouTube, games and dictionaries chosen by hand, each opening where it lives.
 * Beyond the app: small challenges that take the language into the day.
 */
export default function MundusPage() {
  const { language } = useApp();
  const lang = language.id;
  const info = getLanguage(lang);
  const picks = usePicks(lang);
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'beyond' ? 'beyond' : 'picks';
  const setTab = (next: Tab) => {
    setParams(next === 'picks' ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <PageHeader title="Mundus" eyebrow={`The world in ${info?.name ?? lang}`} />
      <div className="mb-7">
        <Segmented<Tab>
          block
          label="Mundus sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'picks', label: 'Picks' },
            { value: 'beyond', label: 'Beyond the app' },
          ]}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={tab} aria-label={tab === 'picks' ? 'Picks' : 'Beyond the app'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.snappy}>
          {tab === 'beyond' ? (
            <TipsView lang={lang} />
          ) : picks === undefined ? (
            <div className="h-64" />
          ) : picks ? (
            <PicksView lang={lang} picks={picks} level={language.level} />
          ) : (
            <NoPicks lang={lang} />
          )}
        </motion.section>
      </AnimatePresence>
    </>
  );
}
