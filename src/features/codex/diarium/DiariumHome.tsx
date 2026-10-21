import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, PenLine, Shuffle, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { curatedPrompt, otherPrompt } from '@/core/lang/prompts';
import type { WritingPrompt } from '@/core/lang/prompts';
import { createEntry, useJournal } from '@/data/journal';
import type { JournalEntry } from '@/data/types';
import { gradeColor, Ring } from '@/design/charts/Ring';
import { Button, Card } from '@/design/primitives';
import { spring } from '@/design/motion';
import { localDateKey } from '@/lib/format';
import { aiPrompt } from '@/services/llm/journal';

const DAY = 86_400_000;

/** The header's "New entry": a blank page for today. */
export function NewEntryButton() {
  const { language } = useApp();
  const navigate = useNavigate();
  return (
    <Button icon={PenLine} onClick={() => void createEntry(language.id).then((id) => navigate(`/mentis/diarium/${id}`))}>
      New entry
    </Button>
  );
}

/** Consecutive days with an entry, ending today or yesterday. */
function writingStreak(entries: JournalEntry[]): number {
  const days = new Set(entries.filter((e) => e.words > 0).map((e) => e.date));
  let cursor = days.has(localDateKey()) ? Date.now() : Date.now() - DAY;
  let n = 0;
  while (days.has(localDateKey(cursor))) {
    n++;
    cursor -= DAY;
  }
  return n;
}

