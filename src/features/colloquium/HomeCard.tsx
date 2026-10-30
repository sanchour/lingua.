import { UiText } from '@/design/i18n/UiText';
import { Link } from 'react-router';
import { ArrowRight, MessagesSquare } from 'lucide-react';
import { sceneOfTheDay } from '@/core/colloquium/prompts';
import type { Level } from '@/core/lang/levels';
import { Card } from '@/design/primitives';

const label = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';
const DAY = 86_400_000;

/** Sermo on Home: the scene of the day, opened on its second screen. */
export function ColloquiumHomeCard({ level }: { lang: string; level: Level }) {
  const scene = sceneOfTheDay(level, Math.floor(Date.now() / DAY));

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={label}><UiText source={'Talk today'} /></p>
        <Link to="/mentis/sermo" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline"><UiText source={'Sermo {0}'} values={[<ArrowRight size={14} aria-hidden />]} /></Link>
      </div>
      <Link to={`/mentis/sermo?scene=${scene.id}`} className="group -m-2 flex items-start gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text" aria-hidden>
          <MessagesSquare size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[17px] leading-snug font-semibold">{scene.title}</span>
          <span className="mt-1 block text-[13.5px] leading-snug text-ink-soft"><UiText source={'{0}. Ten minutes with an AI, by voice or text, with your mistakes corrected.'} values={[scene.detail]} /></span>
        </span>
      </Link>
    </Card>
  );
}
