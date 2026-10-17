# Grammatica: the grammar section (plan)

Status: **planned** for Lingua 2.0. Nothing here is built yet, except the inflection tables that
language packs v6 already carry (the word drawer's *Forms*).

## Goal

Every language gets a full grammar companion:
- short, warm explanations;
- reference tables you can browse;
- interactive drills that adapt to you;
- progress that shows what you have mastered, mapped to CEFR levels.

Grammar should never feel like a separate textbook. It is tied into the rest of the app:
- it uses the words you already know;
- it uses sentences from your own books and podcasts;
- the word drawer links straight to the right lesson.

## Where it lives

- **Desktop:** a sidebar section, *Grammatica*, between Thesaurus and Sonus.
- **iPhone:** a segmented control at the top of Thesaurus, *Words · Grammar*, so the tab bar keeps five tabs.
- **Links from elsewhere:**
  - Codex: the word drawer's Forms tab (*"About the preterite →"*).
  - Ludus: a feedback note after a grammar mistake.
  - Home: a "today's grammar" card when a topic is due.
  - Ratio: grammar progress on the Overview and in Tabula.

## Content model

```
public/grammar/<lang>.v1.json.gz   lazy-loaded per language, cached by the service worker
{
  lang, version,
  units: [{ id, title, level: 'A1'…'C1', topics: [topicId] }],
  topics: {
    [id]: {
      title, level, summary,              // one-line "what it's for"
      explain: Block[],                   // short paragraphs, tips, "watch out" boxes
      tables: TableSpec[],                // generated from paradigms, or written out
      patterns: Pattern[],                // what the drills ask (see below)
      related: [topicId],
      tags: string[]                      // paradigm tags this topic covers, e.g. ['past', 'preterite']
    }
  }
}
```

- **Topic map per language (curated):** about 40–70 topics for each of the current ten languages, ordered A1 → C1. Examples:
  - **Spanish:** ser/estar, present (regular, stem-changing), preterite vs imperfect, the subjunctive.
  - **Russian:** the six cases (singular, then plural), verbs of motion, aspect.
  - **German:** cases and articles, adjective endings, word order (V2, verb-final), Perfekt vs Präteritum.
- **Explanations:** written by hand for the topic maps (with help from the AI, then reviewed). They stay short: three to six small blocks per topic. These texts are original. They are not copied from textbooks.
- **Tables:**
  - **Generated** from the v6 paradigms of a model word, such as hablar, comer and vivir for Spanish present tenses, through `core/lang/paradigm.ts` (the same code as the drawer's Forms).
  - **Written out** for closed sets such as articles, pronouns and prepositions with cases.
  - **"Your words":** the same table filled with a verb from your own deck.
- **Examples:**
  - Pack examples (Wiktionary) whose form carries the topic's tags.
  - Sentences from your own library: dictForms descriptions mark, say, a preterite form, and the sentence it appears in becomes an example.
  - Tatoeba (CC-BY), bundled per language in the grammar file with attribution.

## Exercises

All exercises are pure generators in `core/grammar/drills.ts` (deterministic for a seed, like `core/srs/ludus.ts`). They are rendered by Ludus-style components.

| Drill | Example | Source |
|---|---|---|
| Conjugate | *nosotros · comer (preterite)* → type **comimos** | paradigms |
| Decline | *der Hund → dative plural* → **den Hunden** | paradigms |
| Pick the form | gap in a real sentence, four forms of the same word | examples + paradigms |
| Transform | present → past, singular → plural, statement → question | paradigms + patterns |
| Word order | build the sentence from tiles (German V2, Russian freedom) | examples |
| Article / gender | which article? (already in Ludus) | packs |
| Spot the mistake | one wrong ending in a sentence; tap it | generated |
| Free sentence | write a sentence using the topic; AI checks it (optional, with a key) | Diarium's corrector |
| Translate in | an English sentence → the language, tiles first, then typed | examples |

### How a lesson progresses (Lingua 3.0, at the user's request)

Each topic climbs the same five steps, so a learner meets a form before they must produce it:

1. **Recognise:** which of these is the preterite? (tap one of four)
2. **Pick:** the gap in a real sentence, four forms of the same word.
3. **Build:** type the form (conjugate, decline), with the table one tap away.
4. **Use:** transform a sentence, put tiles in order, spot the mistake.
5. **Say it yourself:** translate into the language, or (with an AI key) a free sentence.

- A lesson is about 12 items: new items of the current step mixed with due ones from earlier
  steps and topics, ending with a two-minute review of what went wrong.
- Every mistake gets a one-line explanation of the rule it broke, drawn from the topic's
  explanation ("-ar verbs: nosotros → -amos"), and the item comes back in the same lesson.
- A topic's next step unlocks at 80 % right; the next topic when the topic is mastered (or by the
  placement check). Items stay FSRS cards, so mastered topics return for review.

### Writing letters and characters (alphabets)

- Trace, then write from memory, on a canvas with pointer events (finger, pen or mouse).
- Stroke data: KanjiVG (CC BY-SA) for kana and kanji, Make Me a Hanzi (LGPL / Arphic) for hanzi,
  hand-drawn stroke paths for Cyrillic, Greek, Hangul jamo and Arabic letters (each joined form).
- A stroke is checked by resampling it and comparing with the expected stroke: order, direction,
  start point and shape (a small Fréchet-style distance). Hints: the next stroke's start glows
  after a miss; three misses show it animated.
- Letters are FSRS items (`mode: 'writing'`), with their own mastery ring beside reading.

## Progress and tracking

- **Each topic** has drill items, such as (verb, tense, person) or (noun, case, number). Each item is an FSRS card in a hidden grammar deck per language, so the review rhythm matches the vocabulary.
- **Mastery per topic** is the share of its items that are mature (interval ≥ 21 days). It shows as rings on the unit map.
- **Unit map:** an illustrated path like the vocabulary journey, A1 → C1, with "You are here".
- **Placement:** an optional 10-minute check at the start skips the topics you already know.
- **Data** (Dexie v6+):
  - `grammarItems` (`[lang+topic+key]`, FSRS fields).
  - `grammarProgress` (`[lang+topic]`: seen, mastery, lastStudied).
  - Reviews go to `reviewLogs` with `mode: 'grammar'`, so Ratio counts them.
- **Ratio:** time and accuracy per topic, weakest topics, and topics mastered per month. Tabula gains a Grammar column with the CEFR level reached.

## Steps

1. Grammar file format, loader and caching. A topic browser with explanations and tables (read-only). Spanish and German first, as the reference languages.
2. Drill generators and the drill screen (conjugate, decline, pick the form, word order). Then FSRS grammar items and mastery rings.
3. Topic maps and explanations for the other eight languages, then for the Lingua 2.0 languages.
4. Library examples, links from the word drawer, Home and Ludus, the placement check, and Ratio and Tabula.
5. Transform, spot-the-mistake and AI free-sentence drills; the five-step lesson progression above.
6. Alphabets with sound, then writing practice (tracing and from memory), as in the section above.

## Open questions

- Arabic, Mandarin, Japanese and Korean (Lingua 2.0) need topic shapes of their own: particles, measure words, verb classes and politeness levels instead of conjugation tables. The format above allows written-out tables and pattern drills, so it doesn't need to change.
- Hungarian has 18 cases plus vowel harmony. The decline drill needs harmony-aware distractors.
