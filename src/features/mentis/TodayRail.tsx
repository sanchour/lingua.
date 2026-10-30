import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, MessagesSquare, PenLine } from 'lucide-react';
import { useApp } from '@/app/context';
import { talkPath, todayPrompt } from '@/core/mentis/today';
import { createEntry } from '@/data/journal';
import { Button, Card } from '@/design/primitives';
import { useRecent } from './useRecent';

const DAY = 86_400_000;
const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

/**
 * Mentis's right rail on every tab: one thing to write and one to talk about today, at your level,
 * from what you read, watched and listened to this week. On Diarium, whose page already has the
 * day's prompt, only a prompt about this week is repeated.
 */
export function TodayRail({ inDiarium = false }: { inDiarium?: boolean }) {
  const translateUi = useUi();
  const { language } = useApp();
  const lang = language.id;
  const recent = useRecent(lang);
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  if (!recent) return <div className="h-80" />;
  const { write, talk } = todayPrompt(lang, language.level, recent, Math.floor(Date.now() / DAY));

  const startWriting = async () => {
    setStarting(true);
    const id = await createEntry(lang, { text: write.text, en: write.en });
    navigate(`/mentis/diarium/${id}`);
  };

  return (
    <aside aria-label={translateUi('Today’s prompt')} className="space-y-3 lg:sticky lg:top-12">
      <p className={label}><UiText source={'Today’s prompt'} /></p>
      {(!inDiarium || write.about) && (
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase"><UiText source={'{0} Write'} values={[<PenLine size={14} aria-hidden />]} /></p>
          {write.about ? (
            <p className="mt-2 text-[15px] leading-snug">{write.en}</p>
          ) : (
            <>
              <p lang={lang} className="mt-2 font-serif text-[18px] leading-snug font-medium">
                {write.text}
              </p>
              {write.en !== write.text && <p className="mt-1 text-[13px] leading-snug text-ink-soft">{write.en}</p>}
            </>
          )}
          <Button className="mt-4" size="sm" icon={PenLine} loading={starting} onClick={() => void startWriting()}><UiText source={'Start writing'} /></Button>
        </Card>
      )}
      <Card className="p-5">
        <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em] text-accent-text uppercase"><UiText source={'{0} Talk'} values={[<MessagesSquare size={14} aria-hidden />]} /></p>
        <p className="mt-2 font-serif text-[18px] leading-snug font-semibold">{talk.title}</p>
        <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{talk.detail}</p>
        <Link to={talkPath(talk)} className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-accent-text hover:underline"><UiText source={'Open in Sermo {0}'} values={[<ArrowRight size={15} aria-hidden />]} /></Link>
      </Card>
      {recent.length === 0 && <p className="px-1 text-[12.5px] leading-snug text-ink-faint"><UiText source={'Read, watch or listen to something this week and the prompts will be about it.'} /></p>}
    </aside>
  );
}
