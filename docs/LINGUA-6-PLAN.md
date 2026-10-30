# Lingua 6 · Features · the plan

**Renamed 2026-10-27** (the user: "Put Lingua 7 as Lingua 6 - Design, so Lingua Design becomes 0.7"): what was planned as
Lingua 7 · Features is **Lingua 6 · Features** (`0.6.x`), built first; what was Lingua 6 · Design is **Lingua 7 · Design** (`0.7.x`),
built after it. Step numbers moved with the names (Features 6-1 … 6-28, Design 7-0 … 7-11).

**Status: planned 2026-10-26, not started.** The user pasted the Lingyu feature catalogue (1,618 entries) and asked:
"Compare the app with these features, check which features it currently has and which ones it doesn't have. For
all the features which it doesn't, map them out and create a long roadmap plan, in order to integrate and add all
these features into the app. All of them that are missing. Do this intelligently. The plan will be noted as
Lingua 6 - Features. However for now, just create the plan … I will most likely implement this plan on another
session."

So this file is written for the session that builds it, on any account. Read first: [CLAUDE.md](../CLAUDE.md), the
queue in [HANDOVER.md](HANDOVER.md), Part One of [the design handbook](handbook/Lingua-Design-Handbook.pdf), and
**the audit, [LINGUA-6-FEATURES.md](LINGUA-6-FEATURES.md)**: every one of the 1,618 entries, ticked where Lingua has
it, and otherwise naming the step below that builds it. Tick entries there as they are built.

---

## 0. What the audit found

| | Entries |
| --- | --- |
| Lingua has it | 437 |
| Partly there: Lingua 6 finishes it | 262 |
| Missing: Lingua 6 builds it | 834 |
| Already planned in an open Lingua 5.2 step (5.2-4, 5.2-6, 5.2-7, 5.2-8) | 38 |
| Needs the user's word: against a standing decision (step 6-27) | 47 |

Lingua already has most of the catalogue's own "Phase 1" core (vocabulary and FSRS, interactive reading, grammar,
pronunciation audio, notes, progress, import and export) and much of its "Phase 3" (video and subtitles, authentic
media, several languages). The gaps are deep rather than wide: pronunciation and phonetics, translation and contrast,
exams, the tutor, games, a phrasebook and notebook, conversation feedback, and many smaller tools in every room.

## 1. How this plan was made "intelligently"

