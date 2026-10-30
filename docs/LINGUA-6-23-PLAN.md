# 6-23 · Tools for each language: the deep plan

**Written 2026-10-30 (Claude Sonnet 5.5), after the user reopened the step: "I want all done deeply."** Step 6-23 was first built in
seven light pushes (0.6.0-alpha.120 to .129). They are real and they stay, but most of them are short hand-written item sets and
small tools. This plan is what "done deeply" means, entry by entry. All 51 entries of 6-23 are open again in
[LINGUA-6-FEATURES.md](LINGUA-6-FEATURES.md) until their own "done when" below is met. Nothing here is built yet.

## 0 · What the light version left, in one list

| Light version now | What is missing |
|---|---|
| Hand-written MCQ sets in Cursus › Marks (`core/script/marks.ts`), 2 to 16 items per topic | Real Grammatica topics (tables, comparisons, visuals) whose sentences come from the pack and are checked by the grammar test; exercises made from the data (dictionary forms, pack sentences), not typed by hand; a source for every claim |
| Chinese conversion character by character (Unihan) | Phrase-level conversion (OpenCC), Taiwan and Hong Kong forms, a "read this text in Traditional" choice in the reader |
| Stroke order for the 1,000 most used Mandarin characters and kanji | Every character that has data (about 9,500 hanzi, about 3,000 kanji), stroke names and rules, the 214 radicals, component trees, kana |
| Write pad compares each stroke with the real one, once, at the end | Feedback while writing, stroke order and count checked as a whole, size-tolerant, tested on noisy input |
| Kanji readings shown in romaji; kun readings only in one quiz | Readings in kana with okurigana, which reading a word uses, grade, JLPT level, frequency |
| Hanja lookup from Unihan only | Sino-Korean words with their hanja from the dictionary, word families sharing a hanja |
| Tone quiz reads marks only | Hearing tones, tone pairs, sandhi, neutral tone, Cantonese tones |
| Arabic roots: 8 by hand and 192 from Wiktionary | A root for most dictionary words (a tested root finder), word families, verb forms I to X with meanings, links to the word graph |
| Arabic dialects, registers: a handful of items | A dialect table from Wiktionary's dialect sections, a phrasebook per dialect, register pairs, labelled for review |
| Russian, Romance, East Asian: 10 to 40 items per language | The topics, tables and exercise sets that make a learner able to use the thing (see tracks C, D, E) |
| Transliteration: one scheme per language, on or off, fading | Several schemes per language (BGN, ISO 9, ALA-LC; Hepburn, Kunrei; RR, McCune–Reischauer; DIN, ALA-LC, chat Arabic), a choice per surface (reader, cards, dictionary, lessons) |
| Unicode reference: code points in the letter sheet | A character reference page with names, blocks, case and normalisation pairs, lookalike warnings |

## 1 · The rules for doing it deeply

1. **No content without a source.** Every table, rule and item set names where it was checked (a grammar, a standard, a dictionary,
   Unicode, Wiktionary tags). A Grammar module's `sources` and `notes` fields already exist; data files carry a `sources` field.
2. **Content that can be made from data is made from data.** Forms from the dictionary's paradigms, sentences from the pack and
   Tatoeba, readings from Unihan and KANJIDIC2, roots from Wiktionary, regional words from Wiktionary's labels. Hand-written
   content is for what no dataset has (register pairs, politeness, the way a rule is explained) and goes through section 7's review.
3. **Real Grammatica topics, not side quizzes.** New teaching goes into `core/grammar/topics/<lang>.ts` (examples first, rule, tables,
   `compare`, `regionalNotes`, `formalityPairs`, `rightWrongPairs`, `decisionTree`, `wordOrder`, `timeline`, `morphology`), each
   topic with at least 12 items whose sentences are in the pack (the grammar test enforces it) and three wrong forms. The Marks
   tab keeps only what is not grammar: scripts, characters, tools, and quick drills made from data.
4. **Exercises use the shared kinds** (`core/exercise`, `contracts/exercise.ts`: `transform`, `correct-mistake`, `drag-drop`,
   `match-*`, `build`, `type`, `cloze`), so they appear in Practice, Ludus and lessons (6-14) with no second implementation.
5. **Every push is looked at**: 1280, 1440 and 1366×768, light and dark, and Arabic right to left; a screenshot check noted in the
   push. Items that are only unit-tested do not count as done.
