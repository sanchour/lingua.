import { UiText, useUi } from '@/design/i18n/UiText';
// A deck from a pasted list of words, or from the words of a pasted text that are not known yet (6-2b), with a preview before anything is made.
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { useLibrary } from '@/data/library';
import { parseWordList, wordsFromChat, wordsFromCounts, wordsFromText } from '@/core/srs/deckFrom';
import { useChats } from '@/data/chats';
import type { Draft } from '@/core/srs/deckFrom';
import { deckFromDrafts, knownNorms } from '@/data/deckTools';
import { Button, Dialog, Select } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { lookUpFull } from '@/services/dictionary/fullDict';

type Source = 'list' | 'text' | 'library' | 'chat';
const HELP: Record<Source, string> = {
  list: 'One word per line. Add its meaning after a tab, “=”, “-” or “;”: casa = house.',
  text: 'Paste a text, a chapter, a song or a conversation. The words you do not know yet, the most used first, become the cards.',
  chat: 'Pick a conversation you had in Colloquium: the words the AI marked, then the other words you did not know yet, become the cards.',
  library: 'Pick a book, article, transcript or song you already have in Codex: its words you do not know yet, the most used first, become the cards.',
};

export function FromListDialog({ open, lang, onClose, onMade }: { open: boolean; lang: string; onClose: () => void; onMade: (deckId: string) => void }) {
  const translateUi = useUi();
  const [source, setSource] = useState<Source>('list');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [textId, setTextId] = useState('');
  const library = useLibrary(lang);
  const chats = useChats(lang);
  const [chatId, setChatId] = useState('');
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

  const vocab = useLiveQuery(async () => (textId ? await db.textVocab.get(textId) : undefined), [textId]);
  const drafts = useMemo<Draft[]>(
    () => (source === 'list' ? parseWordList(text) : source === 'library' ? (vocab ? wordsFromCounts(vocab.norms, vocab.counts, known) : []) : source === 'chat' ? wordsFromChat(chats?.find((c) => c.id === chatId)?.messages ?? [], lang, known) : wordsFromText(text, lang, known)),
    [source, text, lang, known, vocab, chats, chatId],
  );
  // A word without a meaning gets the dictionary's first one, when the full dictionary is on the device.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const found: Record<string, string> = {};
      for (const d of drafts.slice(0, 80)) {
        if (d.meaning || meanings[d.term] !== undefined) continue;
        const row = await lookUpFull(lang, d.term).catch(() => undefined);
        found[d.term] = row?.entries[0]?.senses[0]?.g[0] ?? '';
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
    const id = await deckFromDrafts(lang, name.trim() || (source === 'list' ? 'My list' : source === 'library' ? (library?.find((t) => t.id === textId)?.title ?? 'From a text') : source === 'chat' ? (chats?.find((c) => c.id === chatId)?.title ?? 'From a conversation') : 'From a text'), kept);
    setBusy(false);
    onMade(id);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={translateUi('A deck from a list or a text')}
      maxWidth="max-w-xl"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}><UiText source={'Cancel'} /></Button>
          <Button disabled={!kept.length} loading={busy} onClick={() => void make()}><UiText source={'Make a deck of {0}'} values={[kept.length]} /></Button>
        </>
      }
    >
      <div className="space-y-3 pt-2">
        <div className="flex gap-2" role="tablist" aria-label={translateUi('Where the words come from')}>
          {(['list', 'text', 'library', 'chat'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={source === s}
              onClick={() => setSource(s)}
              className={cx('rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold', source === s ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-soft hover:bg-surface')}
            >
              {s === 'list' ? translateUi('A list of words') : s === 'text' ? translateUi('A text') : s === 'library' ? translateUi('From my library') : translateUi('A conversation')}
            </button>
          ))}
        </div>
        <p className="text-[13.5px] text-ink-soft">{HELP[source]}</p>
        {source === 'chat' ? (
          <Select
            label={translateUi('Conversation')}
            value={chatId}
            onChange={setChatId}
            options={[{ value: '', label: chats?.length ? 'Choose a conversation…' : 'No conversations yet', disabled: true }, ...(chats ?? []).map((c) => ({ value: c.id, label: c.title }))]}
          />
        ) : source === 'library' ? (
          <Select
            label={translateUi('Text')}
            value={textId}
            onChange={setTextId}
            options={[{ value: '', label: library?.length ? 'Choose a text…' : 'Your library is empty', disabled: true }, ...(library ?? []).map((t) => ({ value: t.id, label: t.title }))]}
          />
        ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          lang={lang}
          rows={6}
          aria-label={source === 'list' ? 'Words' : 'Text'}
          className="w-full resize-y rounded-xl border border-line bg-raised p-3 text-[15px] outline-none focus:border-accent"
        />
        )}
        <label className="block text-[13px] font-semibold text-ink-soft"><UiText source={'Name of the deck{0}'} values={[<input value={name} onChange={(e) => setName(e.target.value)} placeholder={source === 'list' ? translateUi('My list') : translateUi('From a text')} className="mt-1 h-10 w-full rounded-xl border border-line bg-raised px-3 text-[15px] font-normal text-ink outline-none focus:border-accent" />]} /></label>
        {kept.length > 0 && (
          <ul className="max-h-48 divide-y divide-line/60 overflow-y-auto rounded-xl border border-line/70" aria-label={translateUi('Preview')}>
            {kept.map((d) => (
              <li key={d.term} className="flex items-center gap-3 px-3 py-1.5 text-[14px]">
                <span lang={lang} className="font-serif text-[16px] font-semibold">
                  {d.term}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{d.meaning || '—'}</span>
                <button type="button" aria-label={translateUi('Leave out {0}', [d.term])} onClick={() => setDropped(new Set([...dropped, d.term]))} className="grid size-6 place-items-center rounded-md text-ink-faint hover:bg-surface hover:text-ink">
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
