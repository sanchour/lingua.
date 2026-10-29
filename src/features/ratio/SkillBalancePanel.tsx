// The learner's skills side by side (6-5b), from the one record: which are quiet, how much was done with a hint, and the words
// that are known when shown but not when asked for. Nothing here is shown until there is something to say.
import { Link } from 'react-router';
import { Scale } from 'lucide-react';
import { useSkillBalance } from '@/data/learner';
import { Panel } from './common';

const NAME: Record<string, string> = { vocabulary: 'Words', grammar: 'Grammar', reading: 'Reading', listening: 'Listening', pronunciation: 'Pronunciation', speaking: 'Speaking', writing: 'Writing', translating: 'Translating' };

export function SkillBalancePanel({ lang }: { lang: string }) {
  const data = useSkillBalance(lang);
  if (!data || !data.balance.some((s) => s.answers > 0)) return null;
  const most = Math.max(...data.balance.map((s) => s.answers), 1);
  const quiet = data.balance.filter((s) => s.answers === 0).map((s) => NAME[s.skill]);

  return (
    <Panel title="Skills, side by side" icon={Scale}>
      <p className="mb-3 text-[13.5px] text-ink-soft">The last two weeks. A short bar is a skill you have left quiet; the part with a hint is answers you did not manage alone.</p>
      <ul className="space-y-1.5">
        {data.balance.map((s) => (
          <li key={s.skill} className="flex items-center gap-3 text-[13.5px]">
            <span className="w-28 shrink-0 text-ink-soft">{NAME[s.skill]}</span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`${s.answers} answers, ${s.assisted} with help`}>
              <span className="absolute inset-y-0 left-0 bg-sage" style={{ width: `${(s.answers / most) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${(Math.min(s.assisted, s.answers) / most) * 100}%` }} />
            </span>
            <span className="w-24 shrink-0 text-right text-ink-faint tabular-nums">
              {s.answers ? `${s.answers}${s.assisted ? ` · ${s.assisted} helped` : ''}` : 'nothing yet'}
            </span>
          </li>
        ))}
      </ul>
      {quiet.length > 0 && <p className="mt-3 text-[13.5px] text-ink-soft">Quiet for two weeks: {quiet.join(', ')}.</p>}
      {data.stuck.length > 0 && (
        <div className="mt-4 border-t border-line/60 pt-3">
          <p className="text-[13.5px] text-ink-soft">Known when you see them, missed when you have to write them:</p>
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {data.stuck.map((id) => (
              <span key={id} lang={lang} className="font-serif text-[16px] font-semibold">
                {id.split(':').slice(1).join(':')}
              </span>
            ))}
          </p>
          <Link to="/thesaurus/practice" className="mt-2 inline-block text-[13px] text-accent hover:underline">
            Practise them
          </Link>
        </div>
      )}
    </Panel>
  );
}
