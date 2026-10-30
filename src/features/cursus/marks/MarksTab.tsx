// Cursus › Marks (6-23): converting a text between scripts, and small drills on accents, diacritics, ligatures and cursive.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/app/context';
import { CONVERSIONS, convertScript } from '@/core/script/convert';
import type { Conversion } from '@/core/script/convert';
import { MARK_LABEL, marksOf } from '@/core/script/marks';
import type { MarkItem, MarkKind } from '@/core/script/marks';
import { shuffle } from '@/core/srs/ludus';
import { Card, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';

/** Whether a language has anything on the Marks tab. */
export const hasMarks = (lang: string) => marksOf(lang).length > 0 || CONVERSIONS.some((c) => c.lang === lang);

export function MarksTab() {
  const { language } = useApp();
  const lang = language.id;
  return (
    <div className="space-y-8">
      <Converter lang={lang} />
      {marksOf(lang).length > 0 && <Drill lang={lang} />}
    </div>
  );
}

function Converter({ lang }: { lang: string }) {
  const options = CONVERSIONS.filter((c) => c.lang === lang);
  const [how, setHow] = useState<Conversion>(options[0].id);
  const [text, setText] = useState('');
  const [out, setOut] = useState('');
  useEffect(() => {
    let live = true;
    void convertScript(text, how).then((r) => live && setOut(r));
    return () => {
      live = false;
    };
  }, [text, how]);
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold">Convert a text</h2>
      <p className="mt-1 mb-4 max-w-2xl text-[14px] text-ink-soft">
        Paste a text to change its script. Chinese is converted character by character (a character with two Traditional forms takes the commoner one); Serbian is exact except for a few words where lj, nj or dž are two letters.
      </p>
      <Segmented label="Conversion" value={how} onChange={setHow} options={options.map((c) => ({ value: c.id, label: c.label }))} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <textarea aria-label="Text to convert" value={text} onChange={(e) => setText(e.target.value)} rows={7} className="rounded-2xl border border-line bg-surface p-3 text-[17px]" placeholder="Paste or type here" />
        <output aria-label="Converted text" className="block min-h-40 rounded-2xl border border-line/70 bg-raised p-3 text-[17px] whitespace-pre-wrap">{out}</output>
      </div>
    </Card>
  );
}

function Drill({ lang }: { lang: string }) {
  const all = marksOf(lang);
  const kinds = [...new Set(all.map((i) => i.kind))];
  const [kind, setKind] = useState<MarkKind>(kinds[0]);
  const items = useMemo(() => shuffle(all.filter((i) => i.kind === kind), Math.random), [all, kind]);
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold">Marks and shapes</h2>
      {kinds.length > 1 && (
        <div className="mt-3">
          <Segmented label="Kind" value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: MARK_LABEL[k] }))} />
        </div>
      )}
      <Questions key={kind + lang} lang={lang} items={items} />
    </Card>
  );
}

function Questions({ lang, items }: { lang: string; items: MarkItem[] }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const item = items[i];
  const options = useMemo(() => (item ? shuffle([...item.options], Math.random) : []), [item]);
  if (!item)
    return (
      <p className="mt-4 text-[15px]">
        {right} of {items.length} right.{' '}
        <button type="button" className="underline" onClick={() => { setI(0); setPicked(null); setRight(0); }}>Again</button>
      </p>
    );
  return (
    <div className="mt-4">
      <p className="text-[16px]">{item.prompt}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            lang={lang}
            disabled={picked !== null}
            onClick={() => { setPicked(o); if (o === item.options[0]) setRight((n) => n + 1); }}
            className={cx('min-w-24 rounded-2xl border px-4 py-3 text-[22px]', picked === null ? 'border-line bg-surface hover:border-line-strong' : o === item.options[0] ? 'border-sage-text bg-sage-soft' : o === picked ? 'border-accent-text bg-accent-soft' : 'border-line/50 opacity-60')}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="mt-3 flex items-center gap-4">
          <p className="max-w-xl text-[14px] text-ink-soft" role="status">{picked === item.options[0] ? 'Right. ' : `It is ${item.options[0]}. `}{item.why}</p>
          <button type="button" className="shrink-0 rounded-xl border border-line px-3 py-1.5 text-[14px]" onClick={() => { setI(i + 1); setPicked(null); }}>Next</button>
        </div>
      )}
    </div>
  );
}
