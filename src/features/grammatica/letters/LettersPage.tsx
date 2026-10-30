import { interpolate } from '@/core/i18n/messages';
import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Languages, RotateCcw } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import type { Letter, ScriptGroup } from '@/core/script/types';
import { dueLetters, nextGroup, useScriptItems, useScriptProgress } from '@/data/script';
import { Badge, buttonClasses, Card, EmptyState } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { eyebrow } from '../parts';
import { GroupRing, LetterSheet, Sample, useScript } from './parts';
import { shown } from './LettersLesson';

/** `/cursus/alphabets`: a language's alphabet as a chart in groups, each with its lesson. */
export default function LettersPage() {
  const translateUi = useUi();
  const { language } = useApp();
  const lang = language.id;
  const info = getLanguage(lang);
  const script = useScript(lang);
  const progress = useScriptProgress(lang);
  const items = useScriptItems(lang);
  const [open, setOpen] = useState<Letter | null>(null);
  const due = useMemo(() => (script && items ? dueLetters(script, items).length : 0), [script, items]);
  const next = script && progress ? nextGroup(script, progress) : undefined;
  const learned = (g: ScriptGroup) => (progress?.get(g.id)?.step ?? 1) >= 6;

  if (script === undefined) return <div className="h-64" />;
  if (script === null)
    return (
      <>
        <PageHeader title={translateUi('Alphabet')} englishTitle={'Alphabet'} eyebrow={info?.name ?? lang} />
        <Card>
          <EmptyState icon={Languages} title={translateUi('{0} uses the Latin alphabet', [info?.name ?? lang])}><UiText source={'Its letters are the ones you know; Grammatica’s topics and the reader are the place to start.'} /></EmptyState>
        </Card>
      </>
    );

  const sets = [...new Set(script.groups.map((g) => g.set ?? ''))];
  return (
    <>
      <PageHeader title={script.name} eyebrow={translateUi('The alphabet · {0}', [translateUi(info?.name ?? lang)])} englishEyebrow={interpolate('The alphabet · {0}', [info?.name ?? lang])} />
      <p className="mb-6 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">{script.summary}</p>

      {next && (
        <Link
          to={`/cursus/alphabets/${next.id}/lesson`}
          className="group mb-2 flex items-center gap-4 rounded-3xl border border-line/70 bg-surface p-5 transition-colors hover:border-line-strong sm:p-6"
        >
          <span lang={lang} dir={script.rtl ? 'rtl' : undefined} className="grid min-w-16 shrink-0 place-items-center rounded-2xl bg-sage-soft px-3 py-2 text-[30px] leading-tight text-sage-text">
            <Sample letters={next.letters} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cx(eyebrow, 'block text-sage-text')}>
              {progress?.get(next.id)?.lessons ? translateUi('Carry on') : translateUi('Next up')}
              {next.set ? ` · ${next.set}` : ''}
            </span>
            <span className="mt-1 block font-serif text-[21px] leading-tight font-semibold">{next.title}</span>
            {next.note && <span className="mt-1 line-clamp-2 block text-[14px] leading-snug text-ink-soft">{next.note}</span>}
          </span>
          <ArrowRight size={20} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
      <div className="mb-2 flex flex-wrap gap-2">
        <Link to="/cursus/alphabets/review" className={cx(buttonClasses(due ? 'primary' : 'secondary', 'md'), 'flex-1 sm:flex-none', !due && 'pointer-events-none opacity-60')} aria-disabled={!due}>
          <RotateCcw size={17} aria-hidden />
          {due ? translateUi('Review {0} {1}', [due, due === 1 ? 'letter' : 'letters']) : translateUi('No letters due')}
        </Link>
        <Link to="/cursus/grammatica" className={cx(buttonClasses('ghost', 'md'), 'flex-1 sm:ml-auto sm:flex-none')}><UiText source={'Grammatica {0}'} values={[<ArrowRight size={16} aria-hidden />]} /></Link>
      </div>

      {sets.map((set) => (
        <div key={set}>
          {set && <h2 className="mt-12 mb-1 font-serif text-[26px] font-semibold">{set}</h2>}
          {script.groups
            .filter((g) => (g.set ?? '') === set)
            .map((g) => (
              <section key={g.id} className="mt-8 first:mt-6" aria-labelledby={`g-${g.id}`}>
                <div className="mb-3 flex items-center gap-3.5">
                  <GroupRing learned={learned(g)} size={40} />
                  <div className="min-w-0 flex-1">
                    <h3 id={`g-${g.id}`} className="font-serif text-[20px] leading-tight font-semibold">
                      {g.title}
                    </h3>
                    {g.note && <p className="mt-0.5 text-[13.5px] leading-snug text-ink-soft">{g.note}</p>}
                  </div>
                  <Link to={`/cursus/alphabets/${g.id}/lesson${learned(g) ? '?mode=practice' : ''}`} className={cx(buttonClasses(g.id === next?.id ? 'primary' : 'secondary', 'sm'), 'shrink-0')}>
                    {learned(g) ? translateUi('Practise') : progress?.get(g.id)?.lessons ? translateUi('Try again') : translateUi('Learn')}
                  </Link>
                </div>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8" dir={script.rtl ? 'rtl' : undefined}>
                  {g.letters.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(l)}
                        className="flex h-full w-full flex-col items-center gap-0.5 rounded-2xl border border-line/60 bg-surface px-2 py-3 transition-colors hover:border-line-strong active:scale-[0.98]"
                      >
                        <span lang={lang} className={cx('leading-tight', l.character ? 'font-serif text-[30px]' : 'text-[28px]')}>
                          {shown(l)}
                        </span>
                        <span className="text-[12.5px] font-semibold text-ink-soft" dir="ltr">
                          {l.latin}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      ))}

      <div className="mt-12 space-y-2 text-[12.5px] leading-relaxed text-ink-faint">
        {script.notes?.map((n) => (
          <p key={n}>
            <Badge><UiText source={'Left out'} /></Badge> {n}
          </p>
        ))}
        <p><UiText source={'Words come from Lingua’s {0} dictionary (Wiktionary, CC BY-SA). Letters and sounds checked against{1}{2}.'} values={[info?.name ?? lang, ' ', script.sources.map((s, i) => (
            <span key={s.name}>
              {i > 0 && (i === script.sources.length - 1 ? translateUi(' and ') : ', ')}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-soft">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </span>
          ))]} /></p>
      </div>
      <LetterSheet letter={open} script={script} onClose={() => setOpen(null)} />
    </>
  );
}
