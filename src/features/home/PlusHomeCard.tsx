import { Link } from 'react-router';
import { ArrowRight, Gem } from 'lucide-react';
import { useApp } from '@/app/context';
import { hasPlus, PLUS_PRICE } from '@/data/plus';
import { Card } from '@/design/primitives';

/** Lingua+ on Home, until it is had: a quiet note with a way to Settings › Lingua+. */
export function PlusHomeCard() {
  const { settings } = useApp();
  if (hasPlus(settings.meta)) return null;
  return (
    <Card className="p-5 sm:p-6">
      <Link to="/settings/plus" className="group -m-2 flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text">
          <Gem size={20} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[17px] leading-snug font-semibold">Lingua+</span>
          <span className="block text-[13.5px] leading-snug text-ink-soft">Every room, once, for {PLUS_PRICE}. Free keeps Codex and Thesaurus.</span>
        </span>
        <ArrowRight size={17} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </Card>
  );
}
