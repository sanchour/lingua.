import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Eraser, RotateCcw, TriangleAlert } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { eraseEverything, resetLanguageProgress } from '@/data/reset';
import type { LanguageProfile } from '@/data/types';
import { Button, Dialog } from '@/design/primitives';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

type Kind = 'language' | 'everything';

const WORD: Record<Kind, string> = { language: 'reset', everything: 'erase' };

/** Starting over, on purpose: a typed word guards against a slip of the finger. */
export function ResetSection({ language }: { language: LanguageProfile }) {
  const translateUi = useUi();
  const [open, setOpen] = useState<Kind | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const name = getLanguage(language.id)?.name ?? language.id;
  const close = () => {
    if (busy) return;
    setOpen(null);
    setTyped('');
  };

  const run = async () => {
    if (!open || typed.trim().toLowerCase() !== WORD[open]) return;
    setBusy(true);
    try {
      if (open === 'everything') {
        await eraseEverything();
        return;
      }
      const counts = await resetLanguageProgress(language.id);
      toast({ source: '{0} starts fresh: {1} words and {2} cards cleared.', values: [String(name), String(counts.words.toLocaleString()), String(counts.cards.toLocaleString())] }, { tone: 'success' });
      setOpen(null);
      setTyped('');
    } catch {
      toast('Something went wrong; nothing was changed.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection id="reset" icon={RotateCcw} title={translateUi('Reset')} description={translateUi('Start over with one language, or erase everything Lingua stored on this device.')}>
      <div className="space-y-3">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-semibold"><UiText source={'Reset {0} progress'} values={[name]} /></p>
            <p className="text-[13px] text-ink-soft"><UiText source={'Word states, decks and reviews, reading positions, statistics, milestones and goals. Books, audio and journal entries stay.'} /></p>
          </div>
          <Button variant="danger" icon={RotateCcw} onClick={() => setOpen('language')}><UiText source={'Reset {0}'} values={[name]} /></Button>
        </div>
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-accent/30 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-semibold"><UiText source={'Erase everything'} /></p>
            <p className="text-[13px] text-ink-soft"><UiText source={'All languages, books, audio, decks, settings and keys on this device. Lingua opens like new.'} /></p>
          </div>
          <Button variant="danger" icon={Eraser} onClick={() => setOpen('everything')}><UiText source={'Erase all data'} /></Button>
        </div>
        <p className="text-[13px] text-ink-faint"><UiText source={'Tip: make a backup first (just above), so you can bring things back.{0}{1}'} values={[' ', <a href="#backup" className="font-semibold text-ink-soft underline-offset-2 hover:underline"><UiText source={'Go to Backup'} /></a>]} /></p>
      </div>

      <Dialog
        open={open !== null}
        onClose={close}
        title={open === 'everything' ? translateUi('Erase everything?') : translateUi('Reset {0}?', [name])}
        actions={
          <>
            <Button variant="ghost" onClick={close} disabled={busy}><UiText source={'Cancel'} /></Button>
            <Button variant="danger" onClick={() => void run()} loading={busy} disabled={!open || typed.trim().toLowerCase() !== WORD[open]}>
              {open === 'everything' ? translateUi('Erase') : translateUi('Reset')}
            </Button>
          </>
        }
      >
        <p className="flex gap-2">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <span>{open === 'everything' ? translateUi('This can’t be undone without a backup. Everything on this device goes.') : translateUi('Your {0} progress goes back to zero. This can’t be undone without a backup.', [name])}</span>
        </p>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-ink"><UiText source={'Type {0} to confirm'} values={[<span className="font-mono">{open ? WORD[open] : ''}</span>]} /></span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void run()}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-raised px-3.5 text-[15px] outline-none focus:border-ink"
            data-autofocus
          />
        </label>
      </Dialog>
    </SettingsSection>
  );
}