6. **Size budget.** Every data file is lazy, fetched on first use, cached by a runtime rule, with its size recorded in
   DECISIONS. Total new data under 40 MB compressed, none of it precached; the largest (strokes) is sharded.
7. **Offline.** Each tool states whether it works offline after first use, and says so on screen when it needs a connection.
8. **Desktop only**, as always: no phone work.

## 2 · Before building: T0, the data checks (one push, findings written into this file)

What this plan assumes, to check first (each is a short script run; a "no" changes the track below it):

| Check | Why | Already known |
|---|---|---|
| OpenCC data (Apache-2.0): `STCharacters`, `STPhrases`, `TWPhrases`, `HKVariants` size when compiled | Track A3 | not fetched |
| UnicodeData.txt, Blocks.txt, Scripts.txt, `confusables.txt` | Track A1 | not fetched |
| Make Me a Hanzi in full (9,574 characters, 30 MB raw) and KanjiVG's `kanjivg-main` (about 6,500 kanji and kana): can they be sharded and gzipped under 8 MB together? | Track B1 | 1,000 characters is 1 MB gzipped, so full is about 9 MB: needs path compression |
| KANJIDIC2 (EDRDG, CC BY-SA 4.0): grade, JLPT, frequency, readings in kana, meanings | Track B4 | not fetched |
| Korean: does the Korean Wiktionary dump list hanja per word (the `ko-hanja` and `hanja` templates)? The education-hanja list (1,800): is it in Unihan or in Wiktionary? | Track B5 | not checked |
| CC-CEDICT (CC BY-SA) for `CL:` classifiers | Track E2 | **Checked: the head templates of Wiktionary's Mandarin nouns carry no classifier** (0 of 91,611; a look at other fields is part of T0), so CC-CEDICT or sentence mining is needed |
| Wiktionary dialect sections as separate dumps (Egyptian `arz`, Levantine `apc`, Gulf `afb`, Moroccan `ary`, Iraqi `acm`): size and coverage | Track F4 | not fetched |
| Root information for Arabic | Track F3 | **Checked: only 9 root categories and 192 root templates**, so roots for most words must come from a root finder |
| Voices for audio comparisons | Tracks B6, D4 | **Checked: Piper has only fr, es (Spain, Mexico), de, ru and zh voices.** No Portuguese, Japanese, Korean or Arabic. Portuguese audio uses the device's `speechSynthesis` voices (pt-PT, pt-BR) when installed and says so when not; Arabic dialect audio is not possible and is not promised |
| Does `core/lang/japanese.ts` and the Korean paradigms give conjugations for the converters (plain to polite)? | Track E1 | Japanese deinflection exists; conjugating forward needs checking |

**Done when:** a `docs/6-23-DATA.md` with each row's result (size, licence, coverage, the script that makes it), and this plan
amended where a result changes it.

## 3 · The tracks

Each track is a list of pushes. "Done when" is what makes its entries tickable. Entries are in `LINGUA-6-FEATURES.md`.

### Track A · Scripts for every language (entries F1298, F1299, F1300, F1301, F1302, F1303, F1304, F1305, F1306, F1334, F1366, F1371)

- **A1 · Unicode character reference (F1306).** A page `/cursus/characters` (from Marks and the letter sheet): every character of the
  scripts Lingua teaches, grouped by block, with code point, official name, category, script, case pair, NFC and NFD, UTF-8
  bytes, how to type it (links to Typing layouts), and a lookalike warning from `confusables.txt` (Latin a, Cyrillic а, Greek α).
  Search by character, by name or by code point. For CJK, the Unihan data already in `public/chars`. Data: `public/chars/unicode/<script>.json`, built by
  `scripts/script/unicode.ts`. **Done when:** a learner can paste any text and see every character in it explained, and a test
  checks the names against `UnicodeData.txt` for all characters of the alphabets.
