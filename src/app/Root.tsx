import { lazy, Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MotionConfig } from 'motion/react';
import { AppContext } from '@/app/context';
import { useThemeController } from '@/app/theme';
import { applyFlavour } from '@/design/flavours';
import { UpdatePrompt } from '@/app/UpdatePrompt';
import { preloadSections } from '@/app/pages';
import { useActiveLanguage } from '@/data/languages';
import { ensureDeviceMeta, useSettings } from '@/data/settings';
import { Toaster } from '@/design/primitives';
import { getLanguage } from '@/core/lang/languages';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import { checkAllMilestones, onMilestone } from '@/data/journey';
import { installPack, packMissing } from '@/services/packs/packs';
import { toast } from '@/state/ui';
import { PackProgress } from './PackProgress';
import { AppShell } from './shells/AppShell';

const Onboarding = lazy(() => import('@/app/onboarding/Onboarding'));
const PerfHud = lazy(() => import('@/features/lab/PerfHud'));
const DesignNotes = lazy(() => import('@/features/lab/designNotes/DesignNotes'));

export function Root() {
  const settings = useSettings();
  const language = useActiveLanguage();
  useThemeController(settings?.theme, settings?.palette);

  // Motion preference: mirrored on <html data-motion> for CSS and imperative animations.
  const motionPref = settings?.ui.motion ?? 'system';
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = motionPref;
  }, [motionPref]);

  useEffect(() => {
    void ensureDeviceMeta();
  }, []);

  const onboarded = Boolean(settings?.meta.onboardedAt && language);

  // The studied language's touch in the design (5.1-4b), unless it's turned off.
  const flavourLang = onboarded && settings?.ui.flavour !== false ? language?.id : null;
  useLayoutEffect(() => applyFlavour(flavourLang), [flavourLang]);

  useEffect(() => {
    if (onboarded) return preloadSections();
  }, [onboarded]);

  // Paired devices sync whenever both are open (the sync code loads only when there's a pairing).
  useEffect(() => {
    if (onboarded) void import('@/services/sync/engine').then((m) => m.startAutoSync());
  }, [onboarded]);

  // The studied language's dictionary installs quietly in the background the first time.
  const activeLang = onboarded ? language?.id : undefined;
  useEffect(() => {
    if (!activeLang) return;
    void Promise.all([packMissing(activeLang), db.dictPacks.get(packId(activeLang))]).then(([missing, installed]) => {
      if (!missing) return;
      const name = getLanguage(activeLang)?.name ?? activeLang;
      // An update (better data, ready-made decks) happens quietly: the old dictionary keeps working
      // until the new one is stored, and a failed update simply tries again next time.
      if (installed) {
        installPack(activeLang)
          .then(() => toast(`The ${name} dictionary was updated.`, { tone: 'success' }))
          .catch(() => undefined);
        return;
      }
      installPack(activeLang)
        .then(() => toast(`${name} dictionary ready. Translations now work offline.`, { tone: 'success' }))
        .catch(() =>
          toast(`The ${name} dictionary couldn’t be installed.`, {
            tone: 'error',
            action: { label: 'Retry', onClick: () => void installPack(activeLang) },
          }),
        );
    });
  }, [activeLang]);

  // Milestones reached just now get a small celebration; old ones are found quietly for Iter.
  const navigate = useNavigate();
  useEffect(() => {
    if (!onboarded) return;
    const off = onMilestone((events) => {
      for (const e of events.slice(0, 2)) toast(`Milestone: ${e.title}`, { tone: 'success', action: { label: 'Journey', onClick: () => navigate('/ratio?tab=iter') } });
    });
    void checkAllMilestones().catch(() => {});
    return off;
  }, [onboarded, navigate]);

  const context = useMemo(() => (settings && language ? { settings, language } : null), [settings, language]);

  // First IndexedDB read takes a few ms; the themed background is already painted by index.html.
  if (!settings || language === undefined) return null;

  return (
    <MotionConfig reducedMotion={motionPref === 'reduced' ? 'always' : motionPref === 'full' ? 'never' : 'user'}>
      {context && onboarded ? (
        <AppContext.Provider value={context}>
          <AppShell />
        </AppContext.Provider>
      ) : (
        <Suspense fallback={null}>
          <Onboarding canCancel={language !== null} />
        </Suspense>
      )}
      <Toaster />
      <PackProgress />
      <UpdatePrompt />
      {settings.ui.perfHud && (
        <Suspense fallback={null}>
          <PerfHud />
        </Suspense>
      )}
      {settings.ui.designNotes && (
        <Suspense fallback={null}>
          <DesignNotes />
        </Suspense>
      )}
    </MotionConfig>
  );
}
