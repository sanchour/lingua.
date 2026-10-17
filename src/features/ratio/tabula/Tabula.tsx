import { useEffect, useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { FileUp, GripVertical, ImageDown, Plus } from 'lucide-react';
import { codeForLanguage, LANGUAGE_NAMES, parseNotionLanguages } from '@/core/parsers/notion';
import { addCapability, importCapabilities, reorderCapabilities, seedCapabilities, useCapabilities } from '@/data/journey';
import { useLanguages } from '@/data/languages';
import { hoursSince, languageSummaries } from '@/data/ratio';
import type { LanguageSummary } from '@/data/ratio';
import type { Capability } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Popover } from '@/design/primitives';
import { downloadFile, pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { hours } from '../common';
import { CapabilityDrawer } from './CapabilityDrawer';
import { renderTableImage } from './image';
import { LEVEL_TINT, SKILLS, STATUS_LABEL } from './levels';

const COLUMNS = 'grid-cols-[22px_minmax(0,1.3fr)_64px_minmax(0,1fr)_minmax(0,1.5fr)_96px_minmax(0,1fr)]';

export function LevelPill({ level }: { level: Capability['level'] }) {
  return (
    <span className="inline-grid h-7 min-w-11 place-items-center rounded-lg px-2 text-[12.5px] font-bold" style={{ background: LEVEL_TINT[level].bg, color: LEVEL_TINT[level].fg }}>
      {level}
    </span>
  );
}

/** Four small segments, one per skill, filled to its level. */
function SkillBars({ capability }: { capability: Capability }) {
  const s = capability.skills;
  if (!s || !Object.values(s).some(Boolean)) return null;
  const order = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return (
    <span className="flex gap-0.5" title={SKILLS.map(([k, n]) => `${n}: ${s[k] ?? '—'}`).join(' · ')}>
      {SKILLS.map(([k]) => (
        <span key={k} className="h-1.5 w-3.5 overflow-hidden rounded-full bg-sunken">
          <span className="block h-full origin-left rounded-full bg-sage" style={{ transform: `scaleX(${s[k] ? order.indexOf(s[k]!) / 6 : 0})` }} />
        </span>
      ))}
    </span>
  );
}

export function Tabula() {
  const rows = useCapabilities();
  const studied = useLanguages();
  const { layout } = useLayout();
  const wide = layout === 'wide';
  const [order, setOrder] = useState<string[]>([]);
  const [open, setOpen] = useState<Capability | null>(null);
  const [summaries, setSummaries] = useState<Map<string, LanguageSummary>>(new Map());
  const [yearHours, setYearHours] = useState(0);
  const [newName, setNewName] = useState('');

  useEffect(() => void seedCapabilities(), []);
  useEffect(() => setOrder((rows ?? []).map((r) => r.id)), [rows]);
  useEffect(() => {
    const ids = (studied ?? []).map((l) => l.id);
    void languageSummaries(ids).then((list) => setSummaries(new Map(list.map((s) => [s.lang, s]))));
    void hoursSince(new Date(new Date().getFullYear(), 0, 1).getTime()).then(setYearHours);
  }, [studied]);

  const byId = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r])), [rows]);
  const ordered = order.map((id) => byId.get(id)).filter((r): r is Capability => Boolean(r));
  const advanced = ordered.filter((r) => r.level === 'C1' || r.level === 'C2').length;
  const live = (c: Capability) => {
    const s = summaries.get(c.id);
    const extra = c.extraHours ?? 0;
    if (!s && !extra) return null;
    return [s ? `${s.known.toLocaleString()} words` : null, hours(((s?.hours ?? 0) + extra) * 60)].filter(Boolean).join(' · ');
  };

  const importNotion = async () => {
    const file = await pickFile('.csv,text/csv');
    if (!file) return;
    try {
      const { added, updated } = await importCapabilities(parseNotionLanguages(await file.text()));
      toast(`Imported: ${added} added, ${updated} updated.`, { tone: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file couldn’t be read.', { tone: 'error' });
    }
  };

  const shareImage = async () => {
    const blob = await renderTableImage(ordered, live);
    downloadFile(new File([blob], 'my-languages.png', { type: 'image/png' }));
  };

  const add = async (close: () => void) => {
    const name = newName.trim();
    if (!name) return;
    const id = codeForLanguage(name);
    if (byId.has(id)) toast(`${LANGUAGE_NAMES[id] ?? name} is already in your table.`);
    else await addCapability(LANGUAGE_NAMES[id] ?? name, id);
    setNewName('');
    close();
  };

  if (!rows) return <div className="h-64 animate-pulse rounded-3xl bg-surface" />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="w-full font-serif text-[19px] sm:w-auto sm:min-w-0 sm:flex-1">
          {ordered.length} {ordered.length === 1 ? 'language' : 'languages'}
          {advanced > 0 && <span className="text-ink-soft"> · {advanced} at C1+</span>}
          <span className="text-ink-soft"> · {hours(yearHours * 60)} this year</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Popover
            label="Add a language"
            placement="bottom-end"
            trigger={(props) => (
              <Button {...props} icon={Plus} variant="secondary">
                Add
              </Button>
            )}
          >
            {(close) => (
              <form
                className="flex w-72 gap-2 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void add(close);
                }}
              >
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Dutch, Arabic" aria-label="Language" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 text-[14.5px] outline-none focus:border-ink" />
                <Button type="submit">Add</Button>
              </form>
            )}
          </Popover>
          <Button variant="ghost" icon={FileUp} onClick={() => void importNotion()}>
            Notion CSV
          </Button>
          <Button variant="ghost" icon={ImageDown} onClick={() => void shareImage()} disabled={!ordered.length}>
            Image
          </Button>
        </div>
      </div>

      {wide && (
        <div className={`grid ${COLUMNS} gap-3 border-b border-line px-3 pb-2 text-[11.5px] font-bold tracking-wide text-ink-faint uppercase`}>
          <span />
          <span>Language</span>
          <span>Level</span>
          <span>Status</span>
          <span>Method</span>
          <span>Started</span>
          <span>In Lingua</span>
        </div>
      )}
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className={wide ? '' : 'space-y-2.5'}
        as="ul"
      >
        {ordered.map((c) => (
          <Row key={c.id} capability={c} wide={wide} live={live(c)} onOpen={() => setOpen(c)} onDrop={() => void reorderCapabilities(order)} />
        ))}
      </Reorder.Group>
      {!ordered.length && <p className="py-10 text-center text-ink-soft">Add the languages you speak, even ones Lingua doesn’t teach.</p>}
      <p className="mt-5 text-[12.5px] text-ink-faint">Drag the handle to reorder. Tap a language for skills, certificates and notes. Notion: export your table as CSV (Dutch or English columns).</p>

      <CapabilityDrawer capability={open} onClose={() => setOpen(null)} live={open ? (live(open) ?? undefined) : undefined} />
    </div>
  );
}