- **A2 · Transliteration schemes and controls (F1298, F1300, F1301, F1371).** One engine, `core/script/translit/<script>.ts`, with
  named schemes: Russian (BGN/PCGN, ISO 9, ALA-LC, a passport scheme), Greek (ELOT 743, ISO 843), Arabic (DIN 31635, ALA-LC, IJMES,
  Buckwalter, plain, "chat Arabic"), Japanese (Hepburn, Kunrei-shiki, Nihon-shiki, with long vowels as macrons, doubled or `ou`), Korean (Revised
  Romanization, McCune–Reischauer, Yale), Mandarin (pinyin with marks or numbers, Zhuyin, Wade–Giles), Georgian (national 2002, ISO 9984), Cantonese (Jyutping, Yale). A
  setting per language for the scheme, and a separate setting for each surface: reader, cards, dictionary, lessons, subtitles. The
  reading is shown over, under, or in a hover; "reveal this word" on a click; fading by word state (done) and by lesson. Golden tests per scheme from published
  examples. **Done when:** every scheme has golden tests from its standard's own examples, the schemes are chosen in Settings › Reading
  and honoured in every surface, and F1300 (reading with no transliteration) is a visible mode with a "check yourself" reveal.
- **A3 · Script conversion (F1299).** Chinese: OpenCC's phrase dictionaries (s2t, t2s, s2tw, s2twp, s2hk, tw2s, hk2s) compiled to a
  compact trie, lazy; conversion of text, of a whole book in the reader ("show in Traditional / Simplified / Taiwan"), of a card's
  fields on export; the many-to-one traps (发, 后, 干, 面) handled by phrases and listed. Serbian: Cyrillic ⇄ Latin with the
  exceptions list for lj, nj, dž (injekcija, nadživeti, vanjezički…) from a word list, tested on a Serbian text sample;
  also in the reader as a view. Japanese hiragana ⇄ katakana and full-width forms; Korean hangul ⇄ Revised Romanization (a round trip test). Mongolian and Kazakh
  Cyrillic ⇄ Latin if their data is simple (checked in T0). **Done when:** round-trip and golden tests pass on OpenCC's own test cases, and the
  reader can show a Chinese text in the other script with the pinyin and word lookups still working on the converted text.
- **A4 · Diacritics, accents, ligatures, cursive (F1302, F1303, F1304, F1305, F1334, F1366).** Drills made from the dictionary, not by hand:
  - *Minimal pairs by diacritic*: from each language's dictionary, every pair of words that differ only in diacritics (esta/está,
    ou/où, si/sí, pero/péro…) found by folding accents; each becomes a sentence cloze from the pack. Spanish, French, Portuguese, Italian,
    German (ä/a), Polish, Czech, Turkish, Vietnamese, Hungarian, and the rest of tier 2 where the pack has accents.
  - *Accent placement (Spanish, Portuguese, Italian, French)*: a syllabifier and stress rules in code (`core/lang/stress.ts` has Spanish), a
    drill that gives a word without its mark and asks where it goes, with the rule named (aguda, llana, esdrújula) and the reason shown; tested
    against every accented word in the dictionary (the rule must reproduce the written accent).
  - *Ligatures*: Arabic lām-alif and the positional forms rendered with the real shaping (`types.ts joinedForm`), a recognition drill over the pack's words;
    Latin æ, œ, ß, ﬁ with the cases where they are spelling and where they are only typography.
  - *Cursive*: Russian handwriting with a bundled open cursive face with Cyrillic (Marck Script or similar, OFL, fetched lazily),
    recognition of cursive letters and then of cursive words from the pack (reading "мама" written in cursive), and the
    confusable letters (т, г, д, и, л, м) trained together; Arabic's different joining shapes in Naskh and Ruqʿa if a licence-clean face exists. Latin cursive for the languages that write it (French, Spanish school hand) if a face is found.
  - Arabic hamza seats (أ إ ؤ ئ ء), tā' marbūṭa, alif maqṣūra, shadda, sukūn, madda, wasla: rules in code (`hamzaSeat`), tested against dictionary spellings; a drill by rule.
  **Done when:** each drill set is generated, each rule function passes a test over its dictionary, and the lessons are reachable from Cursus › Alphabets and Marks.

### Track B · Chinese characters, kanji, hanja (F1294, F1295, F1343, F1345–F1350, F1359, F1360, F1361, F1362)

- **B1 · All the strokes (F1294, F1347).** Every Make Me a Hanzi character and every KanjiVG kanji and kana, sharded by code point block
  (256 characters per file), with simplified path data to hit the size budget, loaded as the learner opens characters, cached by a runtime rule so what was opened works offline;
  an optional "download all strokes" in Settings › Storage. Stroke *names* (héng, shù, piě, nà, diǎn, tí, gōu…) classified from the
  centre lines and shown on each step; the stroke-order rules (top to bottom, left to right, horizontals before verticals, outside
  before inside, close the box last…) as a short lesson with the characters that show each rule; animation speed, replay a stroke, loop; Hangul syllable assembly (jamo into a block, animated).
  **Done when:** any character the pack's words use has strokes (coverage reported by a test against the pack), the size is recorded, and the stroke names are shown.
