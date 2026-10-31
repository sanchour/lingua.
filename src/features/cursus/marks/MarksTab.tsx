import { UiText, useUi } from '@/design/i18n/UiText';
// Cursus › Marks (6-23): converting a text between scripts, and small drills on accents, diacritics, ligatures and cursive.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/app/context';
import { CONVERSIONS, convertScript } from '@/core/script/convert';
import type { Conversion } from '@/core/script/convert';
import { MARK_LABEL, marksOf } from '@/core/script/marks';
import { charRound, QUIZ_LABEL, QUIZ_MODES, toneRound } from '@/core/script/hanzi';
import type { CharData, QuizMode } from '@/core/script/hanzi';
import { applyPattern, loadDictRoots, PATTERNS, ROOTS } from '@/core/script/arabic';
import { loadReadings, loadStrokes } from '@/core/script/strokes';
import type { StrokeData } from '@/core/script/strokes';
import type { MarkItem, MarkKind } from '@/core/script/marks';
import { shuffle } from '@/core/srs/ludus';
import { Card, Segmented } from '@/design/primitives';
import { StrokeOrder } from './StrokeOrder';
import { cx } from '@/lib/cx';

/** Whether a language has anything on the Marks tab. */
export const hasMarks = (lang: string) => marksOf(lang).length > 0 || CONVERSIONS.some((c) => c.lang === lang) || lang === 'ja' || lang === 'ko' || lang === 'ar';

export function MarksTab() {
  const { language } = useApp();
  const lang = language.id;
  return (
    <div className="space-y-8">
      {(lang === 'zh' || lang === 'ja') && <Hanzi set={lang} />}
      {lang in QUIZ_MODES && <CharQuiz lang={lang} />}
      {lang === 'zh' && <Tones />}
      {lang === 'ko' && <HanjaLookup />}
      {lang === 'ar' && <RootExplorer />}
      {CONVERSIONS.some((c) => c.lang === lang) && <Converter lang={lang} />}
      {marksOf(lang).length > 0 && <Drill lang={lang} />}
    </div>
  );
}

function Converter({ lang }: { lang: string }) {
  const translateUi = useUi();
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
      <h2 className="font-serif text-[22px] font-semibold"><UiText source={'Convert a text'} /></h2>
      <p className="mt-1 mb-4 max-w-2xl text-[14px] text-ink-soft"><UiText source={'Paste a text to change its script. Chinese is converted character by character (a character with two Traditional forms takes the commoner one); Serbian is exact except for a few words where lj, nj or dž are two letters.'} /></p>
      <Segmented label={translateUi('Conversion')} value={how} onChange={setHow} options={options.map((c) => ({ value: c.id, label: c.label }))} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <textarea aria-label={translateUi('Text to convert')} value={text} onChange={(e) => setText(e.target.value)} rows={7} className="rounded-2xl border border-line bg-surface p-3 text-[17px]" placeholder={translateUi('Paste or type here')} />
        <output aria-label={translateUi('Converted text')} className="block min-h-40 rounded-2xl border border-line/70 bg-raised p-3 text-[17px] whitespace-pre-wrap">{out}</output>
      </div>
    </Card>
  );
}

function Drill({ lang }: { lang: string }) {
  const translateUi = useUi();
  const all = marksOf(lang);
  const kinds = [...new Set(all.map((i) => i.kind))];
  const [kind, setKind] = useState<MarkKind>(kinds[0]);
  const items = useMemo(() => shuffle(all.filter((i) => i.kind === kind), Math.random), [all, kind]);
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold"><UiText source={'Practice'} /></h2>
      {kinds.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={translateUi('Kind')}>
          {kinds.map((k) => (
            <button key={k} type="button" aria-pressed={k === kind} onClick={() => setKind(k)} className={cx('rounded-full border px-3 py-1 text-[13.5px]', k === kind ? 'border-accent-text bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
              <UiText source={MARK_LABEL[k]} />
            </button>
          ))}
        </div>
      )}
      <Questions key={kind + lang} lang={lang} items={items} />
    </Card>
  );
}

function Questions({ lang, items, onAgain }: { lang: string; items: MarkItem[]; onAgain?: () => void }) {
  const translateUi = useUi();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const item = items[i];
  const options = useMemo(() => (item ? shuffle([...item.options], Math.random) : []), [item]);
  if (!item)
    return (
      <p className="mt-4 text-[15px]"><UiText source={'{0} of {1} right.{2}{3}'} values={[right, items.length, ' ', <button type="button" className="underline" onClick={() => { if (onAgain) onAgain(); setI(0); setPicked(null); setRight(0); }}><UiText source={'Again'} /></button>]} /></p>
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
          <p className="max-w-xl text-[14px] text-ink-soft" role="status">{picked === item.options[0] ? translateUi('Right. ') : translateUi('It is {0}. ', [item.options[0]])}{item.why}</p>
          <button type="button" className="shrink-0 rounded-xl border border-line px-3 py-1.5 text-[14px]" onClick={() => { setI(i + 1); setPicked(null); }}><UiText source={'Next'} /></button>
        </div>
      )}
    </div>
  );
}

