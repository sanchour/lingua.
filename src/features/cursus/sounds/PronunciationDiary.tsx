// The pronunciation diary (6-10): read the same passage aloud now and then, and hear yourself change. Recordings stay on this device,
// their sizes are shown, and each can be deleted. Nothing is scored: the passage is the same, and the ear does the comparing.
import { useEffect, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { passageOf } from '@/core/sounds/passages';
import { daysSince, deleteReading, saveReading, useReadings } from '@/data/diary';
import { db } from '@/data/db';
import { canRecord, useRecorder } from '@/features/speech/useRecorder';
import { SpeakButton } from '@/features/speech/SpeakButton';

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const day = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function Reading({ id, at, bytes, onDelete }: { id: string; at: number; bytes: number; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null;
    void db.blobs.get(id).then((row) => {
      if (row) setUrl((made = URL.createObjectURL(row.blob)));
    });
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [id]);
  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <span className="w-28 text-[14px] font-semibold tabular-nums">{day(at)}</span>
      {url ? <audio src={url} controls className="h-8" aria-label={`Your reading of ${day(at)}`} /> : <span className="h-8 w-48" />}
      <span className="text-[12.5px] text-ink-faint">{size(bytes)}</span>
      <button type="button" aria-label={`Delete the reading of ${day(at)}`} onClick={onDelete} className="ml-auto grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink">
        <Trash2 size={15} aria-hidden />
      </button>
    </li>
  );
}

export function PronunciationDiary({ lang }: { lang: string }) {
  const passage = passageOf(lang);
  const entries = useReadings(lang) ?? [];
  const { status, start, stop } = useRecorder(120_000);
  const [error, setError] = useState<string | null>(null);
  if (!passage || !canRecord()) return null;
  const recording = status === 'recording';
  const since = daysSince(entries);
  const total = entries.reduce((n, e) => n + e.size, 0);

  return (
    <section aria-labelledby="diary-h" className="rounded-3xl border border-line bg-raised p-5">
      <h2 id="diary-h" className="font-serif text-2xl font-semibold">
        Your pronunciation diary
      </h2>
      <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
        Read this passage aloud, then again in a week, and in a month. It is always the same one, so you can hear how you change. {since === null ? 'No reading yet.' : since >= 7 ? `Your last reading was ${since} days ago: time for another.` : `Your last reading was ${since === 0 ? 'today' : `${since} ${since === 1 ? 'day' : 'days'} ago`}.`}
      </p>
      <p lang={lang} dir={lang === 'ar' ? 'rtl' : undefined} className="mt-4 rounded-2xl bg-surface p-4 font-serif text-[18px] leading-relaxed">
        {passage}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SpeakButton lang={lang} text={passage} label="Hear it first" size={18} className="grid size-11 place-items-center rounded-full bg-sunken" />
        <button
          type="button"
          onClick={async () => {
            setError(null);
            try {
              if (recording) {
                const blob = await stop();
                if (blob) await saveReading(lang, blob);
              } else await start();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'The microphone didn’t start.');
            }
          }}
          className={`flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold ${recording ? 'bg-accent-fill text-on-accent' : 'bg-inverse text-on-inverse'}`}
        >
          {recording ? <Square size={15} className="fill-current" aria-hidden /> : <Mic size={16} aria-hidden />}
          {recording ? 'Stop and keep it' : 'Read it aloud'}
        </button>
        {error && <span className="text-[13px] text-accent-text">{error}</span>}
      </div>
      {entries.length > 0 && (
        <>
          <ul className="mt-4 divide-y divide-line/60" aria-label="Your readings">
            {entries.map((e) => (
              <Reading key={e.id} id={e.id} at={e.at} bytes={e.size} onDelete={() => void deleteReading(e.id)} />
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-ink-faint">
            {entries.length} {entries.length === 1 ? 'reading' : 'readings'}, {size(total)} on this device. They are never sent anywhere.
          </p>
        </>
      )}
    </section>
  );
}
