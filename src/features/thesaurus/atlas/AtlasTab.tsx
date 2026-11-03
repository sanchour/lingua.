// Thesaurus › Atlas (6-29, docs/WORD-GRAPH-PLAN.md): the atlas of every word you have (G4), and one word's compass or its
// family as a tree (G2), with the word's own page beside it. The tab opens on the atlas; a word opens its compass.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Map as MapIcon, Maximize, Minus, Network, Orbit, Plus } from 'lucide-react';
import { hasFullDictionary } from '@/core/dictionary/format';
import type { Neighbour, Quarter } from '@/core/graph/model';
import { atlasScene, compassScene, treeScene, type SceneNode } from '@/core/graph/scene';
import { normalizeWord } from '@/core/text/normalize';
import { loadAtlasWord } from '@/data/atlas';
import { db } from '@/data/db';
import { useVocabularyCounts } from '@/data/words';
import { UiText, useUi } from '@/design/i18n/UiText';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { IconButton, SearchInput, Segmented, Switch } from '@/design/primitives';
import { madeFromOf, madeFromReady, refreshAtlas } from '@/services/graph/graph';
import { EntryView } from '../dictionary/Entry';
import { etymonName } from '../dictionary/WordOrigin';
import { AtlasCanvas, nodeTowards, type AtlasCanvasHandle, type Camera } from './AtlasCanvas';

type View = 'atlas' | 'compass' | 'tree';
const lastKey = (lang: string) => `lingua.atlas.${lang}`;
const cameraKey = (lang: string) => `lingua.atlas.camera.${lang}`;
const QUARTERS: Quarter[] = ['meaning', 'form', 'origin', 'use'];
const idOf = (n: Neighbour) => `${n.kind}:${n.lang ?? ''}:${n.key ?? n.label}`;

// Per-device conveniences (the last word, where the atlas was left): a private window simply starts afresh.
function stored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: nothing to keep.
  }
}