/** Mentis › Diarium: today's prompt, a few honest numbers, and every entry by month. */
export function DiariumHome() {
  const { language, settings } = useApp();
  const lang = language.id;
  const entries = useJournal(lang);
  const navigate = useNavigate();
  const hasAi = Boolean(settings.apiKeys[settings.llm.provider] && settings.llm.model);
  // The guide's "Write three lines about …" opens here with that as the day's prompt.
  const about = useSearchParams()[0].get('about')?.trim().slice(0, 120) || '';
  const aboutPrompt = (title: string): WritingPrompt => ({ text: title, en: `Write three lines about ${title}.` });
  const [prompt, setPrompt] = useState<WritingPrompt>(() => (about ? aboutPrompt(about) : curatedPrompt(lang, language.level)));
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (about) return setPrompt(aboutPrompt(about));
    setPrompt(curatedPrompt(lang, language.level));
    if (!hasAi || !navigator.onLine) return;
    let alive = true;
    aiPrompt(lang, language.level)
      .then((p) => alive && setPrompt(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [lang, language.level, hasAi, about]);

  const today = entries?.find((e) => e.date === localDateKey());
  const stats = useMemo(() => {
    const list = entries ?? [];
    const graded = list.filter((e) => e.review).slice(0, 5);
    return {
      count: list.filter((e) => e.words > 0).length,
      words: list.reduce((n, e) => n + e.words, 0),
      grade: graded.length ? Math.round(graded.reduce((n, e) => n + e.review!.scores.overall, 0) / graded.length) : null,
      streak: writingStreak(list),
    };
  }, [entries]);

  const months = useMemo(() => {
    const out = new Map<string, JournalEntry[]>();
    for (const e of entries ?? []) {
      const key = e.date.slice(0, 7);
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push(e);
    }
    return [...out];
  }, [entries]);

  const start = async (withPrompt: boolean) => {
    // An empty entry from earlier today is picked up rather than duplicated.
    if (withPrompt && today && !today.words) return navigate(`/mentis/diarium/${today.id}`);
    setStarting(true);
    const id = await createEntry(lang, withPrompt ? prompt : undefined);
    navigate(`/mentis/diarium/${id}`);
  };

  return (
    <div className="space-y-10">
      {/* Today */}
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -top-6 right-5 font-serif text-[160px] leading-none text-sage/15 select-none">
          “
        </span>
        <p className="text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {today && today.words > 0 ? (
          <>
            <h2 className="mt-2 font-serif text-2xl font-semibold">You wrote today</h2>
            <p lang={lang} className="mt-2 line-clamp-2 max-w-xl font-serif text-[17px] leading-relaxed text-ink-soft">
              {today.text}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={`/mentis/diarium/${today.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-inverse px-4 text-sm font-semibold text-on-inverse shadow-elev-1">
                <PenLine size={16} aria-hidden /> Open today’s entry
              </Link>
              <Button variant="ghost" onClick={() => void start(false)} loading={starting}>
                Write another
              </Button>
            </div>
          </>
        ) : (
          <>
            <motion.p key={prompt.text} lang={lang} className="relative mt-3 max-w-xl font-serif text-[22px] leading-snug font-medium sm:text-[26px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
              {prompt.text}
            </motion.p>
            {prompt.en && <p className="relative mt-2 text-[14px] text-ink-faint italic">{prompt.en}</p>}
            <div className="relative mt-6 flex flex-wrap items-center gap-2">
              <Button icon={PenLine} onClick={() => void start(true)} loading={starting}>
                {today ? 'Continue writing' : 'Write about this'}
              </Button>
              <Button variant="ghost" icon={Shuffle} onClick={() => setPrompt(otherPrompt(lang, language.level, prompt.text))}>
                Another prompt
              </Button>
              <Button variant="ghost" onClick={() => void start(false)}>
                Write freely
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Numbers */}
      {stats.count > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Entries', stats.count.toLocaleString()],
            ['Words written', stats.words.toLocaleString()],
            ['Writing streak', `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`],
            ['Recent grade', stats.grade === null ? '—' : String(stats.grade)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-surface px-4 py-3.5">
              <dd className="font-serif text-2xl font-semibold tabular-nums">{value}</dd>
              <dt className="mt-0.5 text-[12px] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
            </div>
          ))}
        </dl>
      )}

      {/* Entries */}
      {entries && entries.length === 0 && (
        <div className="flex flex-col items-center py-6 text-center text-ink-soft">
          <Sparkles size={22} className="mb-3 text-sage-text" aria-hidden />
          <p className="max-w-sm text-[15px] leading-relaxed">
            A few sentences a day is plenty. Write, then let the AI correct and explain{hasAi ? '' : ' (add a free key in Settings › AI)'}; your mistakes become flashcards.
          </p>
        </div>
      )}
      {months.map(([month, list]) => (
        <section key={month} aria-label={month}>
          <h2 className="mb-3 border-b border-line pb-2 font-serif text-xl font-semibold">
            {new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <ul className="-mx-2">
            {list.map((e) => (
              <li key={e.id}>
                <EntryRow entry={e} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryRow({ entry, lang }: { entry: JournalEntry; lang: string }) {
  const date = new Date(`${entry.date}T12:00:00`);
  const first = entry.text.trim().split('\n')[0];
  const review = entry.review;
  return (
    <Link to={`/mentis/diarium/${entry.id}`} className="group flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-surface">
      <div className="w-12 shrink-0 text-center">
        <p className="font-serif text-2xl leading-none font-semibold tabular-nums">{date.getDate()}</p>
        <p className="mt-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase">{date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
      </div>
      <div className="min-w-0 flex-1">
        {first ? (
          <p lang={lang} className="line-clamp-2 font-serif text-[16.5px] leading-snug">
            {first}
          </p>
        ) : (
          <p className="text-[15px] text-ink-faint italic">{entry.prompt ? `“${entry.prompt}”` : 'Not written yet'}</p>
        )}
        <p className="mt-1 text-[12.5px] text-ink-faint">
          {entry.words} {entry.words === 1 ? 'word' : 'words'}
          {review ? ` · ${review.corrections.length} ${review.corrections.length === 1 ? 'correction' : 'corrections'}` : ''}
          {review?.cefr ? ` · ${review.cefr}` : ''}
        </p>
      </div>
      {review ? (
        <Ring value={review.scores.overall / 100} size={42} stroke={4} color={gradeColor(review.scores.overall)} label={`Grade ${review.scores.overall}`}>
          <span className="text-[12px] font-bold tabular-nums">{review.scores.overall}</span>
        </Ring>
      ) : (
        <ArrowRight size={16} className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      )}
    </Link>
  );
}
