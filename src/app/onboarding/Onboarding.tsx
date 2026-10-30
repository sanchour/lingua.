import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Wordmark } from '@/app/shells/Wordmark';
import { getLanguage, LANGUAGES } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { codeForLanguage } from '@/core/parsers/notion';
import { completeOnboarding, useActiveLanguage } from '@/data/languages';
import { useDevLab } from '@/features/lab/devLab';
import { planOf } from '@/data/plan';
import { patchSetting, useSettings } from '@/data/settings';
import type { LearningReason, ThemePref } from '@/data/settings';
import type { CefrLevel } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Button } from '@/design/primitives';
import { spring } from '@/design/motion';
import { PlanPitch } from '@/features/plans/PlanPitch';
import { requestPersistence } from '@/services/storage/persist';
import { toast } from '@/state/ui';
import { cx } from '@/lib/cx';
import { AestheticStep } from './AestheticStep';
import { enjoymentsFor } from './EnjoyStep';
import { defaultGoal, GoalStep } from './GoalStep';
import { AboutPage, NamePage, WelcomePage } from './IntroPages';
import { LanguageStep } from './LanguageStep';
import { LevelStep } from './LevelStep';
import { FIRST } from './pages';
import type { Page } from './pages';
import { SpeakStep, spokenName } from './SpeakStep';
import type { Spoken } from './SpeakStep';
import { WhyStep } from './WhyStep';

/**
 * The first start (5.1-2b): your name, a welcome and what Lingua does, then seven steps that build up
 * to the plans. Adding another language: its language, level and goal.
 */
const ANOTHER: Page[] = ['language', 'level', 'goal'];
const INTRO = new Set<Page>(['name', 'welcome', 'about']);
const ORDER: CefrLevel[] = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** The device's language, as a code Lingua knows when it can (Norwegian is nb). */
function deviceLanguage(): string {
  const code = (navigator.language || 'en').split('-')[0].toLowerCase();
  return code === 'no' ? 'nb' : code;
}

/** The language translations are given in: the first native language Lingua can gloss in, else English. */
function nativeOf(spoken: Spoken[], target: string | null): string {
  const native = spoken.find((s) => s.level === 'native' && s.code !== target && getLanguage(s.code) && !getLanguage(s.code)?.soon);
  return native?.code ?? 'en';
}

const turn = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48, rotateY: dir * -6 }),
  center: { opacity: 1, x: 0, rotateY: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, rotateY: dir * 6 }),
};

/**
 * First-run setup, also reused to start another language.
 * `canCancel` is true when a language already exists (adding a second one). `replay` is the Device lab's replay of
 * the first start (7-0d) from that page: the language already chosen, and nothing saved at the end.
 */