export default function AtlasTab({ lang }: { lang: string }) {
  const translateUi = useUi();
  const [params, setParams] = useSearchParams();
  const word = params.get('word');
  const view: View = !word ? 'atlas' : params.get('view') === 'tree' ? 'tree' : 'compass';
  const [query, setQuery] = useState('');
  const [lookalikes, setLookalikes] = useState(false);
  const [selected, setSelected] = useState(() => {
    const last = stored<string>(lastKey(lang));
    return last ? `w:${normalizeWord(last, lang)}` : '';
  });
  const [said, setSaid] = useState('');
  const [memory, setMemory] = useState<Record<string, number>>();
  const [madeTick, setMadeTick] = useState(() => (madeFromReady(lang) ? 1 : 0));
  const search = useRef<HTMLInputElement>(null);
  const canvas = useRef<AtlasCanvasHandle>(null);
  const counts = useVocabularyCounts(lang);

  // The whole atlas: the cached scene draws at once; the worker builds it again if the words changed, and says how well
  // each word is remembered now.
  const row = useLiveQuery(async () => (await db.graphLayouts.get([lang, 'atlas'])) ?? null, [lang]);
  const states = useLiveQuery(async () => new Map((await db.words.where('[lang+state]').anyOf([[lang, 1], [lang, 2]]).toArray()).filter((w) => !w.deletedAt).map((w) => [normalizeWord(w.lemma ?? w.norm, lang), w.state])), [lang]);
  useEffect(() => {
    let live = true;
    if (states) void refreshAtlas(lang).then((r) => live && setMemory(r.memory)).catch(() => {});
    return () => {
      live = false;
    };
  }, [lang, states]);
  // The tree's made-from index: built once a session in the worker (it reads the whole dictionary), then used.
  useEffect(() => {
    let live = true;
    if (word && view === 'tree' && !madeFromReady(lang)) void madeFromOf(lang, []).then(() => live && setMadeTick((t) => t + 1)).catch(() => {});
    return () => {
      live = false;
    };
  }, [lang, word, view]);
  const data = useLiveQuery(async () => (word ? ((await loadAtlasWord(lang, word, db, madeFromReady(lang) ? (keys) => madeFromOf(lang, keys) : undefined)) ?? false) : null), [lang, word, madeTick]);

  useEffect(() => {
    if (!data) return;
    setSelected(`w:${data.key}`);
    store(lastKey(lang), data.label);
  }, [data, lang]);

  const regionLabel = (id: string, label: string) => (id === 'little' ? translateUi('The little words') : id.startsWith('around:') ? translateUi('Around {0}', [label.replace(/^Around /, '')]) : translateUi(label));
  const scene = useMemo(() => {
    if (view === 'atlas') return row && states ? atlasScene({ row, states, memory, regionLabel }) : null;
    if (!data) return null;
    const self = data.web.byKey.get(data.key);
    if (view === 'tree' && data.tree) return treeScene(data.tree, data.weak);
    return compassScene({ word: { key: data.key, label: data.label, state: self === undefined ? undefined : data.web.nodes[self].state, weak: data.weak.has(data.key) }, neighbours: data.neighbours, members: data.members, weak: data.weak, lookalikes });
    // regionLabel only changes with the interface's language, which translateUi follows.
  }, [view, row, states, memory, data, lookalikes, translateUi]);

  const open = (w: string, as: View = view === 'atlas' ? 'compass' : view) => setParams(as === 'atlas' ? { tab: 'atlas' } : { tab: 'atlas', word: w, ...(as === 'tree' ? { view: 'tree' } : {}) });
  const chosen = scene?.nodes.find((n) => n.id === selected);
  const page = chosen?.key ? chosen.label : view !== 'atlas' && data ? data.label : null;
  const select = (n: SceneNode) => {
    setSelected(n.id);
    setSaid(n.note ? `${n.label}, ${etymonName(n.note)}` : n.label);
    if (view === 'atlas' && n.key) store(lastKey(lang), n.label);
  };
  // From the atlas a word opens with a flight: the camera goes to it, then its compass draws itself out.
  const onOpen = (n: SceneNode) => {
    if (!n.key) return;
    if (view === 'atlas') void canvas.current?.flyTo(n.id, 2).then(() => open(n.label, 'compass'));
    else open(n.label);
  };
  const find = (text: string) => {
    const key = normalizeWord(text.trim(), lang);
    const node = view === 'atlas' ? scene?.nodes.find((n) => n.key === key) : undefined;
    if (!node) return open(text.trim(), view === 'atlas' ? 'compass' : view);
    select(node);
    void canvas.current?.flyTo(node.id, 1.6);
  };
  useHotkeys({ '/': () => search.current?.focus(), t: () => (chosen?.key || data) && open(chosen?.key ? chosen.label : data ? data.label : '', view === 'tree' ? 'compass' : 'tree') }, true);

  const keys = (e: React.KeyboardEvent) => {
    if (!scene) return;
    const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (arrow) {
      e.preventDefault();
      const next = nodeTowards(scene, selected, arrow[0], arrow[1]);
      if (next) {
        select(next);
        if (view === 'atlas') void canvas.current?.flyTo(next.id, 1);
      }
    } else if (e.key === 'Enter' && chosen) onOpen(chosen);
    // Esc goes back one step: from a word's compass or tree to the atlas, bookmarked where you were.
    else if (e.key === 'Escape') view === 'atlas' ? setSelected('') : open('', 'atlas');
    else if (e.key === '+' || e.key === '=') canvas.current?.zoom(1.25);
    else if (e.key === '-') canvas.current?.zoom(0.8);
    else if (e.key === '0') canvas.current?.fit();
  };

  const quarterLabels = useMemo(() => ({ meaning: translateUi('Meaning'), form: translateUi('Form'), origin: translateUi('Origin'), use: translateUi('Use') }), [translateUi]);
  const listed = (view !== 'atlas' && data ? data.neighbours : []).filter((n) => lookalikes || !n.optional);
  // Loose threads: small groups of words joined only to each other, and words joined to nothing (F1092).
  const loose = useMemo(() => {
    if (!row || view !== 'atlas') return { groups: [] as string[][], alone: [] as string[] };
    const free = row.nodes.map((n) => n.kind === 'word' && n.region === undefined);
    const near = row.nodes.map(() => [] as number[]);
    for (let i = 0; i < row.families.length; i++) {
      const a = row.threads[i * 2], b = row.threads[i * 2 + 1];
      if (free[a] && free[b]) near[a].push(b), near[b].push(a);
    }
    const walked = new Set<number>(), groups: string[][] = [], alone: string[] = [];
    row.nodes.forEach((n, i) => {
      if (!free[i] || walked.has(i)) return;
      const group = [i];
      walked.add(i);
      for (let k = 0; k < group.length; k++) for (const j of near[group[k]]) if (!walked.has(j)) walked.add(j), group.push(j);
      if (group.length === 1) alone.push(n.label);
      else groups.push(group.map((g) => row.nodes[g].label));
    });
    return { groups, alone };
  }, [row, view]);

  const label =
    view === 'atlas'
      ? translateUi('Your words: {0} in {1} regions', [String(states?.size ?? 0), String(row?.regions.length ?? 0)])
      : view === 'tree' && data
        ? translateUi('The tree of {0}', [data.label])
        : data
          ? translateUi('The compass of {0}: {1} things around it', [data.label, String(listed.length)])
          : '';

  return (
    <section aria-label={translateUi('Atlas')} className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <form
            className="max-w-60 min-w-36 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) find(query);
              setQuery('');
            }}
          >
            <SearchInput ref={search} value={query} onChange={setQuery} placeholder={translateUi('Which word?')} />
          </form>
          <div className="w-80 shrink-0">
            <Segmented<View>
              label={translateUi('Atlas view')}
              value={view}
              onChange={(v) => {
                const w = chosen?.key ? chosen.label : data ? data.label : stored<string>(lastKey(lang));
                if (v === 'atlas' || w) open(w ?? '', v);
              }}
              block
              options={[
                { value: 'atlas', label: translateUi('Atlas'), icon: MapIcon },
                { value: 'compass', label: translateUi('Compass'), icon: Orbit },
                { value: 'tree', label: translateUi('Tree'), icon: Network },
              ]}
            />
          </div>
          {view === 'compass' && (
            <div className="flex shrink-0 items-center gap-2 text-[13.5px] font-semibold text-ink-soft">
              <Switch checked={lookalikes} onChange={setLookalikes} label={translateUi('Look-alikes')} />
              <span aria-hidden>
                <UiText source={'Look-alikes'} />
              </span>
            </div>
          )}
        </div>
        <div tabIndex={0} onKeyDown={keys} className="relative h-[calc(100dvh-15.5rem)] min-h-[420px] overflow-hidden rounded-3xl border border-line bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          {view === 'atlas' && counts && (
            <p className="pointer-events-none absolute top-4 left-5 z-10 rounded-lg bg-bg/85 px-2 py-1 text-[13px] text-ink-soft">
              <UiText source={'{0} known · {1} learning · {2} regions'} values={[counts.known.toLocaleString(), counts.learning.toLocaleString(), row?.regions.length ?? 0]} />
            </p>
          )}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-2xl bg-bg/90">
            <IconButton icon={Minus} label={translateUi('Zoom out')} onClick={() => canvas.current?.zoom(0.8)} />
            <IconButton icon={Plus} label={translateUi('Zoom in')} onClick={() => canvas.current?.zoom(1.25)} />
            <IconButton icon={Maximize} label={translateUi('Fit')} onClick={() => canvas.current?.fit()} />
          </div>
          {scene ? (
            <AtlasCanvas
              handle={canvas}
              scene={scene}
              selected={selected}
              onSelect={select}
              onOpen={onOpen}
              quarterLabels={quarterLabels}
              nameOf={etymonName}
              label={label}
              camera={stored<Camera>(cameraKey(lang)) ?? undefined}
              onCamera={(c) => view === 'atlas' && store(cameraKey(lang), c)}
            />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <p className="max-w-sm text-ink-soft">
                {view === 'atlas' ? (
                  states && states.size === 0 ? (
                    <UiText source={'Mark words as Known or Learning while you read, and they appear here, joined to each other.'} />
                  ) : (
                    <UiText source={'Laying out your words…'} />
                  )
                ) : data === false ? (
                  <UiText source={'No word “{0}” here yet. Try another.'} values={[word ?? '']} />
                ) : (
                  <UiText source={'Look up a word to see what is around it: its meanings, its family, where it comes from and how it is used.'} />
                )}
              </p>
            </div>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {said}
        </p>
        {!hasFullDictionary(lang) && (
          <p className="mt-2 text-[12.5px] text-ink-soft">
            <UiText source={'Synonyms, families and origins come with a full dictionary, which this language doesn’t have yet.'} />
          </p>
        )}
      </div>
      <aside aria-label={translateUi('Its neighbours, in words')} className="h-[calc(100dvh-12.2rem)] min-h-[460px] overflow-y-auto pr-1">
        {page && <EntryView lang={lang} word={page} />}
        {view === 'atlas' && !page && (
          <div>
            <h3 className="font-serif text-2xl font-semibold">
              <UiText source={'Loose threads'} />
            </h3>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              <UiText source={'Small groups of words joined only to each other, and words joined to nothing yet. Link one, or learn a word that would join it.'} />
            </p>
            <ul className="mt-4 space-y-1.5">
              {loose.groups.slice(0, 40).map((g) => (
                <li key={g.join('|')} lang={lang} className="font-serif text-[15.5px]">
                  {g.map((w, i) => (
                    <span key={w}>
                      {i > 0 && <span className="text-ink-faint"> — </span>}
                      <button type="button" onClick={() => open(w, 'compass')} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {w}
                      </button>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            {loose.alone.length > 0 && (
              <details className="mt-5">
                <summary className="cursor-pointer text-[13.5px] font-semibold text-ink-soft">
                  <UiText source={'{0} words joined to nothing yet'} values={[loose.alone.length]} />
                </summary>
                <p lang={lang} className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-serif text-[15px]">
                  {loose.alone.slice(0, 200).map((w) => (
                    <button key={w} type="button" onClick={() => open(w, 'compass')} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {w}
                    </button>
                  ))}
                </p>
              </details>
            )}
          </div>
        )}
        {listed.length > 0 && (
          <div className="mt-8 border-t border-line pt-5">
            <h3 className="text-[11.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">
              <UiText source={'Its neighbours, in words'} />
            </h3>
            {QUARTERS.map((q) => {
              const items = listed.filter((n) => n.quarter === q);
              if (!items.length) return null;
              return (
                <div key={q} className="mt-4">
                  <p className="text-[13px] font-bold">{quarterLabels[q]}</p>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {items.map((n) => (
                      <li key={idOf(n)}>
                        {n.key ? (
                          <button type="button" lang={lang} onClick={() => open(n.label)} className={`font-serif text-[15px] underline decoration-line-strong underline-offset-4 hover:decoration-ink ${n.ghost ? 'text-ink-soft italic' : ''}`}>
                            {n.label}
                          </button>
                        ) : (
                          <span lang={n.lang ?? lang} className="font-serif text-[15px] text-ink-soft">
                            {n.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </section>
  );
}
