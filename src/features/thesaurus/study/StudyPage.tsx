import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Coffee } from 'lucide-react';
import { useApp } from '@/app/context';
import { shuffle } from '@/core/srs/ludus';
import type { LudusItem } from '@/core/srs/ludus';
import { recordSession } from '@/data/activity';
import { db } from '@/data/db';
import { loadPracticeCards, loadStudySession } from '@/data/study';
import type { StudySession } from '@/data/study';
import type { Card, Deck, Note } from '@/data/types';
import { buttonClasses } from '@/design/primitives';
import { spring } from '@/design/motion';
import { Ludus } from './Ludus';
import type { LudusEntry } from './Ludus';
import { Recall } from './Recall';
import { Summary } from './Summary';
import type { SummaryAction, SummaryStats } from './Summary';

const LESSON_CARDS = 10;
const POOL = 300;

/** A note as a Ludus item; reading-mined notes lend their sentence (with the word located) as an example. */
function toItem(card: Card, note: Note, lang: string): LudusItem {
  let example = note.example;
  if (!example && note.context?.sentence) {
    const at = note.context.sentence.toLocaleLowerCase(lang).indexOf(note.term.toLocaleLowerCase(lang));
    example = { text: note.context.sentence, cloze: at >= 0 ? [at, at + note.term.length] : undefined };
  }
  return { id: card.id, term: note.term, meaning: note.meaning, pos: note.pos, gender: note.gender, example, isNew: card.state === 0 };
}

async function loadLudus(lang: string, deckId: string | null, affectSchedule: boolean): Promise<{ entries: LudusEntry[]; pool: LudusItem[] }> {
  const session = await loadStudySession(lang, deckId);
  const entries: LudusEntry[] = [];
  const seen = new Set<string>();
  const add = (card: Card, note: Note | undefined, schedule: boolean) => {
    if (!note?.meaning || seen.has(note.id) || entries.length >= LESSON_CARDS) return;
    seen.add(note.id);
    entries.push({ card, item: toItem(card, note, lang), schedule });
  };
  for (const card of session.queue) add(card, session.notes.get(card.noteId), affectSchedule);
  // Not enough due? Practise cards seen longest ago, without moving their schedule.
  for (const deck of session.decks.values()) {
    if (entries.length >= LESSON_CARDS) break;
    const practice = await loadPracticeCards(deck.id, LESSON_CARDS);
    for (const card of practice.cards) add(card, practice.notes.get(card.noteId), false);
  }
  const deckIds = [...session.decks.keys()];
  const notes = (await db.notes.where('deckId').anyOf(deckIds).limit(POOL * 2).toArray()).filter((n) => !n.deletedAt && n.meaning);
  const pool = notes.slice(0, POOL).map((n) => ({ id: `pool-${n.id}`, term: n.term, meaning: n.meaning, pos: n.pos, gender: n.gender, example: n.example, isNew: false }));
  return { entries, pool };
}

type Loaded = { kind: 'recall'; session: StudySession; practice?: boolean } | { kind: 'ludus'; entries: LudusEntry[]; pool: LudusItem[] };

/** The cards of a finished session, shuffled, for a practice pass that leaves their schedule alone. */
async function loadPass(cardIds: string[]): Promise<StudySession> {
  const cards = (await db.cards.bulkGet(cardIds)).filter((c): c is Card => Boolean(c && !c.deletedAt));
  const notes = (await db.notes.bulkGet([...new Set(cards.map((c) => c.noteId))])).filter((n): n is Note => Boolean(n && !n.deletedAt));
  const decks = (await db.decks.bulkGet([...new Set(cards.map((c) => c.deckId))])).filter((d): d is Deck => Boolean(d));
  const noteMap = new Map(notes.map((n) => [n.id, n]));
  return { queue: shuffle(cards.filter((c) => noteMap.has(c.noteId)), Math.random), notes: noteMap, decks: new Map(decks.map((d) => [d.id, d])) };
}