1. **Build the shared machinery once.** Hundreds of entries are the same few things seen from different rooms. "Word
   → synonym" cards, synonym races, synonym maps, a synonym finder while writing and frequency-ranked synonyms are
   five entries and one data source. Part A builds six foundations (the word record, the inbox and decks, cards and
   memory, one exercise engine, the learner's record, checked AI generation); the steps after it mostly add screens
   and content on top.
2. **Every feature lands in a room that exists**, as a tab, a panel, a mode or a setting, in the handbook's style.
   New tabs only where a room needs one: Cursus › Sounds and › Exams, Thesaurus › Phrases and › Map, Mentis › Notebook,
   Ludus › Translate. One word
   everywhere: a word met in a song is the same record in the phrasebook, the word map and the exam deck.
3. **Lingua's rules hold.** Local-first; AI only with Max and the learner's own key; estimates labelled; nothing
   added behind the learner's back (previews before a deck grows); nothing public. Entries that would need a server,
   accounts or a phone app go to 6-27 with a local-first way to get most of them, for the user to decide.
4. **Hand-made where it counts, automatic elsewhere.** Hand-made content (phonetics and mouth drawings, exam
   formats, language-specific tools, culture notes) is for the six core languages; tier 2 gets what builds itself
   from the packs ("Tier 2 stays cheap", CLAUDE.md). Everything generated passes 6-6's checks.
5. **Nothing doubled.** Entries already in open Lingua 5.2 steps stay there; Lingua 6 builds after them.

---

## 2. Where Lingua 6 fits, and the order

- **Next after Lingua 5's check (handover step 21), and before Lingua 7 · Design** (the user, 2026-10-26: "Do Lingua Features first, then Lingua Design"). New screens follow
  the handbook as it stands; Lingua 7 then redesigns rooms that already have Lingua 6's features in them.
- **Versions:** `0.6.0-alpha.N` from its first push (`node scripts/version.ts --line 0.6.0 "…"`), `0.6.0` at 6-28.
- **Desktop only**, as always. **Plans** follow the rooms (D4 of the 5.1 plan): what Thesaurus, Codex, the
  dictionary, Diarium, the notebook and Ratio gain is free; what Ludus, Cursus (Grammatica, the course, Sounds,
  Exams), Sermo and Sonus+ gain is Lingua+; every AI feature is Max (D2, D8).
- **Each step:** claim it in the table below (as HANDOVER.md section 2 says for its queue), write its detailed plan
  in this file under the step before building (CLAUDE.md's way), build, check, tick its entries in
  LINGUA-6-FEATURES.md and its row here, update FEATURES and DECISIONS, version, push.

| Step | Status | What | Entries | Needs | Size |
| --- | --- | --- | --- | --- | --- |
| **Part A · Foundations** | | | | | |
| 6-0 | [x] | *done 2026-10-29 (0.6.0-alpha.2; [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md), `src/core/contracts/`; typecheck, tests and build pass, nothing imports it yet)* The contracts: Part A's types, tables and APIs, before any code | — | Lingua 5's check | S |
| 6-1 | [x] | *the learner's half done 2026-10-29 (0.6.0-alpha.8; Dexie 18, tags, favourite, important, the note, first met, last reviewed and recall on the word's page; 6 of its entries ticked); the language's half is 6-1b* The word record | 22 new · 23 to finish | — | L |
| 6-1b | [x] | *done 2026-10-29 (0.6.0-alpha.20; dictionary version 3 for all six core languages: syllables, what a word is made of, where it comes from, cognates, homophones; 7 of its entries ticked); the rest is 6-1c* The language's half of the word record | 16 of 6-1's entries | 6-1 | L |
| 6-1c | [~] | *0.6.0-alpha.105: "Not the cousin it looks like" on a few Spanish, French and German words (false cognates, hand-made: F0150), and, under Easily confused with, "abajo or bajo?": Max says how the two differ, in a line and an example each, checked, labelled and kept (F0161; looked at with a cached row, not tried with a real model). 0.6.0-alpha.63: example sentences are ordered by how common their words are, easiest first (`core/dictionary/difficulty.ts`: F0162; looked at on casa). 0.6.0-alpha.62: synonyms most common first looked at on bueno (F0160); the verb tables' tense titles and aspect labels count as F0136. 0.6.0-alpha.61: the Set phrases panel (verb phrases such as "hacer de" and sayings such as "cual hicieres, tal habrás") counts as F0155 and F0157, looked at on hacer. 0.6.0-alpha.60: Spanish verbs show which forms are irregular (a dot on each form that is not the regular one, in Present, Preterite, Imperfect, Future and Conditional; `core/lang/irregular.ts`: F0137; looked at on tener and hablar). 0.6.0-alpha.57: a word's own derived words have their own panel, "Made from this word" (F0131). 0.6.0-alpha.53: Spanish stress is worked out from the spelling and marked in the syllables (`core/lang/stress.ts`; Russian had it already: F0140; looked at on hablar). 0.6.0-alpha.51: "A common mistake" on about 15 Spanish, 12 French, 6 German and 5 Russian words (spellings that sound alike, uses English gets wrong; hand-made, `core/lang/learnerErrors.ts`; F0144, F0145, F1060; looked at on hecho). 0.6.0-alpha.47: synonyms come most common first when the language pack's frequency list is on the device (written, not looked at: this browser has no pack); the labels that show tone (derogatory, humorous, euphemistic: F0164) and the Related words panel (word families: F0127, F1056) are ticked. 0.6.0-alpha.41: "Grammar for this word" on a word's page, up to three topics found by the kind of word (`core/grammar/forWord.ts`, by keywords in topic titles; F1073); looked at in a browser on lavar. 0.6.0-alpha.34, looked at in a browser: a word's page shows the labels Wiktionary gives (register, region, uncountable, transitive: F0121–F0123, F0134, F1063–F1064, F1270–F1272), "A false friend" for about 20 words in each of Spanish, French and German and 10 in Russian that English speakers mistake (hand-made, `core/lang/falseFriends.ts`: F0148), "Review by review" on the learner's half of the page (F1071), links to synonyms, antonyms, related and confusable words (F1055, F1074), and sentences shortest first . Not done: irregular forms outside Spanish and separable verbs (Wiktionary has no label for them), false friends checked by meaning against the other language's entry, Arabic and Chinese learner errors, stress in French, German and the rest, frequency-ranked synonyms. Still to do:* What has no data source or needs more than Wiktionary gives: countable and irregular flags, separable verbs, false friends (checked by meaning), common spelling mistakes and learner errors (hand-made for the six languages), stress in French, German and the rest, example sentences ranked by difficulty, frequency-ranked synonyms, the links from a word to grammar topics and to other words, the review history as a list | 9 of 6-1's entries | 6-1b | M |
| 6-2 | [x] | *the inbox and the first deck tools done 2026-10-29 (0.6.0-alpha.10; Dexie 19; 5 of its entries ticked); the rest is 6-2b* The inbox and the deck workshop | 15 new · 25 to finish | 6-1 | L |
| 6-2b | [~] | *0.6.0-alpha.28 and .32: the merge dialog (deck menu › Merge into…, F0056). 0.6.0-alpha.32, looked at in a browser at 1280: Select on a deck's cards, then tag, untag, move, suspend, resume and delete the selected together (F0079); deck menu › Tidy… lists doubled words (same word, same meaning: the copies can be deleted) and what has no meaning or sentence (F0080); Thesaurus › New › From a list or text (pasted words with meanings, or the unknown words of a text, previewed before the deck is made: F0068, F0361, F1481); sort By hand with Move up and Move down; a deck's description in its settings (F0046); the deck page orders its cards by how common, A to Z, newest, due soonest, hardest or kind of word (F0049–F0054). From my library (0.6.0-alpha.46, looked at in a browser): the same dialog makes a deck from the unknown words of any text in Codex, counted already (F0065, F0074, F1487); a deck from a topic is Made by Max's word list (F0070). 0.6.0-alpha.63, looked at in a browser: Select › Edit sets the kind of word and the gender on all the chosen cards (F0078). 0.6.0-alpha.60, looked at in a browser: Deck settings › Look gives a deck a colour and a cover picture (cut square and shrunk to a thumbnail), shown in front of its name in the list and on its page (F0047); folders inside folders (New folder asks for the parent: F0044). 0.6.0-alpha.57, looked at in a browser: the same dialog makes a deck from a conversation (the words the AI marked, with meanings, then the others you did not know: F0067); Your words has a Favourites filter (F0085); a goal is a topic for Made by Max's word list (F0073). 0.6.0-alpha.56: a video's, a song's or a podcast's transcript, once it is made into a text in Codex ("read the transcript as text"), is in From my library too, so its unknown words make a deck (F0066, F0801, F0815, F1239, F1580; the dialog was looked at on a book text, not on a transcript). 0.6.0-alpha.52, looked at in a browser: the deck page also orders by tag (F0055) and by hand, with Earlier and Later for the selected cards (F0048). 0.6.0-alpha.47, looked at in a browser: Split off (the selected cards into a new deck: F0058); Tidy also lists different words given the same meaning (F0081) and fills a sentence and the pronunciation from the dictionary into cards that lack them (F0082, F0083). Not done: decks straight from a song;  bulk edit beyond tags and moving; the tidy of missing sounds and translations. Still to do:* The rest of the deck workshop: ~~a merge dialog~~, bulk tag, move and delete of cards, tidy (duplicate cards and translations, missing sentences and sounds), decks made from a text, a book, a song, a list, a conversation, a topic or a goal with a preview, nested folders and sorting by hand, descriptions and cover pictures, bulk edit | 20 of 6-2's entries | 6-2 | L |
| 6-3 | [x] | *the memory controls done 2026-10-29 (0.6.0-alpha.12; Dexie 20; leeches, bury, mnemonic, how likely it is remembered, the catch-up plan; 4 of its entries ticked); the card kinds and the rest is 6-3b* Cards and memory | 21 new · 11 to finish | 6-1 | L |
| 6-3b | [~] | *claimed 2026-10-29; 0.6.0-alpha.26. 0.6.0-alpha.50: a card that has a sentence shows the word in a different one each review (its own, then the dictionary's, in turn: F0117; looked at once, the turn itself is tested).* **On screen:** twelve kinds of card in the card editor (filled from the dictionary) and on the flip card; pictures from a file, the clipboard or Wikimedia Commons with the licence kept (tried against the real service); a deck's learning steps; siblings kept apart and the most-forgotten first; the Today card's minutes and a five-week due calendar; a card's stability in words, its fading curve, put on another day, forget it; Practice sets for difficult and for rusty words; a letter hint (meaning → word cards) and "I guessed" (counts as Hard) in study. **Looked at in a browser at 1280 (alpha.38):** the Today card's minutes and calendar, the card's memory line in the editor, and the cards for definition, synonym, antonym, collocation and several meanings filled from the Spanish dictionary (F0015–F0017, F0025 ticked). **Also looked at (alpha.44):** the sound, grammar, related-words, picture and picture-with-parts-hidden cards, the letter hint and "I guessed" (F0014, F0026, F0029, F0030 ticked); a picture card used to show blank until its picture had loaded, now it is drawn at once. **Practice sets for difficult and rusty words looked at (rusty played; F1458 ticked).** 15 entries ticked in all (F0006, F0007, F0021, F0022, F0092, F0095, F0097, F0099, F0101, F0103, F0109, F0110, F0112, F0114, F0115). **Also (alpha.55):** the paragraph card and the definition and sound cards in both directions (F0005, F0008, F0009, F0028 ticked; the definition and sound cards were looked at in the direction they open in and checked in `cardFaces` for the other). **Left:** nothing in 6-3b but the difficult and rusty Practice sets, not looked at * The rest of cards and memory | 17 of 6-3's entries | 6-3 | L |
| 6-4 | [x] | *done 2026-10-29 (0.6.0-alpha.6): `core/exercise`, the shared transformation screen, transformations in Ludus, Grammatica and the course; 3 of its 25 new entries built (F0244, F0936, F0937), the rest is 6-4b* One exercise engine | 25 new · 3 to finish | — | L |
| 6-4b | [~] | *claimed 2026-10-29; Practice (`/thesaurus/practice`) built in 0.6.0-alpha.23: the matching games, correct the mistake, rewrite, what comes next, present into past, drag the words, and the options (how sure, answers at the end, another example); 15 entries ticked. Use it in a sentence (alpha.63: the learner writes their own sentence, sees an example and rates themselves Yes, Nearly or Not yet, with no AI; written to the record as writing: F0942; looked at) and Words and pictures works (F0035) (alpha.44, looked at with four picture cards); a matching game now deals only the words that have what it needs (synonyms, opposites, sentences, pictures), so a round is no longer left short. Left: the free sentence tasks and the dialogue (need 6-6b's generator, with the self-rating screen already built), moving the old kinds into the engine (no learner-visible gain; not done)* The rest of 6-4's kinds and ways to answer | 22 of 6-4's new entries · 3 to finish | 6-4 | L |
| 6-5 | [x] | *the record and its first reader done 2026-10-29 (0.6.0-alpha.15; Dexie 22; written where cards and grammar items are answered; weak spots in Ratio; 5 of its entries ticked); the rest is 6-5b* The learner's record | 9 new · 2 to finish | 6-4 | M |
| 6-5b | [~] | *0.6.0-alpha.63: the error log marks a mistake that comes back (the same correction in different conversations, the same item missed again: "keeps coming back" from three times: F0281; looked at). 0.6.0-alpha.57: Ratio has an Error log: every wrong answer of the record (what was written, what was right) and every correction in the conversations, newest first, filtered by words, grammar or conversations, with a way back to the grammar topic (F1127; looked at in a browser). 0.6.0-alpha.31: Ludus answers are now listening and pronunciation rows (a miss says mishearing or pronunciation), and Ratio has "Skills, side by side" (two weeks per skill, the part done with a hint, quiet skills, words known when shown but missed when written); F0113, F1459, F1460 ticked; written and tested, not looked at in a browser. Diarium's corrections are Antigravity-2's (6-12 W4). Sermo is outside the app (the AI chats open in other apps), so it has nothing to record. Left:* The rest of the learner's record: rows from Diarium's corrections, Sermo, Sonus dictation and pronunciation, one row per exercise instead of per card; the readers the API already has (recognised but not recalled, quiet skills, with and without hints) shown to the learner; the error log in Mentis (6-20) and its export (6-24) | 4 of 6-5's entries | 6-5 | M |
| 6-6 | [x] | *the pipeline done 2026-10-29 (0.6.0-alpha.17; Dexie 23; stories and example sentences; checked with a model that is faked in the tests, not yet tried with a real key; no entries ticked, because no screen offers it yet); the rest is 6-6b* Generated materials, checked | 19 new · 3 to finish | 6-1, 6-4 | M |
| 6-6b | [~] | *0.6.0-alpha.105: Made by Max also makes an interactive story (scenes with choices, a way back, endings: checked to lead somewhere), a short course (six lessons, each a deck), a grammar drill (gapped sentences, checked) and sounds to practise (words, pairs and a tongue twister to hear); Practice has two more sets made for you, dictation and a grammar drill from Grammatica's topics; F1022, F1023, F1027, F1609. All with a faked model in tests, looked at with cached rows, not tried with a real key. 0.6.0-alpha.63: example sentences can be made to show one pattern (the topic box takes a pattern: F0254). 0.6.0-alpha.49: every sentence and dialogue line, and the story as a whole, has a Listen button where the device has a voice (listening scripts, audio dialogues: F1020, F1021; looked at on the dialogue); Practice has a Translate set made by Max (an English sentence, the words of its translation put in order: F1024; listed, not run with a model). 0.6.0-alpha.48: a quiz can be about a topic, a text in Codex (documents and transcripts are texts there), pasted notes, or the learner's own mistakes (the weak spots of the record, in words); looked at in a browser with a cached row and the empty/error paths: F1033–F1036 ticked. 0.6.0-alpha.40 adds two more kinds on the same page: a quiz to answer (five questions, the reason shown after each, a score: F1028) and Simplify a text (paste a text, get it back in easier words beside the original: F1031, F1032); looked at in a browser with cached rows. 0.6.0-alpha.36: Thesaurus › New › Made by Max (`/thesaurus/make`): a story, example sentences, a dialogue or a word list on a topic at the learner's level, with the cost note, the Generated label and Report, a translation toggle, and what to keep (a story into Codex, or a deck of its new words; the word list into a deck with its sentences). The word list is a fifth kind in the generator. Looked at in a browser with rows seeded in the cache (the page, Keep in Codex and the deck); never with a real model. F0438, F1013–F1018 ticked. Still open: the grammar double-check.* *0.6.0-alpha.27: the generator now also makes dialogues and made-to-order rewrites (passive, reported speech, question, combine, expand, simplify), checked and kept like stories; Practice offers them as sets made when started (Max and a key). Written and tested with a faked model; not tried with a real key or looked at in a browser. 7 entries ticked (F0246–F0251, F0258). Still to do:* What the pipeline still needs: the screens that ask for a story or sentences (and show the label and Report), the other kinds (dialogues, listening scripts with two voices, quizzes, drills, dictation, translation and pronunciation exercises, word lists, flashcards, parallel and simplified texts, exercises from a document, notes, a transcript or the learner's mistakes), the short grammar check, a cost note before a long job, and a try with a real key | 19 of 6-6's entries | 6-6 | M |
| **Part B · The skills** (in parallel, after Part A) | | | | | |
| 6-7 | [x] | *done by Antigravity-1 2026-10-29; G1 done (browse, plain search, prerequisites, notes; F0195, F0196, F0221, F0227); G2 done (target-language and side-by-side explanations, exceptions, formal/informal pairs, right/wrong pairs, regional notes, cross-references; F0199, F0203, F0204, F0206, F0207, F0220, F0224, F0225, F0226, F0255); G3 done (fine-line timelines, word-order slots, decision trees, sentence diagrams, morphology, coloured endings; F0211, F0212, F0214, F0215, F0216, F0217, F0218); G4 done (interactive topic map with CEFR tiers, prerequisite DAG, learned node fill, error heatmap; F0219, F0264, F0267); G5 done: sentence explainer with device-dictionary lemma/ending extraction, clause segmentation, fine-line SVG dependency arcs, Universal Dependencies roles, and ambiguous interpretations (Max-ready with faked model tested, not tried with a real model); F0273, F0274, F0275, F0276, F0277, F0279, F0333 ticked; typecheck, 1,310 tests and build pass; not looked at in a browser.* Grammar | 19 new · 12 to finish | 6-4, 6-5 | L |
| 6-8 | [x] | *claimed by Codex 2026-10-29; R1 built: Study tools drawer with dictionary-category colours, differing suffixes, interlinear word glosses and reveal by sentence, a positionable reading ruler; selection highlights in three colours, paragraph notes and cards via the existing deck picker. Highlights keep exact quotes/offsets and are not painted when an edited passage no longer matches; stored on the existing text row (no migration). Browser: bundled Spanish story at 1280, 1440 and 1366×768, light/dark; reveal, save/reopen a highlight, note, card creation, remove and Undo tried. Pagination corrected after revealing glosses; a note typed then closed with Escape was kept. Typecheck, 1,255 tests and build pass after rebasing. Not checked: other languages, large books, comics, scroll mode, screen reader or frame timing. Category is the first dictionary sense, not contextual syntax; suffixes require a shared stem; selections stay within one paragraph. R2 built: Codex › Graded orders local texts by the existing measured level and filters by topic/title/author, kind, length, level and Known-or-Learning share. Topic/kind labels save on the text; absent word data is shown as unmeasured. Wikisource/Gutenberg genre searches reuse the existing services only on request; no bundled corpus or dependency added. Typecheck, 1,267 tests and build pass. Graded shelf looked at at 1280, 1440 and 1366×768, light/dark; label saving, combined filters and a Spanish Wikisource fable search tried. Not checked: external edition import, Gutenberg search, other languages or a large library. R3 built on codex/lingua (the user moved future pushes off main): chapter Study tools links to Check understanding, with four offline self-check guides and Max questions for main idea, true/false, events, title, context, paragraph headings, odd sentence and short answers. Specs reuse typed, drag and matching views; answers write Codex reading evidence before advancing, with explicit retry on storage failure. Fake-model/parser/shared-view tests; typecheck, 1,330 tests and build pass. Browser: all four self-checks completed on the Spanish sample; setup and free-answer views seen at 1280, 1440 and 1366×768 in light/dark. Not verified: real AI, generated question interactions in a browser, other languages, or storage-failure injection. Generated interpretations are not fact-checked; exact quotes and schema are checked. First 6,000 chapter characters only. R4 built on codex/lingua: Study tools › Read side by side shows saved learner-supplied parallel text or the existing labelled Max simplifier beside the original excerpt. Manual text is stored on the existing text row and is displayed only when the source excerpt still matches. Max reuses the existing checked/cached simplified kind and Report; target level and translation language are selectable. No new table, generator kind or dependency. Typecheck, 1,333 tests and build pass, including fake-model/cache, persistence/source-change and rendered-column tests. Browser: Spanish sample with an English parallel text saved/reopened; manual and locked-Max modes looked at at 1280, 1440 and 1366×768, light/dark. Not verified: real AI or generated result/Report interactions in a browser, other languages, large chapters or sync across devices. First 4,000 source characters only, independent columns rather than sentence alignment. Assigned R1–R4 slices are complete on the branch; remaining unticked audit entries (book projects, broader source catalogues, bookmarks, contextual syntax, additional interpretation kinds and automatic chapter-end launching) are not claimed complete.* Reading | 41 new · 31 to finish | 6-4, 6-6 | XL |
| 6-9 | [~] | *claimed by Claude 2026-10-29; slice C4 (alpha.109): Visio's English line has two more modes, After (it comes once the line has been heard, in the gap after it) and "Less help each time" (shown, blurred, after, hidden, one step for each time the video is watched to the end: F0454, F0818, F1579; the modes are in code and the settings, no video was watched through here); Sonus has a Noise button (a soft room noise under any listening: F0430, synthesised noise, not recordings; looked at); a made dialogue has "Hear the conversation", each speaker with a different device voice when the device has more than one for the language (F0432: voices, not ages; one voice means both sound the same, and it says so; not heard with two voices); and "Label the speakers" in a transcript's menu (Max: the model guesses who says each line from the words, up to 300 lines; the labels show in the margin at wide widths: F0458; the labelling was tried only with labels written in by hand, not with a real model). Not built: overlapping-speaker comprehension (F0503), regional accents and speaker accents (F0426, F0490, F0501), the same sentence across speakers (F0506): they need real recordings. slice L7 (alpha.107): Practice › Listening has eight more sets, made from your own transcripts and words: partial dictation (three words out), dictation with punctuation, dictation with the endings hidden, where do the words begin? (a line without spaces, cut where each word starts: connected speech), hear a word and choose its meaning, hear a word and choose its picture, hear it and spell it, and cut a word into syllables; dictation is judged word by word (an article counts, a missing accent or comma is only close); the player has an Again button (key A). Ticked: F0472–F0474, F0259, F0465, F0467, F0494, F0495, F0742, F0710, F0726, F0443; looked at in a browser (meaning, cut into words). Slice L6 (alpha.105): Made by Max writes stories as a short formal speech, a lecture excerpt, documentary narration or a casual monologue (each with a Listen button: F0416, F0421–F0423, F0427, F0428, F0414, F0413), and a quiz can ask about the main idea, keywords, who is speaking, where it happens, how the speakers feel, what comes next, where the topic changes, or whether it is formal or informal (F0475–F0477, F0479, F0481–F0484, F0489; a quiz can be about a transcript, so after listening); not tried with a real model. Slice L5 (alpha.103): your own playlists (the item's ⋯ menu › Playlists…, then chips in Sonus' library show just that list: F0440, F0461; looked at); Your words, read aloud (`/sonus/words`: the words you are learning, then their sentence, in the device's voice, previous, next and pause: F0439; the screen looked at, not heard); and the setting a made dialogue is put in (a phone call, an announcement at a station, formal at work, between friends, cheerful, upset: F0415, F0429, F0431, F0434, F0435; sent to Max as part of the topic, so not tried with a real model). Slice L4 (alpha.98): a line that was not made out in a heard exercise is marked Hard to hear in its recording, and the player's Replay the hard parts loops them one after another (F0463, F0464); a dictation shows what you wrote against what was said, word by word (F0486); the speed of what is heard steps up from 0.8× with every right answer in a row, to 1.5×, and falls back after a miss (F0500, F0505); Add noise plays a bed of noise to listen through (F0502); all looked at in a browser. Slice L3 (alpha.96): Practice › Listening has three sets made from the lines of the learner's own transcripts (the places marked Hard to hear first): dictation of the line, the missing word, and putting its words in order; the clip plays from the learner's own audio or video, slowly or as it was said, and the device's voice stands in when the file is gone; answers are written to the record as listening in Sonus, with what was typed and what was heard (F0468, F0469, F0470, F0488, F1600, and F0412 and F0507 for slow beside natural); looked at in a browser with a generated tone and transcript. Not tried: the clip of a video, the device voice. Slice L2 (alpha.95): Listen first keeps a transcript's lines blurred until each has played, or is tapped (F0485; looked at, dark mode). Slice L1 (alpha.92): the player loops a part between A and B (key [), pauses after every line with Line by line (key L, from a transcript), keeps or changes the pitch with the speed, and keeps bookmarks and Hard to hear marks on an item (key B), each a tap from playing again; looked at in a browser, dark mode, with a tone and a transcript: F0444, F0445, F0448, F0449, F0457, F0459, F0460, F0816 ticked.* Listening | 49 new · 18 to finish | 6-4, 6-6 | XL |
| 6-10 | [~] | *claimed by Claude 2026-10-29; C6 (alpha.112): Say it marks a tick for each syllable of your recording and the real speaker's, says how even the beats were against what the language is described as (F0714), and, for "Say the answer" under Which word carries the stress?, which word held your strongest syllable (F0592; Spanish, French, German, Russian and Mandarin; Arabic cannot be counted from its letters). Beats come from loudness below 1 kHz: on seven real Spanish recordings from Commons it found the right number of syllables in four and was one off in three, so a sentence whose beats do not fit its syllable count is not judged. Not tried with a real microphone. Also fixed: recordings' audio is released, "Label the speakers" labels the transcript as it is now, and a seek to the end no longer counts as a watch (80% must be heard in order). C5 (alpha.111): Melody and stress (F0497, F0713, F0739): hear a sentence as a statement and as a question and say which (the same words, for each core language), pick the word of an answer that carries the stress (the one that answers the question), and "Say these" sends the pairs to Say it, which measures which way your own voice goes at the end (Spanish, French, German and Arabic only: Russian and Mandarin ask their questions another way, so they are only heard). Looked at in a browser; the melody is the device voice's, not heard here, and the end-of-sentence check was tested on made-up contours, not on a real microphone. Fixed in the same push: long passages in Compare translations no longer fail, the accent in "más" no longer counts as a mistake in Say it, "Less help each time" counts every full watch, and the spoken-audio cache keeps only its newest 500 clips. Not built: sentence stress detection and rhythm patterns (F0592, F0714). C3 (alpha.108): the mouth from the side drawn for each sound (tongue, soft palate, lips, voice), what to do in words, the voiced or unvoiced partner (F0596, F0597, F0705–F0707); a spectrogram of the real speaker and of you, a Slow button, the lengths compared, and the letters the device did not hear (F0601, F0750, F1618, F0599, F0741, F0590, F0730, F0593, F0740; "Use mine as the model" compares you with your earlier self); drills for clusters, hard syllables, letter combinations, tongue twisters, French nasal vowels, Russian hard and soft, Arabic heavy letters and Mandarin tones and contrasts, and "Test me" with five at random (F0736, F0737, F0744, F1191, F0743, F1309, F1339, F1372, F1344, F0746); pairs of one sound, the sounds you mix up and a button to practise them, and "Say both" (F0735, F0745, F0510, F0598); rules on assimilation, elision, doubled letters, palatalisation and weak forms in all six languages (F0717–F0720, F0496). Looked at in a browser: the diagram, the spectrogram of a real recording, the drills sent to Say it, the pair filter; the microphone and the recognition hints not tried; the diagram is a stylised sketch, and the hints are a letter-level guess from what the device wrote down. Not built: per-sound recordings, regional accents (no recordings to use), sentence stress and intonation teaching beyond the shapes (F0713, F0714, F0739). S5 (alpha.104): Shadow it, beside Say it: the real speaker's recording plays while the microphone records you, then both shapes show (F0586, F0588, F0734; the button looked at, the microphone not tried; headphones are advised). S4 (alpha.102): Your pronunciation diary (the same passage in each core language, read aloud and kept on the device with its size, played back by date, deleted at will, asked for again after a week: F0604–F0606, F0733, F0747, F0748, F0977) and Which syllable is stressed? (common Spanish and Russian words cut into syllables, the answer from the spelling's rules or the dictionary's own mark, a miss written to the record: F0591, F0738); looked at in a browser. S1 to S3 (alpha.99), looked at in a browser, Spanish, dark mode: Cursus › Sounds for the six core languages (`core/sounds`, hand-made): a vowel chart and a consonant chart drawn from the data (voiced in bold, place and manner), Mandarin's four tones drawn as contours, each sound with its note and real words to hear (the device's voice), and the rules of stress, spelling and connected speech; Which did you hear? (minimal pairs in all six languages, a miss says what to listen for and comes back once, written to the record as listening against the sound); Say it, and see it (record a word, see its loudness and pitch beside a real speaker's recording from Wikimedia Commons where there is one, and whether the device understood the word; nothing is kept; pitch by autocorrelation, labelled a mirror and not a mark). Ticked: F0700–F0703, F0708, F0709, F0729, F0492, F0493, F0480, F0711, F0712, F0715, F0716, F0721, F0722, F0723, F0725, F0499, F0594, F0728, F0580, F0589, F0595, F0600, F0727, F0749, F0561. Not done: mouth and tongue drawings, a recording for every sound (words only), a spectrogram, drills for clusters and intonation, Max listening and commenting, the Sounds first unit of the course (6-14). The device's speech recognition is the only check of what was said.* Sounds and pronunciation | 82 new · 7 to finish | 6-4, 6-5 | XL |
| 6-11 | [x] | *done by Antigravity-1 2026-10-29; S1 done (prompt generator with 4 conversation modes, styles & constraints, and 6 new scenes; F0260, F0520, F0536, F0540, F0548–F0555); S2 done (solo speaking practice view with 30s prompts, 1-min monologues, storytelling, picture description, explain a concept, impromptu debate, listen & repeat shadowing, personalized challenges from study memory, prep countdown and target speak timers, live microphone recording with playback, and real-time transcription; F0487, F0579, F0584, F0607–F0613); S3 done: “How did it go?” conversation review engine with speaker turn parsing, sentence-by-sentence analysis, essential grammar vs stylistic alternatives, idiomatic expressions, formality and register feedback, confidence ratings, card extraction to decks, fluency metrics (speech rate wpm, speaking time, turn lengths, filler-word tracking, repeated-word tracking, sentence complexity, hesitations/pauses, self-corrections, word retrieval difficulties, fluency score), turn-by-turn replay with audio, and saving transcripts & notes to Diarium; F0556–F0560, F0562–F0576, F0578, F0581–F0583, F0602, F0603, F0975, F0978, F1126 ticked; typecheck, 1,342 tests and build pass; not looked at in a browser.* Speaking | 46 new · 5 to finish | 6-5, 6-6 | L |
| 6-12 | [x] | *claimed by Codex 2026-10-29; W1 done: 26 task briefs, optional source material, length targets, live word count and a start/pause/reset timer (resets on leaving). Typecheck, 1,219 tests and build pass; chooser and editor looked at at 1280, 1440 and 1366×768, light and dark; email creation, save and timer controls tried. No real model used. W2 done: local vocabulary diversity, sentence lengths and a best-pieces portfolio with study level, topic/kind search and comparisons over time; 1,229 tests, typecheck and build pass. Portfolio looked at in both themes at all three desktop sizes; measures/editor in dark at all three, light at 1366×768. Keep and level/topic filters tried. W3 done: selected/hovered-word help, local forms and full-dictionary synonyms/collocations, seven phrase functions for all six core languages. Typecheck, 1,233 tests and build pass. Help panel looked at in light/dark at 1280, 1440 and 1366×768; tener/tengo conjugations and Spanish phrases tried. Full-dictionary synonym/collocation results, declensions, hover and other languages not tried in the browser. No dedicated Hunspell spellchecker (no dictionary/dependency added). W4 done: labelled suggestions (register/formality, a higher level, idioms, precision, unnatural/literal phrasings, alternatives) and a task rubric in the existing Check flow; model injected and faked in tests. Correction evidence is saved atomically with the review (6-5b Diarium hook), idempotently per review. 1,239 tests, typecheck and build pass. No-key message looked at; feedback panel checked by rendered-markup test, not visually in the browser, and not tried with a real model. Assigned W1–W4 slices finished; unbuilt audit items (picture picker, dedicated spellchecker, draft comparison, lower-level simplification) remain unticked.* Writing | 48 new · 7 to finish | 6-1, 6-6 | L |
| 6-13 | [x] | *done by Antigravity-1 2026-10-29; Compare translations added by Claude (alpha.110): Thesaurus › Make › Compare translations (Max): paste a passage, get it three ways (word for word, natural, literary), a note on each and where they part (F0405, F0767; looked at with a made row put in by hand, not with a real model). T1 done (translation practice sets, hints, literal vs natural, required words, accepted alternatives, idioms, slang, formal registers, dialogues, paragraphs, custom passages, timed challenges; F0389, F0754–F0756, F0758–F0766, F0768, F0771, F0777, F0778); T2 done (interactive word-by-word alignment with syntactic links, round-trip back-translation with drift analysis, scrambled-tile sentence reconstruction, reference comparison; F0769, F0770, F0774–F0776); T3 done: hand-made contrast tables across English and the six core languages (es, fr, de, it, ru, zh) and Romance cross-pairs covering word order, gender systems, case declensions, tense & aspect, articles, prepositions, politeness/address, false friends, shared roots, pronunciation, and cultural semantics, with saved personal notes; F0268–F0272, F0772, F0779–F0794, F1341 ticked; typecheck, 1,326 tests and build pass; not looked at in a browser.* Translating and comparing languages | 45 new · 2 to finish | 6-4, 6-6 | L |
| **Part C · Paths and guidance** | | | | | |
| 6-14 | [ ] | Courses and lessons | 29 new · 10 to finish | Part B's 6-8 to 6-10 | XL |
| 6-15 | [x] | *done by Antigravity-1 2026-10-30; Slice 1 done (TutorSettings in src/data/settings.ts with presets Teacher, Editor, Coach, explanation complexity, sentence length, immersion/bilingual exposure, correction strictness, speech speed, and learner interests in src/features/tutor/TutorSettingsPanel.tsx and Settings › AI); Slice 2 done (contextual tutor engine in src/services/llm/tutor.ts and src/core/tutor/context.ts integrating known words count, studied grammar topics, recent mistake categories from db.evidence, with structured responses for nuances, progressive hints without giving away answers, wrong answer explanation, analogies, comparisons, IPA pronunciation, cultural notes, and natural language grammar search in findMatchingGrammarTopics); Slice 3 done (440px desktop Ask panel side drawer in src/features/tutor/AskPanel.tsx with Alt+T hotkey, context card, prompt chips, question input, example pronunciation at tutor speed, and Save as Mini-Lesson to notes); Slice 4 done (Ask buttons wired into AppShell, WordDrawer, SentenceExplainer, and keyboard shortcuts dialog; F0222–F0223, F0955–F0958, F0960–F0968, F0970–F0971, F0979, F0981–F0985, F0989–F0992, F0994–F0995, F0998–F1005, F1012 ticked; typecheck, 200 test files with 1,443 tests and build pass; not looked at in a browser).* The tutor, in context | 28 new · 10 to finish | 6-5, 6-6 | M | (6-15: The tutor, in context (everywhere, with Max))
| 6-16 | [ ] | Personal and adaptive | 27 new · 11 to finish | 6-5 | L |
| 6-17 | [x] | *done by Antigravity-1 2026-10-30; Slice 1 done (flexible goal schema with GoalKind words, lessons, books, conversations, writing, listening-hours, travel, real-life, custom, HabitSettings in src/data/settings.ts with streakEnabled, restDays, flexibleWeeklyMinutes, remindersEnabled, reminderTimes, quietHours, and custom learner rewards); Slice 2 done (analytics engine in src/core/ratio/analytics.ts calculating bending weekly targets that smoothly redistribute across active days, rest-day streak preservation, 2x make-up day recovery, multi-skill distribution across the 8 skills, delayed recall retention >= 1 day vs same-day echo, assisted vs independent answer ratio, listening comprehension by accent and playback speed, and curriculum progress vs CEFR benchmarks); Slice 3 done (collectible milestone stamps in handbook vintage bookish style with scalloped borders and postmark cancellation in src/features/ratio/MilestoneStamps.tsx and self-set learner rewards); Slice 4 done (real-life communication goals checklist and language encounters log in src/features/ratio/RealLifeGoalsPanel.tsx; weekly review with reflection prompts, habit formation routines, and 3-day gentle restart plans in src/features/ratio/ReflectionDrawer.tsx; printable monthly progress report in src/features/ratio/MonthlyReportModal.tsx; deep Section 14 analytics panel in src/features/ratio/AdvancedAnalyticsPanel.tsx with what-it-says and what-it-does-not-say guidance; Home Today integration with daily motivational quotes and rest day indicators; Ordo Study settings integration; F0508–F0509, F0837, F0840, F0922, F1128, F1144–F1151, F1153, F1155, F1157–F1167, F1170–F1171, F1173–F1174, F1177–F1178, F1510, F1525, F1608 ticked; typecheck, 204 test files with 1,472 tests and build pass; not looked at in a browser).* Goals, habits and progress | 24 new · 12 to finish | 6-5 | L |
| 6-18 | [ ] | Exams and levels | 38 new · 1 to finish | 6-14, 6-16 | L |
| **Part D · More of the language** (in parallel, after Part A) | | | | | |
| 6-19 | [~] | *claimed by Codex 2026-10-29 on codex/lingua; renewed user request after Reading, then stop. C1 built: Mundus Culture shelf with 32 sourced notes and original examples for es/fr/de/ru/zh/ar; search by word/place/topic, exact normalized word links from the reader drawer and dictionary, card creation with the source retained, regional Commons recordings requested from the existing bundled indexes, and eight practical address/etiquette/food scenarios. No new table or dependency. Typecheck, 1,337 tests and build pass; browser checked at 1280, 1440 and 1366×768 in light/dark on Spanish: query/topic filters, selecting a note, creating a tortilla card and finding Spain/Latin-America recording metadata. Not verified: audio playback, word-link navigation in the browser, other languages visually, independent expert review or every regional variant. Arabic direction, source links, normalized word matching, and offline recording retry are tested. C2 built: Every day in Mundus has native surroundings/day prompts for six core languages, starts Diarium tasks or Sermo, a per-language shopping list with tick/remove/Undo, the existing local-photo OCR entry point, and level-labelled Visio playlists with YouTube watch/shorts/live links. Global reference help opens from the sidebar, reader tools or Ctrl/⌘ Shift E (including input selections), with reviewed text/context, local Culture links and labelled injected-model output. Credential fields are excluded from automatic selection. Existing settings rows store bounded lists; video ids/languages and saved shapes are checked. Typecheck, 1,341 tests and build pass. Browser: Spanish Every day and reference drawer at all three desktop sizes/light-dark; shopping add/tick/remove/Undo/reload, the shortcut selecting sobremesa and a surroundings task opening in Diarium tried. Not verified: real AI, generated explanation UI with a real provider, populated video playlists/playback/captions/live streams or photo OCR on an actual sign, other languages visually or a screen reader. C3 implemented with coverage gaps; C4 incomplete on the Codex branch: opt-in Settings › Look and feel now uses bundled es/fr/de/ru/zh/ar interface messages, including dynamic controls, settings search, app-authored errors and notifications. English hover help is retained, learner names/text remain literal, and stable rich-message slots preserve editable drafts when translations reorder them. Arabic message direction and all six catalogues/placeholder sets have automated checks. The user approved three exact source-copy batches for one-time translation drafts; interface translation makes no runtime network request. Core terms were corrected locally; independent native-speaker review was not done. Final checks: integrated suite 1,502 passed (one skipped); after the last fix, typecheck, 24 focused regression/localization/settings tests and production/PWA build pass; six separate catalogue chunks fit the existing offline-cache limit. Browser: Spanish Settings, Culture and Every day at 1280, 1440 and 1366×768 in Paper/Nocturne; translated settings search, interface off/on/reload, English heading help, persisted shopping item and local reference-to-Culture navigation checked. Not looked at: every migrated screen or the other five languages in a browser; no screen reader, real AI, regional audio playback, populated YouTube playback/captions/live streams or photo OCR of a real sign. Unknown external-provider diagnostics fall back to English; learner/course/source material and proper names retain their original language. Incoming main through alpha.119 was merged without rewriting published branch history; incoming tutor/goals controls and metadata received locally authored translations. Educational explanations, reflection briefs and course/source content retain their original language. The tutor opened with translated controls without a model. Ratio crashed on an existing live-query cache write: the read now skips cache writes, with a regression test and successful browser recheck. No full tutor/goals workflow was exercised. Final wrap-up: the user requested skipping further checks and pushing. Main through alpha.122 was merged; its new 6-23 Marks/transliteration screens were not rechecked or fully localized in this pass. Last verified state: typecheck, 24 focused tests and build passed, and Ratio opened successfully after the cache-write fix. Earlier integrated full suite: 1,502 passed, one skipped. Independent native-speaker review, all-language/all-screen browser coverage and real AI/media/OCR remain unverified. No next step claimed. 6-19 is incomplete. Remaining: finish interface coverage on newly merged screens (including 6-23 English text), run checks after the final merge, and complete the missing language/browser and linguistic review. Real AI, audio/media playback and OCR on an actual sign remain unverified; these are verification gaps, not claims of tested behavior. The earlier completion label was premature. Codex retains the 6-19 claim; no next step is claimed.* Immersion and culture | 23 new · 7 to finish | 6-1 | L |
| 6-20 | [ ] | Phrasebook and notebook (the map is 6-29) | 35 new · 10 to finish | 6-1, 6-2 | L |
| 6-21 | [~] | *claimed by Claude Sonnet 5.5 2026-10-30; planned in full (seven pushes, G1 to G7, in this step's section below); G1 done (0.6.0-alpha.132): `core/games` (seeds, letters, hangman, bests, the shelf's data, the items a game is dealt) with 19 tests, Thesaurus › Games (`/thesaurus/games`, Lingua+ like Practice) with the shelf, a frame with a side panel, Hangman in all alphabetic scripts (Latin, Cyrillic, Greek, Arabic, Hebrew, Armenian, Georgian; right to left looked at with Arabic, light and dark at 1280 and 1366; the accents switch and the Latin keyboard are covered by tests, not looked at); F0172, F1196. G2 checkpoint (0.6.0-alpha.133): Ludus is in the sidebar's Tools (`/thesaurus/games`, no Alt-number so the others keep theirs); the games share one round runner (`RoundRunner`) and letter keyboard; built and looked at (Arabic, right to left): Anagrams, Missing letters, Guess from clues (F0173, F1195, F0175, F0189, F1197); the engines for word search, word hunt and word ladder are written and tested (`wordsearch.ts`, `hunt.ts`, `ladder.ts`), G2 done (0.6.0-alpha.134): Word search, Word hunt and Word ladder have their screens (looked at with Arabic, right to left, with a pack's real word list and a pasted text; F0168, F0169, F0171, F1194). Latin accents switch, Cyrillic and Greek boards are covered by tests, not looked at. Next: G3* Games and projects | 66 new · 3 to finish | 6-4, 6-6 | L |
| 6-22 | [x] | *done by Antigravity-1 2026-10-29; Slice 3.1 done (advanced dictionary search in `src/core/dictionary/searchTools.ts` and `DictionarySearch.tsx`: reverse dictionary by meaning/concept, Damerau-Levenshtein typo-tolerant search, rhyme search by phonological tail, similar-sound/homophone search by IPA/phonetic key, prefix & suffix search, and part-of-speech filter; `F1247`–`F1249`, `F1275`–`F1280` ticked); Slice 3.2 done (one search across Lingua via `Ctrl+K` / `⌘K` palette in `src/core/search/globalSearch.ts` and `GlobalSearchModal.tsx` searching words, decks, flashcards, Codex texts, Diarium journal entries, and Grammatica topics with kind chips; `F1282`, `F1283` ticked); Slice 3.3 done (your dictionary in `src/core/dictionary/userDictionary.ts` and `DictionaryToolsPanel.tsx`: always-accessible Favourites filter in `WordMemory.tsx`, custom dictionary headword/sense creation and editing synced to `db.fullDict`, personal dictionary importer for JSON/CSV/TSV/Markdown, side-by-side multi-source comparison across English Wiktionary, monolingual Wiktionary, Lingua Core Pack, and Personal Dictionary, and "Report or fix entry" with immediate local correction override; `F1285`, `F1287`–`F1290`, `F1482` ticked; typecheck, tests and build pass; not looked at in a browser).* Dictionary tools | 15 new · 2 to finish | 6-1 | M |
| 6-23 | [~] | *reopened 2026-10-30: the light version is built (0.6.0-alpha.120 to .129), the user wants it done deeply; the plan is [LINGUA-6-23-PLAN.md](LINGUA-6-23-PLAN.md), nothing of it built yet* Tools for each language | 32 new · 19 to finish | 6-1, 6-4 | L |
| 6-29 | [ ] | *planned in full 2026-10-29: [WORD-GRAPH-PLAN.md](WORD-GRAPH-PLAN.md), seven pushes, G1 to G7* **The word graph** (a new Thesaurus tab: the atlas of all your words, the compass of one): your vocabulary as a bookish, Obsidian-like web; **Opus plans and builds it** (the user, 2026-10-29) | 20 new | Part A | XL |
| **Part E · Around the app** (any time after Part A) | | | | | |
| 6-24 | [x] | *done by Antigravity-1 2026-10-29; Slice 1.1 done (exporter core in `src/services/export/`: RFC 4180 CSV for vocabulary and decks, Markdown with YAML front matter & `[[wikilinks]]` for decks/journal/grammar notes/highlights/bilingual reading journal/conversations/phrasebook, plain TXT, printable HTML progress report, and RFC 5545 `.ics` study calendar); Slice 1.2 done (Anki `.apkg` exporter in `src/services/export/apkg.ts` with SQLite `collection.anki2`, FSRS memory scheduling, and media blobs verified by round-trip test against `readApkg`); Slice 1.3 done (deck export menu for `.apkg`, `.csv`, `.md` in `DeckPage.tsx` and `ExportDataPanel` in Settings › Your data); Slice 1.4 done (importers for Amazon Kindle `My Clippings.txt`, Quizlet custom-delimiter exports, Markdown with YAML front matter/`[[wikilinks]]`/grammar notes, and timed SRT/VTT transcripts into Codex & Thesaurus; `F0059`, `F0408`, `F0692`, `F1138`, `F1473`, `F1475`, `F1480`, `F1483`, `F1490`–`F1498`, `F1509`, `F1511`, `F1512`, `F1615` ticked; `F1486` browser extension left unticked per CODEX-PLAN; typecheck, tests and build pass; not looked at in a browser).* Import, export and integrations | 15 new · 7 to finish | 6-2 | M |
| 6-25 | [x] | *done by Antigravity-1 2026-10-29; Slice 2.1 done (high-contrast light and dark palettes in `src/design/contrast.ts` with WCAG 2.1 AAA >= 7:1 text-to-background contrast verified by `src/design/contrast.test.ts`, toggleable via `data-high-contrast` in Settings › Look and feel); Slice 2.2 done (colour never alone: distinctive shape/pattern glyphs `✦`, `◒`, `↻` across all card and word states in `src/features/thesaurus/library/states.ts`, `TodayCard.tsx`, and `DeckTree.tsx`); Slice 2.3 done (Lexend variable dyslexia-friendly reading font from `@fontsource-variable/lexend` plus adjustable letter spacing and word spacing sliders in `src/features/ordo/sections/ReadingSection.tsx` and reader typography); Slice 2.4 done (Bypass Blocks skip-to-main-content link in `AppShell.tsx`, `aria-live="polite"` on toast announcements, VoiceOver/screen-reader markup, roles, and headings verified, hotkeys `[`, `?`, `mod+k`); Slice 2.5 done (storage management by kind across dictionaries, texts, flashcards, media in `StorageSection.tsx` with cache clear, destination & privacy disclosures for zero tracking, and battery-efficient audio cancellation on `visibilitychange: hidden` in `voice.ts`); Slice 2.6 done (Word of the Day card on Home in `DailyWordCard.tsx` with deterministic date-seeded key, audio pronunciation, add-to-deck, daily desktop notification request, quick 2-minute review sprint timer, and Document Picture-in-Picture floating review window for Chrome/Edge; `F1523`–`F1524`, `F1531`, `F1533`–`F1534`, `F1536`, `F1539`, `F1541`, `F1544`, `F1546`–`F1547`, `F1549`–`F1550` ticked; typecheck, tests and build pass; not looked at in a browser).* Accessibility and the desktop | 3 new · 10 to finish | — | M |
| **Part F · Further out** (each only with the user's word) | | | | | |
| 6-26 | [ ] | Experiments | 38 new · 2 to finish | the user | — |
| 6-27 | [ ] | Together, and beyond the desk | 9 to finish · 47 to decide | the user | — |
| **Part G** | | | | | |
| 6-28 | [ ] | Lingua 6 complete: the check; version 0.6.0 | — | all, 6-29 included | S |

Sizes are a guide: S an evening, M a session, L two or three sessions, XL more, best split into parts as Lingua 5's
big steps were (a, b, c), each pushed on its own.

### Stages, and which AI builds what (the user, 2026-10-28)

The user has Claude Pro, ChatGPT Plus and Google AI Pro, each with its own limits; Lingua 6 is spread over them so
one limit never stops the work. Each step is still claimed in the table above first, whichever AI builds it.

| Stage | Steps | Who | Why |
| --- | --- | --- | --- |
| — | 6-29 The word graph | Claude Opus, in its seven pushes (G1 to G7, [WORD-GRAPH-PLAN.md](WORD-GRAPH-PLAN.md)) | The user asked for Opus to reason and build it: a layout worker, level of detail and a bookish canvas are where a careful model pays off; after Part A, in parallel with Part B |
| 0 | 6-0 The contracts | Claude Opus, one session | The one place a careful model pays off: every later step and every AI builds against it |
| 1 | Part A, 6-1 to 6-6, in order | Claude Code, Sonnet | Dexie migrations and shared types: one owner, one after the other, no parallel work |
| 2a | Part B, 6-7 to 6-13 | Claude Code, Sonnet | The skills; deep in Part A's engine and the learner's record |
| 2b | Parts D and E, 6-19 to 6-25 | Codex (ChatGPT Plus) or Gemini in Antigravity (Google AI Pro) | Mostly new tabs and parsers, in their own folders; runs at the same time as 2a |
| 3 | Part C, 6-14 to 6-18, in order | Claude Code, Sonnet | Ties A, B and D together; 6-14 waits for 6-8 to 6-10, 6-18 for 6-14 and 6-16 |
| 4 | 6-28 The check, 0.6.0 | Any, Gemini is enough | A spot-check: the audit's entries are ticked step by step as they're built, not all at the end |
| — | Part F, 6-26 and 6-27 | Only with the user's word | Not part of 0.6.0 unless the user asks |

- **Models:** Sonnet for building (Opus uses a Pro limit several times faster); Opus only for 6-0 and a step that
  needs real design thinking. The tests, typecheck and build cost no tokens: run them, don't ask a model to.
- **Parallel without collisions (stages 2a and 2b).** The folders differ, but some files are shared: `src/data/db.ts`
  (the Dexie versions), `src/data/types.ts`, `src/app/router.tsx`, `src/app/pages.ts`, the navigation, and the docs
  (FEATURES, DECISIONS, HANDOVER, this table). So: 6-0 reserves every Lingua 6 table and Dexie version up front,
  so no two steps add the same version number; a step adds to the shared files only in its own lines; always rebase
  onto `origin/main` before a push (CLAUDE.md), and a conflict in a shared file is merged, never overwritten.
- **Short briefs:** with 6-0 in place, a step's brief is "build 6-N as LINGUA-6-PLAN.md says, against the contracts",
  plus HANDOVER.md's prompt. Codex and Gemini read CLAUDE.md too.

---

## 3. The steps

Each step: the idea, what it adds, where it lives, the data, and when it is done. "Entries" lists every catalogue
entry the step builds or finishes (the audit has their names).

### Part A · Foundations

#### 6-0 · The contracts (the user, 2026-10-28)

**The idea:** before Part A is built, fix what everything else builds against, so the parallel stages and the three
AIs agree without reading each other's work. Written as code, not only prose: a types-only folder that
`npm run typecheck` checks, with a short guide beside it.

- `src/core/contracts/word.ts`: the updated `Word` and `DictEntry` (6-1), what each field means, which are new and
  how old records read (defaults, never a rewrite of the learner's data).
- `src/core/contracts/db.ts`: the Dexie bump for all of Lingua 6, every new table with its keys and indexes, and the
  version numbers reserved per step; the upgrade functions stay in `src/data/db.ts`, written in 6-1 to 6-6.
- `src/core/contracts/exercise.ts`: the API of `core/exercise` (6-4): the exercise kinds, the props each screen
  takes, how an answer is checked (exact, accent-blind, a list of accepted answers, AI-checked with Max) and the
  result it reports.
- `src/core/contracts/learner.ts`: the `evidence` table of `core/learner` (6-5): one row per thing the learner did
  (what, which word or topic, right or wrong, how sure, when, from which room), and the questions other rooms ask of it.
- `docs/LINGUA-6-CONTRACTS.md`: a page on how to use them, and the rule that changing a contract is its own small,
  versioned push that says what moved.

**Done when:** the four files typecheck, Part A's steps here point to them, and nothing in the app uses them yet.

#### 6-1 · The word record

**Contract (6-0):** [word.ts](../src/core/contracts/word.ts) (`WordV6`, `DictEntryV6`) and [db.ts](../src/core/contracts/db.ts) (Dexie 18). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Every room already reads words from the dictionary packs (`DictEntry`, forms, examples) and the word
memory (`Word`, `Sighting`). 6-1 makes this one record per word with two halves: **the language** (everything the
dictionary can say) and **you** (everything the learner did with it). Every later step reads from it.

**The language, more of it** (built into the packs by `scripts/dictionary.ts` from Wiktionary through kaikki, as now):
- Word families, roots and stems, prefixes and suffixes, derived forms (Wiktionary's derived and related terms,
  etymology templates); compound words split (German first); homonyms and homophones (same spelling or same IPA).
- Syllables (open hyphenation patterns per language), stress (Russian accents from Wiktionary), countable or not,
  irregular forms flagged, aspect pairs (Russian), phrasal and separable verbs.
- Labels on senses: register and formality, slang and colloquial, regional (Spain or Mexico, Brazil or Portugal,
  Britain or America), connotation (pejorative, endearing): Wiktionary's sense tags, shown as small quiet chips.
- Synonyms ranked by frequency; differences between similar words (the "easily confused" lists, extended); example
  sentences ranked by difficulty (Tatoeba sentences scored by the frequency of their words).
- False friends and cognates **with the learner's own languages** (Tabula), from etymology links and spelling, each
  pair checked by meaning; common spelling mistakes and learner errors (hand-made lists for the six core languages).

**You:** personal notes (the `Word.note` field, now edited on the page), tags, favourite and important, first met,
last reviewed, review history and recall rate (from `reviewLogs`), links to grammar topics ("Why this form?" made
general), to other words, and to every text where it was met (the sightings, as now).

**Where:** Thesaurus › Dictionary's entry becomes **the word's page** (the language left, you right, on a desktop);
the word drawer's "Open dictionary" opens it. **Data:** a new pack format version (`DictEntry.family`,
`syllables`, `labels`, `related`); `Word` gains `tags`, `favourite`, `important` (Dexie version + migration, backup
and merge). Tier 2 packs get what Wiktionary has for them; nothing hand-made.
**Done when:** a Spanish, a German and a Russian word each show family, syllables, labels and the learner's half;
the old packs still load. **Entries (22 new · 23 to finish):** F0121–F0125, F0127–F0129, F0131, F0134, F0136–F0137, F0140–F0141, F0144–F0145, F0148–F0151, F0155–F0157, F0160–F0162, F0164, F1055–F1056, F1060, F1063–F1064, F1066–F1074, F1259, F1270–F1272

#### 6-2 · The inbox and the deck workshop

**Contract (6-0):** [word.ts](../src/core/contracts/word.ts) (`DeckV6`, `NoteV6`, `InboxState`) and [db.ts](../src/core/contracts/db.ts) (Dexie 19). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Saving is not scheduling. Words met and looked up wait in an inbox until the learner decides; decks
are easy to shape; making a deck from a book, a song or a list always shows a preview first.

- **The inbox** (Thesaurus › My decks, a first row "Inbox · 23"; "Your words" in the dictionary becomes its full
  view): each word with its sentence and source; Add to a deck (with meaning and sentence filled), Mark known,
  Ignore; select many with checkboxes for bulk add, tag, move or delete.
- **Decks:** nested folders, tags, a description, a cover picture, cards reordered by drag, cards sorted by alphabet,
  date added, difficulty (FSRS), frequency, due date, part of speech or theme; merge, duplicate and split decks;
  archive (not "mastered": it keeps the history); mark important and pin.
- **Tidy** (a panel in a deck's settings): duplicate cards and duplicate translations found, missing sentences and
  sounds suggested from the dictionary, one click each.
- **Decks from things**, all with a preview where words can be unticked: a text, a book or a chapter (its unknown
  words above a chosen frequency), a podcast or video transcript, a song, a pasted list (meanings from the
  dictionary), a conversation (6-11), a topic, a situation or a goal (Max, 6-6; without Max, the dictionary's
  themes).

**Data:** `Deck.description`, `coverBlobId`, `archived`; `Note.order`; `Folder.parentId`; `Word.inbox`
('new' · 'kept' · 'ignored'). Export of decks is 6-24's exporter. **Done when:** a chapter becomes a 20-word deck
through its preview in under a minute; bulk actions undo. **Entries (15 new · 25 to finish):** F0044–F0058, F0065–F0068, F0070, F0073–F0074, F0076–F0086, F0361, F0801, F0815, F1239, F1481, F1487, F1580

#### 6-3 · Cards and memory

**Contract (6-0):** [word.ts](../src/core/contracts/word.ts) (`CardTemplate`, `CardV6`, `ReviewLogV6`) and [db.ts](../src/core/contracts/db.ts) (Dexie 20). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** More kinds of cards, gentler hints, and the memory shown honestly. `core/srs` already runs ts-fsrs.

- **Card templates per deck:** fronts and backs from word, meaning, definition in the language, picture, sound,
  sentence with a gap, a short paragraph; and new kinds: grammar facts (gender, plural, aspect), synonym, antonym or
  collocation (6-1), several meanings on one card, related words on one card, image occlusion (boxes drawn over a
  picture), sound only.
- **Pictures** from a file, the clipboard or a search of open pictures (Wikimedia Commons, Openverse) with the
  licence kept; always the learner's choice, never automatic.
- **Hints:** the first letter, then more letters; a hinted answer is logged as assisted (6-5). An "I guessed"
  button after a right answer counts as Hard and marks the guess. A mnemonic field on every card (Max can suggest).
- **Memory controls:** custom learning steps; leech detection (many lapses: suggest rewriting, a picture or
  suspending); a Difficult set for extra practice; reschedule or forget a card; bury the sibling direction until
  tomorrow; no near-identical cards in a row; frequently forgotten cards first among equals; after a long absence a
  catch-up plan that spreads the overdue cards over days instead of a wall.
- **The memory, honestly:** a due calendar (a month of due counts), today's estimated time (from time per card), and
  on a card's page its stability and how likely it is remembered today ("about 92 %", ts-fsrs' retrievability) in
  plain words, recognition and recall side by side (the two directions), and its contexts rotated through the
  word's sentences.

**Data:** `Card.buriedUntil`, `leech`; `ReviewLog.hinted`, `guessed`, `contextId`; `Note.mnemonic`, `template`.
**Done when:** a deck with picture fronts and synonym cards studies; leeches are found in a test deck; the catch-up
plan spreads 300 overdue cards over a week. **Entries (21 new · 11 to finish):** F0005–F0009, F0014–F0017, F0021–F0022, F0025–F0026, F0028–F0030, F0092, F0095–F0097, F0099–F0101, F0103, F0109–F0112, F0114–F0115, F0117–F0118

#### 6-4 · One exercise engine

**Contract (6-0):** [exercise.ts](../src/core/contracts/exercise.ts) (no table, Dexie 21 unused). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Ludus (`features/thesaurus/study/exercises.tsx`), Grammatica's lessons, the course, Check yourself and
alphabet lessons each have their own exercises today. One engine in `core/exercise`: an exercise kind is plain data
(prompt, answer check, hints, feedback, what it trains) drawn by shared components, so a new kind works in every room
at once and every answer reaches the learner's record (6-5).

- **New kinds:** drag and drop; matching variants (word and definition, picture, sentence, sound; synonyms and
  antonyms; affixes and meanings; words and parts of speech); correct the mistake; rewrite a wrong sentence;
  transformations (singular to plural, present to past, active to passive, direct to reported speech, statement to
  question) from Grammatica's data; combine, expand or simplify sentences; predict the next form; complete a dialogue.
- **Ways to answer:** hints revealed by a tap and growing step by step; an optional confidence rating; a
  self-assessment for free answers ("Was yours as good?"); delayed feedback (all answers at the end, exam-like);
  retry with a different example.
- **Checking answers:** accents and case tolerated where the language allows; a near miss explained ("right word,
  wrong ending"); free answers judged by meaning with Max and labelled; without Max, the model answer and a self-rating.
- The existing kinds move into the engine **without changing what learners see** (snapshot tests first).

**Done when:** one new kind (transformations) appears in Ludus, Grammatica and the course with no room-specific
code. **Entries (25 new · 3 to finish):** F0033, F0035–F0040, F0241, F0243–F0251, F0254, F0257–F0258, F0925, F0936–F0938, F0941–F0942, F0944, F0947

#### 6-5 · The learner's record

**Contract (6-0):** [learner.ts](../src/core/contracts/learner.ts) and [db.ts](../src/core/contracts/db.ts) (`evidence`, `evidenceDays`, Dexie 22). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Lingua already logs reviews, sessions, journal corrections and grammar items. One record joins them
into evidence: what was answered with and without help, which mistakes recur (in one set of categories across
Diarium, conversation transcripts, Grammatica, Ludus and dictation), which words are recognised but not recalled,
which skills are quiet. It is what the tutor remembers (6-15), what adapts (6-16), what Ratio shows (6-17) and
what exams estimate from (6-18).

- **Categories:** Diarium's (grammar, spelling, word choice, word order, agreement, tense and aspect, case,
  punctuation, style) plus pronunciation and mishearing. A mistake seen on three different days or in three places
  is **persistent**; once is a slip.
- **Your error log** (Mentis › Notebook, 6-20): the persistent ones, each with its examples and a "Practise this".
- **Private:** on the device only, in backups and sync, deleted with the language; exportable (6-24).

**Data:** an append-only `evidence` table (at, lang, skill, item, outcome, assisted, category), with small derived
summaries cached per day. **Done when:** a learner's weak spots are the same in Grammatica, Ratio and the tutor.
**Entries (9 new · 2 to finish):** F0113, F0281, F0664, F0974, F0996, F1009, F1127, F1457–F1460

#### 6-6 · Generated materials, checked

**Contract (6-0):** [db.ts](../src/core/contracts/db.ts) (`generated`, `GeneratedRow`, Dexie 23). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Max already writes prompts, checks entries and explains. One generator service (`services/llm`
extended) makes everything the catalogue wants made, and **checks it before it is shown**, because "language
learners can easily internalize a confident but incorrect explanation" (the catalogue's own warning).

- **Makes:** stories and passages at a level, dialogues and listening scripts (with two voices: Gemini or Piper),
  quizzes, grammar drills, translation and dictation exercises, parallel and simplified texts, flashcards, word
  lists, example sentences, variations of a grammar pattern, and exercises from a document, notes, a transcript or
  the learner's mistakes.
- **Checks:** a strict JSON schema; every word looked up in the offline dictionary (unknown words flagged); the
  level measured (share of words beyond the level by frequency) and regenerated when off; a short second check of
  grammar where cheap; a quiet "Generated" label and Report on everything made; cached so nothing is paid for twice;
  the cost said before a long job.
- **Without Max:** the hand-made or dictionary-made version where one exists; otherwise "This comes with Lingua+ Max",
  as today.

**Done when:** a generated A2 story in French passes the checks, shows its label, and is served from the cache the
second time. **Entries (19 new · 3 to finish):** F0278, F0438, F1013–F1018, F1020–F1024, F1027–F1028, F1031–F1036, F1609

### Part B · The skills

#### 6-7 · Grammar (Cursus › Grammatica, after 5.2-8's guided path)

- **More ways in:** browse by part of speech and by category besides level; search in plain words ("when do I use
  the subjunctive?", 6-15); prerequisites ("Before this: …") and a topic map (a graph of topics, the learned ones
  filled), drawn in the handbook's fine line.
- **Richer pages:** a deeper "More on this", formal and informal pairs, right and wrong pairs, exceptions, regional
  notes, agreement and pronoun tables for the core six, cross-references; pictures that explain: tense timelines,
  word-order slots, decision trees ("which past?"), sentence diagrams, endings coloured on the stem.
- **In the language, or both:** each explanation can be read in the language being learned, or side by side with the
  learner's own (the translation language).
- **The sentence explainer:** select any sentence (reader, lyrics, subtitles, a lesson): every word's role,
  dictionary form, ending and function; clauses bracketed; dependencies drawn as arcs; more than one reading shown
  when it is ambiguous. Forms come from the dictionary on the device; roles and dependencies from Max.
- **Personal:** bookmarks and notes on topics (to the notebook); a heatmap of the topics that cause mistakes (6-5).
- Content for the six core languages; tier 2's short grammars get tables where the data exists.
**Entries (19 new · 12 to finish):** F0195–F0196, F0199, F0203–F0204, F0206–F0207, F0211–F0212, F0214–F0221, F0224–F0227, F0255, F0264, F0267, F0273–F0277, F0279, F0333

#### 6-8 · Reading (Codex)

- **More to read, by kind:** a Graded shelf (texts by measured level, and stories Max writes at your level,
  labelled); shelves from open sources: short stories, fables, fairy tales, myths, poems, essays, speeches and
  historical documents (Wikisource), travel guides (Wikivoyage in the language), recipes (Wikibooks), picture books
  under open licences (StoryWeaver and the like, in-app where the licence allows); dialogues, everyday messages,
  emails and posts (generated and labelled, or Tatoeba's dialogues); parallel texts in two columns; simplified
  versions beside the original (Max). Filters by topic, length, level, kind and known-word share.
- **In the reader:** read the page aloud (Piper or Gemini, following the sentence); colour by part of speech; endings
  marked; an interlinear mode (a gloss under every word); a sentence's literal and natural translation (Max); hide the
  translations, then reveal sentence by sentence; a reading ruler; bookmarks, highlights in colours, margin notes,
  quotes kept with their source, cards from a highlighted passage; export of highlights (6-24).
- **Comprehension, more kinds** (6-4 and 6-6): the main idea, true or false, short answers (Max), a title, events in
  order, a character's motive, meaning from context, what happens next, tone, irony, audience, fact or opinion, a
  metaphor, cultural references, a missing paragraph, headings to paragraphs, the sentence that doesn't belong, the
  original against the simplified; at the end of a text and of a chapter.
- **A book as a project:** words collected chapter by chapter; unknown-word density shown on the contents; a glossary
  of characters and places gathered while reading (names the learner confirms); discussion questions per chapter
  (Max); annotations; a shelf of favourite passages.
**Entries (41 new · 31 to finish):** F0284–F0285, F0287–F0292, F0294–F0296, F0298–F0310, F0319–F0323, F0327, F0336, F0338, F0345–F0346, F0354–F0360, F0366–F0369, F0371, F0373–F0384, F0386–F0388, F0393–F0395, F0399–F0400, F0402, F0404, F0407, F1124–F1125, F1602

#### 6-9 · Listening (Sonus et Visio)

- **The player:** repeat the current sentence (R); loop a selection or between two points (A–B); sentence by
  sentence (a pause after each line, as Visio's auto-pause, for audio with a transcript); a line's translation only
  after it has played; pitch kept or changed with speed; speakers labelled in transcripts (with Max; Whisper alone
  can't tell speakers apart); timestamps and bookmarks for hard parts, replayed by themselves; lines where dictation
  went wrong marked; playlists, yours and by level; a second viewing with less help (the second line hidden, then
  the first).
- **More to hear:** slow and natural versions; accents (Lingua Libre's speakers by region, regional radio); speeches
  and lectures (YouTube, 5.2-4); phone calls, announcements, noise and voices of different ages and moods (generated
  scripts with voices, labelled); an episode made from your own saved words (6-6 and a voice); in Sonus+, stream or share
  directly from **YouTube Music, Amazon Music, Spotify, or Apple Music** so the song you are listening to opens cleanly
  and immediately with synchronized lyrics.
- **Exercises** (6-4), from real lines first (the learner's podcasts, songs and films), then generated ones: hear and
  choose the meaning or the picture, rebuild the sentence, order the words, the missing words in a real line,
  dictation of real lines (with punctuation, or the endings only), keywords, the main idea, who, where and how they
  feel, the next phrase, a change of topic, without and then with subtitles, your guess against the transcript,
  formal or informal, which accent.
- **Training the ear:** word boundaries and connected speech from real clips; speed that steps up while accuracy
  holds (from 0.8×); speech in noise; overlapping speakers; one sentence from several speakers (Tatoeba's audio);
  slow and natural side by side.
**Entries (49 new · 18 to finish):** F0259, F0412–F0416, F0421–F0423, F0426–F0432, F0434–F0435, F0439–F0440, F0443–F0445, F0448–F0449, F0454, F0457–F0461, F0463–F0465, F0467–F0470, F0472–F0477, F0479, F0481–F0486, F0488–F0490, F0494–F0495, F0500–F0503, F0505–F0507, F0816, F0818, F1579, F1600

#### 6-10 · Sounds and pronunciation (a new tab: Cursus › Sounds, beside Alphabets)

- **The sound system** of each core language: its sounds as vowel and consonant charts (IPA, drawn in the handbook's
  line), each sound with recordings (Wikimedia Commons' IPA recordings, public domain) and real words; mouth and
  tongue drawings by hand, with voicing and place explained; syllables and stress rules; intonation and rhythm;
  connected speech where the language has it (reduction, assimilation, elision, gemination, palatalization,
  aspiration, nasal vowels); tones (Mandarin) and pitch accent (Japanese); spelling-to-sound rules and the reverse.
- **Practice:** listen and repeat; record and compare (yours beside the model, with the waveform and a pitch line);
  shadowing (the model plays, you speak over it, both recorded); minimal pairs, heard and said; drills for single
  sounds, clusters, stress, intonation and tones; read a word, a sentence or a paragraph aloud; the same passage every
  week, played back over time (a pronunciation diary).
- **Feedback, honestly:** understandable first, never "lose your accent" (the catalogue's own note): did speech
  recognition on the device (Whisper) get your words; stress and pitch drawn from the recording (local pitch
  tracking); sound-level hints only where they are reliable, labelled as hints; with Max, Gemini can listen and
  comment.
- **In the course:** a "Sounds" first unit for each core language, and pronunciation lessons in later units (6-14).
- Recordings stay on the device, sizes shown, deletable.
**Entries (82 new · 7 to finish):** F0480, F0492–F0493, F0496–F0499, F0510, F0561, F0580, F0586–F0601, F0604–F0606, F0700–F0730, F0733–F0750, F0894, F0933, F0977, F1191, F1309, F1339, F1344, F1351, F1372, F1601, F1618

#### 6-11 · Speaking (Mentis › Sermo, after 5.2-6)

- **In the prompts Sermo writes:** the four modes (free, scenario, tutor, immersion); styles (interruptions and
  follow-up questions, an AI that doesn't always understand, little help, only words you know (a capped list from
  the word memory), new expressions one at a time, branching, several characters, a group); more scenes
  (negotiating, asking for clarification, a pronunciation focus).
- **"How did it go?"** The conversation happens in the learner's AI app since 5.2-6, so Lingua takes it back:
  paste or drop the chat (or a recording) into Sermo, and get the corrected transcript, corrections (essential apart
  from style), more natural and idiomatic alternatives, words to learn, register and politeness, and from a recording
  fluency notes (speaking time, length of answers, pauses, fillers, repeated words, self-corrections, words that were
  hard to find, speech rate) from Whisper's timings on the device; reviewed sentence by sentence; a summary of new
  expressions; mistakes and expressions to cards through a preview; the transcript kept in Diarium.
- **Speaking alone:** 30-second prompts, one-minute talks, storytelling, describing a picture, explaining something,
  a quick debate, challenges made from your week; recorded, written out, reviewed the same way.
- No live voice conversation inside Lingua: the user said no (Q3, 2026-10-26). Feedback comes from the pasted conversation.
**Entries (46 new · 5 to finish):** F0260, F0487, F0520, F0536, F0540, F0548–F0560, F0562–F0576, F0578–F0579, F0581–F0584, F0602–F0603, F0607–F0613, F0975, F0978, F1126

#### 6-12 · Writing (Mentis › Diarium, after 5.2-5)

- **Writing tasks** beside the free entry, each with a short brief and a length: describe a picture, a story (begun or
  continued, with your new words), a dialogue, an email, a formal letter, an informal message, a review, an opinion,
  a persuasive piece, for and against, a travel journal, a biography, an imagined conversation, how something works,
  a memory, a post, a work message, a complaint, an apology, an invitation, a reply to today's news, a rewrite with a
  grammar structure, a text rebuilt from notes.
- **The assistant (Max):** register and formality, simpler or a level higher, several phrasings, more idiomatic and
  more precise words, why a correct sentence still sounds unnatural, literal translations from your own language
  spotted; your voice kept (suggestions, not rewrites, by default); a rubric per task. Measured on the device:
  vocabulary range, sentence length and complexity. A portfolio of your best pieces per level, compared over time,
  by topic and kind.
- **While writing:** a spellchecker in the language (open Hunspell dictionaries), words looked up on hover, the
  dictionary's forms in a side panel (conjugation and declension help), synonyms and collocations of the selected
  word (6-1), a phrase bank (openers, linking words, by function; hand-made for the core six), templates, a timer,
  drafts compared side by side.
**Entries (48 new · 7 to finish):** F0165, F0280, F0617, F0620, F0622–F0628, F0630–F0635, F0637–F0647, F0654–F0658, F0662–F0663, F0665–F0667, F0669, F0672–F0673, F0675–F0682, F0684, F0687, F0689, F0695–F0696, F0834

#### 6-13 · Translating and comparing languages (Ludus › Translate, and contrast notes)

- **Translation practice:** sentences, paragraphs, dialogues; with or without hints; literal and natural; several
  right answers accepted (judged by meaning with Max; without it, against Tatoeba's references); alternatives
  compared; with a required word or a grammar construction; idioms, slang, formal and literary texts, registers; a
  word-by-word alignment view; why the direct translation fails; back-translation; translate, then rebuild the
  original; timed rounds; your own texts.
- **Comparing languages, with the ones the learner speaks** (Tabula): word order, gender, cases, tense and aspect,
  prepositions, articles, pronouns, politeness and address, idioms, cognates and false friends, shared roots, word
  formation, sounds of similar words, meanings that drift, cultural associations. Hand-made tables for pairs among
  English and the six core languages first, then generated and labelled for others; your own notes on a pair (6-20).
- Comparing published translations of one passage; false friends between the Romance languages.
**Entries (45 new · 2 to finish):** F0268–F0272, F0389, F0405, F0754–F0756, F0758–F0772, F0774–F0794, F1341

### Part C · Paths and guidance

#### 6-14 · Courses and lessons (Cursus › Course)

- **Further:** units for B2 (then C1) in the six core languages.
- **New lessons:** listening, reading (a short text with tasks), pronunciation (6-10), translation (6-13), culture,
  spaced review, micro (two minutes) and long (twenty-five); tracks for survival, travel and work; lessons built on
  a story that runs through the units, on a dialogue, on one authentic text or one conversation, by discovery (find
  the rule from examples), from your interests (Max).
- **Structure:** a placement at the start (6-18); paths by skill and by goal (travel, work, study) that branch from
  the same units; optional lessons; any order within a unit; bookmarks and history; a recap of words and grammar at
  each unit's end.
- **Your own course:** build one from decks, texts and topics; from a textbook's contents or a syllabus (imported,
  matched to Lingua's topics and decks with Max); around a goal; or generated on a topic (labelled).
**Entries (29 new · 10 to finish):** F0864–F0865, F0868, F0870, F0872–F0873, F0875–F0876, F0878–F0884, F0886–F0888, F0890–F0891, F0898–F0899, F0901, F0903, F0906–F0907, F0911–F0914, F0916, F0918–F0921, F0952–F0953, F1030, F1374

#### 6-15 · The tutor, in context (everywhere, with Max)

- **Not a chat room.** 5.2-6 takes the chat out of Lingua, and the blueprint agrees: "the tutor is contextual, not a
  disconnected chatbot". An **Ask** button where learning happens (the word drawer, a sentence, a grammar topic, a
  lesson's question, a correction, a card) that knows what is on screen and, if the learner allows, their level,
  known words, studied topics, recurring mistakes and interests (6-5).
- **What it does:** explain simply (grammar, nuance, idioms, slang, pronunciation, regional differences, cultural
  references), compare similar words, give more examples, an easier or harder version, a hint that doesn't give it
  away, why an answer was wrong, an analogy; in your language or in the one you're learning; turn a question into a
  short lesson kept in the notebook.
- **How it explains** (Settings, one group): short or thorough, examples first, how hard, how long the sentences,
  how much of the language, how often to correct, how much translation, how fast it speaks. Presets: teacher, editor,
  coach. Encouraging, never gushing (the handbook's voice).
**Entries (28 new · 10 to finish):** F0222–F0223, F0955–F0958, F0960–F0968, F0970–F0971, F0979, F0981–F0985, F0989–F0992, F0994–F0995, F0998–F1005, F1012

#### 6-16 · Personal and adaptive (Home, Mundus, Ludus)

- **On the learner's record (6-5):** exercises chosen by accuracy; lessons as long as the time there is; texts and
  media where 90–98 % of the words are known; listening speed that adapts; pronunciation drills from your mistakes;
  examples about what you enjoy, in words you know; explanations aware of your languages (false friends from
  Tabula); revision lessons and a small homework at the end of a lesson.
- **Today's plan** on Home: a few minutes each of what helps most, every step skippable.
- **Plans:** around a trip, a book or an exam (dates to a weekly plan); a catch-up after a break; an immersion plan;
  goal suggestions; another way when progress stalls (more listening when recall is stuck, and so on).
- **Every suggestion says why, and can be dismissed or overridden** (Mundus's steps, interactive since 5.2-7).
**Entries (27 new · 11 to finish):** F0263, F0282–F0283, F0403, F0504, F0577, F0670, F0838, F0908, F0948, F0954, F0969, F0972, F0980, F1006, F1008, F1010–F1011, F1037, F1172, F1441–F1442, F1444–F1447, F1449–F1451, F1453, F1456, F1462–F1464, F1469–F1470, F1603, F1610

#### 6-17 · Goals, habits and progress (Ratio and Home, after 5.2-9)

- **Goals of every kind** (5.2-9 puts a basic goal in Tabula): words, lessons, books, conversations, writing,
  listening hours, by a date; weekly targets that bend, with rest days; streaks optional (a setting) with a missed
  day made up the next; no guilt.
- **Reminders** as desktop notifications at chosen times, with quiet hours; off by default (Q5); a calendar file
  (6-24).
- **Looking back:** a weekly review of goals with a reflection prompt, a monthly report (printable), moments worth
  keeping (marked from anywhere; Iter's timeline went in 5.2-9, so a small list in Ratio), real-life goals ("order
  in a café") and encounters, restart and habit plans.
- **Stamps, not points:** real milestones (the first book, 1,000 words) as stamps in the handbook's style; rewards the
  learner sets for themselves.
- **The analytics the catalogue's section 14 asks for:** activity by skill, what was remembered after a day or more,
  answers with and without help, the review workload, comprehension, writing and speaking portfolios, mistakes by
  category over time, progress toward the target level, listening by accent and by speed; each chart with its
  definition and what it doesn't say.
**Entries (24 new · 12 to finish):** F0508–F0509, F0837, F0840, F0922, F1128, F1144–F1151, F1153, F1155, F1157–F1167, F1170–F1171, F1173–F1174, F1177–F1178, F1510, F1525, F1608

#### 6-18 · Exams and levels (a new tab: Cursus › Exams)

- **Where you are:** placement by skill (reading, listening, grammar; vocabulary size by sampling frequency bands;
  writing and speaking with Max), as a level estimate per skill, "an estimate, not a certificate", in ranges
  ("likely B1, perhaps B2"), never a single score.
- **Exam preparation** for the exams of Lingua's languages: DELE (Spanish), DELF and DALF (French), Goethe and TestDaF
  (German), TORFL (Russian), HSK (Mandarin), and for tier 2 IELTS, TOEFL and Cambridge (English), JLPT (Japanese),
  TOPIK (Korean): the format explained, timed mock exams in its task types (made by 6-6 from Lingua's materials),
  writing and speaking rubrics (the official descriptors paraphrased), exam word decks, an oral exam in Sermo (an
  examiner scene), a countdown and a plan by the exam date, a weakness report, the history of mocks, a printable
  revision plan. Past papers: links to the official free samples only.
**Entries (38 new · 1 to finish):** F0069, F0614, F0877, F0986, F1007, F1029, F1154, F1375–F1377, F1379–F1406, F1617

### Part D · More of the language

#### 6-19 · Immersion and culture (Mundus, the word drawer, Codex, Settings)

- **Culture notes** on words and set phrases, and a Culture shelf in Mundus: idioms explained, proverbs, regional
  slang, humour and wordplay, politeness and etiquette, greetings and address, body language, conversational habits,
  holidays and food, history behind expressions, dialect samples (with Lingua Libre's regional recordings),
  intercultural scenes and misunderstandings; words that don't translate. Hand-made with sources for the six core
  languages; "Explain this reference" with Max anywhere.
- **Lingua in the language** (Settings › Look and feel): the app's own words in the language being learned, for the
  six core languages, with the English on hover; translated once and checked. It needs every interface string in one
  place first, so it is the biggest piece of this step. The user said yes to it (Q4, 2026-10-26).
- **Every day:** describe your surroundings, narrate your day, a shopping list in the language, signs and menus read
  from a photo (Codex's OCR), playlists of media by level, short videos and live streams through YouTube (5.2-4).
**Entries (23 new · 7 to finish):** F0158, F0406, F0773, F0807, F0811, F0813, F0819, F0821, F0826–F0827, F0829, F0832, F0841–F0847, F0849–F0852, F0856–F0862

#### 6-20 · Phrasebook and notebook (the word map is now [6-29](#6-29--the-word-graph-thesaurus--atlas))

- **Thesaurus › Phrases:** phrases and sentence templates saved from anywhere (a drag in the reader, a line of a song,
  a subtitle, Sermo), by situation and topic; formal and informal versions, replies, openers, linking words, debate
  phrases, idioms, polite requests, emergencies, travel; sound, translation and notes; search; practised by recall,
  cards on request; new phrases from templates; a phrasebook for a trip; offline; exported (6-24).
- **Mentis › Notebook** (beside Diarium): notes in Markdown (grammar, words, confusing expressions, from reading,
  conversations and media), linked to words, topics, lessons and texts; folders, tags, search across every note; the
  error log (6-5); a summary of your notes and exercises made from one (Max).
- **Thesaurus › Map:** moved to its own step, **6-29 The word graph**, which is much bigger than this bullet was.
**Entries (35 new · 10 to finish):** F0146–F0147, F0159, F0683, F0691, F0795, F0835, F1097–F1118, F1120–F1123, F1130–F1137, F1140–F1141, F1595, F1607

#### 6-21 · Games and projects (Ludus)

- **Word games on your own words:** crossword, word search, hangman, anagrams, missing letters, word ladders, find the
  words in a text, guess the definition or the picture, association, synonym and antonym races, sorting by category,
  odd one out, building from parts, memory, bingo, clues one by one, a daily puzzle (the same for everyone learning
  the language, made from the date), a weekly theme, beating your best, timed translation, dictation races.
- **Story games (Max):** mysteries, text adventures, choose-your-own stories, quests, an escape room, a detective
  case, a journey, a city to explore, survival challenges, conversation quests, finishing a story or a dialogue,
  your own game, games from your words.
- **Projects** (the catalogue's section 17): small chains across rooms, each step opening its room: read a story,
  talk about it, write your opinion; listen and sum it up aloud; watch and explain the argument; recreate a dialogue
  and play both parts; translate and compare; record and write it out; read aloud what you wrote; a presentation
  from a text; a podcast into a deck; a week around one topic; a short story with your new words; your own podcast.
- Games never move a card's schedule unless they are reviews (as Lightning).
**Entries (66 new · 3 to finish):** F0168–F0173, F0175–F0177, F0179–F0184, F0186–F0190, F0313–F0314, F0885, F1185, F1190, F1192–F1201, F1203–F1216, F1220–F1225, F1228–F1232, F1234–F1235, F1237–F1238, F1240–F1244

**The plan (2026-10-30, Claude Sonnet 5.5; seven pushes, G1 to G7, each its own version).**
Build on what is there, don't double it: `core/srs/ludus` (seededRandom, shuffle, the lesson planner), `core/exercise` (6-4), Practice
(`/thesaurus/practice`: matching games, 6-4b), Cantus' `SongGames`, Home's `DailyWordCard`, and 6-6/6-6b's checked generation, whose
*adventure* kind (scenes, choices, endings checked to lead somewhere) is the story-game format. Desktop only.

1. **Where it lives.** One new tab, **Thesaurus › Games** (`/thesaurus/games`), beside Practice: a shelf of cards by group (Word
   games, Story games, Projects), a "Today" strip on top (the daily puzzle, the weekly theme, your bests), and a game opens in
   the room's own wide layout with a side panel (rules, timer, best, a hint) and keyboard play (letters typed, Enter, Esc,
   arrows). Projects open as a chain page, not a game. Code: `src/core/games` (pure, tested) and `src/features/games`.
2. **The words come from the learner.** A game asks `core/games/source` for items: the learner's own words first (deck, folder,
   tag, "due soon", "weak spots" from 6-5), then the language's pack. Each item carries only what exists: term, meaning, example,
   synonyms, opposites, morphemes (if the dictionary has them), a picture (6-1 cards with pictures), a category (tag, or the
   dictionary's). A game says what it needs and is greyed with the reason when the set has too few (as 6-4b's matching games
   already do). Tier 2 languages get every game that needs only words and meanings.
3. **Games never touch the schedule** (this step's rule). A game writes an exercise-log row (6-5) *as practice*, and the words
   it used count toward "seen in a game" in the word's history, nothing more. Only a game that *is* a review (a Lightning-style
   round the learner starts from Recall) moves a card, and it says so in its panel. Streaks stay optional (Q5): bests and stamps
   only, no points.
4. **Daily and weekly are the same for everyone, made from the date.** `dailySeed(lang, yyyy-mm-dd)` picks the game, the word
   set (from the language's frequency list, not the learner's, so two learners see one puzzle) and the seed; a week's theme comes
   from a fixed list of 52 topics per language, indexed by ISO week. No server, no clock trust beyond the device's date;
   done-today is a local stamp. (F1215, F1216, F0188 finished.)
5. **Max only where the entry says so.** Word games, bingo, memory, ladders, crosswords, the daily and the weekly work without a
   key. Story games, "AI-generated games on your vocabulary" and custom games use 6-6's pipeline (checked, cached, fakeable in
   tests); without Max they play from the **ready-made set** (below) and say the rest needs Max.

**G1 · The engine and the shelf** (no game yet but one)
- `core/games`: `GameDef` (id, group, needs, play component key, scoring: time, mistakes, hints), `seeds.ts` (dailySeed, weekSeed,
  `seededRandom` reused), `source.ts` (the item shapes above and `canPlay(def, items)`), `bests.ts` (a best per game and
  language, kept in settings), tests for all three.
- `features/games`: `GamesPage` (shelf, Today strip), `GameFrame` (side panel, timer, keyboard, a hint that costs a star), route and
  tab. Entries moved to "partly done" only; the first game, **Hangman-style spelling** (F0172, F1196), proves the frame.
- Done when: the tab is there, hangman plays with the keyboard, the best is kept, light and dark at 1280/1440/1366×768.

**G2 · Letter games** (all pure, no key): anagrams (F0173 finished, F1195), missing letters (F0175), word hunting (F0168: find the learner's words inside a text they have read, the words marked as found, with the sentence shown), word search (F0171, F1194), word ladders (F0169; steps must be words in the pack, one letter apart,
built by search over the pack's words of one length), progressively revealed clues (F0189). Layout makers
(`wordsearch.ts`, `ladder.ts`) are tested for: every word placed, no overlaps that break a word, a ladder that exists.

**G3 · Crossword, and the word-link games**
- Crossword (F0170, F1193): `crossword.ts` places 8 to 14 of the learner's words on a grid (a greedy crossing search with a time
  budget; falls back to fewer words; never a grid with two answers); clues are the meaning, then the example with the word hidden,
  then the first letter; arrow-key and typing play, check-a-word, reveal-a-letter.
- Word association (F0179, F1192), synonym races (F0180), antonym races (F0181): a chain game on the thesaurus data (6-7/6-22),
  scored against the pack's relations; a typed answer is accepted when the pack, or the learner's own links, relate the words.
- Category sorting (F0182, F1200) and odd one out (F0183, F1201): categories from tags, deck names and the dictionary's
  topics; odd one out only when a set has three words of one category and one of another.

**G4 · Picture, meaning and match**
- Guess the definition (F0176), guess the word (F1197), picture vocabulary (F0177, F1198; cards that have a picture; credit shown
  as 6-1 stores it), memory-matching cards (F0186, F1199; word to meaning, word to picture, word to sound), vocabulary bingo
  (F0187; a 5×5 card from the learner's words, "called" as meaning or sound), build a word from morphemes (F0184; only where the
  dictionary has parts, and says so otherwise).

**G5 · Races, the daily, the weekly and the tournament**
- Timed translation (F1185) and dictation races (F1190): run on 6-4's translate and dictation exercise kinds with a clock, a
  best, and 6-5's log (writing and listening); no new judging.
- Daily puzzle (F1215, F0188 finished) and weekly theme (F1216) per rule 4; a shareable result as text (Wordle-style grid), copied,
  not posted. Beating your best (shown on every game card).
- Mini tournaments (F0190): a round of 3 to 5 games chained with one score, local only (solo against your own best and a
  "ghost" of your last run; no other player, no server: the user decides about community in 6-27).

**G6 · Story games (Max, with a ready-made set)**
- One format, the existing `AdventureBody` (scenes, choices, endings), extended with *state* that choices can set and test: an
  item, a clue, a number. That one change carries choose-your-own (F0313, F0314, F1207), text adventures (F1206), mysteries and
  the detective case (F1205, F1210: clues gate the accusation), the escape room (F1209: puzzles in the language gate the door),
  a journey and the city to explore (F1211, F1212: places as scenes), survival challenges (F1213: a clock/health counter),
  quests (F1208) and conversation quests (F1214: a scene asks for a line, judged by 6-11's feedback or by a pick from options
  without Max). The checker grows: every ending reachable, no dead scene, every needed item obtainable.
- Story and dialogue completion (F1203, F1204): the end of a story, or a missing line, chosen or written; judged with options
  (no key) or by Max.
- **Ready-made set:** for the six core languages, hand-made, three stories per level from A1 to B1 (a mystery, an escape
  room, a city), checked by the same checker; written in the course's language and format, listed with their source.
- Games from your words and custom games (F1220, F1221): the learner picks words and a kind; Max writes the story round them
  (checked: the words are in it); "your own game" is an editor for a scene list saved as a deck-like record, exported with 6-24.

**G7 · Projects**
- A project is a **chain**: ordered steps, each a link into a room that exists, with what the step needs carried along (the text,
  the words, the recording). Stored as one record (`projects`, a Dexie table with the next version after 6-16's; chain, step
  states, the made things attached by id), shown in Mentis › Notebook's neighbour tab or Thesaurus › Games › Projects (decide at
  G7 after 6-20 lands), with a progress strip. Templates, each a chain: read a story, discuss it, write your opinion (F1222,
  F1224); listen, summarize aloud (F1223); watch, explain the argument (F1225); listen and recreate a dialogue, perform both
  roles (F1228, F1229); idioms then a story (F1230); translate and compare (F1231, with 6-13); record then transcript (F1232);
  write then read aloud (F1234 finished); spoken answer then transcript (F1235); debate after reading (F1237); a presentation
  from a text (F1238); a conversation into a lesson (F1240); writing corrections into review exercises (F1241, uses 6-5's
  record); a weekly project on one topic (F0885, F1242); a short story with your new words (F1243); your own podcast (F1244,
  with Made by Max's audio and 6-9's recording). A project can be made from scratch: pick steps from the list.
- Steps that need Max say so and are skipped over without it (the rest of the chain still works).

**The quality bar (every game, every push):** played to the end with the keyboard alone; a clear empty state when the
words are too few, and a way to widen the set; no frame drops on the biggest grid (docs/PERFORMANCE.md: layout makers run
off the render path and are cached by seed); right-to-left and non-Latin scripts work in every letter game (Arabic, Hebrew,
Japanese, Chinese: letter games use the script's own units, and games that cannot say so instead of being broken);
sound and speech only where the device has them, as elsewhere; a test for each maker (same seed gives the same puzzle, every
puzzle is solvable) and for the story checker; the game's cards ticked in LINGUA-6-FEATURES.md only when it is
finished, not when it opens.

**Not in this step:** other players, a public daily board, anything with a server (6-27); phone widgets (D6). Hand-made story
sets for tier 2 languages (tier 2 gets the word games and the generated stories only).

**Checks per push:** typecheck, tests (the makers and the story checker carry the most), build, a look at every new game at
1280, 1440, 1366×768, light and dark; a faked model for anything Max. Tick entries in LINGUA-6-FEATURES.md as built; add the
decisions (the shelf's place, the story state format, the daily seed) to DECISIONS.md at G1 and G6.

#### 6-22 · Dictionary tools (Thesaurus › Dictionary)

- **Search:** by definition (a reverse dictionary: describe it, get the word), with typos, rhymes, similar sounds (by
  IPA), prefix or suffix, by part of speech; and **one search across Lingua** (Ctrl K): texts, notes, cards, phrases,
  topics.
- **Your dictionary:** favourites and bookmarks; your own entries; several dictionaries for one language (the pack,
  the language's own Wiktionary, one you import) compared side by side; report a wrong entry (fixed for you at once,
  and listed for the next pack build).
**Entries (15 new · 2 to finish):** F1247–F1249, F1275–F1280, F1282–F1283, F1285, F1287–F1290, F1482

#### 6-23 · Tools for each language

**Reopened 2026-10-30. The deep plan, with a "done when" for every track, is [LINGUA-6-23-PLAN.md](LINGUA-6-23-PLAN.md). What follows is the first, light plan and what it built.**

- **Scripts:** stroke order (Make Me a Hanzi and KanjiVG, open data), components and radicals, transliteration on or
  off and fading as you learn (pinyin, romaji, Arabic and Cyrillic romanisation), script conversion (Serbian Cyrillic
  and Latin; Traditional and Simplified through OpenCC), accents and diacritics drills, ligatures, Russian cursive, a
  character reference.
- **Russian:** the soft and hard signs, unstressed vowels, stress shown, aspect pairs, verbs of motion and their
  prefixes, numerals, participles, reflexive verbs, word order and sentence stress.
- **Romance languages:** clitic pronouns, where the accent goes, regional words (Spain and Latin America, France and
  Québec), dialects compared, European and Brazilian Portuguese, verbs and their prepositions.
- **East Asian:** kanji readings, hanja, honorifics and politeness levels, classifiers and measure words, particles,
  reading aids removed gradually, Traditional and Simplified, kana to kanji, handwriting matched against the strokes.
- **Arabic:** short vowels faded progressively, diacritics, a root explorer (words by root and pattern, from the
  dictionary), Modern Standard and dialect labelled with samples, registers, transliteration controls.
**Entries (32 new · 19 to finish):** F1294–F1295, F1298–F1306, F1308, F1310–F1311, F1314–F1317, F1321–F1325, F1331, F1334–F1335, F1337–F1338, F1340, F1343, F1345–F1350, F1352–F1356, F1359–F1362, F1365–F1369, F1371

**Plan (claimed 2026-10-30; build in these slices, one push each, ticking F-entries in LINGUA-6-FEATURES.md as built):**

1. **Scripts · reading aids (done, 0.6.0-alpha.121).** Build on `core/script` (`romanize.ts`, `letters.ts`, `drills.ts`, `alphabets/`): a per-language transliteration setting (on, off, fading by how well the learner knows the word) shown through one shared `<Reading>` component; Unicode character reference page (F1306). F1298, F1300, F1301, F1306.
2. **Scripts · conversion and drills (done, 0.6.0-alpha.122: Cursus › Marks; Chinese converts character by character from Unihan, not OpenCC's phrase tables; Serbo-Croatian is `sh`; drills are small hand-written sets for es, fr, pt, it, de, ru, ar).** Serbian Cyrillic ⇄ Latin (a table, no dependency); Traditional ⇄ Simplified (OpenCC data as a lazy-loaded chunk, offline); diacritic, accent-mark, ligature and cursive drills on the existing drill engine. F1299, F1302–F1305, F1334.
3. **Stroke order and components (done, 0.6.0-alpha.123 for Mandarin and 0.6.0-alpha.124 for Japanese: KanjiVG, 1,000 kanji in `public/strokes/ja.json`; Mandarin: 1,000 characters from Make Me a Hanzi in `public/strokes/zh.json`, fetched on first use; handwriting matched against strokes and radicals as their own list are left for later).** Make Me a Hanzi / KanjiVG data, built by a script into `public/` per character (lazy), animated stroke order, components and radicals, handwriting matched against strokes later. F1294, F1295.
4. **Russian (done, 0.6.0-alpha.124: nine sets of hand-written multiple-choice items, 2 to 7 each, in Cursus › Marks for Russian; not grammar topics with pack sentences, and no drills built from the dictionary).** Soft and hard signs, unstressed vowels, stress shown (extends `core/lang/stress.ts`), aspect pairs and comparison, verbs of motion and prefixes, numeral declension, participles, reflexives, word order and sentence stress, as grammar topics plus exercises on `core/exercise`. F1308, F1310, F1311, F1314–F1317, F1321–F1325.
5. **Romance (done, 0.6.0-alpha.125: hand-written items in Cursus › Marks for es, fr, pt, it: clitics, verbs and prepositions, Spain and Latin America, France, Belgium and Québec, European and Brazilian Portuguese; Italian has no regional set; not checked by a native speaker).** Clitic pronouns, accent placement, regional words, European vs Brazilian Portuguese, verb + preposition. F1331, F1334–F1335, F1337–F1338, F1340.
6. **East Asian (done, 0.6.0-alpha.128: tone, radical, parts, meaning, kanji-reading, kana-to-kanji, Traditional-form and hanja quizzes built from the data; readings from Unihan in `public/chars/readings.json`; a Hanja lookup for Korean; a write pad that checks each stroke's place and direction against the real one, for Mandarin and kanji; hand-written items for measure words and counters, particles, politeness levels and honorifics in zh, ja and ko; reading aids fade as in slice 1).** Kanji readings, hanja, honorifics and politeness levels, classifiers, particles, kana to kanji. F1343, F1345–F1350, F1352–F1356.
7. **Arabic (done, 0.6.0-alpha.128: a root explorer (eight hand-written roots, 190 more from Wiktionary's root templates in `public/dict/ar-roots.json`, and ten patterns fitted to any root); short vowel marks fade in the reader with Fading; plain or scholarly transliteration; hand-written items for short vowels, diacritics, dialect and register).** Short vowels faded progressively, diacritics, root explorer from the dictionary (feeds WORD-GRAPH-PLAN), MSA vs dialect labels, registers, transliteration controls. F1359–F1362, F1365–F1369, F1371.

Each slice: tests beside the code, `typecheck` + `test` + `build`, look at it at 1280/1440/1366×768 in light and dark, update ROADMAP/DECISIONS. Data licences (Make Me a Hanzi, KanjiVG, OpenCC) are noted in DECISIONS when slice 2–3 land. Tier 2 languages stay cheap: nothing here adds a course for them.

#### 6-29 · The word graph (Thesaurus › Atlas)

**The user's idea (2026-10-29):** "In Thesaurus I was thinking of a graph view, like a beautiful, bookish, aesthetic web view, where you have an overview of your personal vocabulary and dictionary, like a second brain, kind of like Obsidian, but made for and specialised completely for languages." Then, the same day: the lines "smooth, dynamic, aesthetic", and everything "easy to overview, hover, scroll, zoom, see, all the words you know".

**The full plan is [WORD-GRAPH-PLAN.md](WORD-GRAPH-PLAN.md)** (Claude Opus, 2026-10-29, measured on the real dictionaries and
packs; to be built by Opus in seven pushes, G1 to G7, with two sketches drawn from the data in `docs/graph/`). In short: two
views of one web. **The atlas** shows every word you have at once, in regions named by their theme, and is where the tab
opens; **the compass** shows one word with its neighbours in four quarters (meaning west, form east, origin north, use
south), and is where a word opens. Shared things are hubs only when 2 to 60 of your words share them, bigger groups are
lenses; size is how common a word is and ink how well you know it; the lines are curves drawn like ink, bundled between
regions, alive when you act and still when you read; every view ends in something to do (review the fading, link the loose
threads, discover words, practise your mix-ups). It replaces 6-20's "Thesaurus › Map" bullet (one map, not two) and holds the
audit's 13.2. Its tables are Dexie 46, after a contract push (G3). The tab is called **Atlas** (the user, 2026-10-29).

**Entries (20 new):** F1076–F1095 (all of 13.2), traced push by push in the plan's section 12.

### Part E · Around the app

#### 6-24 · Import, export and integrations

- **One exporter** (`services/export`) used by every room. **Out:** words to CSV, decks to Anki (`.apkg` with media)
  and CSV, notes and entries to Markdown, text or PDF, statistics (CSV), highlights, conversation transcripts, the
  phrasebook, progress reports (a printable page), a bilingual reading journal; a calendar file (`.ics`) for plans
  and exam dates; Markdown that Obsidian and Notion import.
- **In:** Quizlet's text export, Markdown, transcripts with timings, grammar notes, any web page's text through the
  Lingua extension (5.2-4's extension gains "Send to Codex"), Kindle's `My Clippings.txt` and vocabulary lookups.
**Entries (15 new · 7 to finish):** F0059, F0408, F0692, F1138, F1473, F1475, F1480, F1483, F1486, F1490–F1498, F1509, F1511–F1512, F1615

#### 6-25 · Accessibility and the desktop (with Lingua 7's check)

- A high-contrast pair of palettes (7 : 1 text); colour never alone (shapes and patterns beside the colours of word
  states, card states and charts); a dyslexia-friendly reading choice (Lexend or OpenDyslexic, with letter and word
  spacing) besides Atkinson Hyperlegible; a screen-reader pass (labels, live regions, headings; Narrator, NVDA and
  macOS VoiceOver); a keyboard-only pass over every room.
- One privacy page: what is sent where (AI, translation, look-ups, recordings). Storage by kind (packs, voices,
  audio, video, recordings) with delete. Transcription paused when the app is hidden. Clear errors everywhere (with
  Lingua 7-10). Undo after every destructive action.
- **On the desktop instead of a phone widget:** a word of the day on Home and as an optional notification, and a
  small review window that floats over other apps (Document Picture-in-Picture in Chrome and Edge).
**Entries (3 new · 10 to finish):** F1523–F1524, F1531, F1533–F1534, F1536, F1539, F1541, F1544, F1546–F1547, F1549–F1550

### Part F · Further out (each only with the user's word)

#### 6-26 · Experiments

Each is proposed to the user in a few lines before it is built, and starts in Settings › Lab. Ideas: interactive
novels and audio dramas (6-6 and voices); characters who remember (would need a chat, which the user declined: Q3); generated roleplay worlds,
shops, cafés and stations to walk through; a tutor that follows your word map; meaning maps across languages; a map
of grammar; a morphology explorer; books and your own writing analysed (vocabulary profile, difficulty curve, your
corpus); authors compared; language across periods and how words evolved (etymology chains); dialect maps; a
pronunciation lab (waveform and spectrogram); AI pronunciation coaching; hints while you talk; speech-driven
adventures; the webcam reading signs and labelling objects; phrases suggested by context; one journal in several
languages; word families across languages; **a personal textbook** (a printable book of your words and texts);
audiobooks at your level; subtitles that show only the words you don't know; a research dashboard and experiments
comparing ways to remember; plans to keep a language up; heritage-language paths; what transfers between your
languages; a multilingual word map; a game of real or synthetic voices.
**Entries (38 new · 2 to finish):** F0398, F0491, F1269, F1467–F1468, F1551–F1578, F1581–F1585, F1587–F1588

#### 6-27 · Together, and beyond the desk

**What is here:** community (profiles, following, forums, groups, partners, exchanges, peer correction, leaderboards,
shared goals, tournaments, community decks, courses and reading lists), apps for iPhone and Android, widgets,
TalkBack, a phone's share sheet, and cloud sync with accounts.

**Why it waits for the user:** Lingua is private and local, with no accounts and only a tiny licence server (D1);
the phone isn't designed for (D6, D7); anything public needs moderation, reporting, blocking and safety for younger
learners (the catalogue's own F1437–F1439), which is ongoing work and, in the EU, a legal duty for platforms.

**What Lingua can do without a server** (each small, proposed as the default): share a deck, a reading list, a plan
or a course as a file or a link that carries its data, imported by the other person; "Ask a speaker" already copies
a text for someone; two people's devices paired for shared decks only (as device sync does); a progress card as a
picture (Tabula's image card). **With a server:** accounts and a database (Supabase, as FEATURES once noted),
moderation tools, terms and a privacy policy, and a running cost. The PWA keeps working on phones as it does (D7).
**Entries (9 to finish · 47 to decide):** F0060–F0064, F0192, F0318, F0917, F1179–F1181, F1217–F1219, F1407–F1408, F1410–F1439, F1500, F1504, F1515–F1516, F1522, F1540, F1612–F1614, F1616

### Part G

#### 6-28 · Lingua 6 complete: the check

Every step's entries ticked in LINGUA-6-FEATURES.md (or moved, with the reason, to 6-26 or 6-27); the handbook's
review sheet for every new screen; typecheck, tests and the build; 1280, 1440 and 1366×768, light and dark, two
palettes each; the six core languages and one tier 2 language through each new feature; `node scripts/version.ts
--release`: version 0.6.0.

---

## 4. The methods (the catalogue's section 26)

Methods aren't features: this is where Lingua already teaches with each, and what Lingua 6 adds.

| Method | In Lingua today | Lingua 6 |
| --- | --- | --- |
| Spaced repetition | FSRS for cards and grammar items | 6-3: the memory shown honestly, catch-up plans |
| Active recall | Production cards, typing, Ludus | 6-3: hints that are logged |
| Interleaving | Grammatica brings items from other topics; Ludus mixes kinds | 6-4: kinds from every skill mixed |
| Retrieval practice | Reviews, Lightning | 6-21: games on your words |
| Comprehensible input | Level guesses, known-word share | 6-16: texts at 90–98 % known |
| Extensive reading | Codex, Discover, shelves | 6-8: graded shelves by kind |
| Intensive reading | The word panel, S, Check yourself | 6-7: the sentence explainer; 6-8: comprehension |
| Extensive listening | Podcasts, audiobooks, radio | 6-9: playlists by level |
| Intensive listening | Transcripts, line replay | 6-9: loops, dictation of real lines |
| Shadowing | — | 6-10 |
| Dictation | Ludus dictation where a natural voice speaks | 6-9: dictation of real media |
| Sentence mining | Lines and phrases as cards, Made for you | 6-2: the inbox |
| Translation | Ludus and Grammatica both ways | 6-13 |
| Output practice | Diarium, Sermo, the course's speaking and writing | 6-11, 6-12 |
| Corrective feedback | Diarium's Check, "Your own sentence" | 6-11: conversation feedback; 6-5: mistakes across rooms |
| Task-based learning | Sermo's scenes, the course's writing tasks | 6-12: tasks; 6-21: projects |
| Communicative practice | Sermo | 6-11 |
| Pattern discovery | Grammatica's "examples first" | 6-14: discovery lessons |
| Explicit instruction | Grammatica's rules | 6-7 |
| Minimal-pair training | — | 6-10 |
| Phonetic training | Alphabets (letters and sounds) | 6-10 |
| Interlinear reading | Pinyin and kana over words, glosses on hover | 6-8: the interlinear mode |
| Dual coding | Fine drawings, pictures on Anki cards | 6-3: pictures on any card |
| Mnemonics | — | 6-3: a mnemonic on every card |
| Chunk learning | Set phrases, phrases as cards | 6-20: the phrasebook |
| Incidental learning | Reading, listening and watching with look-ups | — (already the heart of Lingua) |
| Deliberate practice | Weak spots in Grammatica (5.2-8) | 6-5, 6-16 |
| Self-explanation | — | 6-4: "explain why" answers |
| Peer learning | "Ask a speaker" | 6-27 |
| Immersion | Visio, radio, music, Mundus | 6-19 |
| Reflective learning | Ratio, Mundus's note on your week | 6-17: reflection prompts |

---

## 5. What can't be done exactly as the catalogue says

- **Song lyrics** are shown from LRCLIB as now; Lingua doesn't store or pass on licensed lyrics.
- **Past exam papers:** links to the official free samples only.
- **Sound-by-sound scoring** in the browser isn't reliable; Lingua says whether you were understood, draws stress and
  pitch, and labels anything finer as a hint.
- **Telling speakers apart** without a key isn't reliable on the device; with Max only.
- **Exam scores** are ranges with their uncertainty, never a prediction to the point.
- **Quizlet** has no open API (its text export works); books bought for Kindle or Apple Books are DRM-protected
  (highlights come through Kindle's clippings file).
- **Third-party media** stays within each service's terms, as Visio already does; live streams through YouTube only.
- **Pictures for cards** come from open-licence sources with their credit, never scraped from search engines.
- **Community and phone apps:** 6-27.

## 6. The user's answers (2026-10-26)

| # | Question | The user's answer, and what follows |
| --- | --- | --- |
| Q1 | Lingua 6 after Lingua 7, or before? | **"Do Lingua Features first, then Lingua Design."** Lingua 6 is next after Lingua 5's check; Lingua 7 follows. Versions: Lingua 6 is `0.6.x`, Lingua 7 then `0.7.x`: the plans were renamed on 2026-10-27 so the numbers follow the order (VERSIONS.md). |
| Q2 | Sharing and community: files and links only, or a server with accounts? | **"Still to be considered."** Open: nothing in 6-27 is built until the user decides. |
| Q3 | A live voice conversation inside Lingua again? | **No.** Sermo keeps opening the learner's AI app; 6-11's feedback comes from the pasted conversation. |
| Q4 | The interface in the language being learned, for the six core languages? | **Yes**, as the last part of 6-19. |
| Q5 | Streaks optional, stamps instead of points, reminders off by default? | **Yes.** |
| Q6 | Phone apps and widgets: still decided against (D6)? | **"Can be."** Not ruled out any more; still not scheduled. Until the user schedules them, desktop only (D6) holds for everything built. |