function Hanzi({ set }: { set: 'zh' | 'ja' }) {
  const translateUi = useUi();
  const [char, setChar] = useState(set === 'ja' ? '語' : '好');
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold"><UiText source={'Stroke order'} /></h2>
      <p className="mt-1 mb-4 max-w-2xl text-[14px] text-ink-soft"><UiText source={'Type a {0} to see it drawn stroke by stroke and what it is built from; tap a part to open it. Covers the 1,000 most used.'} values={[set === 'ja' ? <UiText source={'kanji'} /> : <UiText source={'character'} />]} /></p>
      <input aria-label={translateUi('Character')} lang={set} value={char} maxLength={2} onChange={(e) => setChar([...e.target.value].slice(-1).join(''))} className="mb-4 w-24 rounded-2xl border border-line bg-surface p-2 text-center font-serif text-[32px]" />
      {char && <StrokeOrder key={set} char={char} set={set} onOpen={setChar} />}
      <p className="mt-4 text-[12.5px] text-ink-faint">
        {set === 'ja' ? translateUi('Stroke order from KanjiVG (CC BY-SA 3.0).') : translateUi('Stroke shapes from Make Me a Hanzi (Arphic Public License); parts and meanings from its dictionary (LGPL).')}
      </p>
    </Card>
  );
}

/** Practice made from the character data: radicals, parts, meanings, readings, Traditional forms, hanja. */
function CharQuiz({ lang }: { lang: string }) {
  const translateUi = useUi();
  const modes = QUIZ_MODES[lang];
  const [mode, setMode] = useState<QuizMode>(modes[0]);
  const [data, setData] = useState<CharData | null | undefined>();
  const [trad, setTrad] = useState<Array<[string, string]>>([]);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    const set = lang === 'ja' ? 'ja' : 'zh';
    void Promise.all([loadStrokes(set), loadReadings(), lang === 'zh' ? import('@/core/script/variants.data') : null]).then(
      ([strokes, readings, v]) => {
        if (!live) return;
        setData({ strokes: strokes as Record<string, StrokeData>, readings });
        if (v) { const [from, to] = v.HANS_TO_HANT; const f = [...from]; const t = [...to]; setTrad(f.map((c, i) => [c, t[i]] as [string, string]).filter(([a]) => strokes[a] || strokes[t[f.indexOf(a)]])); }
      },
      () => live && setData(null),
    );
    return () => { live = false; };
  }, [lang]);
  const items = useMemo(() => (data ? charRound(mode, data, Math.random, 8, trad) : []), [data, mode, trad, round]);
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold"><UiText source={'Characters'} /></h2>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={translateUi('Kind')}>
        {modes.map((m) => (
          <button key={m} type="button" aria-pressed={m === mode} onClick={() => setMode(m)} className={cx('rounded-full border px-3 py-1 text-[13.5px]', m === mode ? 'border-accent-text bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
            <UiText source={QUIZ_LABEL[m]} />
          </button>
        ))}
      </div>
      {data === undefined && <p className="mt-4 text-[14px] text-ink-faint"><UiText source={'Loading…'} /></p>}
      {data === null && <p className="mt-4 text-[14px] text-ink-faint"><UiText source={'The character data could not be loaded (it needs a connection the first time).'} /></p>}
      {data && <Questions key={`${mode}-${round}`} lang={mode === 'hanja' ? 'ko' : lang === 'ja' ? 'ja' : 'zh'} items={items} onAgain={() => setRound((r) => r + 1)} />}
    </Card>
  );
}

function Tones() {
  const [round, setRound] = useState(0);
  const items = useMemo(() => toneRound(Math.random, 8), [round]);
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold"><UiText source={'Tones'} /></h2>
      <p className="mt-1 text-[14px] text-ink-soft"><UiText source={'Read the tone mark and name the tone. (Listening practice is in Sounds.)'} /></p>
      <Questions key={round} lang="zh" items={items} onAgain={() => setRound((r) => r + 1)} />
    </Card>
  );
}

