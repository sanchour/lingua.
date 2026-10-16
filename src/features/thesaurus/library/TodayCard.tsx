import { Link } from 'react-router';
import { Gamepad2, Layers, Sparkles } from 'lucide-react';
import { useDueSummary } from '@/data/study';
import { buttonClasses, Card } from '@/design/primitives';

/** What's waiting today across every deck, with the two ways to study it. */
export function TodayCard({ lang, hasDecks }: { lang: string; hasDecks: boolean }) {
  const today = useDueSummary(lang);
  if (!today) return <Card className="h-[104px]" />;
  const total = today.due + today.fresh;

  if (!hasDecks) {
    return (
      <Card className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text">
          <Sparkles size={22} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-serif text-lg font-semibold">Your treasury is empty, for now</p>
          <p className="text-sm text-ink-soft">Add a ready-made deck below, make your own, or mark words as Learning while you read.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="font-serif text-5xl leading-none font-semibold tabular-nums">{total}</span>
        <div className="min-w-0">
          <p className="font-serif text-lg leading-tight font-semibold">{total === 0 ? 'All caught up' : total === 1 ? 'card for today' : 'cards for today'}</p>
          <p className="text-sm text-ink-soft">
            {total === 0 ? 'Nothing is due. Practise freely with Ludus, or add new words.' : [today.due && `${today.due} to review`, today.fresh && `${today.fresh} new`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link to="/thesaurus/study/all?mode=ludus" className={buttonClasses('secondary', 'md')}>
          <Gamepad2 size={17} aria-hidden />
          Ludus
        </Link>
        {total > 0 && (
          <Link to="/thesaurus/study/all?mode=recall" className={buttonClasses('primary', 'md')}>
            <Layers size={17} aria-hidden />
            Review
          </Link>
        )}
      </div>
    </Card>
  );
}
