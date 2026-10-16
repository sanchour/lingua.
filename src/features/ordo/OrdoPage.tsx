import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { useLayout } from '@/design/hooks/useLayout';
import { AboutSection } from './sections/AboutSection';
import { AiSection } from './sections/AiSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { BackupSection } from './sections/BackupSection';
import { CardsSection } from './sections/CardsSection';
import { KeyboardSection } from './sections/KeyboardSection';
import { LanguageSection } from './sections/LanguageSection';
import { ListeningSection } from './sections/ListeningSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { ReadingSection } from './sections/ReadingSection';
import { StorageSection } from './sections/StorageSection';
import { StudySection } from './sections/StudySection';

const NAV = [
  ['appearance', 'Preferences'],
  ['reading', 'Reading'],
  ['study', 'Study'],
  ['cards', 'Flashcards'],
  ['listening', 'Listening'],
  ['language', 'Languages'],
  ['ai', 'AI & translation'],
  ['storage', 'Storage'],
  ['backup', 'Backup'],
  ['keyboard', 'Keyboard'],
  ['performance', 'Performance'],
  ['about', 'About'],
] as const;

export default function OrdoPage() {
  const { settings, language } = useApp();
  const { layout, pointer } = useLayout();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <>
      <PageHeader title="Ordo" />
      <div className={layout === 'wide' ? 'grid grid-cols-[180px_minmax(0,1fr)] gap-10' : ''}>
        {layout === 'wide' && (
          <nav aria-label="Settings sections" className="sticky top-12 self-start">
            <ul className="space-y-0.5">
              {NAV.filter(([id]) => id !== 'keyboard' || pointer === 'fine').map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="flex min-w-0 flex-col gap-5">
          <AppearanceSection theme={settings.theme} motion={settings.ui.motion} />
          <ReadingSection reader={settings.reader} lang={language.id} />
          <StudySection study={settings.study} speech={settings.speech} lang={language.id} />
          <CardsSection look={settings.cards} lang={language.id} />
          <ListeningSection audio={settings.audio} />
          <LanguageSection active={language} />
          <AiSection llm={settings.llm} apiKeys={settings.apiKeys} translation={settings.translation} />
          <StorageSection />
          <BackupSection meta={settings.meta} />
          {pointer === 'fine' && <KeyboardSection />}
          <PerformanceSection perfHud={settings.ui.perfHud} />
          <AboutSection />
        </div>
      </div>
    </>
  );
}