export default function StudyPage() {
  const { deckId: param } = useParams();
  const [search] = useSearchParams();
  const mode = search.get('mode') === 'ludus' ? 'ludus' : 'recall';
  const { language, settings } = useApp();
  const lang = language.id;
  const deckId = param && param !== 'all' ? param : null;
  const navigate = useNavigate();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [round, setRound] = useState(0);
  const [pass, setPass] = useState(0);
  const active = useRef({ ms: 0, startedAt: Date.now(), cards: 0 });

  useEffect(() => {
    let alive = true;
    setLoaded(null);
    setSummary(null);
    void (async () => {
      const deck = deckId ? await db.decks.get(deckId) : null;
      if (!alive) return;
      setTitle(deck?.name ?? 'All decks');
      if (mode === 'recall') {
        const session = await loadStudySession(lang, deckId);
        if (alive) setLoaded({ kind: 'recall', session });
      } else {
        const lesson = await loadLudus(lang, deckId, settings.study.ludusAffectsSchedule);
        if (alive) setLoaded({ kind: 'ludus', ...lesson });
      }
    })();
    return () => {
      alive = false;
    };
  }, [lang, deckId, mode, round, settings.study.ludusAffectsSchedule]);

  // The session counts towards today's study time and Ratio's history when the screen closes.
  useEffect(() => {
    const a = active.current;
    return () => {
      if (a.ms < 5000) return;
      void recordSession({ lang, type: mode === 'ludus' ? 'ludus' : 'review', refId: deckId ?? undefined, startedAt: a.startedAt, endedAt: Date.now(), activeMs: a.ms, cards: a.cards });
    };
  }, [lang, mode, deckId]);

  const onActive = useCallback((ms: number) => {
    active.current.ms += ms;
  }, []);
  const back = useCallback(() => navigate(deckId ? `/thesaurus/deck/${deckId}` : '/thesaurus', { replace: true }), [navigate, deckId]);
  const finish = useCallback((stats: SummaryStats) => {
    active.current.cards += stats.cards;
    setSummary(stats);
  }, []);

  if (summary) {
    const ids = summary.cardIds ?? [];
    const actions: SummaryAction[] =
      mode === 'ludus'
        ? [{ label: 'Another lesson', onClick: () => setRound((r) => r + 1) }]
        : [
            ...(ids.length
              ? [
                  {
                    label: 'Practise again',
                    onClick: () =>
                      void loadPass(ids).then((session) => {
                        setLoaded({ kind: 'recall', session, practice: true });
                        setPass((p) => p + 1);
                        setSummary(null);
                      }),
                  },
                ]
              : []),
            { label: 'Practise with Ludus', onClick: () => navigate(`/thesaurus/study/${param}?mode=ludus`, { replace: true }) },
          ];
    return (
      <div className="grid min-h-dvh place-items-center py-10">
        <Summary title={mode === 'ludus' ? 'Lesson complete' : loaded?.kind === 'recall' && loaded.practice ? 'Another pass done' : 'Done for now'} stats={summary} onDone={back} actions={actions} />
      </div>
    );
  }

  if (!loaded) return <div className="min-h-dvh" />;

  const empty = loaded.kind === 'recall' ? !loaded.session.queue.length : loaded.entries.length === 0;
  if (empty) {
    return (
      <motion.div className="grid min-h-dvh place-items-center px-6 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
        <div className="max-w-sm">
          <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-sage-soft text-sage-text">
            <Coffee size={28} aria-hidden />
          </span>
          <h1 className="font-serif text-2xl font-semibold">{loaded.kind === 'recall' ? 'Nothing due right now' : 'No cards to play with yet'}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            {loaded.kind === 'recall' ? 'Every card is resting until its time comes. Ludus lets you practise anyway.' : 'Add a ready-made deck or a few words of your own, then come back.'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={back} className={buttonClasses('secondary', 'md')}>
              Back
            </button>
            {loaded.kind === 'recall' && (
              <Link to={`/thesaurus/study/${param}?mode=ludus`} replace className={buttonClasses('primary', 'md')}>
                Ludus
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return loaded.kind === 'recall' ? (
    <Recall key={`${round}:${pass}`} lang={lang} title={loaded.practice ? `Practice · ${title}` : title} session={loaded.session} practice={loaded.practice} onFinish={finish} onClose={back} onActive={onActive} />
  ) : (
    <Ludus key={round} lang={lang} title={`Ludus · ${title}`} entries={loaded.entries} pool={loaded.pool} onFinish={finish} onClose={back} onActive={onActive} />
  );
}
