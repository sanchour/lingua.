import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { CEFR_LEVELS, LOG_ACTIVITIES, addMoment, logStudy, saveGoal } from '@/data/journey';
import type { CefrLevel, Goal, LanguageProfile, StudyLog } from '@/data/types';
import { Button, Drawer } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { langName } from './common';

const label = 'mb-2 block text-[12px] font-bold tracking-wide text-ink-faint uppercase';
const input = 'h-11 w-full rounded-xl border border-line bg-raised px-3.5 text-[15px] outline-none transition-colors focus:border-ink';
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromLocalInput = (value: string) => new Date(`${value}T${new Date().toTimeString().slice(0, 5)}`).getTime();

export function Chips<T extends string>({ value, options, onChange }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx('h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors', value === o.id ? 'border-ink bg-inverse text-on-inverse' : 'border-line text-ink-soft hover:text-ink')}
        >
          <UiText source={o.label} />
        </button>
      ))}
    </div>
  );
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <span className={label}><UiText source={title} /></span>
      {children}
    </div>
  );
}

function LanguageField({ languages, value, onChange, all }: { languages: LanguageProfile[]; value: string; onChange: (v: string) => void; all?: boolean }) {
  const translateUi = useUi();
  if (languages.length < 2 && !all) return null;
  return (
    <Field title={translateUi('Language')}>
      <Chips value={value} onChange={onChange} options={[...languages.map((l) => ({ id: l.id, label: langName(l.id) })), ...(all ? [{ id: '*', label: translateUi('All languages') }] : [])]} />
    </Field>
  );
}

/** "Log time": study done outside Lingua, so hours reflect everything. */
export function LogTimeDrawer({ open, onClose, languages, lang }: { open: boolean; onClose: () => void; languages: LanguageProfile[]; lang: string }) {
  const translateUi = useUi();
  const [target, setTarget] = useState(lang);
  const [activity, setActivity] = useState<StudyLog['activity']>('class');
  const [minutes, setMinutes] = useState(45);
  const [date, setDate] = useState(toLocalInput(Date.now()));
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) {
      setTarget(lang);
      setDate(toLocalInput(Date.now()));
      setNote('');
    }
  }, [open, lang]);
  const save = async () => {
    await logStudy({ lang: target, activity, minutes, at: fromLocalInput(date), note: note.trim() || undefined });
    toast({ source: 'Logged {0} minutes of {1}.', values: [String(minutes), String(langName(target))] }, { tone: 'success' });
    onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title={translateUi('Log study time')} description={translateUi('Classes, tutors, conversations, other apps: it all counts.')} footer={<Button block onClick={() => void save()} disabled={minutes <= 0}><UiText source={'Log {0} minutes'} values={[minutes]} /></Button>}>
      <div className="space-y-6">
        <LanguageField languages={languages} value={target} onChange={setTarget} />
        <Field title={translateUi('What')}>
          <Chips value={activity} onChange={setActivity} options={LOG_ACTIVITIES} />
        </Field>
        <Field title={translateUi('How long')}>
          <div className="flex flex-wrap items-center gap-1.5">
            {[15, 30, 45, 60, 90].map((m) => (
              <button key={m} type="button" onClick={() => setMinutes(m)} className={cx('h-9 rounded-full border px-3.5 text-[13px] font-semibold', minutes === m ? 'border-ink bg-inverse text-on-inverse' : 'border-line text-ink-soft')}>
                {m < 60 ? translateUi('{0} min', [m]) : `${m / 60} h`}
              </button>
            ))}
            <input type="number" min={1} max={600} inputMode="numeric" aria-label={translateUi('Minutes')} value={minutes} onChange={(e) => setMinutes(Math.max(0, Math.min(600, Number(e.target.value) || 0)))} className="h-9 w-20 rounded-full border border-line bg-raised px-3 text-center text-[13px] outline-none focus:border-ink" />
          </div>
        </Field>
        <Field title={translateUi('When')}>
          <input type="date" className={input} value={date} max={toLocalInput(Date.now())} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field title={translateUi('Note')}>
          <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={translateUi('Optional')} />
        </Field>
      </div>
    </Drawer>
  );
}

export const MOMENT_CATEGORIES = [
  { id: 'class', label: 'Class' },
  { id: 'tutoring', label: 'Tutoring' },
  { id: 'exam', label: 'Exam or certificate' },
  { id: 'trip', label: 'Trip' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'note', label: 'Note' },
] as const;
export type MomentCategory = (typeof MOMENT_CATEGORIES)[number]['id'];

