import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Wordmark } from '@/app/shells/Wordmark';
import { getLanguage, LANGUAGES } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { completeOnboarding } from '@/data/languages';
import { patchSetting, setSetting, useSettings } from '@/data/settings';
import type { ThemePref } from '@/data/settings';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Button } from '@/design/primitives';
import { spring } from '@/design/motion';
import { requestPersistence } from '@/services/storage/persist';
import { toast } from '@/state/ui';
import { cx } from '@/lib/cx';
import { AestheticStep } from './AestheticStep';
import { LanguageStep } from './LanguageStep';
import { LevelStep } from './LevelStep';

const STEPS = ['Language', 'Level', 'Aesthetic'] as const;

function guessNative(): string {
  const code = (navigator.language || 'en').split('-')[0].toLowerCase();
  return getLanguage(code) ? code : 'en';
}

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48 }),
};

/**
 * First-run setup, also reused to start another language.
 * `canCancel` is true when a language already exists (adding a second one).
 */
export default function Onboarding({ canCancel = false }: { canCancel?: boolean }) {
  const navigate = useNavigate();
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [target, setTarget] = useState<string | null>(null);
  const [native, setNative] = useState(guessNative);
  const [level, setLevel] = useState<Level>('A0');
  const [seedKnown, setSeedKnown] = useState(true);
  const [busy, setBusy] = useState(false);
  const theme: ThemePref = settings?.theme ?? 'paper';

  const canContinue = step !== 0 || (target !== null && target !== native);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const finish = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await completeOnboarding({ target, native, level, seedKnown, theme });
      void requestPersistence();
      navigate('/', { replace: true });
      toast(canCancel ? `Now studying ${getLanguage(target)?.name ?? target}.` : 'Welcome to Lingua. Happy reading!', { tone: 'success' });
    } catch {
      setBusy(false);
      toast('Could not save your choices. Please try again.', { tone: 'error' });
    }
  };

  const next = () => {
    if (!canContinue || busy) return;
    if (step < STEPS.length - 1) go(step + 1);
    else void finish();
  };

  const cancel = () => void patchSetting('meta', { onboardedAt: Date.now() });
  useHotkeys({ escape: cancel }, canCancel);

  return (
    <div className="flex min-h-dvh flex-col pt-safe pb-safe">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-6 pt-6">
        <Wordmark />
        {canCancel && (
          <Button variant="ghost" size="sm" onClick={cancel} className="mr-auto">
            Cancel
          </Button>
        )}
        <ol className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((name, i) => (
            <motion.li
              key={name}
              layout
              aria-current={i === step ? 'step' : undefined}
              className={cx('h-2 rounded-full', i === step ? 'w-6 bg-accent' : i < step ? 'w-2 bg-sage' : 'w-2 bg-line-strong')}
              transition={spring.snappy}
            />
          ))}
        </ol>
      </header>

      <main className="flex flex-1 justify-center px-5 py-8 sm:items-center">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.section key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={spring.gentle}>
              {step === 0 && <LanguageStep target={target} native={native} onTarget={setTarget} onNative={setNative} />}
              {step === 1 && <LevelStep level={level} seedKnown={seedKnown} onLevel={setLevel} onSeedKnown={setSeedKnown} />}
              {step === 2 && target && (
                <AestheticStep
                  pref={theme}
                  sample={getLanguage(target)?.sample ?? LANGUAGES[0].sample}
                  lang={target}
                  onChange={(pref) => void setSetting('theme', pref)}
                />
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>

      <footer className="sticky bottom-0 bg-gradient-to-t from-bg via-bg/95 to-bg/0 px-5 pt-6 pb-5">
        <div className="mx-auto flex max-w-2xl gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => go(step - 1)} disabled={busy}>
              Back
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={next} disabled={!canContinue} loading={busy} iconRight={ArrowRight}>
            {step === STEPS.length - 1 ? 'Begin' : 'Continue'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
