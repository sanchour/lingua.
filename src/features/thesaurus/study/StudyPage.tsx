import { UiText, useUi } from '@/design/i18n/UiText';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Coffee } from 'lucide-react';
import { useApp } from '@/app/context';
import { gridOfFormTable, planTransforms } from '@/core/exercise';
import type { TransformSpec } from '@/core/exercise';
import { formTables } from '@/core/lang/paradigm';
import { packId } from '@/core/packs/format';
import { EXERCISE_KINDS, EXERCISE_NAME, seededRandom, shuffle } from '@/core/srs/ludus';
import { normalizeWord } from '@/core/text/normalize';
import type { LudusItem } from '@/core/srs/ludus';
import { recordSession } from '@/data/activity';
import { db } from '@/data/db';
import { lessonSentences } from '@/data/sentences';
import { loadPracticeCards, loadStudySession } from '@/data/study';
import { currentGrammarTopic } from '@/data/grammar';
import type { StudySession } from '@/data/study';
import type { Card, Deck, Note } from '@/data/types';
import { buttonClasses } from '@/design/primitives';
import { spring } from '@/design/motion';
import { LessonEnd, LessonSetup, recordBest } from '@/features/lesson/kit';
import type { LessonResult } from '@/features/lesson/kit';
import { PlanRoute } from '@/features/plans/PlanRoute';
import { Ludus } from './Ludus';
import { SentencesRound } from './SentencesRound';
import type { LudusEntry } from './Ludus';
import { Recall } from './Recall';
import { Summary } from './Summary';
import type { SummaryAction, SummaryStats } from './Summary';

/** Cards in a Lightning round: it goes round them as long as the minute lasts. */
const LIGHTNING_CARDS = 30;
const LUDUS_KINDS = EXERCISE_KINDS.map((id) => ({ id, label: EXERCISE_NAME[id] }));
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

/** A form to change into another, for each card whose word has an inflection table in the language's pack (6-4). */
async function transformsFor(lang: string, entries: LudusEntry[], lemmas: Map<string, string | undefined>): Promise<Map<string, TransformSpec>> {
  const pack = packId(lang);
  const wanted = entries.map((e) => ({ e, lemma: lemmas.get(e.card.id) ?? e.item.term }));
  const paradigms = await db.dictParadigms.bulkGet(wanted.map((w) => [pack, w.lemma] as [string, string]));
  const random = seededRandom(Date.now() % 2 ** 31);
  const out = new Map<string, TransformSpec>();
  wanted.forEach(({ e, lemma }, i) => {
    const paradigm = paradigms[i];
    if (!paradigm) return;
    const grids = formTables(lang, paradigm.forms, paradigm.pos).tables.map(gridOfFormTable);
    const trains = { skill: 'grammar', item: { type: 'word', wordId: `${lang}:${normalizeWord(e.item.term, lang)}` } } as const;
    const [spec] = planTransforms(grids, lang, random, 1, { trains, keyPrefix: `tf-${e.card.id}`, lemma });
    if (spec) out.set(e.item.id, spec);
  });
  return out;
}

