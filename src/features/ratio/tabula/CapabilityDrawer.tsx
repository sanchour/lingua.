import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { CEFR_LEVELS, removeCapability, saveCapability } from '@/data/journey';
import type { Capability, CapabilityStatus, CefrLevel } from '@/data/types';
import { Button, Drawer } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { LEVEL_TINT, METHOD_OPTIONS, SKILLS, STATUS_HINT, STATUS_LABEL } from './levels';

const label = 'mb-2 block text-[12px] font-bold tracking-wide text-ink-faint uppercase';
const input = 'h-11 w-full rounded-xl border border-line bg-raised px-3.5 text-[15px] outline-none transition-colors focus:border-ink';

function LevelPicker({ value, onChange, allowNone }: { value?: CefrLevel; onChange: (l: CefrLevel | undefined) => void; allowNone?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {CEFR_LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          onClick={() => onChange(allowNone && value === l ? undefined : l)}
          className={cx('h-9 min-w-11 rounded-xl px-2.5 text-[13.5px] font-bold transition-[box-shadow,transform] active:scale-95', value === l ? 'shadow-[0_0_0_2px_var(--ink)]' : 'opacity-80 hover:opacity-100')}
          style={{ background: LEVEL_TINT[l].bg, color: LEVEL_TINT[l].fg }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Everything about one language, tucked into a drawer: level, status, how, skills, certificates. */
export function CapabilityDrawer({ capability, onClose, live }: { capability: Capability | null; onClose: () => void; live?: string }) {
  const translateUi = useUi();
  const [draft, setDraft] = useState<Capability | null>(capability);
  const [custom, setCustom] = useState('');
  // The last row stays in the drawer while it slides away.
  useEffect(() => {
    if (capability) setDraft(capability);
  }, [capability]);
  if (!draft) return null;
  const set = (patch: Partial<Capability>) => setDraft({ ...draft, ...patch });
  const save = async () => {
    await saveCapability({ ...draft, name: draft.name.trim() || (capability?.name ?? draft.id) });
    onClose();
  };
  const toggleMethod = (m: string) => set({ methods: draft.methods.includes(m) ? draft.methods.filter((x) => x !== m) : [...draft.methods, m] });
  const certificates = draft.certificates ?? [];

  return (
    <Drawer
      open={Boolean(capability)}
      onClose={onClose}
      title={draft.name}
      description={live}
      footer={
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => {
              void removeCapability(draft.id);
              onClose();
            }}
          ><UiText source={'Remove'} /></Button>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}><UiText source={'Cancel'} /></Button>
          <Button onClick={() => void save()}><UiText source={'Save'} /></Button>
        </div>
      }
    >
      <div className="space-y-7">
        <div>
          <span className={label}><UiText source={'Name'} /></span>
          <input className={input} value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-label={translateUi('Language name')} />
        </div>
        <div>
          <span className={label}><UiText source={'Overall level'} /></span>
          <LevelPicker value={draft.level} onChange={(l) => l && set({ level: l })} />
        </div>
        <div>
          <span className={label}><UiText source={'Status'} /></span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(Object.keys(STATUS_LABEL) as CapabilityStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ status: s })}
                className={cx('rounded-xl border px-3 py-2.5 text-left transition-colors', draft.status === s ? 'border-ink bg-raised' : 'border-line hover:border-line-strong')}
              >
                <span className="block text-[14px] font-semibold">{STATUS_LABEL[s]}</span>
                <span className="block text-[12.5px] text-ink-soft">{STATUS_HINT[s]}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}><UiText source={'How you learn it'} /></span>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...METHOD_OPTIONS, ...draft.methods])].map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={draft.methods.includes(m)}
                onClick={() => toggleMethod(m)}
                className={cx('h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors', draft.methods.includes(m) ? 'border-ink bg-inverse text-on-inverse' : 'border-line text-ink-soft hover:text-ink')}
              >
                {m}
              </button>
            ))}
            <form
              className="flex"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) toggleMethod(custom.trim());
                setCustom('');
              }}
            >
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={translateUi('Add your own')} aria-label={translateUi('Add a method')} className="h-9 w-32 rounded-full border border-dashed border-line bg-transparent px-3.5 text-[13px] outline-none focus:border-ink" />
            </form>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={label}><UiText source={'Started'} /></span>
            <input type="date" className={input} value={draft.started ?? ''} onChange={(e) => set({ started: e.target.value || undefined })} />
          </label>
          <label>
            <span className={label}><UiText source={'Hours before Lingua'} /></span>
            <input type="number" min={0} inputMode="numeric" className={input} value={draft.extraHours ?? ''} onChange={(e) => set({ extraHours: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })} />
          </label>
        </div>
        <div>
          <span className={label}><UiText source={'Skills'} /></span>
          <div className="space-y-3">
            {SKILLS.map(([key, name]) => (
              <div key={key} className="grid gap-1.5 sm:grid-cols-[90px_1fr] sm:items-center">
                <span className="text-[13.5px] font-semibold text-ink-soft">{name}</span>
                <LevelPicker allowNone value={draft.skills?.[key]} onChange={(l) => set({ skills: { ...draft.skills, [key]: l } })} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <span className={label}><UiText source={'Certificates'} /></span>
          <ul className="space-y-2">
            {certificates.map((c, i) => (
              <li key={i} className="grid grid-cols-[1fr_70px_auto] gap-2">
                <input className={input} value={c.name} placeholder={translateUi('DELE, Goethe…')} aria-label={translateUi('Certificate')} onChange={(e) => set({ certificates: certificates.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className={input} value={c.level ?? ''} placeholder="B2" aria-label={translateUi('Level')} onChange={(e) => set({ certificates: certificates.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)) })} />
                <button type="button" aria-label={translateUi('Remove certificate')} onClick={() => set({ certificates: certificates.filter((_, j) => j !== i) })} className="grid size-11 place-items-center rounded-xl text-ink-faint hover:bg-surface hover:text-ink">
                  <X size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => set({ certificates: [...certificates, { name: '' }] })} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-[13px] font-semibold text-ink-soft hover:bg-surface hover:text-ink"><UiText source={'{0} Add a certificate'} values={[<Plus size={14} aria-hidden />]} /></button>
        </div>
        <div>
          <span className={label}><UiText source={'Notes'} /></span>
          <textarea rows={3} className="w-full resize-y rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[15px] outline-none focus:border-ink" value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} />
        </div>
      </div>
    </Drawer>
  );
}