function Row({ capability: c, wide, live, onOpen, onDrop }: { capability: Capability; wide: boolean; live: string | null; onOpen: () => void; onDrop: () => void }) {
  const controls = useDragControls();
  const handle = (
    <button
      type="button"
      aria-label={`Move ${c.name}`}
      onPointerDown={(e) => controls.start(e)}
      className="grid size-7 cursor-grab touch-none place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink active:cursor-grabbing pointer-coarse:size-10"
    >
      <GripVertical size={16} aria-hidden />
    </button>
  );
  const started = c.started ? new Date(`${c.started}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';
  return (
    <Reorder.Item value={c.id} dragListener={false} dragControls={controls} onDragEnd={onDrop} as="li" className="relative list-none bg-bg">
      {wide ? (
        <div className={`grid ${COLUMNS} items-center gap-3 border-b border-line px-3 py-3`}>
          {handle}
          <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-2 text-left">
            <span className="truncate font-serif text-[17px] font-semibold hover:underline">{c.name}</span>
            <SkillBars capability={c} />
          </button>
          <LevelPill level={c.level} />
          <span className="truncate text-[14px] text-ink-soft">{STATUS_LABEL[c.status]}</span>
          <span className="flex min-w-0 flex-wrap gap-1">
            {c.methods.map((m) => (
              <span key={m} className="rounded-full bg-sunken px-2.5 py-0.5 text-[12px] font-semibold text-ink-soft">
                {m}
              </span>
            ))}
          </span>
          <span className="text-[13.5px] text-ink-soft tabular-nums">{started}</span>
          <span className="truncate text-[13px] text-ink-faint">{live ?? '—'}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3.5">
          {handle}
          <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-2">
              <span className="truncate font-serif text-[18px] font-semibold">{c.name}</span>
              <SkillBars capability={c} />
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
              {STATUS_LABEL[c.status]}
              {c.methods.length ? ` · ${c.methods.join(', ')}` : ''}
            </span>
            {live && <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">{live}</span>}
          </button>
          <LevelPill level={c.level} />
        </div>
      )}
    </Reorder.Item>
  );
}
