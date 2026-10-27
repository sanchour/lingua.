import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Compass, Layers, Library, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { RoomTabs } from '@/app/RoomTabs';
import type { RoomTab } from '@/app/RoomTabs';
import { getLanguage } from '@/core/lang/languages';
import { starterKey } from '@/data/starter';
import { buttonClasses, SearchInput } from '@/design/primitives';
import { spring } from '@/design/motion';
import { DiscoverTab } from '@/features/codex/discover/DiscoverTab';
import { ExploreView } from '@/features/mundus/ExploreView';
import { NoPicks, PicksView } from '@/features/mundus/PicksView';
import { useGuide } from '@/features/mundus/useGuide';
import { StarterLibrary } from '@/features/thesaurus/library/StarterLibrary';

type Tab = 'all' | 'read' | 'picks' | 'words';

const TABS: Array<RoomTab<Tab>> = [
  { id: 'all', label: 'For you', to: '/explora', icon: Compass },
  { id: 'read', label: 'Free reading', short: 'Read', to: '/explora?tab=read', icon: BookOpen },
  { id: 'picks', label: 'Curated picks', short: 'Picks', to: '/explora?tab=picks', icon: Sparkles },
  { id: 'words', label: 'Word decks', short: 'Decks', to: '/explora?tab=words', icon: Layers },
];

/**
 * Explora: the discovery room where you find new books, articles, podcasts, audiobooks, series,
 * films, radio stations and vocabulary decks for your active language and add them to the right tool.
 */
export default function ExploraPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const langName = getLanguage(lang)?.name ?? lang;
  const guide = useGuide();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = requested === 'read' || requested === 'picks' || requested === 'words' ? requested : 'all';
  const [deckQuery, setDeckQuery] = useState('');

  return (
    <>
      <PageHeader
        title="Explora"
        eyebrow={`Discover content for your ${langName} tools · ${language.level}`}
        actions={
          <Link to="/bibliotheca" className={buttonClasses('secondary', 'md')}>
            <Library size={17} aria-hidden /> Bibliotheca
          </Link>
        }
      />

      <RoomTabs
        label="Explora sections"
        tabs={TABS}
        active={tab}
        end={
          tab === 'words' ? (
            <SearchInput
              value={deckQuery}
              onChange={setDeckQuery}
              placeholder="Search ready-made decks"
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
            {tab === 'all' && <ExploreView lang={lang} picks={guide.picks} level={language.level} />}
            {tab === 'read' && <DiscoverTab lang={lang} />}
            {tab === 'picks' && (guide.picks ? <PicksView lang={lang} picks={guide.picks} level={language.level} /> : <NoPicks lang={lang} />)}
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
