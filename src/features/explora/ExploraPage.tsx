import { interpolate } from '@/core/i18n/messages';
import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Compass, Layers, Library } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { RoomTabs } from '@/app/RoomTabs';
import type { RoomTab } from '@/app/RoomTabs';
import { getLanguage } from '@/core/lang/languages';
import { starterKey } from '@/data/starter';
import { buttonClasses, SearchInput } from '@/design/primitives';
import { spring } from '@/design/motion';
import { DiscoverTab } from '@/features/codex/discover/DiscoverTab';
import { ExploreAll } from '@/features/explora/ExploreAll';
import { useGuide } from '@/features/mundus/useGuide';
import { StarterLibrary } from '@/features/thesaurus/library/StarterLibrary';

type Tab = 'all' | 'read' | 'words';

const TABS: Array<RoomTab<Tab>> = [
  { id: 'all', label: 'Explore', to: '/explora', icon: Compass },
  { id: 'read', label: 'Free reading', short: 'Read', to: '/explora?tab=read', icon: BookOpen },
  { id: 'words', label: 'Word decks', short: 'Decks', to: '/explora?tab=words', icon: Layers },
];

/**
 * Explora: the discovery room where you find new books, articles, podcasts, audiobooks, series,
 * films, radio stations and vocabulary decks for your active language and add them to the right tool.
 */
export default function ExploraPage() {
  const translateUi = useUi();
  const { language, settings } = useApp();
  const lang = language.id;
  const langName = getLanguage(lang)?.name ?? lang;
  const guide = useGuide();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = requested === 'read' || requested === 'words' ? requested : 'all';
  const [deckQuery, setDeckQuery] = useState('');

  return (
    <>
      <PageHeader
        title={translateUi('Explora')} englishTitle={'Explora'}
        eyebrow={translateUi('Discover content for your {0} tools · {1}', [translateUi(langName), language.level])} englishEyebrow={interpolate('Discover content for your {0} tools · {1}', [langName, language.level])}
        actions={
          <Link to="/bibliotheca" className={buttonClasses('secondary', 'md')}><UiText source={'{0} Bibliotheca'} values={[<Library size={17} aria-hidden />]} /></Link>
        }
      />

      <RoomTabs
        label={translateUi('Explora sections')}
        tabs={TABS}
        active={tab}
        end={
          tab === 'words' ? (
            <SearchInput
              value={deckQuery}
              onChange={setDeckQuery}
              placeholder={translateUi('Search ready-made decks')}
              onClose={() => setDeckQuery('')}
              className="h-10! w-64"
            />
          ) : undefined
        }
      />

      {guide === undefined ? (
        <div className="h-96" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.snappy}>
            {tab === 'all' && <ExploreAll lang={lang} picks={guide.picks} level={language.level} />}
            {tab === 'read' && <DiscoverTab lang={lang} />}
            {tab === 'words' && (
              <StarterLibrary
                lang={lang}
                query={deckQuery}
                sort={settings.ui.discoverSort}
                group={settings.ui.discoverGroup}
                onOpen={(spec) => navigate('/thesaurus/ready/' + starterKey(spec))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
