import { Navigate, useParams } from 'react-router';
import { Feather, Earth, MessagesSquare } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { InRoom } from '@/app/room';
import { RoomTabs } from '@/app/RoomTabs';
import type { RoomTab } from '@/app/RoomTabs';
import { getLanguage } from '@/core/lang/languages';
import { DiariumHome, NewEntryButton } from '@/features/codex/diarium/DiariumHome';
import ColloquiumPage from '@/features/colloquium/ColloquiumPage';
import MundusPage from '@/features/mundus/MundusPage';
import { PlusChip, RequirePlan } from '@/features/plans/Locked';
import { useCan } from '@/features/plans/usePlan';
import { TodayRail } from './TodayRail';

type Tab = 'mundus' | 'sermo' | 'diarium';
const TABS: Array<RoomTab<Tab>> = [
  { id: 'mundus', label: 'Mundus', to: '/mentis', icon: Earth },
  { id: 'sermo', label: 'Sermo', to: '/mentis/sermo', icon: MessagesSquare },
  { id: 'diarium', label: 'Diarium', to: '/mentis/diarium', icon: Feather },
];
const MUNDUS_TABS = new Set(['', 'try', 'culture']);

/**
 * Mentis (Lingua 5.1-1), the room for thinking in the language: Mundus the guide, Sermo for talking
 * and Diarium for writing, with today's prompt beside every tab so the three lead into each other.
 */
export default function MentisPage() {
  const { language } = useApp();
  const sermoOpen = useCan('sermo');
  const sub = (useParams()['*'] ?? '').replace(/\/+$/, '');
  const tab: Tab | null = MUNDUS_TABS.has(sub) ? 'mundus' : sub === 'sermo' || sub === 'diarium' ? sub : null;
  if (!tab) return <Navigate to="/mentis" replace />;
  const name = getLanguage(language.id)?.name ?? language.id;
  const tabs = sermoOpen ? TABS : TABS.map((t) => (t.id === 'sermo' ? { ...t, badge: <PlusChip feature="sermo" /> } : t));

  return (
    <>
      <PageHeader title="Mentis" eyebrow={`Think, talk and write in ${name}`} actions={tab === 'diarium' ? <NewEntryButton /> : undefined} />
      <RoomTabs label="Mentis" tabs={tabs} active={tab} />
      <div className={sub === 'culture' ? '' : 'grid gap-10 lg:grid-cols-[minmax(0,1fr)_288px]'}>
        <div className="min-w-0">
          <InRoom.Provider value>
            {tab === 'mundus' && <MundusPage />}
            {tab === 'sermo' && (
              <RequirePlan feature="sermo">
                <ColloquiumPage />
              </RequirePlan>
            )}
            {tab === 'diarium' && <DiariumHome />}
          </InRoom.Provider>
        </div>
        {sub !== 'culture' && <TodayRail inDiarium={tab === 'diarium'} />}
      </div>
    </>
  );
}
