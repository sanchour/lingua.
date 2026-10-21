import { Link } from 'react-router';
import { ArrowRight, MessageCircle, MessagesSquare } from 'lucide-react';
import { SCENE_INFO, sceneOfTheDay } from '@/core/colloquium/prompts';
import type { Level } from '@/core/lang/levels';
import { useChats } from '@/data/chats';
import { Card } from '@/design/primitives';

const label = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';
const DAY = 86_400_000;

/**
 * Colloquium on Home, the way in on a phone (it has no place in the header): a chat from the last
 * two days to carry on, or the scene of the day.
 */
export function ColloquiumHomeCard({ lang, level }: { lang: string; level: Level }) {
  const chats = useChats(lang);
  if (chats === undefined) return null;
  const now = Date.now();
  const recent = chats.find((c) => c.messages.length > 1 && now - c.updatedAt < 2 * DAY);
  const scene = sceneOfTheDay(level, Math.floor(now / DAY));
  const info = SCENE_INFO[scene];

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={label}>{recent ? 'Carry on talking' : 'Talk today'}</p>
        <Link to="/mentis/sermo" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline">
          Sermo <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <Link to={recent ? `/mentis/sermo/chat/${recent.id}` : `/mentis/sermo?scene=${scene}`} className="group -m-2 flex items-start gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text" aria-hidden>
          {recent ? <MessageCircle size={20} /> : <MessagesSquare size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[17px] leading-snug font-semibold">{recent ? recent.title : info.title}</span>
          {recent ? (
            <span lang={lang} className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">
              {recent.messages.at(-1)?.text}
            </span>
          ) : (
            <span className="mt-1 block text-[13.5px] leading-snug text-ink-soft">{info.detail}. Ten minutes with an AI, by voice or text, with your mistakes corrected.</span>
          )}
        </span>
      </Link>
    </Card>
  );
}
