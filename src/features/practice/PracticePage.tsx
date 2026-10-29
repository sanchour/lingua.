// Practice (6-4b): sets of exercises made from your own words and from Grammatica, in every kind the engine has: matching games,
// correct the mistake, rewrite, what comes next, drag the words, change a form. Each runs in one session screen.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { attachRetries, correctMistake, dragSentence, gridOfGrammarTable, matchAffixes, matchAntonyms, matchDefinitions, matchPartsOfSpeech, matchPictures, matchSentences, matchSounds, matchSynonyms, planTransforms, predictForms, rewriteFix, tenseTransforms } from '@/core/exercise';
import type { ExerciseSpec } from '@/core/contracts/exercise';
import type { FormGrid, WordFacts } from '@/core/exercise';
import type { Topic } from '@/core/grammar/types';
import { plain } from '@/core/grammar/types';
import { getLanguage } from '@/core/lang/languages';
import { seededRandom, shuffle } from '@/core/srs/ludus';
import { affixesOfWords, itemsOf, practiceNotes, practiceTopics, verbGrids, wordFacts } from '@/data/practice';
import { buttonClasses, Card } from '@/design/primitives';
import { ExerciseSession } from '@/features/exercise/ExerciseSession';

interface Ctx {
  facts: WordFacts[];
  affixes: Array<{ affix: string; meaning: string }>;
  topics: Topic[];
  verbs: Array<{ lemma: string; grids: FormGrid[] }>;
}

interface PracticeSet {
  id: string;
  group: 'words' | 'grammar';
  title: string;
  detail: string;
  /** Needs, said when the set cannot be made yet. */
  needs: string;
  make: () => ExerciseSpec[];
}

const ROUNDS = 3;

/** Rounds of a matching game, each from five different words. */
function rounds(facts: WordFacts[], random: () => number, build: (chunk: WordFacts[], key: string) => ExerciseSpec | null, prefix: string): ExerciseSpec[] {
  const mixed = shuffle(facts, random);
  const out: ExerciseSpec[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const spec = build(mixed.slice(i * 5, i * 5 + 5), `${prefix}-${i}`);
    if (spec) out.push(spec);
  }
  return out;
}

function buildSets(lang: string, c: Ctx): PracticeSet[] {
  const random = () => Math.random();
  const trains = (topic: string) => ({ skill: 'grammar', item: { type: 'grammar', topicId: topic } }) as const;
  const items = () => shuffle(itemsOf(c.topics), random);
  const games = (id: string, title: string, detail: string, needs: string, build: (chunk: WordFacts[], r: () => number, key: string) => ExerciseSpec | null): PracticeSet => ({
    id,
    group: 'words',
    title,
    detail,
    needs,
    make: () => rounds(c.facts, random, (chunk, key) => build(chunk, random, key), id),
  });
  return [
    games('definitions', 'Words and meanings', 'Match each of your words with what it means.', 'words with a meaning in your decks', (w, r, k) => matchDefinitions(w, lang, r, k)),
    games('synonyms', 'Words that mean the same', 'Match each word with a synonym.', 'the dictionary, and words that have synonyms', (w, r, k) => matchSynonyms(w, lang, r, k)),
    games('antonyms', 'Opposites', 'Match each word with its opposite.', 'the dictionary, and words that have opposites', (w, r, k) => matchAntonyms(w, lang, r, k)),
    games('pos', 'Kinds of words', 'Match nouns, verbs, adjectives and the rest.', 'words of different kinds', (w, r, k) => matchPartsOfSpeech(w, lang, r, k)),
    games('sentences', 'Words in sentences', 'Match each word with the sentence it fits.', 'words with an example sentence', (w, r, k) => matchSentences(w, lang, r, k)),
    games('sounds', 'Sounds and words', 'Hear a word, match it with how it is written.', 'a voice for this language', (w, r, k) => matchSounds(w, lang, r, k)),
    games('pictures', 'Words and pictures', 'Match each word with its picture.', 'cards with a picture', (w, r, k) => matchPictures(w, lang, r, k)),
    {
      id: 'affixes',
      group: 'words',
      title: 'Beginnings and endings',
      detail: 'Match prefixes and suffixes with what they do.',
      needs: 'the dictionary, and words made of parts',
      make: () => [matchAffixes(shuffle(c.affixes, random), lang, random, 'affixes-0')].filter((s): s is NonNullable<typeof s> => s !== null),
    },
    {
      id: 'tense',
      group: 'words',
      title: 'Present into past',
      detail: 'Change a verb from one tense to another.',
      needs: 'the dictionary, and verbs in your decks',
      make: () => shuffle(c.verbs, random).flatMap((v) => tenseTransforms(v.grids, lang, random, 2, { skill: 'grammar', item: { type: 'word', wordId: `${lang}:${v.lemma}` } }, `tense-${v.lemma}`, v.lemma)).slice(0, 8),
    },
    {
      id: 'correct',
      group: 'grammar',
      title: 'Correct the mistake',
      detail: 'A sentence with a wrong form: type the right one.',
      needs: 'a grammar for this language',
      make: () => {
        const all = items();
        const main = all.slice(0, 8).map((x, i) => correctMistake(x.item, x.topic, lang, random, `correct-${i}`));
        return attachRetries<ExerciseSpec>(main, all.slice(8, 16).map((x, i) => correctMistake(x.item, x.topic, lang, random, `correct-s${i}`)));
      },
    },
    {
      id: 'rewrite',
      group: 'grammar',
      title: 'Rewrite the sentence',
      detail: 'Write the whole sentence again, without the mistake.',
      needs: 'a grammar for this language',
      make: () => {
        const all = items();
        return attachRetries<ExerciseSpec>(all.slice(0, 6).map((x, i) => rewriteFix(x.item, x.topic, lang, random, `rewrite-${i}`)), all.slice(6, 12).map((x, i) => rewriteFix(x.item, x.topic, lang, random, `rewrite-s${i}`)));
      },
    },
    {
      id: 'predict',
      group: 'grammar',
      title: 'What comes next?',
      detail: 'The forms of a verb in order (I, you, he…): type the next one.',
      needs: 'the dictionary, and verbs in your decks',
      // Only a conjugation is an order: a grammar table lists different words, so its "next" row would be a guess.
      make: () => shuffle(c.verbs, random).flatMap((v) => v.grids.flatMap((g, n) => predictForms(g, `word:${lang}:${v.lemma}`, lang, random, 1, `predict-${v.lemma}-${n}`).map((p) => ({ ...p, trains: { skill: 'grammar', item: { type: 'word', wordId: `${lang}:${v.lemma}` } } as const, body: { ...p.body, lemma: v.lemma } })))).slice(0, 8),
    },
    {
      id: 'forms',
      group: 'grammar',
      title: 'Change the form',
      detail: 'One form of a word into another: singular to plural, and the like.',
      needs: 'a grammar with tables',
      make: () => c.topics.flatMap((t) => planTransforms((t.tables ?? []).map((tb) => gridOfGrammarTable(tb, t.title)), lang, random, 2, { trains: trains(t.id), keyPrefix: `forms-${t.id}` })).slice(0, 8),
    },
    {
      id: 'drag',
      group: 'grammar',
      title: 'Drag the words into order',
      detail: 'Build the sentence from its words by dragging.',
      needs: 'a grammar with sentences and their translations',
      make: () => items().flatMap((x, i) => dragSentence(plain(x.item.s), x.item.en, lang, random, `drag-${i}`, trains(x.topic)) ?? []).slice(0, 8),
    },
  ];
}