- **B2 · Radicals and components (F1295, F1345, F1346).** The 214 Kangxi radicals page (name in Chinese, Japanese and Korean, meaning,
  strokes, frequency, variants such as 氵, 扌, 讠) with a words-and-characters list for each; component trees to the leaves from the IDS decompositions
  (MMH and KanjiVG agree or the difference is shown); "characters that contain this" and "which component is the sound and which
  the meaning" (the phonetic-semantic hint from the MMH etymology field); a quiz built from the trees ("which component is missing"), and a drag-to-build exercise (assemble 好 from 女 and 子). **Done when:** the page covers all radicals, the tree
  for any character in the data renders, and the build exercise is a shared exercise kind.
- **B3 · Handwriting that checks like a teacher (F1362).** A proper recogniser in `core/script/handwriting.ts`: normalise the whole
  drawing to its bounding box so size and place do not matter; match stroke by stroke as drawn (real-time: a wrong stroke is flagged at once, the
  correct stroke is shown on a second try, a hint is one tap); stroke count and order checked as a whole; accept the documented
  alternative orders (some characters have two accepted orders: from the data where it lists them, else a short exception list); handle a stroke drawn in two pieces (merge when close) and a stroke drawn too wobbly (smooth first); tolerance by stroke length.
  Tests with synthetic input made from the centre lines plus noise, rotation, scale and speed; a corpus of human drawings is
  not available, so the thresholds are tuned on synthetic noise and the first real use is noted. The pad is used in Cursus (trace, write from memory, write from pinyin or meaning), in the
  alphabet lessons (replacing the shape-only check where stroke data exists) and in the cards. **Done when:** 95% of 1,000 synthetic noisy copies of a character are accepted and 95% of copies with one stroke swapped or reversed are rejected, measured in a test.
