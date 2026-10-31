import { UiText, useUi } from '@/design/i18n/UiText';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Clock, ExternalLink, Sparkles, Volume2 } from 'lucide-react';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import { addNote, useDecks } from '@/data/decks';
import { Badge, Button, Card, Dialog } from '@/design/primitives';
import { toast } from '@/state/ui';
import { speak } from '@/services/speech/voice';

const QuickStudy = lazy(() => import('@/features/thesaurus/study/StudyPage'));

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

export async function loadDailyWord(lang: string, todayStr: string, database = db): Promise<DailyWord | null> {
  // 1. Try starter pack words
  const starter = await database.starterLists.get(lang);
  if (starter?.lemmaFreq && starter.lemmaFreq.length > 0) {
    const idx = getDailyWordKey(lang, todayStr, Math.min(starter.lemmaFreq.length, 500));
    const word = starter.lemmaFreq[idx];
    const [freq, dict] = await Promise.all([
      database.frequency.get(`${lang}:${word}`),
      database.dictEntries.get([packId(lang), word]),
    ]);
    const gloss = freq?.gloss ?? dict?.senses[0]?.glosses[0] ?? 'core vocabulary word';
    const ex = await database.dictExamples.get([packId(lang), word]);
    return {
      word,
      pos: freq?.pos ?? dict?.senses[0]?.pos,
      gloss,
      sentence: ex?.ex?.[0]?.[0],
      translation: ex?.ex?.[0]?.[1],
    };
  }

  // 2. Fallback to frequency table: take a bounded sample without full-table scanning
  const prefix = `${lang}:`;
  const sample = await database.frequency.where('id').between(prefix, `${prefix}\uffff`).limit(100).toArray();
  if (sample.length > 0) {
    const idx = getDailyWordKey(lang, todayStr, sample.length);
    const found = sample[idx];
    if (found) {
      return {
        word: found.norm,
        pos: found.pos,
        gloss: found.gloss ?? 'common word',
      };
    }
  }

  return null;
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
  const [deadline, setDeadline] = useState(0);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [notifGranted, setNotifGranted] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted');

  const decks = useDecks(lang);

  const dailyWord = useLiveQuery(() => loadDailyWord(lang, todayStr), [lang, todayStr]);

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
      new Notification(translateUi('Word of the day: {0}', [dailyWord?.word ?? '']), {
        body: dailyWord?.gloss ?? translateUi('Check out today’s featured word in Lingua!'),
      });
      toast('Daily word notifications enabled.', { tone: 'success' });
    } else {
      toast('Notification permission was denied.', { tone: 'error' });
    }
  };

  const startReview = () => { setTimerSeconds(120); setDeadline(Date.now() + 120000); };
  const openFloatingReview = async () => {
    if (!('documentPictureInPicture' in window)) return;
    try {
      const api = (window as unknown as { documentPictureInPicture: { requestWindow: (opts: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
      const pip = await api.requestWindow({ width: 520, height: 680 });
      pip.document.title = translateUi('Lingua · Quick Review');
      const base = pip.document.createElement('base'); base.href = document.baseURI; pip.document.head.append(base);
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => pip.document.head.append(node.cloneNode(true)));
      for (const attr of document.documentElement.attributes) if (attr.name.startsWith('data-') || attr.name === 'style' || attr.name === 'lang') pip.document.documentElement.setAttribute(attr.name, attr.value);
      pip.document.body.style.cssText = 'margin:0;background:var(--bg);color:var(--ink);overflow:auto';
      pip.addEventListener('pagehide', () => { setPipWindow(null); setDeadline(0); }, { once: true });
      startReview(); setPipWindow(pip);
    } catch { toast('Could not open floating review.', { tone: 'error' }); }
  };
  useEffect(() => () => { pipWindow?.close(); }, [pipWindow]);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => { const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); setTimerSeconds(remaining); if (!remaining) clearInterval(timer); };
    const timer = setInterval(tick, 1000); tick();
    return () => clearInterval(timer);
  }, [deadline]);
  const review = <div className="max-h-[70dvh] space-y-4 overflow-y-auto">
    <p role="timer" aria-label={translateUi('2-Minute Sprint')} className="font-mono text-lg font-bold text-accent-text">{Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}</p>
    {timerSeconds > 0 ? <Suspense fallback={<p><UiText source="Loading…" /></p>}><QuickStudy /></Suspense> : <p role="status"><UiText source="Session complete" /></p>}
  </div>;

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
              disabled={!dailyWord}
              onClick={() => void requestDailyNotifications()}
              title={notifGranted ? translateUi('Daily notification enabled') : translateUi('Turn on daily word notification')}
              className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink"
              aria-label={translateUi('Daily notifications')}
            >
              <Bell size={15} className={notifGranted ? 'text-sage-text fill-sage-text' : ''} aria-hidden />
            </button>
          </div>

          {!dailyWord && <p className="mt-3 text-sm text-ink-soft"><UiText source="Install this language’s dictionary to see a word of the day." /></p>}
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
            <Button variant="ghost" size="sm" disabled={!dailyWord} onClick={() => void handleAddToDeck()}><UiText source={'Add to deck'} /></Button>
            {dailyWord && (
              <Link
                to={`/thesaurus?tab=dictionary&word=${encodeURIComponent(dailyWord.word)}`}
                className="inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[12.5px] font-semibold text-ink-soft hover:bg-surface hover:text-ink"
              ><UiText source={'Dictionary {0}'} values={[<ExternalLink size={12} aria-hidden />]} /></Link>
            )}
          </div>
          <Button variant="secondary" size="sm" icon={Clock} onClick={() => { startReview(); setQuickReviewOpen(true); }}><UiText source={'Quick 2-min review'} /></Button>
          {'documentPictureInPicture' in window && <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => void openFloatingReview()}><UiText source="Floating review" /></Button>}
        </div>
      </Card>

      <Dialog open={quickReviewOpen} onClose={() => { setQuickReviewOpen(false); setDeadline(0); }} title={translateUi('Quick 2-Minute Review')} maxWidth="max-w-3xl">
        {quickReviewOpen && review}
        <Link to="/thesaurus/study/all?mode=recall" onClick={() => setQuickReviewOpen(false)} className="mt-4 block text-sm underline"><UiText source="Continue in full study {0}" values={[<ExternalLink size={14} aria-hidden />]} /></Link>
      </Dialog>
      {pipWindow && createPortal(<div className="p-4">{review}</div>, pipWindow.document.body)}
    </>
  );
}