export default function PracticePage() {
  const { language } = useApp();
  const lang = language.id;
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const navigate = useNavigate();
  const chosen = useParams().set;
  // A set's own address takes the whole screen; it is made when it opens, so each go is a fresh mix.
  const [running, setRunning] = useState<{ title: string; specs: ExerciseSpec[] } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const random = seededRandom(Date.now() % 2 ** 31);
      const notes = await practiceNotes(lang);
      const [facts, affixes, topics, verbs] = await Promise.all([wordFacts(lang, notes), affixesOfWords(lang, notes), practiceTopics(lang, random), verbGrids(lang, notes)]);
      if (alive) setCtx({ facts, affixes, topics, verbs });
    })();
    return () => {
      alive = false;
    };
  }, [lang]);

  const sets = useMemo(() => (ctx ? buildSets(lang, ctx) : []), [ctx, lang]);
  const ready = useMemo(() => new Map(sets.map((s) => [s.id, s.make().length > 0])), [sets]);

  useEffect(() => {
    const set = sets.find((s) => s.id === chosen);
    const specs = set?.make() ?? [];
    // A set that cannot be made (too few words for it) never opens as an empty lesson.
    setRunning(set && specs.length ? { title: set.title, specs } : null);
  }, [chosen, sets]);

  if (chosen && !running) return <p className="p-10 text-ink-soft">{ctx ? 'This set can’t be made yet.' : 'Getting it ready…'}</p>;
  if (running) return <ExerciseSession title={running.title} lang={lang} specs={running.specs} onClose={() => navigate('/thesaurus/practice')} />;

  const name = getLanguage(lang)?.name ?? lang;
  const section = (group: PracticeSet['group'], title: string) => (
    <section className="mt-8" aria-label={title}>
      <h2 className="mb-3 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sets
          .filter((s) => s.group === group)
          .map((s) => (
            <Card key={s.id} className="flex flex-col p-5">
              <p className="font-serif text-lg font-semibold">{s.title}</p>
              <p className="mt-1 flex-1 text-[14px] leading-snug text-ink-soft">{s.detail}</p>
              {ready.get(s.id) ? (
                <Link to={`/thesaurus/practice/${s.id}`} className={buttonClasses('primary', 'sm') + ' mt-4 self-start'}>
                  Start
                </Link>
              ) : (
                <p className="mt-4 text-[12.5px] text-ink-faint">Needs {s.needs}.</p>
              )}
            </Card>
          ))}
      </div>
    </section>
  );

  return (
    <>
      <PageHeader title="Practice" eyebrow={`${name}, in every kind of exercise`} />
      <p className="max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Sets made from your own words and from Grammatica. Missed ones come back once with another example; in the options (top right) you can ask to be asked how sure you are, or to see the answers only at the end.{' '}
        <Link to="/thesaurus" className="font-semibold text-ink underline decoration-line-strong underline-offset-4">
          Back to Thesaurus
        </Link>
      </p>
      {!ctx ? <p className="mt-8 text-ink-soft">Looking at your words…</p> : (
        <>
          {section('words', 'Your words')}
          {section('grammar', 'Grammar')}
        </>
      )}
    </>
  );
}
