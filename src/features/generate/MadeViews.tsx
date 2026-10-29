// How the later kinds Max makes are shown (6-6b): an interactive story you play, a course you can turn into decks, a drill you answer,
// and sounds to practise. Each is a small screen of its own; the page around them (label, Report) is MakePage's.
import { useState } from 'react';
import { Link } from 'react-router';
import { Layers, RotateCcw } from 'lucide-react';
import type { AdventureBody, CourseBody, DrillBody, PronunciationBody } from '@/core/generate/generate';
import { judge } from '@/core/exercise';
import { Button } from '@/design/primitives';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';

export function Adventure({ body, lang }: { body: AdventureBody; lang: string }) {
  const [at, setAt] = useState(body.start);
  const [trail, setTrail] = useState<string[]>([]);
  const scene = body.scenes[at];
  return (
    <>
      <h2 lang={lang} className="font-serif text-2xl font-semibold">
        {body.title}
      </h2>
      <div className="mt-3 flex items-start gap-2">
        <SpeakButton lang={lang} text={scene.text} size={16} label="Hear the scene" />
        <p lang={lang} className="font-serif text-[18px] leading-relaxed">
          {scene.text}
        </p>
      </div>
      {scene.choices.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="What do you do?">
          {scene.choices.map((c) => (
            <button key={c.label} type="button" lang={lang} onClick={() => (setTrail((t) => [...t, at]), setAt(c.to))} className="rounded-xl border border-line px-3.5 py-3 text-left text-[15px] hover:bg-surface">
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-3" role="status">
          <p className="font-serif text-lg font-semibold">The end.</p>
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => (setAt(body.start), setTrail([]))}>
            Play again
          </Button>
        </div>
      )}
      {trail.length > 0 && scene.choices.length > 0 && (
        <button type="button" onClick={() => (setAt(trail[trail.length - 1]), setTrail((t) => t.slice(0, -1)))} className="mt-3 text-[13px] text-ink-faint underline underline-offset-4 hover:text-ink">
          Go back one step
        </button>
      )}
    </>
  );
}

export function Course({ body, lang, onDeck }: { body: CourseBody; lang: string; onDeck: (name: string, words: Array<{ term: string; meaning: string; example?: string }>) => void }) {
  return (
    <>
      <h2 className="font-serif text-2xl font-semibold">{body.title}</h2>
      <ol className="mt-4 space-y-5">
        {body.lessons.map((l, i) => (
          <li key={l.title} className="rounded-2xl border border-line/70 p-4">
            <p className="text-[12px] font-bold tracking-wide text-ink-faint uppercase">Lesson {i + 1}</p>
            <h3 className="font-serif text-xl font-semibold">{l.title}</h3>
            <p className="mt-1 text-[14px] text-ink-soft">{l.goal}</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {l.words.map((w) => (
                <li key={w.term} className="text-[14.5px]">
                  <span lang={lang} className="font-serif text-[16px] font-semibold">
                    {w.term}
                  </span>{' '}
                  <span className="text-ink-faint">{w.meaning}</span>
                </li>
              ))}
            </ul>
            <p lang={lang} className="mt-3 flex items-center gap-2 font-serif text-[16px] text-ink-soft italic">
              <SpeakButton lang={lang} text={l.sentence} size={15} />
              {l.sentence}
            </p>
            <Button className="mt-3" size="sm" variant="secondary" icon={Layers} onClick={() => onDeck(`${body.title}: ${l.title}`, l.words.map((w, k) => ({ ...w, example: k === 0 ? l.sentence : undefined })))}>
              A deck of this lesson
            </Button>
          </li>
        ))}
      </ol>
    </>
  );
}

export function Drill({ body, lang }: { body: DrillBody; lang: string }) {
  const [given, setGiven] = useState<Record<number, string>>({});
  const [shown, setShown] = useState(false);
  const verdict = (i: number) => (given[i]?.trim() ? judge({ rule: 'accent-blind', expected: body.items[i].answer }, given[i], lang).outcome : null);
  const right = body.items.filter((_, i) => verdict(i) === 'right' || verdict(i) === 'close').length;
  return (
    <>
      <h2 className="font-serif text-2xl font-semibold">{body.topic}</h2>
      <ol className="mt-4 space-y-3">
        {body.items.map((it, i) => {
          const v = shown ? verdict(i) : null;
          return (
            <li key={i} lang={lang} className="flex flex-wrap items-center gap-2 font-serif text-[18px]">
              <span>{it.before}</span>
              <input
                value={given[i] ?? ''}
                onChange={(e) => setGiven({ ...given, [i]: e.target.value })}
                aria-label={`Gap ${i + 1}${it.hint ? `, ${it.hint}` : ''}`}
                placeholder={it.hint}
                className={cx('h-9 w-32 rounded-lg border bg-raised px-2 text-[16px] outline-none focus:border-accent', v === 'right' && 'border-sage', v === 'close' && 'border-sage', v === 'wrong' && 'border-accent')}
              />
              <span>{it.after}</span>
              {shown && v !== 'right' && <span className="font-sans text-[13px] text-ink-faint">→ {it.answer}</span>}
            </li>
          );
        })}
      </ol>
      <div className="mt-5 flex items-center gap-3">
        <Button onClick={() => setShown(true)}>Check</Button>
        {shown && (
          <p className="font-serif text-lg font-semibold" role="status">
            {right} of {body.items.length} right
          </p>
        )}
      </div>
    </>
  );
}

export function PronunciationList({ body, lang }: { body: PronunciationBody; lang: string }) {
  return (
    <>
      <h2 className="font-serif text-2xl font-semibold">{body.sound}</h2>
      <ul className="mt-3 divide-y divide-line/60">
        {body.items.map((it) => (
          <li key={it.text} className="flex items-center gap-3 py-2.5">
            <SpeakButton lang={lang} text={it.text} size={16} label={`Hear ${it.text}`} />
            <span lang={lang} className="font-serif text-[19px] font-semibold">
              {it.text}
            </span>
            {it.note && <span className="text-[14px] text-ink-faint">{it.note}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13.5px] text-ink-soft">
        Say them aloud, then{' '}
        <Link to="/cursus/sounds" className="font-semibold text-ink underline decoration-line-strong underline-offset-4">
          record yourself in Cursus › Sounds
        </Link>{' '}
        and see them beside a real speaker’s.
      </p>
    </>
  );
}