/** "Add a moment": something worth remembering on the journey, with a photo if you like. */
export function MomentDrawer({ open, onClose, languages, lang }: { open: boolean; onClose: () => void; languages: LanguageProfile[]; lang: string }) {
  const translateUi = useUi();
  const [target, setTarget] = useState(lang);
  const [category, setCategory] = useState<MomentCategory>('conversation');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState(toLocalInput(Date.now()));
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setTarget(lang);
    setTitle('');
    setDetail('');
    setPhoto(null);
    setDate(toLocalInput(Date.now()));
  }, [open, lang]);
  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const save = async () => {
    let photoBlobId: string | undefined;
    if (photo) {
      const { db } = await import('@/data/db');
      photoBlobId = crypto.randomUUID();
      await db.blobs.add({ id: photoBlobId, kind: 'image', mime: photo.type || 'image/jpeg', size: photo.size, blob: photo, createdAt: Date.now() });
    }
    await addMoment({ lang: target, category, title: title.trim(), detail: detail.trim() || undefined, at: fromLocalInput(date), photoBlobId });
    onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title={translateUi('Add a moment')} description={translateUi('A class, an exam, a trip, a first real conversation.')} footer={<Button block onClick={() => void save()} disabled={!title.trim()}><UiText source={'Add to the journey'} /></Button>}>
      <div className="space-y-6">
        <LanguageField languages={languages} value={target} onChange={setTarget} />
        <Field title={translateUi('Kind')}>
          <Chips value={category} onChange={setCategory} options={[...MOMENT_CATEGORIES]} />
        </Field>
        <Field title={translateUi('Title')}>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={translateUi('Passed DELE B1, first call in Russian…')} autoFocus />
        </Field>
        <Field title={translateUi('Details')}>
          <textarea rows={3} className="w-full resize-y rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[15px] outline-none focus:border-ink" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={translateUi('Optional')} />
        </Field>
        <Field title={translateUi('When')}>
          <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field title={translateUi('Photo')}>
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="" className="h-32 rounded-2xl object-cover" />
              <button type="button" aria-label={translateUi('Remove photo')} onClick={() => setPhoto(null)} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-inverse/80 text-on-inverse">
                <X size={14} aria-hidden />
              </button>
            </div>
          ) : (
            <Button variant="secondary" icon={ImagePlus} onClick={() => void pickFile('image/*').then((f) => f && setPhoto(f))}><UiText source={'Add a photo'} /></Button>
          )}
        </Field>
      </div>
    </Drawer>
  );
}

const GOAL_KINDS: Array<{ id: Goal['kind']; label: string }> = [
  { id: 'level', label: 'Reach a level' },
  { id: 'hours-week', label: 'Hours a week' },
  { id: 'words-week', label: 'New words a week' },
  { id: 'books-year', label: 'Books this year' },
];

export function GoalDrawer({ open, onClose, languages, lang, editing, startKind = 'level' }: { open: boolean; onClose: () => void; languages: LanguageProfile[]; lang: string; editing?: Goal | null; startKind?: Goal['kind'] }) {
  const translateUi = useUi();
  const [kind, setKind] = useState<Goal['kind']>('level');
  const [target, setTarget] = useState<string>(lang);
  const [level, setLevel] = useState<CefrLevel>('B1');
  const [amount, setAmount] = useState(5);
  const [by, setBy] = useState('');
  useEffect(() => {
    if (!open) return;
    setKind(editing?.kind ?? startKind);
    setTarget(editing?.lang ?? lang);
    setLevel(editing?.kind === 'level' ? (editing.target as CefrLevel) : 'B1');
    setAmount(editing && editing.kind !== 'level' ? Number(editing.target) : 5);
    setBy(editing?.by ?? '');
  }, [open, lang, editing, startKind]);
  useEffect(() => {
    if (editing) return;
    setAmount(kind === 'hours-week' ? 5 : kind === 'words-week' ? 50 : 12);
    // The reading challenge counts books in every language unless one is picked.
    setTarget(kind === 'books-year' ? '*' : lang);
  }, [kind, editing, lang]);

  const save = async () => {
    await saveGoal({ id: editing?.id, kind, lang: kind === 'books-year' ? target : target === '*' ? lang : target, target: kind === 'level' ? level : amount, by: kind === 'level' && by ? by : undefined, year: kind === 'books-year' ? new Date().getFullYear() : undefined });
    onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title={editing ? translateUi('Edit goal') : translateUi('New goal')} footer={<Button block onClick={() => void save()}>{editing ? translateUi('Save goal') : translateUi('Set goal')}</Button>}>
      <div className="space-y-6">
        <Field title={translateUi('Goal')}>
          <Chips value={kind} onChange={setKind} options={GOAL_KINDS} />
        </Field>
        <LanguageField languages={languages} value={target} onChange={setTarget} all={kind === 'books-year'} />
        {kind === 'level' ? (
          <>
            <Field title={translateUi('Level')}>
              <Chips value={level} onChange={setLevel} options={CEFR_LEVELS.filter((l) => l !== 'A0').map((l) => ({ id: l, label: l }))} />
            </Field>
            <Field title={translateUi('By (optional)')}>
              <input type="date" className={input} value={by} onChange={(e) => setBy(e.target.value)} />
            </Field>
          </>
        ) : (
          <Field title={kind === 'hours-week' ? translateUi('Hours each week') : kind === 'words-week' ? translateUi('New words each week') : translateUi('Books in {0}', [new Date().getFullYear()])}>
            <input type="number" min={1} inputMode="numeric" className={input} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        )}
      </div>
    </Drawer>
  );
}
