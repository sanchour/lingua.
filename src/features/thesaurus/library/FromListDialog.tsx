// A deck from a pasted list of words, or from the words of a pasted text that are not known yet (6-2b), with a preview before anything is made.
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { fillFromEntry } from '@/core/srs/templateFill';
import { parseWordList, wordsFromText } from '@/core/srs/deckFrom';
import type { Draft } from '@/core/srs/deckFrom';
import { deckFromDrafts, knownNorms } from '@/data/deckTools';
import { Button, Dialog } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { lookUpFull } from '@/services/dictionary/fullDict';

type Source = 'list' | 'text';
const HELP: Record<Source, string> = {
  list: 'One word per line. Add its meaning after a tab, “=”, “-” or “;”: casa = house.',
  text: 'Paste a text, a chapter, a song or a conversation. The words you do not know yet, the most used first, become the cards.',
};

export function FromListDialog({ open, lang, onClose, onMade }: { open: boolean; lang: string; onClose: () => void; onMade: (deckId: string) => void }) {
  const [source, setSource] = useState<Source>('list');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [known, setKnown] = useState<ReadonlySet<string>>(new Set());
  const [meanings, setMeanings] = useState<Record<string, string>>({});
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText('');
    setName('');
    setDropped(new Set());
    void knownNorms(lang).then(setKnown);
  }, [open, lang]);

  const drafts = useMemo<Draft[]>(() => (source === 'list' ? parseWordList(text) : wordsFromText(text, lang, known)), [source, text, lang, known]);
  // A word without a meaning gets the dictionary's first one, when the full dictionary is on the device.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const found: Record<string, string> = {};
      for (const d of drafts.slice(0, 80)) {
        if (d.meaning || meanings[d.term] !== undefined) continue;
        const row = await lookUpFull(lang, d.term).catch(() => undefined);
        found[d.term] = (row && fillFromEntry(row, 'definition')) || '';
      }
      if (alive && Object.keys(found).length) setMeanings((m) => ({ ...m, ...found }));
    })();
    return () => {
      alive = false;
    };
  }, [drafts, lang, meanings]);

  const kept = drafts.filter((d) => !dropped.has(d.term)).map((d) => ({ ...d, meaning: d.meaning || meanings[d.term] || '' }));
  const make = async () => {
    setBusy(true);
    const id = await deckFromDrafts(lang, name.trim() || (source === 'list' ? 'My list' : 'From a text'), kept);
    setBusy(false);
    onMade(id);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="A deck from a list or a text"
      maxWidth="max-w-xl"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!kept.length} loading={busy} onClick={() => void make()}>
            Make a deck of {kept.length}
          </Button>
        </>
      }
    >
      <div className="space-y-3 pt-2">
        <div className="flex gap-2" role="tablist" aria-label="Where the words come from">
          {(['list', 'text'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={source === s}
              onClick={() => setSource(s)}
              className={cx('rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold', source === s ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-soft hover:bg-surface')}
            >
              {s === 'list' ? 'A list of words' : 'A text'}
            </button>
          ))}
        </div>
        <p className="text-[13.5px] text-ink-soft">{HELP[source]}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          lang={lang}
          rows={6}
          aria-label={source === 'list' ? 'Words' : 'Text'}
          className="w-full resize-y rounded-xl border border-line bg-raised p-3 text-[15px] outline-none focus:border-accent"
        />
        <label className="block text-[13px] font-semibold text-ink-soft">
          Name of the deck
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={source === 'list' ? 'My list' : 'From a text'} className="mt-1 h-10 w-full rounded-xl border border-line bg-raised px-3 text-[15px] font-normal text-ink outline-none focus:border-accent" />
        </label>
        {kept.length > 0 && (
          <ul className="max-h-48 divide-y divide-line/60 overflow-y-auto rounded-xl border border-line/70" aria-label="Preview">
            {kept.map((d) => (
              <li key={d.term} className="flex items-center gap-3 px-3 py-1.5 text-[14px]">
                <span lang={lang} className="font-serif text-[16px] font-semibold">
                  {d.term}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{d.meaning || '—'}</span>
                <button type="button" aria-label={`Leave out ${d.term}`} onClick={() => setDropped(new Set([...dropped, d.term]))} className="grid size-6 place-items-center rounded-md text-ink-faint hover:bg-surface hover:text-ink">
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
