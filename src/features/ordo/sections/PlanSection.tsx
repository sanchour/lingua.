import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ClipboardCopy, ExternalLink, Gem, KeyRound } from 'lucide-react';
import { migratePlan, planOf } from '@/data/plan';
import type { PlanKind } from '@/data/plan';
import type { Settings } from '@/data/settings';
import { Button, buttonClasses } from '@/design/primitives';
import { PlanCards } from '@/features/plans/PlanCards';
import { MaxMark } from '@/features/plans/PlanMarks';
import { STORE, TEST_MODE } from '@/services/licence/config';
import { claimCheckout, LicenceError, restoreLicence } from '@/services/licence/store';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

const NAME: Record<PlanKind, string> = { free: 'Free', plus: 'Lingua+', max: 'Lingua+ Max' };
const day = (ms: number) => new Date(ms).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });

/** Checkouts already being claimed, so a remount doesn't claim one twice. */
const claiming = new Set<string>();

/**
 * Stripe sends the learner back to Settings › Lingua+ with `?checkout=<id>` after paying; the
 * licence server turns that into a licence. The address is tidied once it worked.
 */
function useCheckoutReturn() {
  const [params, setParams] = useSearchParams();
  const session = params.get('checkout');
  useEffect(() => {
    if (!session || claiming.has(session)) return;
    claiming.add(session);
    const claim = () =>
      claimCheckout(session).then(
        (kind) => {
          toast(`${NAME[kind]} is yours. Thank you.`, { tone: 'success' });
          const next = new URLSearchParams(params);
          next.delete('checkout');
          setParams(next, { replace: true });
        },
        (error: unknown) =>
          toast(error instanceof LicenceError ? error.message : 'The purchase couldn’t be confirmed yet.', { tone: 'error', duration: 12000, action: { label: 'Try again', onClick: () => void claim() } }),
      );
    void claim();
  }, [session, params, setParams]);
}

/** Your plan in a sentence: since when, and for Max until when. */
function status(meta: Settings['meta'], plan: PlanKind): string {
  const state = migratePlan(meta);
  if (state.pretend) return `Test mode: Lingua acts as ${NAME[state.pretend]} on this device (Settings › Lab). Nothing was charged.`;
  if (plan === 'max' && state.max) {
    const renews = state.max.interval === 'year' ? 'yearly' : 'monthly';
    return state.max.until > Date.now()
      ? `Since ${day(state.max.since)}. Paid until ${day(state.max.until)}; it renews ${renews} until you cancel.`
      : `Paid until ${day(state.max.until)}. Lingua checks for the renewal when it’s online; Max stays on meanwhile.`;
  }
  if (plan === 'plus' && state.plus) return `Yours since ${day(state.plus.since)}, for life, with every update.`;
  return 'Codex, Thesaurus, your library, audiobooks, the radio, Mundus and Diarium, for good.';
}

/** Settings › Lingua+ (5.1-2a): your plan, Max's renewal and its Stripe page, the licence to copy or restore, and the plans. */
export function PlanSection({ meta }: { meta: Settings['meta'] }) {
  const translateUi = useUi();
  const plan = planOf(meta);
  const state = migratePlan(meta);
  const licence = state.max?.licence ?? state.plus?.licence;
  useCheckoutReturn();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(licence!);
      toast('Licence copied. On another device, paste it under Restore with a licence key.', { tone: 'success' });
    } catch {
      toast('Copying didn’t work here.', { tone: 'error' });
    }
  };

  return (
    <SettingsSection id="plus" icon={Gem} title="Lingua+" description={translateUi('Your plan, and the way to change it. Everything free stays free.')}>
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-accent-soft/50 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2.5 font-serif text-[22px] leading-tight font-semibold">
            {plan === 'max' ? (
              <>
                Lingua<span className="-ml-2.5 text-accent-text">+</span> <MaxMark />
              </>
            ) : plan === 'plus' ? (
              <span>
                Lingua<span className="text-accent-text">+</span>
              </span>
            ) : (
              translateUi('Free')
            )}
          </p>
          <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{status(meta, plan)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {licence && (
            <Button variant="secondary" icon={ClipboardCopy} onClick={() => void copy()}><UiText source={'Copy licence'} /></Button>
          )}
          {state.max && STORE.portal && (
            <a href={STORE.portal} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'md')}><UiText source={'Manage subscription {0}'} values={[<ExternalLink size={15} aria-hidden />]} /></a>
          )}
        </div>
      </div>
      {plan === 'max' && !STORE.portal && (
        <p className="mt-2 text-[12.5px] text-ink-faint"><UiText source={'Manage subscription opens Stripe’s page (change, cancel, invoices) once purchases are open.'} /></p>
      )}

      <div className="mt-6">
        <PlanCards current={plan} />
      </div>

      <Restore />
    </SettingsSection>
  );
}

/** A licence from the purchase email or another device. */
function Restore() {
  const translateUi = useUi();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    setBusy(true);
    try {
      const kind = await restoreLicence(text.trim());
      setText('');
      toast(`${NAME[kind]} is restored on this device.`, { tone: 'success' });
    } catch (error) {
      toast(error instanceof LicenceError ? error.message : 'That licence couldn’t be read.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-8">
      <label htmlFor="licence" className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase"><UiText source={'Restore with a licence key'} /></label>
      <div className="flex gap-2">
        <input
          id="licence"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && text.trim() && void restore()}
          autoComplete="off"
          spellCheck={false}
          placeholder={translateUi('Paste the licence from your purchase email or another device')}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-raised px-3.5 font-mono text-[14px] transition-colors hover:border-line-strong"
        />
        <Button variant="secondary" icon={KeyRound} onClick={() => void restore()} loading={busy} disabled={!text.trim()}><UiText source={'Restore'} /></Button>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-faint">
        {TEST_MODE ? translateUi('Test mode: purchases aren’t open yet, so there are no licences to restore.') : translateUi('The licence is checked on this device, offline too. For another of your devices, copy it there.')}
      </p>
    </div>
  );
}