async function loadLudus(lang: string, deckId: string | null, affectSchedule: boolean, size: number): Promise<{ entries: LudusEntry[]; pool: LudusItem[]; off: string[]; transforms: Map<string, TransformSpec> }> {
  const session = await loadStudySession(lang, deckId);
  const entries: LudusEntry[] = [];
  const seen = new Set<string>();
  const lemmas = new Map<string, string | undefined>();
  const add = (card: Card, note: Note | undefined, schedule: boolean) => {
    if (!note?.meaning || seen.has(note.id) || entries.length >= size) return;
    seen.add(note.id);
    lemmas.set(card.id, note.lemma);
    entries.push({ card, item: toItem(card, note, lang), schedule });
  };
  for (const card of session.queue) add(card, session.notes.get(card.noteId), affectSchedule);
  // Not enough due? Practise cards seen longest ago, without moving their schedule.
  for (const deck of session.decks.values()) {
    if (entries.length >= size) break;
    const practice = await loadPracticeCards(deck.id, size);
    for (const card of practice.cards) add(card, practice.notes.get(card.noteId), false);
  }
  // Cards without a sentence of their own borrow one from the dictionary (5.1-3b), so gaps, word banks
  // and translations come into the mix for them too.
  const bare = entries.filter((e) => !e.item.example);
  const lent = await lessonSentences(lang, bare.map((e) => ({ key: e.item.id, term: e.item.term, lemma: lemmas.get(e.item.id) })));
  for (const e of bare) {
    const example = lent.get(e.item.id);
    if (example) e.item = { ...e.item, example };
  }
  const deckIds = [...session.decks.keys()];
  const notes = (await db.notes.where('deckId').anyOf(deckIds).limit(POOL * 2).toArray()).filter((n) => !n.deletedAt && n.meaning);
  const pool = notes.slice(0, POOL).map((n) => ({ id: `pool-${n.id}`, term: n.term, meaning: n.meaning, pos: n.pos, gender: n.gender, example: n.example, isNew: false }));
  // One deck's lesson also leaves out what that deck's settings turned off.
  const off = deckId ? (session.decks.get(deckId)?.config.ludusOff ?? []) : [];
  return { entries, pool, off, transforms: await transformsFor(lang, entries, lemmas) };
}

type Loaded = { kind: 'recall'; session: StudySession; practice?: boolean } | { kind: 'ludus'; entries: LudusEntry[]; pool: LudusItem[]; off: string[]; transforms: Map<string, TransformSpec> };

/** The cards of a finished session, shuffled, for a practice pass that leaves their schedule alone. */
async function loadPass(cardIds: string[]): Promise<StudySession> {
  const cards = (await db.cards.bulkGet(cardIds)).filter((c): c is Card => Boolean(c && !c.deletedAt));
  const notes = (await db.notes.bulkGet([...new Set(cards.map((c) => c.noteId))])).filter((n): n is Note => Boolean(n && !n.deletedAt));
  const decks = (await db.decks.bulkGet([...new Set(cards.map((c) => c.deckId))])).filter((d): d is Deck => Boolean(d));
  const noteMap = new Map(notes.map((n) => [n.id, n]));
  return { queue: shuffle(cards.filter((c) => noteMap.has(c.noteId)), Math.random), notes: noteMap, decks: new Map(decks.map((d) => [d.id, d])) };
}

/** Ludus has a mode of its own, sentences with a gap; everything else studies cards. */
export default function StudyPage() {
  const { deckId: param } = useParams();
  const [search] = useSearchParams();
  const back = param && param !== 'all' ? `/thesaurus/deck/${param}` : '/thesaurus';
  if (search.get('mode') === 'ludus')
    return (
      <PlanRoute feature="ludus" fallback={back}>
        {search.get('kind') === 'sentences' ? <SentencesRound deckId={param && param !== 'all' ? param : null} /> : <CardStudy />}
      </PlanRoute>
    );
  return <CardStudy />;
}