- **B4 · Kanji readings (F1348).** Kanji with grade, JLPT level, frequency, strokes, radical, meanings and readings *in kana with okurigana*
  (KANJIDIC2), on and kun separated, with the **reading each word uses** found by aligning each Japanese dictionary word's kanji with its kana
  (an alignment algorithm over the dictionary's `reading` fields, tested on a hand-checked sample); the pattern of why (gemination, rendaku, ateji) named; drills: read the word, pick the reading, "which kanji has this reading in this word", jukugo composition. Also in the word drawer ("why is it read like this"). **Done when:** at least 95% of dictionary words with kanji have an aligned reading per kanji (measured), and kanji pages show all fields.
- **B5 · Hanja (F1350).** Sino-Korean words in the Korean dictionary with their hanja (from the Korean Wiktionary or the English one's `hanja` data, T0), shown in the word drawer and optionally over the word in the reader; each hanja's page lists the Korean words, Japanese words and Chinese words that use it, with the three readings compared; word families sharing a hanja; a quiz "guess the meaning from the hanja"; the education hanja list levels if available. **Done when:** the Korean word drawer shows hanja for words that have them, and the hanja page links to the words.
- **B6 · Tones (F1343).** Beyond reading marks: *hear* a syllable and choose the tone (recorded by the Mandarin Piper voice, and by the device voice if present, each syllable of the 4 × 400 inventory generated once and cached; or generated live), tone *pairs* (the 16 combinations plus neutral), sandhi (third tone + third tone, 不 and 一) with the changed pitch shown from `core/sounds/pitch.ts`, tone production feedback from 6-10's pitch tool where it exists, Cantonese's six tones with Jyutping, and a minimal-pair set from the dictionary (妈 麻 马 骂). **Done when:** a listening round, a pairs round and a sandhi round exist, built from the dictionary's pinyin, and the pitch contour is drawn for each.
- **B7 · Hanzi recognition and reading aids (F1349, F1359).** Recognition: characters read in context (pack sentences with the character hidden, then a choice among lookalikes), a set of confusable characters computed from shared components and stroke-count (己 已 巳, 末 未, 日 曰), and reading a line of text with only the unknown characters annotated. Gradual removal: the learner's known *characters* (from known words) decide where pinyin, jyutping, zhuyin and furigana appear, by character, not by word; and a "level" setting (all, unknown only, none) with a gentle auto-step as the known set grows. **Done when:** the reader shows annotations only above characters the learner doesn't know, and the recognition set covers the 500 most confusable pairs.
- **B8 · Traditional versus Simplified (F1360), kana to kanji (F1361).** The comparison page: systematic simplification rules (the component table: 讠 ← 言, 钅 ← 金, 饣 ← 食, and others), many-to-one traps, the regional vocabulary (Mainland, Taiwan, Hong Kong), a side-by-side reader view from A3, and a recognition quiz in both directions by shape. Kana to kanji: an IME-like exercise (type the reading, choose the right kanji for the sentence from homophones in the dictionary), and a homophone disambiguation cloze from pack sentences (橋, 箸, 端); kana-only words that have a usual kanji ("this is usually written in kana"). **Done when:** both exercises exist, are made from the pack, and the comparison page is complete.

### Track C · Russian (F1308, F1310, F1311, F1314–F1317, F1321–F1325)

C1 to C5 are Grammatica topics (checked against the pack, 12+ items, visuals) plus exercises from the dictionary's data.

- **C1 · Spelling and sound (F1308, F1311).** Topics: *hard and soft signs* (the rules and the exceptions, with pack words), *spelling rules* (ы after г к х ж ч ш щ, ю/я after hushers…), *akanye, ikanye and the test-word rule* (with the sound shown in the Sounds tab), *devoicing and assimilation*. Exercises: test-word generation from the dictionary (find the word's related form where the vowel is stressed: the dictionary's accented forms), "write the sound you hear" with the Russian Piper voices, soft sign in feminine nouns by gender data. **Done when:** 4 topics, the generated test-word drill, and a dictation set with audio.
- **C2 · Stress (F1310, F1325).** Stress shown in the reader and cards (from the dictionary's accented headword, a toggle), a stress-placement drill over every word that has accent data, the stress *patterns* (fixed, end-stressed, mobile; Zaliznyak's simplified types for nouns and verbs) as topics with the paradigm tables shown with stress, and sentence stress and intonation (the seven IC types, simplified to the five a learner needs) with pitch shown from `core/sounds`. **Done when:** the drill covers the dictionary's accented words, the pattern topics have tables, and intonation has recorded examples.
- **C3 · Aspect (F1314, F1315).** A topic series: *what aspect is*, *forming pairs* (prefix, suffix, suppletion, the 20 most useful prefixes), *using aspect* (past, future, imperative, negation, infinitive after verbs of beginning and ending), and a **pairs table of at least 400 pairs mined from the dictionary** (the headword's pair given in Wiktionary's `impf` and `pf` templates; checked in T0) with a pair finder; exercises: choose the aspect in context from pack sentences (the aspect of the verb in each pack sentence is known from its form), build the pair, a timeline visual per use. **Done when:** 4 topics, 400+ pairs searchable, and 100+ context items from the pack.
- **C4 · Verbs of motion (F1316, F1317).** The 14 pairs (идти/ходить, ехать/ездить, нести/носить, везти/возить…), prefixes (в-, вы-, при-, у-, под-, от-, пере-, про-, за-, до-, об-, с-, раз-) each with its meaning, the prepositions it takes (a diagram of directions), the aspect it forms, the figurative uses; a **verb builder** (pick a verb and a prefix: the form and the meaning, from the dictionary where it exists, flagged when the combination is not used); exercises from pack sentences (choose the prefix, choose the verb). **Done when:** the builder uses the dictionary and every prefix has a diagram and 10 pack sentences.
- **C5 · Numerals, participles, reflexives, word order (F1321, F1322, F1323, F1324).** *Numerals*: full declension tables (один, два/три/четыре, пять and up, сорок, сто, ordinal, collective, compound numbers), the agreement rules (nominative after 2–4, genitive plural after 5+, case in oblique), typed form drills from the paradigm grids (`core/exercise/grid.ts`); *participles*: four kinds with formation tables, short forms, participle vs relative clause, newspaper usage, a recognition drill from pack sentences; *reflexives*: the five kinds (true, reciprocal, passive, impersonal, inherent -ся verbs list from the dictionary), -ся/-сь rule; *word order*: topic and focus, the neutral order, the question-word rule, the `wordOrder` visual, "move the focus" transformations. **Done when:** each has a topic with tables and 12+ pack items and a drill from grids or pack data.

### Track D · Romance languages (F1331, F1334, F1335, F1337, F1338, F1340)

- **D1 · Clitic pronouns (F1331).** A topic for each of Spanish, French, Portuguese and Italian (Portuguese has none now; Italian has `object-pronouns`, to be deepened): the slots as a
  `wordOrder` visual (me te se nos lo la les… in order), placement with infinitives, gerunds and imperatives, combination rules (se lo, le lui, glielo, mo-lo in Portuguese: -lho), the Portuguese mesoclisis in the future (dir-lhe-ei), and EP/BR placement. Exercises as `transform` specs ("replace the noun with a pronoun"), with answers accepted in both placements where the grammar allows (*lo quiero ver / quiero verlo*), 30 per language, each from a pack sentence, with accepted lists
  checked by a test (every accepted answer is a grammatical form per the source). **Done when:** the topic exists in all four languages with the visual and 30 transforms each.
- **D2 · Accents (F1334).** From A4 (Spanish, Portuguese, Italian, French), plus a topic each on *where the accent goes* (diacritic accent, hiatus, interrogatives, stress rules), tested against the dictionary. Counted here; **Done when:** the four topics exist and A4's generated drills are linked from them.
- **D3 · Verbs with prepositions (F1340).** A table per language of the verb–preposition combinations mined from the pack and Tatoeba (lemma + next preposition counts, filtered to a frequency floor and checked by sentence), shown in a "Verbs and prepositions" browser with the combination, its meaning, three example sentences and the equivalent in the other Romance languages (pensar en / penser à / pensare a / pensar em), plus a cloze exercise "which preposition" from the pack sentences. **Done when:** at least 150 combinations per language with sentences, a search, and the exercise.
- **D4 · Regional Spanish, French, Portuguese and Italian (F1335, F1337, F1338).** A **regional lexicon** built from Wiktionary's regional labels (Spain, Mexico, Argentina, Chile, Colombia, the Caribbean, Andean, and for French France, Québec, Belgium, Switzerland, Africa, and for Portuguese Portugal, Brazil, Angola, Mozambique): concept → words by region, with the sense and an example, 300 concepts for Spanish and Portuguese, 150 for French and Italian where tags allow; a dialect page per language with phonology (seseo, yeísmo, aspiration; French vowel and tonal differences; EP vowel reduction, BR palatalisation), grammar (voseo tables, tuteo/voseo/ustedeo; clitic placement; gerund vs *a* + infinitive; *você/tu*), spelling (1990 Orthographic Agreement differences listed and generated, e.g. facto/fato, ótimo/óptimo), and *audio comparison where there are voices* (Spanish Spain vs Mexico with Piper; Portuguese with the device's pt-PT and pt-BR voices, said plainly when none is installed; French with Piper's France voice only). In the dictionary's word drawer, region chips; in the reader, an optional highlight of words that are regional (by the lexicon). A converter "Brazilian to European" (and back) on the lexicon and the spelling rules, labelled approximate. **Done when:** the lexicons meet their size targets with the Wiktionary label as the cited source, the dialect pages exist for Spanish, French and Portuguese, and the audio comparison works or states why it can't.

### Track E · East Asian (F1352–F1356 and the readings above)

- **E1 · Politeness and honorifics (F1352, F1353).** Grammatica topics (Japanese now has 5 topics, Korean 3): Japanese *polite and plain*, *keigo*: honorific (尊敬語), humble (謙譲語), polite (丁寧語) with the special verbs table (30 verbs, each with its three forms), お/ご patterns, the *keigo decision tree* (`decisionTree` visual: who is the subject, who is the listener), the common mistakes (double honorifics, 〜させていただく overuse), `formalityPairs` for 40 situations (greeting, asking, refusing, apologising), Korean *speech levels* (합쇼체, 해요체, 해체, 하게체, plus 해라체 in writing), the honorific -(으)시-, 께서/께, special honorific and humble words, age and name forms, counting units for respect. A **style converter** tool (the user types a sentence or picks a pack sentence, sees plain → polite → honorific, using the conjugation engine on the dictionary form where it can and saying where it can't). Each topic with 12+ pack items. **Done when:** topics for both languages, the 30 special verbs checked against a keigo reference, and the converter tested on a list of 100 sentences with hand-checked output.
- **E2 · Measure words and counters (F1354, F1355).** Mandarin: the classifier of every noun that the dictionary or CC-CEDICT lists (T0: Wiktionary does not), a "noun → measure words" lookup and a "measure word → nouns" list, the grammar of measure words (before demonstratives, with 几, with 一点儿, the reduplication 个个), an exercise that blanks the measure word in a pack sentence (`cloze`, answers accepted: 个 where it is also right), 60 measure words as pages with images of the kind of thing. Japanese: counters with the **sound changes generated** (1 to 10, 100, 1000, 10,000 × 30 counters: 本, 枚, 冊, 匹, 頭, 羽, 台, 個, 人, 回, 杯, 階, 歳, 分, 時, 日, 月…) by an algorithm and exception table tested against a reference chart, spoken by the device voice if present, a typed "say the number with the counter" drill, and the categories of things each counter counts. Korean: native vs Sino-Korean numbers with counters (개, 명, 마리, 권, 잔, 장, 살/세, 시/분), the 한/두/세/네/스무 forms, the same two exercise types. A comparison page across the three languages. **Done when:** each language has the lookup, the generated sound-change table (Japanese), and two exercise types.
- **E3 · Particles (F1356).** Japanese topics: は vs が, を, に vs で, へ, の, と, も, から/まで, より, だけ/しか/ばかり, か/ね/よ, て-forms as connectors (about 15 topics); Korean: 은/는, 이/가, 을/를, 에/에서, 에게/한테, 으로, 와/과/하고, 도, 만, 부터/까지, 보다 (about 10); Mandarin: 了 (aspect vs sentence-final), 过, 着, 吧, 呢, 啊, 吗, 的/得/地, 把 (some exist; deepen and add 着, 地, 吧/呢/啊), each topic with 12+ pack items, `compare` and `rightWrongPairs`. **A particle explorer**: any pack sentence or pasted sentence with its particles marked and explained, extending `core/grammar/sentenceExplainer.ts` to Japanese and Korean (a tested tokeniser step: `core/lang/japanese.ts` already splits words). **Done when:** the topics exist with items, and the explorer marks particles correctly on 200 pack sentences (hand-checked sample of 50).
- **E4 · Cantonese.** Not in the entries; the Jyutping reading aids, tones (B6) and the character tools use the same data, so Cantonese gets them where the data has it, and its gaps are listed in the DECISIONS note.

### Track F · Arabic (F1365, F1366, F1367, F1368, F1369, F1371)

- **F1 · Short vowels (F1365).** Reader: stages (full harakat, harakat only on uncommon words, none) chosen by the learner, with the existing fade. Word drawer: the likely vocalisations of an unvowelled word from the dictionary (ambiguous ones listed with their meanings). Drills made from the dictionary's vowelled lemmas: read a vowelled word and pick the transliteration; add the vowels (pick from the candidates); tanwīn, shadda, sukūn, madda, wasla recognition; *i‘rāb* endings shown optionally. **Done when:** the drills are generated for thousands of words and the stages work in the reader.
- **F2 · Diacritics and spelling (F1366).** From A4: the hamza seat rules, tā' marbūṭa, alif maqṣūra, the sun and moon letters (assimilation of the article, a generated drill), the dagger alif. **Done when:** a topic per rule group in Grammatica with items, and `hamzaSeat` tested against the dictionary.
- **F3 · Roots and patterns (F1367).** A **root finder** (`core/lang/arabicRoots.ts`): strip prefixes and the article, match about 40 patterns (verb forms I to X, participles, masdar patterns, place and instrument nouns, plurals: sound and broken patterns), and check the candidate root against the known roots (Wiktionary's root templates, the hand roots, the roots seen in dictionary entries that are not loanwords); accuracy measured on the 192 known roots' words and the result marked "probable" in the UI. Explorer: a root with all its words from the dictionary grouped by pattern, with the pattern's meaning; verb forms I to X for each root (which forms exist, their meanings, from the dictionary); exercises: find the root, build the word from root and pattern, guess the meaning of an unknown word from root and pattern; the root as a hub in the word graph (6-29) fed by the same data. **Done when:** root accuracy is measured and at least 80% on the known set, the explorer covers every dictionary word the finder can place, and the three exercises exist.
- **F4 · Dialects (F1368).** A dialect table: the same concept in Modern Standard, Egyptian, Levantine, Gulf, Iraqi and Moroccan (from Wiktionary's dialect sections where they exist, 300 concepts), with the Arabic and a transliteration, clearly labelled colloquial and *unwritten in a standard way*, no audio (no voice exists: say so); a phrasebook per dialect of 60 phrases (greetings, shopping, directions) written and **marked for review by a native speaker**; a "dialect of interest" setting that shows that dialect's word next to the standard one in the word drawer; and an explanation of diglossia. Dialect-aware exercises: "which dialect says this" and "say it in the standard". **Done when:** the table meets its size from the data, every hand-written phrase is flagged in the review file, and the setting works in the drawer.
- **F5 · Registers (F1369).** Formal and colloquial pairs for 60 situations (as `formalityPairs`), a register classifier exercise on sentences (formal, neutral, colloquial) from pairs and pack sentences marked by hand, a reading text in two registers side by side, and a "write it formally" transformation. Flagged for review (section 7). **Done when:** the 60 pairs and the three exercises exist and the review file lists every hand-written line.

### Track G · What every track shares

- **G1 · The review file (section 7).** `docs/review/6-23-<language>.md`: every hand-written item or line, with the source it was checked against, for a native speaker (the user, or someone they ask) to mark ok or wrong. The app gets a "Report a mistake" on Marks and on the new topics, using 6-22's `DictIssueReport` (stored on the device and listed for the next build).
- **G2 · Practice and lessons.** All new exercise sets register as Practice sets (6-4b) and are available to lessons (6-14) when that lands; progress is recorded in the learner's record (6-5) like other grammar items.
- **G3 · Tests.** Golden tests for converters and transliteration; property tests (round trips); a data test per generated file (coverage, uniqueness, sources); synthetic-input tests for handwriting; the existing grammar test for every new topic.
- **G4 · Docs.** ROADMAP, DECISIONS (data, licences, sizes, limits), FEATURES ticks, HANDOVER, and `docs/6-23-DATA.md`.

## 4 · Order, size and cost

| # | Push | Needs | Size |
|---|---|---|---|
| 1 | T0 data checks and `docs/6-23-DATA.md` | | S |
| 2 | A1 Unicode reference · A2 transliteration schemes | T0 | M · L |
| 3 | A3 OpenCC and Serbian conversion | T0 | L |
| 4 | B1 all strokes (sharded) | T0 | L |
| 5 | B2 radicals and components · B3 handwriting recogniser | B1 | M · L |
| 6 | B4 kanji readings · B5 hanja · B8 trad/simp and kana to kanji | T0, A3 | L · M · M |
| 7 | B6 tones with audio · B7 recognition and reading aids | | M · M |
| 8 | C1 to C5 Russian topics and exercises (five pushes) | | 5 × M |
| 9 | D1 clitics · D3 verbs with prepositions · D4 regional lexicons and dialect pages (about six pushes) | T0 | 6 × M |
| 10 | E1 politeness · E2 counters · E3 particles (about six pushes) | T0 | 6 × M |
| 11 | F1 to F5 Arabic (five pushes) | T0 | 5 × M |
| 12 | A4 diacritic, accent, ligature and cursive drills (two to three pushes), run beside the language tracks | | 3 × M |
| 13 | G1 review files and report links, G2 Practice wiring, G4 docs, then the 6-23 tick | all | M |

About 45 pushes, 0.6.x versions. They can run in parallel by track (the tracks touch different files: `core/script`, `core/grammar/topics/<lang>`, `features/cursus/marks`).
The topic work (C, D, E, F) is content-heavy and goes to Sonnet with the data; the algorithms (A2, A3, B3, B4, F3) are better for Opus. The user
decides where a version ends.

## 5 · How each entry is closed

An entry is ticked only when its track's "done when" is met and the push notes say what was seen in a browser. Until then it stays
open, marked "light version built" in the features list. The light version (Cursus › Marks) is kept and absorbed: its items either
become generated drills, move into Grammatica topics, or are deleted when a deeper version replaces them.

## 6 · What this plan does not promise

- Audio for languages with no voice (Portuguese in Piper, Arabic dialects, Japanese, Korean): it uses the device's voices where they exist and says so.
- A recogniser trained on real handwriting: the thresholds are tuned on synthetic input; the first real use is noted.
- Native-level correctness of hand-written content without a native reviewer: it is flagged, not asserted.
- Characters that no open dataset covers (rare hanzi, variant kanji): they get no strokes and the page says so.
- Phone layouts: desktop only.

## 7 · Review

Everything hand-written goes into `docs/review/6-23-<language>.md` the day it is written (the item, the claim, the source). Nothing is marked
"checked" in the app until a reviewer has marked it. The existing Marks items are moved into those files first, as the plan's first content push.
