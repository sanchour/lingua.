import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { loadScript } from '@/core/script/load';
import { codePoints } from '@/core/script/reading';
import type { Letter, Script } from '@/core/script/types';
import { Ring } from '@/design/charts/Ring';
import { Drawer } from '@/design/primitives';
import { StrokeOrder } from '@/features/cursus/marks/StrokeOrder';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { JoinedForms, named, shown } from './LettersLesson';

/** A language's alphabet, or null when it has none; `undefined` while loading. */
export function useScript(lang: string): Script | null | undefined {
  const [state, setState] = useState<{ lang: string; script: Script | null }>();
  useEffect(() => {
    let alive = true;
    void loadScript(lang).then((s) => alive && setState({ lang, script: s }));
    return () => {
      alive = false;
    };
  }, [lang]);
  return state?.lang === lang ? state.script : undefined;
}

/** A group's ring: empty, or full with a check once its lesson is passed. */
export function GroupRing({ learned, size = 44 }: { learned: boolean; size?: number }) {
  return (
    <Ring value={learned ? 1 : 0} size={size} stroke={5} color="var(--sage)" label={learned ? 'Learned' : 'Not learned yet'}>
      {learned && <Check size={18} className="text-sage-text" strokeWidth={3} aria-hidden />}
    </Ring>
  );
}

/** A group's first letters as a taste of it: one on a phone, three from `sm` up. */
export function Sample({ letters }: { letters: Letter[] }) {
  return (
    <span className="whitespace-nowrap">
      {letters.slice(0, 3).map((l, i) => (
        <span key={l.id} className={i ? 'hidden sm:inline' : undefined}>
          {i ? ' ' : ''}
          {l.glyph}
        </span>
      ))}
    </span>
  );
}

/** One letter in full: shapes, name, sound and its words, in a side panel (a sheet on a phone). */
export function LetterSheet({ letter, script, onClose }: { letter: Letter | null; script: Script; onClose: () => void }) {
  const lang = script.lang;
  return (
    <Drawer open={Boolean(letter)} onClose={onClose} title={letter ? shown(letter) : ''} description={letter?.latin}>
      {letter && (
        <div className="space-y-6 pb-2">
          <div className="text-center">
            <p lang={lang} className={letter.character ? 'font-serif text-[96px] leading-none' : 'text-[88px] leading-none'}>
              {shown(letter)}
            </p>
            {named(letter) && (
              <p className="mt-2 text-[14px] text-ink-faint">
                called <span lang={lang}>{letter.name}</span>
              </p>
            )}
            <p className="mx-auto mt-2 max-w-sm text-[15.5px] leading-snug text-ink-soft">{letter.sound}</p>
            <p className="mt-2 font-mono text-[12.5px] text-ink-faint" dir="ltr" title="Unicode code points">{codePoints(shown(letter))}</p>
          </div>
          {lang === 'zh' && letter.character && <StrokeOrder char={[...letter.glyph][0]} />}
          {script.joins && <JoinedForms letter={letter} lang={lang} />}
          {letter.words.length > 0 && (
            <ul className="divide-y divide-line rounded-2xl border border-line/70">
              {letter.words.map((w) => (
                <li key={w.w} className="flex items-center gap-3 px-4 py-2.5">
                  <span lang={lang} dir="auto" className="font-serif text-[20px] font-semibold">
                    {w.w}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink-soft">
                    {w.latin} · {w.en}
                  </span>
                  <SpeakButton lang={lang} text={w.w} size={17} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}
