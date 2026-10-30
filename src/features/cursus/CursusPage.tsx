import { interpolate } from '@/core/i18n/messages';
import { useUi } from '@/design/i18n/UiText';
import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router';
import { AudioLines, BookA, Keyboard, Languages, Route } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { InRoom } from '@/app/room';
import { RoomTabs } from '@/app/RoomTabs';
import type { RoomTab } from '@/app/RoomTabs';
import { getLanguage } from '@/core/lang/languages';
import { hasScript } from '@/core/script/load';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import GrammaticaPage from '@/features/grammatica/GrammaticaPage';
import LettersPage from '@/features/grammatica/letters/LettersPage';
import { PlusChip, RequirePlan } from '@/features/plans/Locked';
import { usePlan } from '@/features/plans/usePlan';
import { can } from '@/data/plan';
import type { Feature, PlanKind } from '@/data/plan';
import { CourseTab } from './course/CourseTab';
import { SoundsTab } from './sounds/SoundsTab';
import { TypingTab } from './TypingTab';

type Tab = Exclude<Settings['ui']['cursusTab'], ''>;

/** The tabs a language has: the course and typing for the six core languages, alphabets where there is a script to learn. */
export function cursusTabs(lang: string, plan: PlanKind = 'max'): Array<RoomTab<Tab>> {
  const core = getLanguage(lang)?.tier === 1;
  const chip = (feature: Feature) => (can(feature, plan) ? undefined : <PlusChip feature={feature} />);
  const tabs: Array<RoomTab<Tab> | false> = [
    core && { id: 'course', label: 'Course', to: '/cursus/course', icon: Route, badge: chip('course') },
    { id: 'grammatica', label: 'Grammatica', to: '/cursus/grammatica', icon: BookA, badge: chip('grammatica') },
    core && { id: 'sounds', label: 'Sounds', to: '/cursus/sounds', icon: AudioLines },
    hasScript(lang) && { id: 'alphabets', label: 'Alphabets', to: '/cursus/alphabets', icon: Languages },
    core && { id: 'typing', label: 'Typing', to: '/cursus/typing', icon: Keyboard, badge: chip('typing') },
  ];
  return tabs.filter((t): t is RoomTab<Tab> => Boolean(t));
}

/**
 * Cursus (Lingua 5.1-1), the room for learning the language step by step: the course, Grammatica,
 * the alphabet and typing. It opens on the tab used last.
 */
export default function CursusPage() {
  const translateUi = useUi();
  const { language, settings } = useApp();
  const lang = language.id;
  const asked = useParams().tab;
  const plan = usePlan();
  const tabs = cursusTabs(lang, plan);
  const tab = tabs.find((t) => t.id === asked)?.id;
  const remembered = settings.ui.cursusTab;

  useEffect(() => {
    if (tab && tab !== remembered) void patchSetting('ui', { cursusTab: tab });
  }, [tab, remembered]);

  if (!tab) {
    const to = tabs.find((t) => t.id === remembered) ?? tabs[0];
    return <Navigate to={to.to} replace />;
  }
  const name = getLanguage(lang)?.name ?? lang;

  return (
    <>
      <PageHeader title={translateUi('Cursus')} englishTitle={'Cursus'} eyebrow={translateUi('Learn {0} step by step', [translateUi(name)])} englishEyebrow={interpolate('Learn {0} step by step', [name])} />
      <RoomTabs label={translateUi('Cursus')} tabs={tabs} active={tab} />
      <InRoom.Provider value>
        {tab === 'course' && (
          <RequirePlan feature="course">
            <CourseTab />
          </RequirePlan>
        )}
        {tab === 'grammatica' && (
          <RequirePlan feature="grammatica">
            <GrammaticaPage />
          </RequirePlan>
        )}
        {tab === 'alphabets' && <LettersPage />}
        {tab === 'sounds' && <SoundsTab />}
        {tab === 'typing' && (
          <RequirePlan feature="typing">
            <TypingTab />
          </RequirePlan>
        )}
      </InRoom.Provider>
    </>
  );
}
