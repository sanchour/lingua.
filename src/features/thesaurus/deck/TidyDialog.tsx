import { UiText, useUi } from '@/design/i18n/UiText';
// Tidy a deck (6-2b): the doubled words and the cards with nothing on them, listed before anything is deleted.
import { useMemo, useState } from 'react';
import { tidyReport, extraCopies } from '@/core/srs/tidy';
import { deleteNotes, fillFromDictionary } from '@/data/deckTools';
import { lookUpFull } from '@/services/dictionary/fullDict';
import type { Note } from '@/data/types';
import { Button, Dialog } from '@/design/primitives';

const names = (notes: Note[], max = 6) => notes.slice(0, max).map((n) => n.term).join(', ') + (notes.length > max ? `, and ${notes.length - max} more` : '');

export function TidyDialog({ open, onClose, notes, lang }: { open: boolean; onClose: () => void; notes: Note[]; lang: string }) {
  const translateUi = useUi();
  const report = useMemo(() => tidyReport(notes, lang), [notes, lang]);
  const extras = extraCopies(report);
  const [busy, setBusy] = useState(false);
  const [filledCount, setFilledCount] = useState<number | null>(null);
  const missing = report.noExample.length;
  const clean = !extras.length && !report.sameMeaning.length && !report.sameWord.length && !report.noMeaning.length && !report.noExample.length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={translateUi('Tidy this deck')}
      maxWidth="max-w-lg"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}><UiText source={'Close'} /></Button>
          {missing > 0 && (
            <Button
              variant="secondary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                // Up to 200 at a time: each is a look-up in the dictionary on this device.
                const n = await fillFromDictionary(
                  report.noExample.slice(0, 200).map((x) => x.id),
                  async (word) => {
                    const row = await lookUpFull(lang, word).catch(() => undefined);
                    const first = row?.tatoeba?.[0] ?? row?.entries.flatMap((e) => e.senses.flatMap((x) => x.ex ?? []))[0];
                    return { ipa: row?.entries[0]?.ipa?.[0], example: first ? [first[0], first[1]] : undefined };
                  },
                );
                setFilledCount(n);
                setBusy(false);
              }}
            ><UiText source={'Fill in from the dictionary'} /></Button>
          )}
          {extras.length > 0 && (
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                await deleteNotes(extras.map((n) => n.id));
                setBusy(false);
                onClose();
              }}
            ><UiText source={'Delete {0} {1}'} values={[extras.length, extras.length === 1 ? 'copy' : 'copies']} /></Button>
          )}
        </>
      }
    >
      <div className="space-y-3 pt-2 text-[14px] text-ink-soft">
        {clean && <p><UiText source={'Nothing to tidy: no doubled words, and every card has a meaning and a sentence.'} /></p>}
        {extras.length > 0 && (
          <p><UiText source={'{0} {1} of a word with the same meaning ({2}). The first of each stays; the copies go, with their history.'} values={[<b className="text-ink">{extras.length}</b>, extras.length === 1 ? 'card is a copy' : 'cards are copies', names(extras)]} /></p>
        )}
        {filledCount !== null && <p className="text-sage-text"><UiText source={'Filled in {0} {1} with a sentence or the pronunciation from the dictionary.'} values={[filledCount, filledCount === 1 ? 'card' : 'cards']} /></p>}
        {report.sameMeaning.length > 0 && (
          <p><UiText source={'{0} {1} given to more than one word ({2}). Check they are not mixed up.'} values={[<b className="text-ink">{report.sameMeaning.length}</b>, report.sameMeaning.length === 1 ? 'meaning is' : 'meanings are', report.sameMeaning.slice(0, 4).map((g) => g.map((n) => n.term).join(' = ')).join('; ')]} /></p>
        )}
        {report.sameWord.length > 0 && (
          <p><UiText source={'{0} {1} more than one meaning ({2}). These stay; look at them by hand.'} values={[<b className="text-ink">{report.sameWord.length}</b>, report.sameWord.length === 1 ? 'word has' : 'words have', names(report.sameWord.map((g) => g[0]))]} /></p>
        )}
        {report.noMeaning.length > 0 && (
          <p><UiText source={'{0} without a meaning: {1}.'} values={[<b className="text-ink">{report.noMeaning.length}</b>, names(report.noMeaning)]} /></p>
        )}
        {report.noExample.length > 0 && (
          <p><UiText source={'{0} without an example sentence{1}.'} values={[<b className="text-ink">{report.noExample.length}</b>, report.noExample.length === notes.length ? '' : `: ${names(report.noExample)}`]} /></p>
        )}
      </div>
    </Dialog>
  );
}