/** Hanja: type a hanja to see its reading and meaning, or a hangul syllable to see the hanja read that way. */
function HanjaLookup() {
  const translateUi = useUi();
  const [q, setQ] = useState('학');
  const [readings, setReadings] = useState<Record<string, import('@/core/script/hanzi').CharReadings> | null>(null);
  useEffect(() => {
    void loadReadings().then(setReadings, () => setReadings({}));
  }, []);
  const rows = useMemo(() => {
    if (!readings || !q) return [];
    const hit = /\p{Script=Han}/u.test(q) ? [...q].filter((c) => readings[c]?.ko) : Object.keys(readings).filter((c) => readings[c].ko?.includes(q));
    return hit.slice(0, 40);
  }, [readings, q]);
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold"><UiText source={'Hanja'} /></h2>
      <p className="mt-1 mb-4 max-w-2xl text-[14px] text-ink-soft"><UiText source={'Much of Korean vocabulary is built from Chinese characters (hanja), each read as one syllable. Type a syllable in hangul to see hanja read that way, or a hanja to see its reading. Covers the 1,500 most used characters.'} /></p>
      <input aria-label={translateUi('Hangul syllable or hanja')} lang="ko" value={q} onChange={(e) => setQ(e.target.value.trim())} className="mb-4 w-32 rounded-2xl border border-line bg-surface p-2 text-center font-serif text-[28px]" />
      {readings === null && <p className="text-[14px] text-ink-faint"><UiText source={'Loading…'} /></p>}
      {readings && !rows.length && <p className="text-[14px] text-ink-faint"><UiText source={'Nothing for “{0}”.'} values={[q]} /></p>}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <li key={c} className="flex items-baseline gap-3 rounded-2xl border border-line/70 bg-surface px-4 py-2.5">
            <button type="button" lang="zh" className="font-serif text-[30px]" onClick={() => setQ(c)} aria-label={translateUi('Show {0}', [c])}>{c}</button>
            <span className="min-w-0 text-[14px]"><span lang="ko" className="font-semibold">{readings![c].ko!.join(', ')}</span><span className="block truncate text-ink-soft">{readings![c].d}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12.5px] text-ink-faint"><UiText source={'Readings and meanings from the Unicode Unihan database.'} /></p>
    </Card>
  );
}

/** Arabic words are a root of three letters fitted into a pattern: pick a root to see its words and the patterns. */
function RootExplorer() {
  const translateUi = useUi();
  const [root, setRoot] = useState('ك ت ب');
  const [dict, setDict] = useState<Awaited<ReturnType<typeof loadDictRoots>> | null>(null);
  useEffect(() => {
    void loadDictRoots().then(setDict, () => setDict({}));
  }, []);
  const known = ROOTS[root];
  const fromDict = dict?.[root] ?? [];
  const letters = Object.keys(ROOTS).concat(Object.keys(dict ?? {}).filter((r) => !ROOTS[r]).slice(0, 40));
  return (
    <Card>
      <h2 className="font-serif text-[22px] font-semibold"><UiText source={'Roots and patterns'} /></h2>
      <p className="mt-1 mb-4 max-w-2xl text-[14px] text-ink-soft"><UiText source={'Most Arabic words are a root of three consonants (ك ت ب, about writing) fitted into a pattern, which says whether the word is a doer, a place, a thing done. Pick a root, or type three letters separated by spaces.'} /></p>
      <input aria-label={translateUi('Root')} dir="rtl" lang="ar" value={root} onChange={(e) => setRoot(e.target.value.replace(/[^\u0621-\u064A ]/g, ''))} className="mb-3 w-40 rounded-2xl border border-line bg-surface p-2 text-center font-serif text-[26px]" />
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label={translateUi('Roots')}>
        {letters.map((r) => (
          <button key={r} type="button" lang="ar" dir="rtl" aria-pressed={r === root} onClick={() => setRoot(r)} className={cx('rounded-full border px-3 py-0.5 text-[17px]', r === root ? 'border-accent-text bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>{r}</button>
        ))}
      </div>
      {known && <p className="mb-2 text-[14px] text-ink-soft"><UiText source={'Root meaning: {0}'} values={[known.en]} /></p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold tracking-wide text-ink-faint uppercase"><UiText source={'Words'} /></p>
          <ul className="divide-y divide-line rounded-2xl border border-line/70">
            {(known?.words ?? []).map((w) => (
              <li key={w.w} className="flex items-center gap-3 px-4 py-2"><span lang="ar" dir="rtl" className="font-serif text-[22px]">{w.w}</span><span className="text-[14px] text-ink-soft">{w.en}</span></li>
            ))}
            {fromDict.map(([w, pos, gloss]) => (
              <li key={`${w}${pos}`} className="flex items-center gap-3 px-4 py-2"><span lang="ar" dir="rtl" className="font-serif text-[22px]">{w}</span><span className="min-w-0 truncate text-[14px] text-ink-soft">{pos} · {gloss}</span></li>
            ))}
            {!known && !fromDict.length && <li className="px-4 py-3 text-[14px] text-ink-faint">{dict ? translateUi('No words known for this root yet: the dictionary links only some words to a root.') : translateUi('Loading…')}</li>}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold tracking-wide text-ink-faint uppercase"><UiText source={'The root in each pattern'} /></p>
          <ul className="divide-y divide-line rounded-2xl border border-line/70">
            {PATTERNS.map((p) => (
              <li key={p.pattern} className="flex items-center gap-3 px-4 py-2"><span lang="ar" dir="rtl" className="w-24 shrink-0 font-serif text-[22px]">{applyPattern(root, p.pattern) ?? '—'}</span><span className="text-[13.5px] text-ink-soft"><span lang="ar" className="text-[15px]">{p.pattern}</span> · {p.name}</span></li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-ink-faint"><UiText source={'A pattern fitted to a root is not always a word in use.'} /></p>
        </div>
      </div>
      <p className="mt-4 text-[12.5px] text-ink-faint"><UiText source={'Dictionary roots from Wiktionary (CC BY-SA); the words listed first are written by hand.'} /></p>
    </Card>
  );
}