export default function Onboarding({ canCancel = false, replay }: { canCancel?: boolean; replay?: number }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const settings = useSettings();
  const active = useActiveLanguage();
  const replaying = replay !== undefined;
  const pages = canCancel && !replaying ? ANOTHER : FIRST;
  const [index, setIndex] = useState(replay ?? 0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(replaying ? (active?.id ?? null) : null);
  const [level, setLevel] = useState<Level>('A0');
  const [seedKnown, setSeedKnown] = useState(true);
  const [spoken, setSpoken] = useState<Spoken[]>(() => [{ code: deviceLanguage(), level: 'native' }]);
  const [reasons, setReasons] = useState<LearningReason[] | null>(null);
  const [goal, setGoal] = useState<CefrLevel | null>(null);
  const [minutes, setMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const page = pages[index];
  const steps = pages.filter((p) => !INTRO.has(p));
  const theme: ThemePref = settings?.theme ?? 'system';
  // Adding another language starts from what was chosen the first time.
  const nameNow = name ?? settings?.learner.name ?? '';
  const reasonsNow = reasons ?? settings?.learner.reasons ?? [];
  const enjoysNow = settings?.learner.enjoys?.length ? settings.learner.enjoys : enjoymentsFor(reasonsNow);
  // A goal at or below the level chosen since moves up with it.
  const goalNow = goal && ORDER.indexOf(goal) > ORDER.indexOf(level) ? goal : defaultGoal(level);
  const languageName = getLanguage(target ?? '')?.name ?? 'this language';

  const canContinue = page !== 'language' || target !== null;

  const go = (next: number) => {
    setDir(next > index ? 1 : -1);
    setIndex(next);
    window.scrollTo({ top: 0 });
  };

  const leaveReplay = () => void useDevLab.getState().endReplay();

  const finish = async () => {
    if (!target || busy) return;
    if (replaying) {
      leaveReplay();
      toast('The replay is over. Nothing was saved, and your light is as it was.');
      return;
    }
    setBusy(true);
    try {
      await completeOnboarding({
        target,
        // Adding another language skips "You speak": the device's language, as before 5.1-2b.
        native: nativeOf(spoken, target),
        level,
        seedKnown,
        theme,
        minutes,
        goal: goalNow,
        learner: { reasons: reasonsNow, enjoys: enjoysNow, name: nameNow.trim() || undefined },
        spoken: canCancel
          ? undefined
          : spoken.map((s) => ({ id: getLanguage(s.code) ? s.code : codeForLanguage(spokenName(s.code)), name: spokenName(s.code), level: s.level === 'native' ? 'C2' : s.level, native: s.level === 'native' })),
      });
      void requestPersistence();
      navigate('/', { replace: true });
      toast(canCancel ? `Now studying ${getLanguage(target)?.name ?? target}.` : `Welcome to Lingua${nameNow.trim() ? `, ${nameNow.trim()}` : ''}. Happy reading!`, { tone: 'success' });
    } catch {
      setBusy(false);
      toast('Could not save your choices. Please try again.', { tone: 'error' });
    }
  };

  const next = () => {
    if (!canContinue || busy) return;
    if (index < pages.length - 1) go(index + 1);
    else void finish();
  };

  const cancel = () => (replaying ? leaveReplay() : void patchSetting('meta', { onboardedAt: Date.now() }));
  useHotkeys({ escape: cancel }, canCancel || replaying);

  const width = page === 'language' ? 'max-w-7xl' : page === 'about' || page === 'light' || page === 'plans' ? 'max-w-6xl' : 'max-w-3xl';
  const label =
    page === 'name'
      ? nameNow.trim()
        ? 'Continue'
        : 'Skip for now'
      : page === 'welcome'
        ? 'Show me around'
        : page === 'about'
          ? 'Choose a language'
          : page === 'language' && target
            ? `Continue with ${getLanguage(target)?.endonym ?? target}`
            : index === pages.length - 1
              ? 'Begin'
              : 'Continue';

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header className={cx('mx-auto flex w-full items-center justify-between gap-4 px-8 pt-6', width)}>
        <Wordmark />
        {replaying ? (
          <Button variant="secondary" size="sm" onClick={cancel} className="mr-auto"><UiText source={'Leave the replay {0}'} values={[<kbd className="ml-1 font-sans text-[11px] opacity-60"><UiText source={'Esc'} /></kbd>]} /></Button>
        ) : (
          canCancel && (
            <Button variant="ghost" size="sm" onClick={cancel} className="mr-auto"><UiText source={'Cancel'} /></Button>
          )
        )}
        {!INTRO.has(page) && (
          <ol className="flex items-center gap-1.5" aria-label={translateUi('Step {0} of {1}', [steps.indexOf(page) + 1, steps.length])}>
            {steps.map((step) => {
              const i = steps.indexOf(step);
              const at = steps.indexOf(page);
              return (
                <motion.li
                  key={step}
                  layout
                  aria-current={i === at ? 'step' : undefined}
                  className={cx('h-2 rounded-full', i === at ? 'w-6 bg-accent' : i < at ? 'w-2 bg-sage' : 'w-2 bg-line-strong')}
                  transition={spring.snappy}
                />
              );
            })}
          </ol>
        )}
      </header>

      <main className={cx('flex flex-1 justify-center px-8', page === 'language' ? 'pt-1 pb-2' : page === 'plans' ? 'items-center py-3' : 'items-center py-8')} style={{ perspective: 1600 }}>
        <div className={cx('w-full', width)}>
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.section key={page} custom={dir} variants={turn} initial="enter" animate="center" exit="exit" transition={spring.gentle}>
              {page === 'name' && <NamePage name={nameNow} onName={setName} onEnter={next} />}
              {page === 'welcome' && <WelcomePage name={nameNow} />}
              {page === 'about' && <AboutPage />}
              {page === 'language' && <LanguageStep target={target} onTarget={setTarget} />}
              {page === 'level' && target && <LevelStep lang={target} level={level} seedKnown={seedKnown} onLevel={setLevel} onSeedKnown={setSeedKnown} />}
              {page === 'speak' && <SpeakStep spoken={spoken} target={target} onSpoken={setSpoken} />}
              {page === 'why' && <WhyStep language={languageName} reasons={reasonsNow} onReasons={setReasons} />}
              {page === 'goal' && <GoalStep level={level} goal={goalNow} minutes={minutes} onGoal={setGoal} onMinutes={setMinutes} />}
              {page === 'light' && settings && <AestheticStep pref={theme} palette={settings.palette} sample={getLanguage(target ?? 'en')?.sample || LANGUAGES[0].sample} lang={target ?? 'en'} />}
              {page === 'plans' && settings && <PlanPitch current={planOf(settings.meta)} onFree={() => void finish()} replay={replaying} />}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>

      <footer className="sticky bottom-0 bg-gradient-to-t from-bg via-bg/95 to-bg/0 px-8 pt-3 pb-4">
        <div className={cx('mx-auto flex gap-3', width, INTRO.has(page) && 'max-w-md')}>
          {index > 0 && (
            <Button variant="secondary" size="lg" onClick={() => go(index - 1)} disabled={busy}><UiText source={'Back'} /></Button>
          )}
          <Button size="lg" className="flex-1" onClick={next} disabled={!canContinue} loading={busy} iconRight={ArrowRight}>
            {label}
          </Button>
        </div>
      </footer>
    </div>
  );
}