function CardStudy() {
  const translateUi = useUi();
  const { deckId: param } = useParams();
  const [search] = useSearchParams();
  const mode = search.get('mode') === 'ludus' ? 'ludus' : 'recall';
  const lightning = mode === 'ludus' && search.get('lightning') === '1';
  const { language, settings } = useApp();
  const lang = language.id;
  const deckId = param && param !== 'all' ? param : null;
  const navigate = useNavigate();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [ludusEnd, setLudusEnd] = useState<LessonResult | null>(null);
  const [grammarNext, setGrammarNext] = useState<{ id: string; title: string } | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const size = lightning ? LIGHTNING_CARDS : settings.lessons.length;
  const [round, setRound] = useState(0);
  const [pass, setPass] = useState(0);
  const active = useRef({ ms: 0, startedAt: Date.now(), cards: 0 });

  useEffect(() => {
    let alive = true;
    setLoaded(null);
    setSummary(null);
    setLudusEnd(null);
    void (async () => {
      const deck = deckId ? await db.decks.get(deckId) : null;
      if (!alive) return;
      setTitle(deck?.name ?? 'All decks');
      if (mode === 'recall') {
        const session = await loadStudySession(lang, deckId);
        if (alive) setLoaded({ kind: 'recall', session });
      } else {
        const lesson = await loadLudus(lang, deckId, settings.study.ludusAffectsSchedule, size);
        if (alive) setLoaded({ kind: 'ludus', ...lesson });
      }
    })();
    return () => {
      alive = false;
    };
    // The lesson length is read when a lesson is made; changing it applies to the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, deckId, mode, round, lightning, settings.study.ludusAffectsSchedule]);

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

  const finishLudus = useCallback(
    async (result: LessonResult) => {
      active.current.cards += result.answered;
      const previousBest = lightning ? await recordBest(settings.lessons.best, `${lang}:ludus`, result.score ?? 0) : undefined;
      // The language's next grammar topic, offered at the end (3.0-8).
      const next = await currentGrammarTopic(lang, language.level).catch(() => null);
      setGrammarNext(next ? { id: next.topic.id, title: next.topic.title } : null);
      setLudusEnd({ ...result, previousBest });
    },
    [lightning, lang, language.level, settings.lessons.best],
  );

  if (ludusEnd) {
    const actions = lightning
      ? [{ label: 'Play again', onClick: () => setRound((r) => r + 1) }]
      : [
          { label: 'Another lesson', onClick: () => setRound((r) => r + 1) },
          { label: 'Lightning round', onClick: () => navigate(`/thesaurus/study/${param}?mode=ludus&lightning=1`, { replace: true }) },
          { label: 'Sentences with a gap', onClick: () => navigate(`/thesaurus/study/${param}?mode=ludus&kind=sentences`, { replace: true }) },
          ...(grammarNext ? [{ label: `Grammar: ${grammarNext.title}`, onClick: () => navigate(`/cursus/grammatica/${grammarNext.id}`) }] : []),
        ];
    return (
      <div className="grid min-h-dvh place-items-center py-10">
        <LessonEnd
          title={lightning ? translateUi('Time!') : translateUi('Lesson complete')}
          note={lightning ? (ludusEnd.score ? `${ludusEnd.score} right in a minute.` : 'The clock won this time. Another go?') : undefined}
          result={ludusEnd}
          actions={actions}
          onDone={back}
        />
      </div>
    );
  }

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
        <Summary title={mode === 'ludus' ? translateUi('Lesson complete') : loaded?.kind === 'recall' && loaded.practice ? translateUi('Another pass done') : translateUi('Done for now')} stats={summary} onDone={back} actions={actions} />
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
          <h1 className="font-serif text-2xl font-semibold">{loaded.kind === 'recall' ? translateUi('Nothing due right now') : translateUi('No cards to play with yet')}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            {loaded.kind === 'recall' ? translateUi('Every card is resting until its time comes. Ludus lets you practise anyway.') : translateUi('Add a ready-made deck or a few words of your own, then come back.')}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={back} className={buttonClasses('secondary', 'md')}><UiText source={'Back'} /></button>
            {loaded.kind === 'recall' && (
              <Link to={`/thesaurus/study/${param}?mode=ludus`} replace className={buttonClasses('primary', 'md')}><UiText source={'Ludus'} /></Link>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return loaded.kind === 'recall' ? (
    <Recall key={`${round}:${pass}`} lang={lang} title={loaded.practice ? `Practice · ${title}` : title} session={loaded.session} practice={loaded.practice} onFinish={finish} onClose={back} onActive={onActive} />
  ) : (
    <>
      <Ludus
        key={`${round}:${lightning}`}
        lang={lang}
        title={`${lightning ? 'Lightning' : 'Ludus'} · ${title}`}
        entries={loaded.entries}
        pool={loaded.pool}
        deckOff={loaded.off}
        transforms={loaded.transforms}
        onFinish={(r) => void finishLudus(r)}
        onClose={back}
        onActive={onActive}
        onSetup={() => setSetupOpen(true)}
        lightning={lightning}
      />
      <LessonSetup open={setupOpen} onClose={() => setSetupOpen(false)} kinds={LUDUS_KINDS} offKey="ludusOff" />
    </>
  );
}
