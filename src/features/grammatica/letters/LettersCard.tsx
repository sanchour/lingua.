import { Link } from 'react-router';
import { ArrowRight, Languages } from 'lucide-react';
import { nextGroup, useScriptProgress } from '@/data/script';
import { Card } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { eyebrow } from '../parts';
import { GroupRing, Sample, useScript } from './parts';

/**
 * The alphabet's next group, for languages with a script of their own: on Grammatica always (a
 * quiet link once the alphabet is learned), on Home for beginners who haven't finished it.
 */
export function LettersCard({ lang, home, level }: { lang: string; home?: boolean; level?: string }) {
  const script = useScript(lang);
  const progress = useScriptProgress(lang);
  if (!script || !progress) return null;
  const next = nextGroup(script, progress);
  const learned = script.groups.filter((g) => (progress.get(g.id)?.step ?? 1) >= 6).length;
  // Home offers it to beginners, and to anyone who has begun it.
  if (home && (!next || (!progress.size && level !== 'A0' && level !== 'A1'))) return null;

  if (!next) {
    return (
      <Link
        to="/grammatica/letters"
        className="mb-2 flex items-center gap-3 rounded-2xl border border-line/60 bg-surface px-4 py-3 text-[14.5px] font-semibold transition-colors hover:border-line-strong"
      >
        <GroupRing learned size={30} />
        <span className="flex-1">{script.name}: every letter learned</span>
        <span className="text-[13px] text-ink-soft">Practise</span>
        <ArrowRight size={16} className="text-ink-faint" aria-hidden />
      </Link>
    );
  }

  const body = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={cx(eyebrow, 'inline-flex items-center gap-1.5 text-sage-text')}>
          <Languages size={14} aria-hidden /> The alphabet · {script.name}
        </p>
        <Link to="/grammatica/letters" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline">
          {learned} of {script.groups.length} groups <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <Link to={`/grammatica/letters/${next.id}/lesson`} className="group -m-2 flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
        <span lang={lang} dir={script.rtl ? 'rtl' : undefined} className="grid min-w-14 shrink-0 place-items-center rounded-2xl bg-sage-soft px-2.5 py-1.5 text-[26px] leading-tight text-sage-text">
          <Sample letters={next.letters} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold text-ink-faint">
            {progress.get(next.id)?.lessons ? 'Carry on' : learned ? 'Next up' : 'Start here'}
            {next.set ? ` · ${next.set}` : ''}
          </span>
          <span className="block font-serif text-[17px] leading-snug font-semibold">{next.title}</span>
          {!learned && <span className="mt-0.5 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">{script.summary}</span>}
        </span>
        <ArrowRight size={18} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </>
  );
  return home ? <Card className="p-5 sm:p-6">{body}</Card> : <div className="mb-2 rounded-3xl border border-line/70 bg-surface p-5 sm:p-6">{body}</div>;
}
