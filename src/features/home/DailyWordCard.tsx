import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Clock, ExternalLink, Sparkles, Volume2 } from 'lucide-react';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import { addNote, useDecks } from '@/data/decks';
import { useDueSummary } from '@/data/study';
import { Badge, Button, Card, Dialog } from '@/design/primitives';
import { toast } from '@/state/ui';
import { speak } from '@/services/speech/voice';

export interface DailyWord {
  word: string;
  pos?: string;
  gloss: string;
  sentence?: string;
  translation?: string;
}

/** Picks a deterministic daily word based on the date string (YYYY-MM-DD) and installed frequency list / starter words. */
export function getDailyWordKey(lang: string, dateStr: string, count: number): number {
  let hash = 0;
  const seed = `${lang}:${dateStr}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return count > 0 ? hash % count : 0;
}

/**
 * Word of the Day widget (F1524), Quick 2-Minute Review (F1523),
 * and Document Picture-in-Picture floating review window (Slice 2.6).
 */
export function DailyWordCard({ lang }: { lang: string }) {
  const translateUi = useUi();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [quickReviewOpen, setQuickReviewOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const [notifGranted, setNotifGranted] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted');

  const decks = useDecks(lang);
  const due = useDueSummary(lang);

  const dailyWord = useLiveQuery(async (): Promise<DailyWord | null> => {
    // 1. Try starter pack words
    const starter = await db.starterLists.get(lang);
    if (starter?.lemmaFreq && starter.lemmaFreq.length > 0) {
      const idx = getDailyWordKey(lang, todayStr, Math.min(starter.lemmaFreq.length, 500));
      const word = starter.lemmaFreq[idx];
      const [freq, dict] = await Promise.all([
        db.frequency.get(`${lang}:${word}`),
        db.dictEntries.get([packId(lang), word]),
      ]);
      const gloss = freq?.gloss ?? dict?.senses[0]?.glosses[0] ?? 'core vocabulary word';
      const ex = await db.dictExamples.get([packId(lang), word]);
      return {
        word,
        pos: freq?.pos ?? dict?.senses[0]?.pos,
        gloss,
        sentence: ex?.ex?.[0]?.[0],
        translation: ex?.ex?.[0]?.[1],
      };
    }

    // 2. Fallback to frequency table
    const freqCount = await db.frequency.where('id').startsWith(`${lang}:`).count();
    if (freqCount > 0) {
      const idx = getDailyWordKey(lang, todayStr, Math.min(freqCount, 300));
      const found = await db.frequency.where('id').startsWith(`${lang}:`).offset(idx).first();
      if (found) {
        return {
          word: found.norm,
          pos: found.pos,
          gloss: found.gloss ?? 'common word',
        };
      }
    }

    return {
      word: lang === 'es' ? 'sobremesa' : lang === 'fr' ? 'flâner' : lang === 'de' ? 'fernweh' : 'lingua',
      pos: 'noun',
      gloss: 'lingering conversation at the table after a meal',
      sentence: 'Disfrutamos de una larga sobremesa con amigos.',
      translation: 'We enjoyed a long lingering conversation at the table with friends.',
    };
  }, [lang, todayStr]);

  const handleHear = () => {
    if (!dailyWord) return;
    speak(dailyWord.word, lang);
  };

  const handleAddToDeck = async () => {
    if (!dailyWord) return;
    const activeDeck = decks?.find((d) => !d.deletedAt && !d.archived);
    if (!activeDeck) {
      toast('Create a deck in Thesaurus first.', { tone: 'error' });
      return;
    }
    await addNote(activeDeck.id, {
      term: dailyWord.word,
      meaning: dailyWord.gloss,
      example: dailyWord.sentence ? { text: dailyWord.sentence, translation: dailyWord.translation } : undefined,
      tags: ['word-of-the-day'],
      source: 'manual',
    });
    toast({ source: 'Added “{0}” to {1}.', values: [String(dailyWord.word), String(activeDeck.name)] }, { tone: 'success' });
  };

  const requestDailyNotifications = async () => {
    if (typeof Notification === 'undefined') {
      toast('Notifications are not supported in this browser.', { tone: 'error' });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifGranted(true);
      new Notification(`Word of the day: ${dailyWord?.word ?? ''}`, {
        body: dailyWord?.gloss ?? 'Check out today’s featured word in Lingua!',
      });
      toast('Daily word notifications enabled.', { tone: 'success' });
    } else {
      toast('Notification permission was denied.', { tone: 'error' });
    }
  };

  // Document Picture-in-Picture or pop-up review window (Slice 2.6)
  const openFloatingReview = async () => {
    if ('documentPictureInPicture' in window) {
      try {
        const dpip = (window as unknown as { documentPictureInPicture: { requestWindow: (opts: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
        const pipWin = await dpip.requestWindow({ width: 380, height: 480 });
        pipWin.document.title = 'Lingua · Quick Review';
        // Built from elements, not an HTML string: the word and its gloss are data and are never read as markup.
        const doc = pipWin.document;
        const el = (tag: string, css: string, text?: string, parent?: HTMLElement) => {
          const e = doc.createElement(tag);
          e.style.cssText = css;
          if (text !== undefined) e.textContent = text;
          parent?.append(e);
          return e;
        };
        const page = el('div', 'font-family: -apple-system, system-ui, sans-serif; padding: 20px; text-align: center; background: #faf6f0; color: #262220; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;');
        const top = el('div', '', undefined, page);
        el('p', 'font-size: 11px; font-weight: 700; text-transform: uppercase; color: #776c63; letter-spacing: 0.1em;', 'Quick Review · Floating', top);
        el('h2', 'font-size: 26px; margin: 12px 0 4px 0;', dailyWord?.word ?? 'Practice', top);
        el('p', 'color: #5e554e; font-size: 14px;', dailyWord?.gloss ?? '', top);
        const bottom = el('div', '', undefined, page);
        el('p', 'font-size: 13px; color: #776c63; margin-bottom: 12px;', `${due?.due ?? 0} cards due today`, bottom);
        const link = el('a', 'display: block; padding: 10px; background: #c86d51; color: white; border-radius: 12px; font-weight: 600; text-decoration: none;', 'Full Review', bottom) as HTMLAnchorElement;
        link.href = '/thesaurus/study/all?mode=recall';
        link.target = '_blank';
        doc.body.replaceChildren(page);
        return;
      } catch {
        // Fall back to modal
      }
    }
    // Fallback: open Quick Review modal
    setTimerSeconds(120);
    setTimerActive(true);
    setQuickReviewOpen(true);
  };

  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) return;
    const t = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timerActive, timerSeconds]);

  return (
    <>
      <Card className="flex flex-col justify-between p-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-sage-soft text-sage-text">
                <Sparkles size={14} aria-hidden />
              </span>
              <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'Word of the day'} /></p>
            </div>
            <button
              type="button"
              onClick={() => void requestDailyNotifications()}
              title={notifGranted ? translateUi('Daily notification enabled') : translateUi('Turn on daily word notification')}
              className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink"
              aria-label={translateUi('Daily notifications')}
            >
              <Bell size={15} className={notifGranted ? 'text-sage-text fill-sage-text' : ''} aria-hidden />
            </button>
          </div>

          {dailyWord && (
            <div className="mt-3">
              <div className="flex items-baseline gap-2.5">
                <h3 lang={lang} className="font-serif text-[28px] font-semibold text-ink">
                  {dailyWord.word}
                </h3>
                {dailyWord.pos && <Badge>{dailyWord.pos}</Badge>}
                <button
                  type="button"
                  onClick={handleHear}
                  aria-label={translateUi('Hear pronunciation')}
                  className="grid size-7 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink"
                >
                  <Volume2 size={15} aria-hidden />
                </button>
              </div>
              <p className="mt-1 text-[14.5px] leading-snug text-ink-soft">{dailyWord.gloss}</p>
              {dailyWord.sentence && (
                <div className="mt-2.5 rounded-xl border border-line bg-surface/60 p-2.5">
                  <p lang={lang} className="font-serif text-[13.5px] leading-snug text-ink">
                    {dailyWord.sentence}
                  </p>
                  {dailyWord.translation && (
                    <p className="mt-0.5 text-[12px] text-ink-faint italic">{dailyWord.translation}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => void handleAddToDeck()}><UiText source={'Add to deck'} /></Button>
            {dailyWord && (
              <Link
                to={`/thesaurus?tab=dictionary&word=${encodeURIComponent(dailyWord.word)}`}
                className="inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[12.5px] font-semibold text-ink-soft hover:bg-surface hover:text-ink"
              ><UiText source={'Dictionary {0}'} values={[<ExternalLink size={12} aria-hidden />]} /></Link>
            )}
          </div>
          <Button variant="secondary" size="sm" icon={Clock} onClick={() => void openFloatingReview()}><UiText source={'Quick 2-min review'} /></Button>
        </div>
      </Card>

      {/* Quick 2-Minute Review Modal (F1523) */}
      <Dialog
        open={quickReviewOpen}
        onClose={() => setQuickReviewOpen(false)}
        title={translateUi('Quick 2-Minute Review')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-surface p-3">
            <div className="flex items-center gap-2 text-ink-soft">
              <Clock size={16} aria-hidden />
              <span className="text-[13px] font-semibold"><UiText source={'2-Minute Sprint'} /></span>
            </div>
            <span className="font-mono text-lg font-bold tabular-nums text-accent-text">
              {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="rounded-2xl border border-line p-4 text-center">
            <p className="text-[12px] font-bold text-ink-faint uppercase"><UiText source={'Word to review'} /></p>
            <h4 lang={lang} className="mt-1 font-serif text-[32px] font-semibold">
              {dailyWord?.word ?? 'palabra'}
            </h4>
            <p className="mt-2 text-[15px] text-ink-soft">{dailyWord?.gloss}</p>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="ghost" onClick={() => setQuickReviewOpen(false)}><UiText source={'Close'} /></Button>
            <Link
              to="/thesaurus/study/all?mode=recall"
              onClick={() => setQuickReviewOpen(false)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-on-accent"
            ><UiText source={'Continue in full study {0}'} values={[<ExternalLink size={14} aria-hidden />]} /></Link>
          </div>
        </div>
      </Dialog>
    </>
  );
}
