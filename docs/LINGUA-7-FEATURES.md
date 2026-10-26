# Lingua 7 · Features · the audit

The Lingyu design package's feature catalogue (1,618 entries, F0001–F1618, pasted by the user on 2026-10-26)
checked against Lingua as it is on 2026-10-26 (version 0.5.2-alpha.3). The plan that builds what is missing is
[LINGUA-7-PLAN.md](LINGUA-7-PLAN.md); each entry below names its step.

**How to read it**
- `- [x]` Lingua has it. Where it lives is said under each section's heading.
- `- [ ]` … **7-N**: built in Lingua 7 step 7-N. "partly there" means part of it exists and the step finishes it.
- **5.2-N** · planned in Lingua 5.2: an open step of Lingua 5 already covers it.
- **7-27** · needs the user's word: it goes against a standing decision (desktop only; no accounts, no servers,
  nothing public). Step 7-27 says what each would take, and a local-first way to get most of it.
- **When a step is built, tick its entries here** in the same commit, so this list stays the truth.

The audit was made from the docs (FEATURES, ROADMAP, the 5.1 and 5.2 plans) and the code (`src/data/types.ts`,
`core/srs`, the rooms' folders). "Has it" means a learner can do it today; an entry counted as there in a
simpler form than the catalogue means is marked "partly there" rather than ticked.

## In numbers

| | Entries |
| --- | --- |
| Lingua has it | 437 |
| Partly there, finished in Lingua 7 | 262 |
| Missing, built in Lingua 7 | 834 |
| Planned in Lingua 5.2 already | 38 |
| Needs the user's word (step 7-27) | 47 |
| **All** | **1618** |

| # | Category | Entries | Has | Partly | Missing | 5.2 | Ask |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 02 | [Vocabulary learning](#02--vocabulary-learning) | 192 | 59 | 53 | 76 | 0 | 4 |
| 03 | [Grammar learning](#03--grammar-learning) | 91 | 31 | 14 | 44 | 2 | 0 |
| 04 | [Reading and comprehension](#04--reading-and-comprehension) | 125 | 44 | 32 | 47 | 1 | 1 |
| 05 | [Listening and auditory learning](#05--listening-and-auditory-learning) | 102 | 26 | 19 | 57 | 0 | 0 |
| 06 | [Speaking and conversation](#06--speaking-and-conversation) | 104 | 8 | 5 | 64 | 27 | 0 |
| 07 | [Writing and composition](#07--writing-and-composition) | 82 | 25 | 8 | 49 | 0 | 0 |
| 08 | [Pronunciation and phonetics](#08--pronunciation-and-phonetics) | 54 | 5 | 3 | 46 | 0 | 0 |
| 09 | [Translation and bilingual learning](#09--translation-and-bilingual-learning) | 45 | 4 | 2 | 39 | 0 | 0 |
| 10 | [Real-world immersion](#10--real-world-immersion) | 67 | 28 | 10 | 26 | 3 | 0 |
| 11 | [Interactive lessons and courses](#11--interactive-lessons-and-courses) | 92 | 38 | 10 | 43 | 0 | 1 |
| 12 | [AI tutor and personal teacher](#12--ai-tutor-and-personal-teacher) | 83 | 10 | 13 | 60 | 0 | 0 |
| 13 | [The personal vocabulary and knowledge system](#13--the-personal-vocabulary-and-knowledge-system) | 104 | 28 | 11 | 65 | 0 | 0 |
| 15 | [Goals, habits and motivation](#15--goals-habits-and-motivation) | 41 | 9 | 10 | 19 | 0 | 3 |
| 16 | [Interactive games and challenges](#16--interactive-games-and-challenges) | 39 | 7 | 0 | 29 | 0 | 3 |
| 17 | [Reading, writing and speaking together](#17--reading-writing-and-speaking-together) | 23 | 3 | 2 | 17 | 1 | 0 |
| 18 | [Dictionaries and linguistic reference tools](#18--dictionaries-and-linguistic-reference-tools) | 46 | 25 | 5 | 16 | 0 | 0 |
| 19 | [Language-specific tools](#19--language-specific-tools) | 82 | 25 | 19 | 38 | 0 | 0 |
| 20 | [Exams and proficiency certification](#20--exams-and-proficiency-certification) | 34 | 2 | 2 | 30 | 0 | 0 |
| 21 | [Community and social learning](#21--community-and-social-learning) | 33 | 1 | 5 | 0 | 0 | 27 |
| 22 | [Personalization and adaptive learning](#22--personalization-and-adaptive-learning) | 31 | 7 | 9 | 13 | 2 | 0 |
| 23 | [Importing, exporting and integrations](#23--importing-exporting-and-integrations) | 42 | 17 | 8 | 14 | 2 | 1 |
| 24 | [Mobile, desktop and accessibility](#24--mobile-desktop-and-accessibility) | 38 | 20 | 10 | 4 | 0 | 4 |
| 25 | [Advanced and experimental features](#25--advanced-and-experimental-features) | 38 | 1 | 3 | 34 | 0 | 0 |
| 27 | [My recommended feature priorities](#27--my-recommended-feature-priorities) | 30 | 14 | 9 | 4 | 0 | 3 |

## 01 · The complete learning landscape

- **Vocabulary:** Words, phrases, recall and retention.
- **Reading:** Texts, books, comprehension and context.
- **Listening:** Speech, accents, sounds and comprehension.
- **Speaking:** Conversation, fluency and pronunciation.
- **Writing:** Composition, spelling and expression.
- **Grammar:** Patterns, sentence structure and usage.
- **Translation:** Meaning, nuance and switching languages.
- **Immersion &amp; culture:** Real-world use, media and cultural context.

*Lingua's rooms already cover all eight: Thesaurus and Ludus (vocabulary), Codex (reading), Sonus et Visio
(listening), Sermo and the course's speaking (speaking), Diarium (writing), Grammatica (grammar), translation
in every room, and Mundus, Visio and the music (immersion and culture).*

## 02 · Vocabulary learning

Vocabulary is much more than translating a word and flipping a flashcard. Learners need to recognize words, recall them, understand their different meanings, use them in context and retrieve them weeks later.

#### 2.1 Flashcards and recall

*In Lingua: Thesaurus: cards both ways, sentences with a gap; Ludus: choices, typing, pairs, letter tiles, listening and dictation where a natural voice speaks.*

- [x] `F0001` ⭐ Traditional front-and-back flashcards
- [x] `F0002` ⭐ Target language → native language
- [x] `F0003` ⭐ Native language → target language
- [x] `F0004` Word → definition
- [ ] `F0005` Definition → word · **7-3** · partly there
- [ ] `F0006` Word → image · **7-3**
- [ ] `F0007` Image → word · **7-3**
- [ ] `F0008` Audio → word · **7-3** · partly there
- [ ] `F0009` Word → audio recognition · **7-3** · partly there
- [x] `F0010` Word → example sentence
- [x] `F0011` Example sentence → missing word
- [x] `F0012` Word → pronunciation
- [x] `F0013` Pronunciation → spelling
- [ ] `F0014` Word → grammatical information · **7-3**
- [ ] `F0015` Word → synonym · **7-3**
- [ ] `F0016` Word → antonym · **7-3**
- [ ] `F0017` Word → collocation · **7-3**
- [x] `F0018` Word → common phrase
- [x] `F0019` Multiple-choice vocabulary questions
- [x] `F0020` Type-the-answer cards
- [ ] `F0021` First-letter hints · **7-3**
- [ ] `F0022` Progressive hints · **7-3**
- [x] `F0023` Cloze deletion cards
- [x] `F0024` Bidirectional cards
- [ ] `F0025` Multiple meanings on one card · **7-3**
- [ ] `F0026` Cards containing multiple related words · **7-3**
- [x] `F0027` Sentence-based flashcards
- [ ] `F0028` Contextual flashcards with a short paragraph · **7-3** · partly there
- [ ] `F0029` Image occlusion cards · **7-3**
- [ ] `F0030` Audio-only recall · **7-3** · partly there
- [x] `F0031` Spelling reconstruction
- [x] `F0032` Word unscrambling
- [ ] `F0033` Match words with definitions · **7-4** · partly there
- [x] `F0034` Match words with translations
- [ ] `F0035` Match words with images · **7-4**
- [ ] `F0036` Match words with example sentences · **7-4**
- [ ] `F0037` Match audio recordings with written words · **7-4** · partly there
- [ ] `F0038` Match synonyms and antonyms · **7-4**
- [ ] `F0039` Match prefixes and suffixes to their meanings · **7-4**
- [ ] `F0040` Match words with their grammatical categories · **7-4**

#### 2.2 Vocabulary deck management

*In Lingua: Thesaurus › My decks (decks, folders, colours), Discover (ready-made and Top-N decks), + Deck everywhere; the word memory keeps every word met.*

- [x] `F0041` ⭐ Create custom decks
- [x] `F0042` ⭐ Add words from any part of the app
- [x] `F0043` ⭐ Organize decks into folders
- [ ] `F0044` Nested folders and subdecks · **7-2** · partly there
- [ ] `F0045` Tags and multiple tags per word · **7-2** · partly there
- [ ] `F0046` Custom deck descriptions · **7-2**
- [ ] `F0047` Deck cover images and colors · **7-2** · partly there
- [ ] `F0048` Reorder cards manually · **7-2**
- [ ] `F0049` Sort alphabetically · **7-2** · partly there
- [ ] `F0050` Sort by date added · **7-2** · partly there
- [ ] `F0051` Sort by difficulty · **7-2** · partly there
- [ ] `F0052` Sort by frequency · **7-2** · partly there
- [ ] `F0053` Sort by due date · **7-2** · partly there
- [ ] `F0054` Sort by part of speech · **7-2**
- [ ] `F0055` Sort by topic · **7-2**
- [ ] `F0056` Merge decks · **7-2**
- [ ] `F0057` Duplicate decks · **7-2**
- [ ] `F0058` Split a deck into smaller decks · **7-2**
- [ ] `F0059` Import and export decks · **7-24** · partly there
- [ ] `F0060` Share decks with other learners · **7-27** · partly there
- [ ] `F0061` Public community decks · **7-27** · needs the user's word
- [ ] `F0062` Collaborative decks · **7-27** · needs the user's word
- [ ] `F0063` Follow deck creators · **7-27** · needs the user's word
- [ ] `F0064` Clone and modify shared decks · **7-27** · partly there
- [ ] `F0065` Generate decks from a text, document or book · **7-2** · partly there
- [ ] `F0066` Generate decks from a video transcript · **7-2** · partly there
- [ ] `F0067` Generate decks from a conversation · **7-2**
- [ ] `F0068` Generate decks from a list of unknown words · **7-2** · partly there
- [ ] `F0069` Generate decks from exam vocabulary · **7-18**
- [ ] `F0070` Generate decks from a topic or situation · **7-2** · partly there
- [x] `F0071` Generate decks from a CEFR level
- [x] `F0072` Generate decks from frequency lists
- [ ] `F0073` Generate decks from a personal goal · **7-2**
- [ ] `F0074` Automatically extract vocabulary from reading material · **7-2** · partly there
- [x] `F0075` Automatically add unfamiliar words encountered in the app
- [ ] `F0076` Save words to a central vocabulary inbox · **7-2** · partly there
- [ ] `F0077` Review the inbox before adding words to a deck · **7-2**
- [ ] `F0078` Bulk-edit word information · **7-2**
- [ ] `F0079` Bulk-tag, move or delete cards · **7-2**
- [ ] `F0080` Detect duplicate cards · **7-2** · partly there
- [ ] `F0081` Detect duplicate translations · **7-2**
- [ ] `F0082` Suggest missing example sentences · **7-2** · partly there
- [ ] `F0083` Suggest missing audio or pronunciation data · **7-2** · partly there
- [ ] `F0084` Mark a word as important · **7-2**
- [ ] `F0085` Pin favorite words · **7-2**
- [ ] `F0086` Archive mastered vocabulary without deleting it · **7-2** · partly there

#### 2.3 Spaced repetition and memory

*In Lingua: ts-fsrs scheduling (`core/srs`), daily limits, suspend, the Today rail and Ratio's forecast and retention.*

- [x] `F0087` ⭐ Spaced repetition scheduling
- [x] `F0088` ⭐ Daily review queue
- [x] `F0089` ⭐ Again / Hard / Good / Easy ratings
- [x] `F0090` Review intervals based on past performance
- [x] `F0091` Adaptive intervals based on recall difficulty
- [ ] `F0092` Due-date calendar · **7-3** · partly there
- [x] `F0093` New-card and review-card limits
- [x] `F0094` Separate new learning from review
- [ ] `F0095` Customizable learning steps · **7-3**
- [ ] `F0096` Leech detection for repeatedly forgotten cards · **7-3**
- [ ] `F0097` Automatic creation of extra practice for difficult words · **7-3** · partly there
- [x] `F0098` Suspend a card temporarily
- [ ] `F0099` Manually reschedule a card · **7-3**
- [ ] `F0100` Bury related cards until another day · **7-3**
- [ ] `F0101` Avoid showing several nearly identical cards consecutively · **7-3** · partly there
- [x] `F0102` Prioritize overdue cards
- [ ] `F0103` Prioritize frequently forgotten words · **7-3**
- [x] `F0104` Prioritize useful words over obscure words
- [x] `F0105` Adjust for time since last review
- [x] `F0106` Track consecutive successful recalls
- [x] `F0107` Track forgetting rates
- [x] `F0108` Predict upcoming review workload
- [ ] `F0109` Show estimated review time · **7-3** · partly there
- [ ] `F0110` Show the stability of a memory over time · **7-3**
- [ ] `F0111` Show retrievability or estimated probability of recall · **7-3**
- [ ] `F0112` Separate recognition strength from active recall strength · **7-3** · partly there
- [ ] `F0113` Compare performance with and without hints · **7-5**
- [ ] `F0114` Distinguish correct answers from lucky guesses · **7-3**
- [ ] `F0115` Reintroduce words after long absences · **7-3**
- [x] `F0116` Mix old and new vocabulary
- [ ] `F0117` Review words in different contexts · **7-3** · partly there
- [ ] `F0118` Generate a catch-up plan after a break · **7-3**

> Design note: Anki-style spaced repetition is an excellent foundation, but your scheduler should be tested against actual learner outcomes. Don’t simply label a word “mastered” because it was answered correctly once.

#### 2.4 Vocabulary depth

*In Lingua: Thesaurus › Dictionary (the six core languages): forms, IPA, recordings, etymology, meanings, set phrases, pairs, Tatoeba; "#437 most common · A1" in the word panel.*

- [x] `F0119` Word frequency ranking
- [x] `F0120` CEFR level estimates
- [ ] `F0121` Formality and register labels · **7-1** · partly there
- [ ] `F0122` Slang and colloquial labels · **7-1** · partly there
- [ ] `F0123` Regional usage labels · **7-1** · partly there
- [ ] `F0124` British versus American English distinctions · **7-1**
- [ ] `F0125` European versus Brazilian Portuguese distinctions · **7-1** · partly there
- [x] `F0126` Etymology and word origins
- [ ] `F0127` Word families · **7-1**
- [ ] `F0128` Roots and stems · **7-1**
- [ ] `F0129` Prefixes and suffixes · **7-1**
- [x] `F0130` Inflectional forms
- [ ] `F0131` Derivational forms · **7-1**
- [x] `F0132` Singular and plural forms
- [x] `F0133` Gender and grammatical class
- [ ] `F0134` Countable versus uncountable nouns · **7-1**
- [x] `F0135` Verb conjugation tables
- [ ] `F0136` Verb aspect and tense information · **7-1** · partly there
- [ ] `F0137` Irregular forms · **7-1** · partly there
- [x] `F0138` Declension tables
- [x] `F0139` Case information
- [ ] `F0140` Stress patterns · **7-1** · partly there
- [ ] `F0141` Syllable breakdown · **7-1**
- [x] `F0142` IPA transcription
- [x] `F0143` Audio pronunciation
- [ ] `F0144` Common spelling mistakes · **7-1**
- [ ] `F0145` Common learner errors · **7-1**
- [ ] `F0146` Synonym maps · **7-20** · partly there
- [ ] `F0147` Antonym maps · **7-20** · partly there
- [ ] `F0148` False friends between languages · **7-1** · partly there
- [ ] `F0149` Cognates · **7-1** · partly there
- [ ] `F0150` False cognates · **7-1** · partly there
- [ ] `F0151` Homonyms and homophones · **7-1**
- [x] `F0152` Polysemy and different senses
- [x] `F0153` Idioms and fixed expressions
- [x] `F0154` Collocations
- [ ] `F0155` Phrasal verbs · **7-1** · partly there
- [ ] `F0156` Compound words · **7-1**
- [ ] `F0157` Proverbs and sayings · **7-1** · partly there
- [ ] `F0158` Words that don’t translate neatly · **7-19**
- [ ] `F0159` Semantic fields · **7-20** · partly there
- [ ] `F0160` Frequency-ranked synonyms · **7-1**
- [ ] `F0161` Differences between similar words · **7-1** · partly there
- [ ] `F0162` Example sentences ranked by difficulty · **7-1** · partly there
- [x] `F0163` Corpus examples showing authentic usage
- [ ] `F0164` Connotation and emotional tone · **7-1**
- [ ] `F0165` Words that are technically correct but unnatural in context · **7-12**

#### 2.5 Vocabulary games

*In Lingua: Ludus: Lightning (a minute, best score), matching, gaps, listen and pick.*

- [x] `F0166` Timed recall
- [x] `F0167` Word matching
- [ ] `F0168` Word hunting · **7-21**
- [ ] `F0169` Word ladders · **7-21**
- [ ] `F0170` Crossword puzzles · **7-21**
- [ ] `F0171` Word searches · **7-21**
- [ ] `F0172` Hangman-style spelling · **7-21**
- [ ] `F0173` Anagrams · **7-21** · partly there
- [x] `F0174` Sentence completion
- [ ] `F0175` Missing-letter puzzles · **7-21**
- [ ] `F0176` Guess the definition · **7-21**
- [ ] `F0177` Guess the word from a picture · **7-21**
- [x] `F0178` Guess the word from audio
- [ ] `F0179` Word association · **7-21**
- [ ] `F0180` Synonym races · **7-21**
- [ ] `F0181` Antonym races · **7-21**
- [ ] `F0182` Category sorting · **7-21**
- [ ] `F0183` Odd-one-out challenges · **7-21**
- [ ] `F0184` Build a word from morphemes · **7-21**
- [x] `F0185` Speed rounds
- [ ] `F0186` Memory-matching cards · **7-21**
- [ ] `F0187` Vocabulary bingo · **7-21**
- [ ] `F0188` Daily word challenges · **7-21** · partly there
- [ ] `F0189` Guess a word from progressively revealing clues · **7-21**
- [ ] `F0190` Mini word tournaments · **7-21**
- [x] `F0191` Personal best challenges
- [ ] `F0192` Cooperative vocabulary challenges · **7-27** · needs the user's word

## 03 · Grammar learning

Grammar can be taught through explanation, pattern recognition, repeated examples, correction, transformation and actual communication. A strong app should support all of these approaches.

#### 3.1 Grammar reference system

*In Lingua: Cursus › Grammatica: topics by level and unit, examples with sound, comparisons, tables, "watch out".*

- [ ] `F0193` ⭐ Searchable grammar library · **5.2-8** · planned in Lingua 5.2
- [x] `F0194` Grammar topics organized by level
- [ ] `F0195` Grammar topics organized by part of speech · **7-7**
- [ ] `F0196` Grammar topics organized by linguistic category · **7-7** · partly there
- [x] `F0197` Beginner-to-advanced grammar progression
- [x] `F0198` Concise explanations
- [ ] `F0199` Detailed explanations · **7-7** · partly there
- [x] `F0200` Examples beside every rule
- [x] `F0201` Examples with translations
- [x] `F0202` Examples with audio
- [ ] `F0203` Formal and informal examples · **7-7** · partly there
- [ ] `F0204` Correct versus incorrect examples · **7-7** · partly there
- [x] `F0205` Common mistakes
- [ ] `F0206` Exceptions to rules · **7-7** · partly there
- [ ] `F0207` Notes on regional variation · **7-7**
- [x] `F0208` Visual grammar tables
- [x] `F0209` Verb conjugation tables
- [x] `F0210` Noun declension tables
- [ ] `F0211` Adjective agreement tables · **7-7** · partly there
- [ ] `F0212` Pronoun tables · **7-7** · partly there
- [x] `F0213` Tense and aspect comparisons
- [ ] `F0214` Sentence structure diagrams · **7-7**
- [ ] `F0215` Word order visualizations · **7-7**
- [ ] `F0216` Grammar decision trees · **7-7**
- [ ] `F0217` Grammar timelines · **7-7**
- [ ] `F0218` Morphology breakdowns · **7-7**
- [ ] `F0219` Interactive grammar maps · **7-7**
- [ ] `F0220` Cross-references between related rules · **7-7** · partly there
- [ ] `F0221` Prerequisite links showing what to learn first · **7-7**
- [ ] `F0222` Grammar search by natural language question · **7-15**
- [ ] `F0223` AI-generated explanations at different difficulty levels · **7-15**
- [ ] `F0224` Grammar explanations in the target language · **7-7**
- [ ] `F0225` Grammar explanations in the learner’s native language · **7-7** · partly there
- [ ] `F0226` Side-by-side explanations in two languages · **7-7**
- [ ] `F0227` Grammar bookmarks and personal notes · **7-7**

#### 3.2 Grammar exercises

*In Lingua: Grammatica lessons in five steps: recognise, gap, type the form, word order or the wrong word, build from English; review and Lightning.*

- [x] `F0228` ⭐ Fill in the blank
- [x] `F0229` Multiple-choice grammar
- [x] `F0230` Type the missing word
- [x] `F0231` Select the correct ending
- [x] `F0232` Conjugate a verb
- [x] `F0233` Decline a noun
- [x] `F0234` Choose the correct case
- [x] `F0235` Choose the correct tense
- [x] `F0236` Choose the correct aspect
- [x] `F0237` Choose the correct article
- [x] `F0238` Choose the correct preposition
- [x] `F0239` Choose the correct pronoun
- [x] `F0240` Choose the correct word order
- [ ] `F0241` Correct a grammatical mistake · **7-4**
- [x] `F0242` Identify the error in a sentence
- [ ] `F0243` Rewrite an incorrect sentence · **7-4**
- [ ] `F0244` Transform singular into plural · **7-4**
- [ ] `F0245` Transform present into past · **7-4**
- [ ] `F0246` Transform active into passive · **7-4**
- [ ] `F0247` Transform direct into reported speech · **7-4**
- [ ] `F0248` Transform statements into questions · **7-4**
- [ ] `F0249` Combine two simple sentences · **7-4**
- [ ] `F0250` Expand a sentence with additional information · **7-4**
- [ ] `F0251` Simplify a complex sentence · **7-4**
- [x] `F0252` Complete a sentence from context
- [x] `F0253` Translate a sentence using a specific grammar rule
- [ ] `F0254` Generate multiple examples of a pattern · **7-4** · partly there
- [ ] `F0255` Distinguish between two similar grammatical constructions · **7-7** · partly there
- [x] `F0256` Explain why an answer is wrong
- [ ] `F0257` Predict the next grammatical form · **7-4**
- [ ] `F0258` Complete a dialogue using the right forms · **7-4**
- [ ] `F0259` Dictation focused on grammatical endings · **7-9**
- [ ] `F0260` Oral grammar drills · **7-11**
- [x] `F0261` Timed conjugation challenges
- [x] `F0262` Mixed grammar review
- [ ] `F0263` Adaptive grammar exercises based on mistakes · **7-16** · partly there

#### 3.3 Advanced grammar tools

*In Lingua: Grammatica rings and crowns per topic.*

- [ ] `F0264` Grammar error heatmap · **7-7** · partly there
- [ ] `F0265` Personal grammar weakness tracker · **5.2-8** · planned in Lingua 5.2
- [x] `F0266` Grammar mastery by topic
- [ ] `F0267` Prerequisite dependency graph · **7-7**
- [ ] `F0268` Contrastive grammar between two languages · **7-13**
- [ ] `F0269` Compare grammatical gender systems · **7-13**
- [ ] `F0270` Compare tense and aspect systems · **7-13**
- [ ] `F0271` Compare case systems · **7-13**
- [ ] `F0272` Compare word order patterns · **7-13**
- [ ] `F0273` Analyze the grammar of any pasted sentence · **7-7**
- [ ] `F0274` Identify every word’s grammatical role · **7-7** · partly there
- [ ] `F0275` Show dependency relationships between words · **7-7**
- [ ] `F0276` Highlight clauses and subordinate clauses · **7-7**
- [ ] `F0277` Parse complex sentences · **7-7**
- [ ] `F0278` Generate sentence variations using a selected rule · **7-6**
- [ ] `F0279` Explain multiple grammatically valid interpretations · **7-7**
- [ ] `F0280` Identify unnatural but technically grammatical constructions · **7-12**
- [ ] `F0281` Track recurring grammar mistakes across conversations · **7-5**
- [ ] `F0282` Generate a personalized grammar curriculum · **7-16**
- [ ] `F0283` Predict which grammar topics will be hardest for a learner based on previous errors · **7-16**

> An especially useful idea: let a learner tap any word in a sentence to reveal its grammatical role, dictionary form, inflection, function and relationship to the rest of the sentence.

## 04 · Reading and comprehension

Reading is one of the richest sources of vocabulary, grammar and cultural knowledge. I’d make it a first-class feature rather than a collection of disconnected reading exercises.

#### 4.1 Reading library

*In Lingua: Codex: imports (EPUB, PDF, text, comics, photos), Discover (Gutenberg, Wikisource, Wikipedia, news), song lyrics as texts.*

- [ ] `F0284` ⭐ Graded readers organized by CEFR level · **7-8** · partly there
- [ ] `F0285` Short stories · **7-8** · partly there
- [x] `F0286` Novels
- [ ] `F0287` Literary excerpts · **7-8** · partly there
- [ ] `F0288` Folktales and fairy tales · **7-8** · partly there
- [ ] `F0289` Fables · **7-8** · partly there
- [ ] `F0290` Myths and legends · **7-8** · partly there
- [ ] `F0291` Historical texts · **7-8** · partly there
- [ ] `F0292` Biographies · **7-8** · partly there
- [x] `F0293` News articles
- [ ] `F0294` Opinion pieces · **7-8** · partly there
- [ ] `F0295` Essays · **7-8** · partly there
- [ ] `F0296` Poems · **7-8** · partly there
- [x] `F0297` Song lyrics, subject to appropriate licensing
- [ ] `F0298` Dialogues · **7-8**
- [ ] `F0299` Everyday messages · **7-8**
- [ ] `F0300` Emails and letters · **7-8**
- [ ] `F0301` Social media-style posts · **7-8**
- [ ] `F0302` Travel guides · **7-8** · partly there
- [ ] `F0303` Recipes · **7-8**
- [ ] `F0304` Instructions and manuals · **7-8**
- [ ] `F0305` Academic texts · **7-8** · partly there
- [ ] `F0306` Philosophy excerpts · **7-8** · partly there
- [ ] `F0307` Religious and spiritual texts · **7-8** · partly there
- [ ] `F0308` Political speeches · **7-8** · partly there
- [ ] `F0309` Historical documents · **7-8** · partly there
- [ ] `F0310` Children’s literature · **7-8** · partly there
- [x] `F0311` Comic strips
- [x] `F0312` Graphic novels
- [ ] `F0313` Interactive fiction · **7-21**
- [ ] `F0314` Choose-your-own-adventure stories · **7-21**
- [x] `F0315` User-imported texts
- [x] `F0316` Personal document library
- [x] `F0317` Public-domain literature collection
- [ ] `F0318` Community-created reading materials · **7-27** · needs the user's word
- [ ] `F0319` AI-generated stories at a chosen level · **7-8**
- [ ] `F0320` Parallel texts in two languages · **7-8**
- [ ] `F0321` Original text alongside a translation · **7-8** · partly there
- [ ] `F0322` Simplified versions of difficult texts · **7-8**
- [ ] `F0323` Original and adapted versions side by side · **7-8**

#### 4.2 Interactive reader

*In Lingua: The reader: hover and click words, drag to translate a phrase, S for the sentence, the word panel, typography and papers, the end page.*

- [x] `F0324` ⭐ Tap any word to see its meaning
- [x] `F0325` ⭐ Save a word to vocabulary
- [x] `F0326` ⭐ Play word pronunciation
- [ ] `F0327` ⭐ Read the whole passage aloud · **7-8** · partly there
- [x] `F0328` Inline translations
- [x] `F0329` Optional translations on demand
- [x] `F0330` Phrase-level translation
- [x] `F0331` Sentence-by-sentence translation
- [x] `F0332` Dictionary popover
- [ ] `F0333` Grammar breakdown of a selected sentence · **7-7**
- [x] `F0334` Highlight known vocabulary
- [x] `F0335` Highlight unknown vocabulary
- [ ] `F0336` Color-code parts of speech · **7-8**
- [x] `F0337` Display lemma or dictionary form
- [ ] `F0338` Show grammatical endings · **7-8** · partly there
- [x] `F0339` Show conjugation or declension details
- [x] `F0340` Display IPA transcription
- [x] `F0341` Display synonyms
- [x] `F0342` Display example sentences
- [x] `F0343` Display word frequency
- [x] `F0344` Display CEFR estimates
- [ ] `F0345` Show literal versus natural translation · **7-8**
- [ ] `F0346` Hide translations to test comprehension · **7-8** · partly there
- [x] `F0347` Reveal translations one sentence at a time
- [x] `F0348` Adjustable font size
- [x] `F0349` Adjustable line spacing
- [x] `F0350` Adjustable text width
- [x] `F0351` Serif and sans-serif reading modes
- [x] `F0352` Dark mode and warm-paper mode
- [x] `F0353` Distraction-free reading
- [ ] `F0354` Reading ruler to focus on one line · **7-8**
- [ ] `F0355` Bookmark passages · **7-8** · partly there
- [ ] `F0356` Highlight passages · **7-8**
- [ ] `F0357` Add margin notes · **7-8**
- [ ] `F0358` Export highlights · **7-8**
- [ ] `F0359` Save quotes · **7-8**
- [ ] `F0360` Create flashcards from highlighted text · **7-8** · partly there
- [ ] `F0361` Generate vocabulary lists from a text · **7-2** · partly there
- [x] `F0362` Track reading progress
- [x] `F0363` Track time spent reading
- [x] `F0364` Estimate text difficulty
- [x] `F0365` Show the proportion of known words
- [ ] `F0366` Filter texts by topic, length, difficulty and genre · **7-8** · partly there

#### 4.3 Reading comprehension exercises

*In Lingua: Check yourself at the end of a text; In your own words.*

- [ ] `F0367` Main idea identification · **7-8** · partly there
- [ ] `F0368` Detail questions · **7-8** · partly there
- [ ] `F0369` True or false · **7-8**
- [x] `F0370` Multiple-choice comprehension
- [ ] `F0371` Short-answer questions · **7-8**
- [x] `F0372` Summarize the passage
- [ ] `F0373` Choose a suitable title · **7-8**
- [ ] `F0374` Put events in order · **7-8** · partly there
- [ ] `F0375` Identify a character’s motivation · **7-8**
- [ ] `F0376` Infer meaning from context · **7-8**
- [ ] `F0377` Predict what happens next · **7-8**
- [ ] `F0378` Identify the author’s tone · **7-8**
- [ ] `F0379` Identify irony or humor · **7-8**
- [ ] `F0380` Identify the intended audience · **7-8**
- [ ] `F0381` Distinguish fact from opinion · **7-8**
- [ ] `F0382` Explain a metaphor · **7-8**
- [ ] `F0383` Identify references to history or culture · **7-8**
- [ ] `F0384` Reconstruct a missing paragraph · **7-8**
- [x] `F0385` Fill in deleted words
- [ ] `F0386` Match paragraphs to headings · **7-8**
- [ ] `F0387` Identify the sentence that doesn’t belong · **7-8**
- [ ] `F0388` Compare the original with a simplified version · **7-8**
- [ ] `F0389` Translate a selected passage · **7-13**
- [x] `F0390` Retell the text in the target language
- [ ] `F0391` Discuss the text with an AI tutor · **5.2-6** · planned in Lingua 5.2

#### 4.4 Advanced reading ideas

*In Lingua: Shelves (Reading, To read, Finished); the word memory across texts; Explain in context (Max).*

- [x] `F0392` A personal reading list
- [ ] `F0393` Book-length reading projects · **7-8** · partly there
- [ ] `F0394` Chapter-by-chapter vocabulary collection · **7-8** · partly there
- [ ] `F0395` Recurring character and place glossary · **7-8**
- [x] `F0396` Automatically track vocabulary encountered across books
- [x] `F0397` Track how often a word appears across all reading material
- [ ] `F0398` Compare an author’s vocabulary across works · **7-26**
- [ ] `F0399` Literary annotation system · **7-8**
- [ ] `F0400` Save quotations with source information · **7-8**
- [x] `F0401` Read authentic literature with AI assistance
- [ ] `F0402` Track unknown-word density by chapter · **7-8**
- [ ] `F0403` Recommend the next text based on reading performance · **7-16**
- [ ] `F0404` Generate discussion questions about a passage · **7-8**
- [ ] `F0405` Compare translations of the same literary passage · **7-13**
- [ ] `F0406` Explain cultural and historical references · **7-19** · partly there
- [ ] `F0407` Build a personal library of favorite passages · **7-8**
- [ ] `F0408` Export a bilingual reading journal · **7-24**

> My favorite idea here: a reader that gradually becomes more personal. It learns which words are already familiar, remembers words the learner saves and provides just enough assistance to keep reading enjoyable.

## 05 · Listening and auditory learning

Listening comprehension deserves its own system because recognizing a written word is very different from understanding it when spoken quickly by a native speaker.

#### 5.1 Audio library

*In Lingua: Sonus: podcasts, audiobooks (LibriVox), radio, your files; recordings (Lingua Libre), Gemini and Piper voices.*

- [x] `F0409` ⭐ Word pronunciation recordings
- [x] `F0410` ⭐ Phrase pronunciation recordings
- [x] `F0411` Sentence recordings
- [ ] `F0412` Slow and natural-speed audio · **7-9** · partly there
- [ ] `F0413` Beginner listening exercises · **7-9** · partly there
- [ ] `F0414` Everyday conversations · **7-9** · partly there
- [ ] `F0415` Dialogues between multiple speakers · **7-9**
- [ ] `F0416` Short stories in audio format · **7-9** · partly there
- [x] `F0417` Audiobooks
- [x] `F0418` Podcasts
- [x] `F0419` News broadcasts
- [x] `F0420` Interviews
- [ ] `F0421` Speeches · **7-9** · partly there
- [ ] `F0422` Lectures · **7-9** · partly there
- [ ] `F0423` Documentary narration · **7-9** · partly there
- [x] `F0424` Radio programs
- [x] `F0425` Public-domain recordings
- [ ] `F0426` Regional accent samples · **7-9**
- [ ] `F0427` Casual conversations · **7-9** · partly there
- [ ] `F0428` Formal speeches · **7-9** · partly there
- [ ] `F0429` Telephone conversations · **7-9**
- [ ] `F0430` Background-noise recordings · **7-9**
- [ ] `F0431` Real-world announcements · **7-9**
- [ ] `F0432` Different speaker ages and voices · **7-9** · partly there
- [x] `F0433` Male, female and other available voice options
- [ ] `F0434` Different emotional tones · **7-9**
- [ ] `F0435` Formal and informal speech · **7-9**
- [x] `F0436` Authentic versus learner-oriented audio
- [x] `F0437` User-imported audio
- [ ] `F0438` AI-generated dialogues with transcripts · **7-6**
- [ ] `F0439` Audio generated from saved vocabulary · **7-9**
- [ ] `F0440` Personalized listening playlists · **7-9**

#### 5.2 Audio player

*In Lingua: The players: speed, skip, transcripts that follow, lines for songs, two subtitle lines in Visio, offline episodes.*

- [x] `F0441` ⭐ Play, pause and resume
- [x] `F0442` ⭐ Adjustable playback speed
- [ ] `F0443` Repeat the current sentence · **7-9** · partly there
- [ ] `F0444` Repeat a selected segment · **7-9**
- [ ] `F0445` Loop a word or phrase · **7-9**
- [x] `F0446` Jump backward by a few seconds
- [x] `F0447` Jump forward by a few seconds
- [ ] `F0448` A-B loop between two timestamps · **7-9**
- [ ] `F0449` Sentence-by-sentence playback · **7-9** · partly there
- [x] `F0450` Transcript synchronization
- [x] `F0451` Word-level transcript highlighting
- [x] `F0452` Show or hide the transcript
- [x] `F0453` Show or hide translations
- [ ] `F0454` Show translations only after listening · **7-9** · partly there
- [x] `F0455` Show subtitles in the target language
- [x] `F0456` Show bilingual subtitles
- [ ] `F0457` Control playback pitch where supported · **7-9**
- [ ] `F0458` Separate speakers in a transcript · **7-9**
- [ ] `F0459` Save timestamps · **7-9** · partly there
- [ ] `F0460` Bookmark difficult sections · **7-9**
- [ ] `F0461` Create a personal audio playlist · **7-9**
- [x] `F0462` Download permitted audio for offline use
- [ ] `F0463` Automatically replay difficult sections · **7-9**
- [ ] `F0464` Highlight sections with repeated mistakes · **7-9**

#### 5.3 Listening exercises

*In Lingua: Ludus listening and dictation; In your own words after listening.*

- [ ] `F0465` Listen and choose the correct meaning · **7-9** · partly there
- [x] `F0466` Listen and identify the word
- [ ] `F0467` Listen and select the matching image · **7-9**
- [ ] `F0468` Listen and reconstruct a sentence · **7-9**
- [ ] `F0469` Listen and arrange words in order · **7-9**
- [ ] `F0470` Listen and fill in missing words · **7-9** · partly there
- [x] `F0471` Full dictation
- [ ] `F0472` Partial dictation · **7-9**
- [ ] `F0473` Dictation with punctuation · **7-9**
- [ ] `F0474` Dictation with grammatical endings · **7-9**
- [ ] `F0475` Listen and identify the speaker · **7-9**
- [ ] `F0476` Listen and identify the emotion · **7-9**
- [ ] `F0477` Listen and identify the location · **7-9**
- [x] `F0478` Listen and summarize
- [ ] `F0479` Listen and answer comprehension questions · **7-9**
- [ ] `F0480` Listen and distinguish similar sounds · **7-10**
- [ ] `F0481` Listen for specific keywords · **7-9**
- [ ] `F0482` Listen for the main idea · **7-9**
- [ ] `F0483` Listen and predict the next phrase · **7-9**
- [ ] `F0484` Listen and identify a change in topic · **7-9**
- [ ] `F0485` Listen without subtitles, then with subtitles · **7-9** · partly there
- [ ] `F0486` Compare an initial guess with the transcript · **7-9**
- [ ] `F0487` Listen to a phrase and repeat it · **7-11** · partly there
- [ ] `F0488` Transcribe a short audio clip · **7-9**
- [ ] `F0489` Identify formal versus informal speech · **7-9**
- [ ] `F0490` Identify the speaker’s accent · **7-9**
- [ ] `F0491` Distinguish native speech from synthetic speech · **7-26**

#### 5.4 Advanced listening training

- [ ] `F0492` Minimal-pair listening · **7-10**
- [ ] `F0493` Phoneme discrimination · **7-10**
- [ ] `F0494` Word-boundary recognition · **7-9**
- [ ] `F0495` Connected-speech training · **7-9**
- [ ] `F0496` Reduced vowels and weak forms · **7-10**
- [ ] `F0497` Stress and intonation recognition · **7-10**
- [ ] `F0498` Pitch-accent training where relevant · **7-10**
- [ ] `F0499` Tone recognition for tonal languages · **7-10** · partly there
- [ ] `F0500` Fast-speech comprehension · **7-9**
- [ ] `F0501` Accent adaptation · **7-9**
- [ ] `F0502` Speech-in-noise exercises · **7-9**
- [ ] `F0503` Overlapping-speaker comprehension · **7-9**
- [ ] `F0504` Automatic difficulty adjustment · **7-16**
- [ ] `F0505` Listening-speed progression · **7-9**
- [ ] `F0506` Compare the same sentence across speakers · **7-9**
- [ ] `F0507` Compare slow, careful speech with natural speech · **7-9**
- [ ] `F0508` Track listening comprehension by accent · **7-17**
- [ ] `F0509` Track comprehension as playback speed increases · **7-17**
- [ ] `F0510` Identify specific phonemes that are repeatedly confused · **7-10**

## 06 · Speaking and conversation

This is where an AI-powered app can become especially valuable. Learners often have plenty of opportunities to study words but very few opportunities to use them spontaneously.

#### 6.1 AI conversation partner

*In Lingua: Mentis › Sermo opens the learner's own AI app with a scene, level, words due and the next grammar topic.*

- [x] `F0511` ⭐ Open-ended text conversations
- [x] `F0512` ⭐ Voice conversations
- [x] `F0513` Free conversation without a fixed script
- [ ] `F0514` Beginner-friendly guided conversation · **5.2-6** · planned in Lingua 5.2
- [ ] `F0515` Conversation by topic · **5.2-6** · planned in Lingua 5.2
- [x] `F0516` Conversation by CEFR level
- [x] `F0517` Conversation based on saved vocabulary
- [ ] `F0518` Conversation based on recent lessons · **5.2-6** · planned in Lingua 5.2
- [x] `F0519` Conversation focused on a grammar point
- [ ] `F0520` Conversation focused on pronunciation · **7-11**
- [ ] `F0521` Casual conversation with an informal persona · **5.2-6** · planned in Lingua 5.2
- [ ] `F0522` Formal professional conversation · **5.2-6** · planned in Lingua 5.2
- [ ] `F0523` Travel conversations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0524` Restaurant conversations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0525` Shopping conversations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0526` Hotel check-in simulations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0527` Airport and train station simulations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0528` Meeting new people · **5.2-6** · planned in Lingua 5.2
- [ ] `F0529` Talking about hobbies · **5.2-6** · planned in Lingua 5.2
- [ ] `F0530` Discussing books and films · **5.2-6** · planned in Lingua 5.2
- [ ] `F0531` Discussing philosophy · **5.2-6** · planned in Lingua 5.2
- [ ] `F0532` Talking about current events · **5.2-6** · planned in Lingua 5.2
- [x] `F0533` Debate practice
- [ ] `F0534` Job interview simulations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0535` University seminar simulations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0536` Negotiation practice · **7-11**
- [ ] `F0537` Giving a presentation · **5.2-6** · planned in Lingua 5.2
- [ ] `F0538` Making a phone call · **5.2-6** · planned in Lingua 5.2
- [ ] `F0539` Handling an awkward situation · **5.2-6** · planned in Lingua 5.2
- [ ] `F0540` Asking for clarification · **7-11**
- [ ] `F0541` Expressing disagreement politely · **5.2-6** · planned in Lingua 5.2
- [ ] `F0542` Telling a story · **5.2-6** · planned in Lingua 5.2
- [ ] `F0543` Explaining an opinion · **5.2-6** · planned in Lingua 5.2
- [ ] `F0544` Talking about past experiences · **5.2-6** · planned in Lingua 5.2
- [ ] `F0545` Talking about future plans · **5.2-6** · planned in Lingua 5.2
- [ ] `F0546` Roleplay with a fictional character · **5.2-6** · planned in Lingua 5.2
- [ ] `F0547` Interactive mystery conversations · **5.2-6** · planned in Lingua 5.2
- [ ] `F0548` Conversation with branching outcomes · **7-11**
- [ ] `F0549` Multi-character conversations · **7-11**
- [ ] `F0550` Group conversation simulation · **7-11**
- [ ] `F0551` Conversations with interruptions and follow-up questions · **7-11**
- [ ] `F0552` Conversations where the AI doesn’t automatically understand everything · **7-11**
- [ ] `F0553` Conversation with limited target-language assistance · **7-11**
- [ ] `F0554` Conversation where the AI uses only vocabulary the learner probably knows · **7-11**
- [ ] `F0555` Conversation with gradual introduction of new expressions · **7-11**

#### 6.2 Conversation modes

- **Free conversation:** Talk about anything. The AI responds naturally, asks follow-up questions and adapts to the learner’s level.
- **Scenario mode:** Practice a real-world situation with a clear goal, such as buying a train ticket or checking into a hotel.
- **Tutor mode:** The AI explains mistakes, answers questions and teaches a specific skill during the conversation.
- **Immersion mode:** Stay in the target language, receive minimal assistance and work through misunderstandings yourself.

*Sermo opens the learner's own AI app (Lingua 5.2-6); step 7-11 writes these four modes into its prompts.*

#### 6.3 Conversation feedback

- [ ] `F0556` ⭐ Corrected transcript after a conversation · **7-11**
- [ ] `F0557` ⭐ Corrections for grammatical errors · **7-11**
- [ ] `F0558` More natural alternatives to the learner’s wording · **7-11**
- [ ] `F0559` Vocabulary suggestions · **7-11**
- [ ] `F0560` Suggestions for more idiomatic expressions · **7-11**
- [ ] `F0561` Pronunciation feedback · **7-10**
- [ ] `F0562` Fluency feedback · **7-11**
- [ ] `F0563` Filler-word tracking · **7-11**
- [ ] `F0564` Repeated-word tracking · **7-11**
- [ ] `F0565` Sentence complexity analysis · **7-11**
- [ ] `F0566` Speaking-time analysis · **7-11**
- [ ] `F0567` Response-length analysis · **7-11**
- [ ] `F0568` Hesitation and pause analysis · **7-11**
- [ ] `F0569` Self-correction tracking · **7-11**
- [ ] `F0570` Word retrieval difficulty tracking · **7-11**
- [ ] `F0571` Formality and register feedback · **7-11**
- [ ] `F0572` Pragmatic appropriateness feedback · **7-11**
- [ ] `F0573` Confidence indicators for corrections · **7-11**
- [ ] `F0574` Separate essential errors from stylistic suggestions · **7-11** · partly there
- [ ] `F0575` Save corrected sentences to vocabulary · **7-11** · partly there
- [ ] `F0576` Convert mistakes into flashcards · **7-11**
- [ ] `F0577` Generate a personalized review session · **7-16**
- [ ] `F0578` Replay the conversation · **7-11**
- [ ] `F0579` Listen to the learner’s own recordings · **7-11**
- [ ] `F0580` Compare the learner’s attempt with a model recording · **7-10**
- [ ] `F0581` Review the conversation sentence by sentence · **7-11**
- [ ] `F0582` Create a summary of new expressions · **7-11**
- [ ] `F0583` Save conversation transcripts to a personal journal · **7-11**

#### 6.4 Advanced speaking features

*In Lingua: The course's speaking lesson compares what you said word by word.*

- [ ] `F0584` Real-time transcription · **7-11** · partly there
- [x] `F0585` Speech-to-text practice
- [ ] `F0586` Speech shadowing · **7-10**
- [ ] `F0587` Repeat-after-me exercises · **7-10** · partly there
- [ ] `F0588` Simultaneous speech imitation · **7-10**
- [ ] `F0589` Pronunciation recording comparisons · **7-10**
- [ ] `F0590` Phoneme-level pronunciation feedback · **7-10**
- [ ] `F0591` Word stress detection · **7-10**
- [ ] `F0592` Sentence stress detection · **7-10**
- [ ] `F0593` Rhythm and intonation analysis · **7-10**
- [ ] `F0594` Tone recognition for tonal languages · **7-10**
- [ ] `F0595` Pitch contour visualization · **7-10**
- [ ] `F0596` Vowel articulation guidance · **7-10**
- [ ] `F0597` Consonant articulation guidance · **7-10**
- [ ] `F0598` Minimal-pair pronunciation practice · **7-10**
- [ ] `F0599` Slow playback of model speech · **7-10**
- [ ] `F0600` Visual waveform comparison · **7-10**
- [ ] `F0601` Spectrogram visualization · **7-10**
- [ ] `F0602` Speech rate measurement · **7-11**
- [ ] `F0603` Pause distribution analysis · **7-11**
- [ ] `F0604` Pronunciation diary · **7-10**
- [ ] `F0605` Record the same passage every week · **7-10**
- [ ] `F0606` Track pronunciation development over time · **7-10**
- [ ] `F0607` Personalized speaking challenges · **7-11** · partly there
- [ ] `F0608` Spontaneous 30-second speaking prompts · **7-11**
- [ ] `F0609` One-minute monologues · **7-11**
- [ ] `F0610` Storytelling challenges · **7-11**
- [ ] `F0611` Picture description tasks · **7-11**
- [ ] `F0612` Explain-a-concept challenges · **7-11**
- [ ] `F0613` Impromptu debate prompts · **7-11**
- [ ] `F0614` Oral examination simulations · **7-18**

> A useful distinction: pronunciation feedback should help users become understandable, not pressure them to eliminate their accent. Native-like pronunciation and effective communication are not the same goal.

## 07 · Writing and composition

Writing gives learners time to think carefully, experiment with grammar and produce language they might not yet be able to say aloud.

#### 7.1 Writing exercises

*In Lingua: Mentis › Diarium (entries, daily prompts), Grammatica's "Your own sentence", In your own words.*

- [x] `F0615` ⭐ Translate a sentence
- [x] `F0616` ⭐ Write a sentence from a prompt
- [ ] `F0617` Describe an image · **7-12**
- [x] `F0618` Write a diary entry
- [x] `F0619` Write about the day
- [ ] `F0620` Write a short story · **7-12** · partly there
- [x] `F0621` Continue an unfinished story
- [ ] `F0622` Write a dialogue · **7-12**
- [ ] `F0623` Write an email · **7-12**
- [ ] `F0624` Write a formal letter · **7-12**
- [ ] `F0625` Write an informal message · **7-12**
- [ ] `F0626` Write a review · **7-12**
- [ ] `F0627` Write an opinion paragraph · **7-12** · partly there
- [ ] `F0628` Write a persuasive essay · **7-12**
- [x] `F0629` Write a summary
- [ ] `F0630` Write a book review · **7-12**
- [ ] `F0631` Write a travel journal · **7-12**
- [ ] `F0632` Write a biography · **7-12**
- [ ] `F0633` Write a fictional conversation · **7-12**
- [ ] `F0634` Explain a process · **7-12**
- [ ] `F0635` Describe a memory · **7-12**
- [x] `F0636` Write a personal introduction
- [ ] `F0637` Write a social media post · **7-12**
- [ ] `F0638` Write a professional message · **7-12**
- [ ] `F0639` Write a complaint · **7-12**
- [ ] `F0640` Write an apology · **7-12**
- [ ] `F0641` Write an invitation · **7-12**
- [ ] `F0642` Write a response to a news article · **7-12**
- [ ] `F0643` Write a short argument for and against a topic · **7-12**
- [ ] `F0644` Rewrite a paragraph using a particular grammar structure · **7-12**
- [ ] `F0645` Write using a list of required vocabulary · **7-12**
- [ ] `F0646` Continue a story using newly learned words · **7-12**
- [ ] `F0647` Reconstruct a text from notes · **7-12**
- [x] `F0648` Write from dictation

#### 7.2 AI writing assistant

*In Lingua: Diarium's Check (Max): corrections by category with explanations, a native-like rewrite, scores, a CEFR estimate, the word diff.*

- [x] `F0649` Grammar correction
- [x] `F0650` Spelling correction
- [x] `F0651` Punctuation correction
- [x] `F0652` Word choice suggestions
- [x] `F0653` Naturalness improvements
- [ ] `F0654` Idiomatic expression suggestions · **7-12** · partly there
- [ ] `F0655` Register adjustment · **7-12**
- [ ] `F0656` Formality adjustment · **7-12**
- [ ] `F0657` Simplification to a lower level · **7-12**
- [ ] `F0658` Expansion to a higher level · **7-12**
- [x] `F0659` Explain every correction
- [x] `F0660` Highlight changes inline
- [x] `F0661` Compare original and corrected versions
- [ ] `F0662` Preserve the learner’s original voice · **7-12** · partly there
- [ ] `F0663` Provide several alternative phrasings · **7-12**
- [ ] `F0664` Identify recurring mistakes · **7-5** · partly there
- [ ] `F0665` Suggest more precise vocabulary · **7-12**
- [ ] `F0666` Explain why a sentence sounds unnatural · **7-12**
- [ ] `F0667` Identify literal translations from the native language · **7-12**
- [x] `F0668` Provide a more natural native-speaker version
- [ ] `F0669` Score task completion against a rubric · **7-12**
- [ ] `F0670` Generate follow-up exercises from errors · **7-16**
- [x] `F0671` Evaluate writing against a chosen CEFR level
- [ ] `F0672` Estimate vocabulary diversity · **7-12**
- [ ] `F0673` Track sentence complexity · **7-12**
- [x] `F0674` Track grammatical accuracy
- [ ] `F0675` Maintain a personal writing portfolio · **7-12**

#### 7.3 Writing tools

*In Lingua: Diarium: prompts, versions, word count, offline drafts, words and corrections to cards.*

- [ ] `F0676` Target-language spellchecker · **7-12**
- [ ] `F0677` Dictionary lookup while typing · **7-12** · partly there
- [ ] `F0678` Conjugation helper · **7-12**
- [ ] `F0679` Declension helper · **7-12**
- [ ] `F0680` Synonym finder · **7-12**
- [ ] `F0681` Collocation suggestions · **7-12**
- [ ] `F0682` Phrase bank · **7-12**
- [ ] `F0683` Personal phrasebook · **7-20**
- [ ] `F0684` Reusable sentence templates · **7-12**
- [x] `F0685` Writing prompts
- [x] `F0686` Draft history
- [ ] `F0687` Version comparison · **7-12** · partly there
- [x] `F0688` Word counter
- [ ] `F0689` Writing timer · **7-12**
- [x] `F0690` Offline writing journal
- [ ] `F0691` Notebook folders and tags · **7-20** · partly there
- [ ] `F0692` Export to Markdown, TXT or PDF · **7-24**
- [x] `F0693` Save selected sentences to vocabulary
- [x] `F0694` Turn corrections into flashcards
- [ ] `F0695` Compare writing samples over time · **7-12**
- [ ] `F0696` Track writing by topic and genre · **7-12**

## 08 · Pronunciation and phonetics

This deserves a dedicated section because pronunciation involves both hearing distinctions and learning to produce them.

#### 8.1 Sound system

*In Lingua: Cursus › Alphabets for seven scripts.*

- [x] `F0697` Alphabet learning
- [x] `F0698` Letter names and sounds
- [x] `F0699` Script recognition
- [ ] `F0700` Phoneme inventory · **7-10**
- [ ] `F0701` Vowel chart · **7-10**
- [ ] `F0702` Consonant chart · **7-10**
- [ ] `F0703` IPA reference · **7-10**
- [ ] `F0704` Audio for every phoneme · **7-10**
- [ ] `F0705` Mouth-position illustrations · **7-10**
- [ ] `F0706` Tongue-position illustrations · **7-10**
- [ ] `F0707` Voicing demonstrations · **7-10**
- [ ] `F0708` Place-of-articulation explanations · **7-10**
- [ ] `F0709` Minimal pairs · **7-10**
- [ ] `F0710` Syllable segmentation · **7-10**
- [ ] `F0711` Stress placement · **7-10**
- [ ] `F0712` Word-level stress rules · **7-10**
- [ ] `F0713` Sentence intonation · **7-10**
- [ ] `F0714` Rhythm patterns · **7-10**
- [ ] `F0715` Connected speech · **7-10**
- [ ] `F0716` Sound reduction · **7-10**
- [ ] `F0717` Assimilation · **7-10**
- [ ] `F0718` Elision · **7-10**
- [ ] `F0719` Gemination · **7-10**
- [ ] `F0720` Palatalization · **7-10**
- [ ] `F0721` Aspiration · **7-10**
- [ ] `F0722` Nasal vowels · **7-10**
- [ ] `F0723` Tonal contours · **7-10** · partly there
- [ ] `F0724` Pitch accent · **7-10**
- [ ] `F0725` Orthography-to-sound rules · **7-10**
- [ ] `F0726` Sound-to-spelling exercises · **7-10** · partly there

#### 8.2 Pronunciation practice

*In Lingua: Ludus "say it out loud"; the course's speaking lesson.*

- [ ] `F0727` Listen and repeat · **7-10** · partly there
- [ ] `F0728` Record and compare · **7-10**
- [ ] `F0729` Minimal-pair discrimination · **7-10**
- [ ] `F0730` Identify the incorrect pronunciation · **7-10**
- [x] `F0731` Read a word aloud
- [x] `F0732` Read a sentence aloud
- [ ] `F0733` Read a paragraph aloud · **7-10**
- [ ] `F0734` Shadow an audio recording · **7-10**
- [ ] `F0735` Practice specific phonemes · **7-10**
- [ ] `F0736` Practice consonant clusters · **7-10**
- [ ] `F0737` Practice difficult syllables · **7-10**
- [ ] `F0738` Practice word stress · **7-10**
- [ ] `F0739` Practice sentence stress · **7-10**
- [ ] `F0740` Practice intonation patterns · **7-10**
- [ ] `F0741` Practice speaking speed · **7-10**
- [ ] `F0742` Practice connected speech · **7-10**
- [ ] `F0743` Practice tonal contrasts · **7-10**
- [ ] `F0744` Practice unfamiliar letter combinations · **7-10**
- [ ] `F0745` Pronunciation drills based on personal errors · **7-10**
- [ ] `F0746` Randomized pronunciation tests · **7-10**
- [ ] `F0747` Weekly pronunciation recordings · **7-10**
- [ ] `F0748` Pronunciation progress history · **7-10**
- [ ] `F0749` Feedback on intelligibility · **7-10**
- [ ] `F0750` Visual speech feedback where technically supported · **7-10**

## 09 · Translation and bilingual learning

Translation can be a powerful learning method when used actively. It becomes less useful when learners rely on it for every sentence and never learn to process the target language directly.

#### 9.1 Translation modes

*In Lingua: Ludus and Grammatica translation both ways, building the sentence from English.*

- [x] `F0751` ⭐ Native language → target language
- [x] `F0752` ⭐ Target language → native language
- [x] `F0753` Sentence translation
- [ ] `F0754` Paragraph translation · **7-13**
- [ ] `F0755` Dialogue translation · **7-13**
- [ ] `F0756` Translation with hints · **7-13**
- [x] `F0757` Translation without hints
- [ ] `F0758` Literal translation · **7-13**
- [ ] `F0759` Natural translation · **7-13**
- [ ] `F0760` Multiple valid translations · **7-13**
- [ ] `F0761` Compare translation alternatives · **7-13**
- [ ] `F0762` Translate with a required vocabulary word · **7-13**
- [ ] `F0763` Translate using a specified grammar construction · **7-13** · partly there
- [ ] `F0764` Translate idioms · **7-13**
- [ ] `F0765` Translate slang · **7-13**
- [ ] `F0766` Translate formal expressions · **7-13**
- [ ] `F0767` Translate literary passages · **7-13**
- [ ] `F0768` Translate a phrase in different registers · **7-13**
- [ ] `F0769` Translate with word-by-word alignment · **7-13**
- [ ] `F0770` Compare sentence structure across languages · **7-13**
- [ ] `F0771` Explain why a direct translation doesn’t work · **7-13**
- [ ] `F0772` Identify false friends · **7-13**
- [ ] `F0773` Explain untranslatable concepts · **7-19**
- [ ] `F0774` Back-translation exercises · **7-13**
- [ ] `F0775` Translate and then reconstruct the original · **7-13**
- [ ] `F0776` Compare a learner’s translation with several reference translations · **7-13**
- [ ] `F0777` Translation challenges with a timer · **7-13**
- [ ] `F0778` Translation of user-imported content · **7-13**

#### 9.2 Contrastive language tools

- [ ] `F0779` Compare word order · **7-13**
- [ ] `F0780` Compare grammatical gender · **7-13**
- [ ] `F0781` Compare case systems · **7-13**
- [ ] `F0782` Compare tense and aspect · **7-13**
- [ ] `F0783` Compare prepositions · **7-13**
- [ ] `F0784` Compare articles · **7-13**
- [ ] `F0785` Compare pronouns · **7-13**
- [ ] `F0786` Compare politeness systems · **7-13**
- [ ] `F0787` Compare formal and informal address · **7-13**
- [ ] `F0788` Compare idioms across languages · **7-13**
- [ ] `F0789` Compare cognates and false cognates · **7-13** · partly there
- [ ] `F0790` Compare shared roots · **7-13**
- [ ] `F0791` Compare word formation · **7-13**
- [ ] `F0792` Compare pronunciation of similar words · **7-13**
- [ ] `F0793` Compare semantic differences · **7-13**
- [ ] `F0794` Compare cultural associations · **7-13**
- [ ] `F0795` Maintain personal notes on difficult language pairs · **7-20**

## 10 · Real-world immersion

Immersion is not just watching foreign films. It is building a life in which the target language becomes a tool for obtaining information, enjoying culture and communicating with people.

#### 10.1 Media immersion

*In Lingua: Sonus et Visio: films, series, videos with two interactive subtitle lines; podcasts, audiobooks, radio, music; Mundus's picks.*

- [ ] `F0796` ⭐ YouTube video learning · **5.2-4** · planned in Lingua 5.2
- [x] `F0797` Video playback with subtitles
- [x] `F0798` Interactive subtitles
- [x] `F0799` Tap-to-translate subtitles
- [x] `F0800` Dual subtitles
- [ ] `F0801` Subtitle-based vocabulary extraction · **7-2** · partly there
- [x] `F0802` Podcast learning
- [x] `F0803` Audiobook learning
- [x] `F0804` News reading
- [x] `F0805` Music listening
- [x] `F0806` Film and television study
- [ ] `F0807` Short-form video comprehension · **7-19** · partly there
- [x] `F0808` Documentary learning
- [x] `F0809` Interviews and talk shows
- [ ] `F0810` Lectures and educational videos · **5.2-4** · planned in Lingua 5.2
- [ ] `F0811` Public speeches · **7-19** · partly there
- [x] `F0812` Radio listening
- [ ] `F0813` Live-stream comprehension · **7-19** · partly there
- [x] `F0814` Video transcript reading
- [ ] `F0815` Vocabulary lists generated from media · **7-2** · partly there
- [ ] `F0816` Save timestamps for difficult sections · **7-9**
- [x] `F0817` Review phrases from favorite scenes
- [ ] `F0818` Rewatch difficult passages with less assistance · **7-9**
- [ ] `F0819` Media playlists organized by level · **7-19**
- [x] `F0820` Authentic media recommendations based on interests

> For third-party media, integration should respect copyright, platform terms and content-access restrictions.

#### 10.2 Everyday immersion

*In Lingua: News in Codex; Diarium; Mundus › Things to try (think aloud, labels at home, …); Sermo's scenes; the study log.*

- [ ] `F0821` Change the app interface to the target language · **7-19**
- [x] `F0822` Read the news in the target language
- [x] `F0823` Follow creators who use the target language
- [x] `F0824` Keep a diary in the target language
- [x] `F0825` Think-aloud exercises
- [ ] `F0826` Describe your surroundings · **7-19** · partly there
- [ ] `F0827` Narrate daily activities · **7-19**
- [x] `F0828` Label objects in your home
- [ ] `F0829` Use a target-language shopping list · **7-19**
- [x] `F0830` Simulate ordering food
- [x] `F0831` Simulate travel
- [ ] `F0832` Read local advertisements and signs · **7-19** · partly there
- [ ] `F0833` Practice common phone calls · **5.2-6** · planned in Lingua 5.2
- [ ] `F0834` Write real messages with feedback · **7-12** · partly there
- [ ] `F0835` Maintain a personal phrasebook · **7-20**
- [x] `F0836` Set a daily target-language challenge
- [ ] `F0837` Build a list of real-life communication goals · **7-17**
- [ ] `F0838` Create a personal immersion plan · **7-16**
- [x] `F0839` Track time spent using the language
- [ ] `F0840` Record real-world language encounters · **7-17** · partly there

#### 10.3 Cultural immersion

*In Lingua: Mundus's picks for books, music and films; the course's first units.*

- [ ] `F0841` Cultural notes attached to vocabulary · **7-19**
- [ ] `F0842` Idioms with cultural explanations · **7-19**
- [ ] `F0843` Proverbs and sayings · **7-19** · partly there
- [ ] `F0844` Regional slang · **7-19**
- [ ] `F0845` Politeness conventions · **7-19**
- [ ] `F0846` Humor and wordplay · **7-19**
- [ ] `F0847` Social etiquette · **7-19**
- [x] `F0848` Greetings and introductions
- [ ] `F0849` Formal versus informal communication · **7-19**
- [ ] `F0850` Regional language differences · **7-19**
- [ ] `F0851` Dialect samples · **7-19**
- [ ] `F0852` Historical context for expressions · **7-19**
- [x] `F0853` Literature recommendations
- [x] `F0854` Music recommendations
- [x] `F0855` Film recommendations
- [ ] `F0856` Regional food vocabulary · **7-19**
- [ ] `F0857` Holidays and traditions · **7-19**
- [ ] `F0858` Cultural references in news · **7-19**
- [ ] `F0859` Differences in body language · **7-19**
- [ ] `F0860` Common conversational conventions · **7-19**
- [ ] `F0861` Intercultural scenarios · **7-19**
- [ ] `F0862` Cultural misunderstandings and how to handle them · **7-19**

## 11 · Interactive lessons and courses

This is the structured side of the app. Learners need a route through the material, especially at beginner level, without losing the freedom to explore.

#### 11.1 Lesson formats

*In Lingua: Cursus › Course: twelve units A1–B1 with words, phrases, grammar, speaking, writing and a unit check; Grammatica lessons.*

- [x] `F0863` ⭐ Step-by-step lessons
- [ ] `F0864` Short micro-lessons · **7-14** · partly there
- [ ] `F0865` Long-form lessons · **7-14**
- [x] `F0866` Vocabulary lessons
- [x] `F0867` Grammar lessons
- [ ] `F0868` Listening lessons · **7-14**
- [x] `F0869` Speaking lessons
- [ ] `F0870` Reading lessons · **7-14**
- [x] `F0871` Writing lessons
- [ ] `F0872` Pronunciation lessons · **7-14**
- [ ] `F0873` Translation lessons · **7-14**
- [x] `F0874` Mixed-skills lessons
- [ ] `F0875` Culture lessons · **7-14**
- [ ] `F0876` Review lessons · **7-14** · partly there
- [ ] `F0877` Exam-preparation lessons · **7-18**
- [ ] `F0878` Survival-language lessons · **7-14**
- [ ] `F0879` Travel-language lessons · **7-14**
- [ ] `F0880` Business-language lessons · **7-14**
- [ ] `F0881` Literature-based lessons · **7-14**
- [ ] `F0882` Topic-based lessons · **7-14** · partly there
- [ ] `F0883` Story-based lessons · **7-14**
- [ ] `F0884` Dialogue-based lessons · **7-14**
- [ ] `F0885` Project-based learning · **7-21**
- [ ] `F0886` Discovery-based learning · **7-14**
- [ ] `F0887` Lessons built around a single authentic text · **7-14**
- [ ] `F0888` Lessons built around a single conversation · **7-14**
- [x] `F0889` Lessons built around a particular grammar pattern
- [ ] `F0890` Lessons generated from personal interests · **7-14**

#### 11.2 Course structure

*In Lingua: The course trail (CEFR units, locked units with a check to jump, the next lesson on Home); Alphabets; the Path decks.*

- [ ] `F0891` ⭐ Beginner-to-advanced curriculum · **7-14** · partly there
- [x] `F0892` CEFR-aligned course paths
- [x] `F0893` Alphabet and script courses
- [ ] `F0894` Pronunciation foundations · **7-10**
- [x] `F0895` Core vocabulary courses
- [x] `F0896` Grammar progression
- [x] `F0897` Topic-based modules
- [ ] `F0898` Situational modules · **7-14** · partly there
- [ ] `F0899` Skill-specific pathways · **7-14**
- [x] `F0900` General language courses
- [ ] `F0901` Specialized courses · **7-14**
- [x] `F0902` Prerequisite requirements
- [ ] `F0903` Optional lessons · **7-14**
- [x] `F0904` Course completion tracking
- [x] `F0905` Unit completion tracking
- [ ] `F0906` Lesson bookmarks · **7-14**
- [ ] `F0907` Lesson history · **7-14**
- [ ] `F0908` Personalized revision lessons · **7-16**
- [x] `F0909` Unlockable advanced content
- [x] `F0910` Skip-ahead tests
- [ ] `F0911` Course placement assessment · **7-14** · partly there
- [ ] `F0912` Custom learning paths · **7-14**
- [ ] `F0913` Branching curriculum · **7-14**
- [ ] `F0914` Flexible lesson order · **7-14** · partly there
- [x] `F0915` Recommended next lesson
- [ ] `F0916` User-created courses · **7-14**
- [ ] `F0917` Community-created courses · **7-27** · needs the user's word
- [ ] `F0918` AI-generated courses · **7-14**
- [ ] `F0919` Import an existing syllabus · **7-14**
- [ ] `F0920` Build a course from a textbook · **7-14**
- [ ] `F0921` Build a course around a personal goal · **7-14**
- [ ] `F0922` Compare curriculum progress against a target proficiency level · **7-17**

#### 11.3 Lesson interaction patterns

*In Lingua: Ludus and Grammatica: choices, gaps, ordering, building, matching, typing, speaking, listening; feedback and the rule after a mistake.*

- [x] `F0923` Multiple choice
- [x] `F0924` Fill in the blank
- [ ] `F0925` Drag and drop · **7-4**
- [x] `F0926` Word ordering
- [x] `F0927` Sentence building
- [x] `F0928` Matching
- [x] `F0929` Typing answers
- [x] `F0930` Speaking answers
- [x] `F0931` Listening responses
- [x] `F0932` Flashcards
- [ ] `F0933` Audio repetition · **7-10** · partly there
- [x] `F0934` Interactive reading
- [x] `F0935` Inline dictionary lookup
- [ ] `F0936` Tap-to-reveal hints · **7-4**
- [ ] `F0937` Progressive hints · **7-4**
- [ ] `F0938` Error correction · **7-4**
- [x] `F0939` Short written responses
- [x] `F0940` Open-ended responses
- [ ] `F0941` Confidence ratings · **7-4**
- [ ] `F0942` Self-assessment · **7-4**
- [x] `F0943` Immediate feedback
- [ ] `F0944` Delayed feedback · **7-4**
- [x] `F0945` Explanations after incorrect answers
- [x] `F0946` Retry without penalty
- [ ] `F0947` Retry with a different example · **7-4**
- [ ] `F0948` Adaptive exercise selection · **7-16**
- [x] `F0949` Interleaved practice
- [x] `F0950` Mixed review at the end of a lesson
- [x] `F0951` Lesson summary
- [ ] `F0952` Vocabulary recap · **7-14** · partly there
- [ ] `F0953` Grammar recap · **7-14** · partly there
- [ ] `F0954` Personalized homework · **7-16**

## 12 · AI tutor and personal teacher

The AI tutor could be the layer that connects every other feature. Instead of being a separate chatbot, it should understand the learner’s vocabulary, lessons, weaknesses, interests and progress.

#### 12.1 Tutor capabilities

*In Lingua: Sentence translation (S), Mundus's next steps, Diarium's review, Sermo for conversation and debate.*

- [ ] `F0955` ⭐ Ask any language question · **7-15** · partly there
- [ ] `F0956` ⭐ Explain grammar in simple terms · **7-15** · partly there
- [ ] `F0957` ⭐ Explain vocabulary nuances · **7-15** · partly there
- [ ] `F0958` ⭐ Generate examples on demand · **7-15** · partly there
- [x] `F0959` Translate difficult sentences
- [ ] `F0960` Explain idioms · **7-15**
- [ ] `F0961` Explain slang · **7-15**
- [ ] `F0962` Compare similar words · **7-15**
- [ ] `F0963` Explain pronunciation · **7-15**
- [ ] `F0964` Explain regional differences · **7-15**
- [ ] `F0965` Explain cultural references · **7-15**
- [ ] `F0966` Answer questions about an active lesson · **7-15**
- [ ] `F0967` Explain why an answer was incorrect · **7-15** · partly there
- [ ] `F0968` Create additional examples · **7-15**
- [ ] `F0969` Give progressively harder exercises · **7-16**
- [ ] `F0970` Simplify difficult material · **7-15**
- [ ] `F0971` Generate a lesson on a specific topic · **7-15**
- [ ] `F0972` Generate a personalized study plan · **7-16**
- [x] `F0973` Recommend a next step
- [ ] `F0974` Diagnose recurring mistakes · **7-5**
- [ ] `F0975` Review a conversation · **7-11**
- [x] `F0976` Review an essay
- [ ] `F0977` Review a pronunciation recording · **7-10**
- [ ] `F0978` Generate vocabulary from a conversation · **7-11**
- [ ] `F0979` Turn a question into a mini-lesson · **7-15**
- [ ] `F0980` Turn a mistake into a practice exercise · **7-16**
- [ ] `F0981` Create analogies for difficult grammar · **7-15**
- [ ] `F0982` Explain a concept using the learner’s native language · **7-15** · partly there
- [ ] `F0983` Explain a concept entirely in the target language · **7-15**
- [ ] `F0984` Provide hints without giving away the answer · **7-15**
- [ ] `F0985` Simulate a patient teacher · **7-15**
- [ ] `F0986` Simulate an examiner · **7-18**
- [x] `F0987` Simulate a conversation partner
- [x] `F0988` Simulate a debate opponent
- [ ] `F0989` Simulate a writing editor · **7-15**
- [ ] `F0990` Simulate a language coach · **7-15**
- [ ] `F0991` Provide encouragement without exaggerated praise · **7-15**

#### 12.2 Tutor personalization

*In Lingua: The translation language; what you enjoy (Settings › Languages).*

- [ ] `F0992` Remember the learner’s preferred explanation style · **7-15**
- [x] `F0993` Remember the learner’s native language
- [ ] `F0994` Remember known vocabulary · **7-15** · partly there
- [ ] `F0995` Remember grammar topics already studied · **7-15** · partly there
- [ ] `F0996` Remember recurring errors · **7-5**
- [x] `F0997` Remember personal interests
- [ ] `F0998` Adjust explanation complexity · **7-15**
- [ ] `F0999` Adjust sentence length · **7-15**
- [ ] `F1000` Adjust vocabulary difficulty · **7-15**
- [ ] `F1001` Adjust speech speed · **7-15** · partly there
- [ ] `F1002` Adjust correction frequency · **7-15**
- [ ] `F1003` Adjust the amount of target-language exposure · **7-15**
- [ ] `F1004` Adjust how much translation is shown · **7-15**
- [ ] `F1005` Adapt examples to hobbies and interests · **7-15** · partly there
- [ ] `F1006` Adapt practice to upcoming travel · **7-16**
- [ ] `F1007` Adapt practice to exams · **7-18**
- [ ] `F1008` Adapt to time available · **7-16** · partly there
- [ ] `F1009` Distinguish persistent mistakes from occasional slips · **7-5**
- [ ] `F1010` Avoid repeatedly teaching mastered concepts · **7-16**
- [ ] `F1011` Recommend prerequisite material when needed · **7-16**
- [ ] `F1012` Explain connections between different lessons · **7-15**

#### 12.3 AI-generated learning materials

*In Lingua: Sermo's scene prompts, Diarium's prompts, Check yourself's story questions (Max).*

- [ ] `F1013` Generate flashcards · **7-6** · partly there
- [ ] `F1014` Generate vocabulary lists · **7-6**
- [ ] `F1015` Generate example sentences · **7-6** · partly there
- [ ] `F1016` Generate graded reading passages · **7-6**
- [ ] `F1017` Generate short stories · **7-6**
- [ ] `F1018` Generate dialogues · **7-6**
- [x] `F1019` Generate roleplay scenarios
- [ ] `F1020` Generate listening scripts · **7-6**
- [ ] `F1021` Generate audio dialogues where supported · **7-6**
- [ ] `F1022` Generate dictation exercises · **7-6**
- [ ] `F1023` Generate grammar drills · **7-6**
- [ ] `F1024` Generate translation exercises · **7-6**
- [x] `F1025` Generate writing prompts
- [x] `F1026` Generate comprehension questions
- [ ] `F1027` Generate pronunciation drills · **7-6**
- [ ] `F1028` Generate quizzes · **7-6**
- [ ] `F1029` Generate mock exams · **7-18**
- [ ] `F1030` Generate topic-specific courses · **7-14**
- [ ] `F1031` Generate parallel texts · **7-6**
- [ ] `F1032` Generate simplified versions of difficult articles · **7-6**
- [ ] `F1033` Generate exercises from uploaded documents · **7-6**
- [ ] `F1034` Generate exercises from notes · **7-6**
- [ ] `F1035` Generate exercises from transcripts · **7-6**
- [ ] `F1036` Generate exercises from conversation mistakes · **7-6**
- [ ] `F1037` Generate a personalized daily lesson · **7-16**

> Important: AI-generated content should be checked for grammatical accuracy, natural usage, suitable difficulty and reliable translations. Language learners can easily internalize a confident but incorrect explanation.

## 13 · The personal vocabulary and knowledge system

This is an area where your app could become particularly distinctive. Many learners collect vocabulary, but their collections eventually become disorganized and disconnected from actual learning.

Think of this as a personal linguistic knowledge base.

#### 13.1 Individual word pages

*In Lingua: Thesaurus › Dictionary with Your words beside it (every place and sentence a word was met).*

- [x] `F1038` Headword
- [x] `F1039` Translation
- [x] `F1040` Definitions
- [x] `F1041` Multiple meanings
- [x] `F1042` Part of speech
- [x] `F1043` Grammatical gender
- [x] `F1044` Singular and plural
- [x] `F1045` Inflected forms
- [x] `F1046` Verb conjugations
- [x] `F1047` Declensions
- [x] `F1048` Pronunciation
- [x] `F1049` IPA transcription
- [x] `F1050` Audio recordings
- [x] `F1051` Example sentences
- [x] `F1052` Example sentence translations
- [x] `F1053` Synonyms
- [x] `F1054` Antonyms
- [ ] `F1055` Related words · **7-1** · partly there
- [ ] `F1056` Word families · **7-1**
- [x] `F1057` Etymology
- [x] `F1058` Collocations
- [x] `F1059` Idioms
- [ ] `F1060` Common mistakes · **7-1**
- [x] `F1061` Frequency ranking
- [x] `F1062` CEFR estimate
- [ ] `F1063` Formality and register · **7-1** · partly there
- [ ] `F1064` Regional usage · **7-1** · partly there
- [x] `F1065` Source of discovery
- [ ] `F1066` Personal notes · **7-1** · partly there
- [ ] `F1067` Tags · **7-1**
- [ ] `F1068` Favorite status · **7-1**
- [ ] `F1069` First encountered date · **7-1** · partly there
- [ ] `F1070` Last reviewed date · **7-1**
- [ ] `F1071` Review history · **7-1**
- [ ] `F1072` Recall success rate · **7-1**
- [ ] `F1073` Links to relevant grammar topics · **7-1** · partly there
- [ ] `F1074` Links to other vocabulary items · **7-1**
- [x] `F1075` Links to texts in which the word appeared

> Every word could have its own detailed page containing:

#### 13.2 Personal linguistic graph

- [ ] `F1076` Synonym connections · **7-20**
- [ ] `F1077` Antonym connections · **7-20**
- [ ] `F1078` Cognate connections · **7-20**
- [ ] `F1079` Word-family connections · **7-20**
- [ ] `F1080` Root connections · **7-20**
- [ ] `F1081` Collocation connections · **7-20**
- [ ] `F1082` Semantic category connections · **7-20**
- [ ] `F1083` Grammatical connections · **7-20**
- [ ] `F1084` Topic connections · **7-20**
- [ ] `F1085` Idiom connections · **7-20**
- [ ] `F1086` Shared example sentence connections · **7-20**
- [ ] `F1087` Connections between a word and a saved text · **7-20**
- [ ] `F1088` Connections between a word and a personal mistake · **7-20**
- [ ] `F1089` Connections between words across multiple languages · **7-20**
- [ ] `F1090` Visual graph exploration · **7-20**
- [ ] `F1091` Filter by word type, topic or difficulty · **7-20**
- [ ] `F1092` Identify isolated words with few connections · **7-20**
- [ ] `F1093` Discover related vocabulary · **7-20**
- [ ] `F1094` Build a personal semantic map · **7-20**
- [ ] `F1095` Create a word cluster from a selected concept · **7-20**

> Imagine a network where words connect to other words based on meaning, form, usage and context.

> For example, learning the Russian word путь could connect it to travel vocabulary, related expressions, examples from literature and the learner’s own saved sentences.

#### 13.3 Personal phrasebook

*In Lingua: Phrases saved from the reader as cards ("From my reading").*

- [x] `F1096` Save complete phrases
- [ ] `F1097` Save sentence templates · **7-20**
- [ ] `F1098` Organize by situation · **7-20**
- [ ] `F1099` Organize by topic · **7-20**
- [ ] `F1100` Store formal and informal alternatives · **7-20**
- [ ] `F1101` Save useful conversational responses · **7-20**
- [ ] `F1102` Store sentence starters · **7-20**
- [ ] `F1103` Store linking expressions · **7-20**
- [ ] `F1104` Store debate phrases · **7-20**
- [ ] `F1105` Store idioms · **7-20**
- [ ] `F1106` Store polite requests · **7-20**
- [ ] `F1107` Store emergency phrases · **7-20**
- [ ] `F1108` Save travel phrases · **7-20**
- [ ] `F1109` Attach audio · **7-20**
- [ ] `F1110` Attach translations · **7-20**
- [ ] `F1111` Add personal notes · **7-20**
- [ ] `F1112` Search saved phrases · **7-20**
- [ ] `F1113` Practice phrases through recall · **7-20** · partly there
- [ ] `F1114` Convert phrases into flashcards · **7-20** · partly there
- [ ] `F1115` Generate new phrases from templates · **7-20**
- [ ] `F1116` Build a phrasebook for an upcoming trip · **7-20**
- [ ] `F1117` Export the phrasebook · **7-20**
- [ ] `F1118` Make selected phrases available offline · **7-20**

#### 13.4 Language notebook

*In Lingua: Diarium, its daily prompts; goals.*

- [x] `F1119` Daily language journal
- [ ] `F1120` Free-form notes · **7-20**
- [ ] `F1121` Grammar notes · **7-20**
- [ ] `F1122` Vocabulary notes · **7-20** · partly there
- [ ] `F1123` Notes about confusing expressions · **7-20**
- [ ] `F1124` Saved quotations · **7-8**
- [ ] `F1125` Notes from reading · **7-8**
- [ ] `F1126` Notes from conversations · **7-11**
- [ ] `F1127` Personal error log · **7-5**
- [ ] `F1128` Weekly learning reflections · **7-17**
- [x] `F1129` Language goals
- [ ] `F1130` Book and media notes · **7-20**
- [ ] `F1131` Attach vocabulary to notes · **7-20**
- [ ] `F1132` Link notes to grammar topics · **7-20**
- [ ] `F1133` Link notes to lessons · **7-20**
- [ ] `F1134` Link notes to texts · **7-20**
- [ ] `F1135` Markdown support · **7-20** · partly there
- [ ] `F1136` Folders and tags · **7-20**
- [ ] `F1137` Search across all notes · **7-20** · partly there
- [ ] `F1138` Export notes · **7-24**
- [x] `F1139` Daily journal prompts
- [ ] `F1140` AI-generated summaries of learning notes · **7-20**
- [ ] `F1141` Turn notebook entries into exercises · **7-20**

## 14 · Learning analytics and progress

Progress tracking should answer more than “How many points have I earned?” It should tell learners what they can do, what they have retained and what would help them improve.

*No entries in the source. Lingua 7 step 7-17 covers it: activity by skill, delayed recall, assisted and
unassisted answers, review workload, comprehension evidence, writing and speaking portfolios, real-world goals,
each with its definition, private and exportable. Lingua 5.2-9 already expands Ratio.*

## 15 · Goals, habits and motivation

*In Lingua: Home's minutes and the daily goal; Ratio's heatmap and streaks; Lightning's best; Things to try; the vocabulary journey and the course trail; reasons in Settings.*

- [x] `F1142` ⭐ Daily, weekly and monthly learning goals
- [x] `F1143` Goals based on minutes studied
- [ ] `F1144` Goals based on words learned · **7-17** · partly there
- [ ] `F1145` Goals based on lessons completed · **7-17**
- [ ] `F1146` Goals based on books read · **7-17** · partly there
- [ ] `F1147` Goals based on conversations held · **7-17**
- [ ] `F1148` Goals based on writing practice · **7-17**
- [ ] `F1149` Goals based on listening hours · **7-17**
- [ ] `F1150` Milestones for vocabulary size · **7-17** · partly there
- [ ] `F1151` Milestones for CEFR proficiency · **7-17** · partly there
- [x] `F1152` Personal learning challenges
- [ ] `F1153` Custom deadlines · **7-17** · partly there
- [ ] `F1154` Exam countdowns · **7-18**
- [ ] `F1155` Travel preparation countdowns · **7-17**
- [x] `F1156` Habit calendar
- [ ] `F1157` Optional streak tracking · **7-17** · partly there
- [ ] `F1158` Streak freeze or recovery · **7-17**
- [ ] `F1159` Flexible weekly targets · **7-17** · partly there
- [ ] `F1160` Rest days · **7-17**
- [ ] `F1161` Study reminders · **7-17**
- [ ] `F1162` Custom reminder schedules · **7-17**
- [ ] `F1163` Quiet hours · **7-17**
- [ ] `F1164` Daily motivational messages · **7-17** · partly there
- [ ] `F1165` Weekly progress summaries · **7-17** · partly there
- [ ] `F1166` Monthly progress reports · **7-17**
- [ ] `F1167` Personal achievement badges · **7-17**
- [x] `F1168` Milestone celebrations
- [x] `F1169` Personal best tracking
- [ ] `F1170` Reflection prompts · **7-17**
- [ ] `F1171` Weekly review of goals · **7-17**
- [ ] `F1172` Goal adjustment recommendations · **7-16**
- [ ] `F1173` Habit formation plans · **7-17**
- [ ] `F1174` Restart plans after a long break · **7-17**
- [x] `F1175` Visual progress journeys
- [x] `F1176` Personal reasons for learning
- [ ] `F1177` A record of memorable learning moments · **7-17** · partly there
- [ ] `F1178` Reward customization · **7-17**
- [ ] `F1179` Optional accountability partner · **7-27** · needs the user's word
- [ ] `F1180` Study challenges with friends · **7-27** · needs the user's word
- [ ] `F1181` Opt-in leaderboards · **7-27** · needs the user's word
- [x] `F1182` Private mode without social competition

## 16 · Interactive games and challenges

*In Lingua: Ludus: pairs, Lightning, building and ordering sentences, listening, grammar Lightning.*

- [x] `F1183` Word matching games
- [x] `F1184` Vocabulary speed rounds
- [ ] `F1185` Timed translation · **7-21**
- [x] `F1186` Sentence construction puzzles
- [x] `F1187` Word ordering challenges
- [x] `F1188` Grammar competitions
- [x] `F1189` Listening quizzes
- [ ] `F1190` Dictation races · **7-21**
- [ ] `F1191` Pronunciation challenges · **7-10**
- [ ] `F1192` Word association games · **7-21**
- [ ] `F1193` Crossword puzzles · **7-21**
- [ ] `F1194` Word searches · **7-21**
- [ ] `F1195` Anagrams · **7-21**
- [ ] `F1196` Hangman-style spelling · **7-21**
- [ ] `F1197` Guess-the-word games · **7-21**
- [ ] `F1198` Picture vocabulary quizzes · **7-21**
- [ ] `F1199` Memory matching · **7-21**
- [ ] `F1200` Semantic category sorting · **7-21**
- [ ] `F1201` Odd-one-out challenges · **7-21**
- [x] `F1202` Fill-the-gap races
- [ ] `F1203` Story completion games · **7-21**
- [ ] `F1204` Dialogue completion · **7-21**
- [ ] `F1205` Interactive mysteries · **7-21**
- [ ] `F1206` Text adventures · **7-21**
- [ ] `F1207` Choose-your-own-adventure stories · **7-21**
- [ ] `F1208` Roleplaying quests · **7-21**
- [ ] `F1209` Escape-room-style language puzzles · **7-21**
- [ ] `F1210` Clue-based detective games · **7-21**
- [ ] `F1211` Simulated travel adventures · **7-21**
- [ ] `F1212` Virtual city exploration · **7-21**
- [ ] `F1213` Survival-language challenges · **7-21**
- [ ] `F1214` Conversation quests · **7-21**
- [ ] `F1215` Daily puzzles · **7-21**
- [ ] `F1216` Weekly themed challenges · **7-21**
- [ ] `F1217` Cooperative multiplayer quizzes · **7-27** · needs the user's word
- [ ] `F1218` Head-to-head vocabulary matches · **7-27** · needs the user's word
- [ ] `F1219` Community tournaments · **7-27** · needs the user's word
- [ ] `F1220` Custom game creation · **7-21**
- [ ] `F1221` AI-generated games based on personal vocabulary · **7-21**

## 17 · Reading, writing and speaking together

These are integrated activities that combine skills instead of training each one in isolation.

*In Lingua: Sermo with words due; Grammatica's own sentence; In your own words.*

- [ ] `F1222` Read a story, then discuss it · **7-21**
- [ ] `F1223` Listen to a story, then summarize it aloud · **7-21**
- [ ] `F1224` Read an article, then write an opinion · **7-21**
- [ ] `F1225` Watch a video, then explain the main argument · **7-21**
- [x] `F1226` Learn vocabulary, then use it in a conversation
- [x] `F1227` Study grammar, then write a paragraph using it
- [ ] `F1228` Listen to a dialogue, then recreate it · **7-21**
- [ ] `F1229` Read a dialogue, then perform both roles · **7-21**
- [ ] `F1230` Learn idioms, then use them in a story · **7-21**
- [ ] `F1231` Translate a passage, then compare alternatives · **7-21**
- [ ] `F1232` Listen to a recording, then write a transcript · **7-21**
- [x] `F1233` Read a text, then retell it without looking
- [ ] `F1234` Write a paragraph, then read it aloud · **7-21** · partly there
- [ ] `F1235` Record a spoken response, then transcribe it · **7-21**
- [ ] `F1236` Discuss a book with an AI tutor · **5.2-6** · planned in Lingua 5.2
- [ ] `F1237` Debate an issue after reading about it · **7-21**
- [ ] `F1238` Create a presentation from a text · **7-21**
- [ ] `F1239` Turn a podcast into a vocabulary deck · **7-2** · partly there
- [ ] `F1240` Turn a conversation into a personalized lesson · **7-21**
- [ ] `F1241` Turn writing corrections into future review exercises · **7-21**
- [ ] `F1242` Build a weekly project around one topic · **7-21**
- [ ] `F1243` Produce a short story using recently learned words · **7-21**
- [ ] `F1244` Create a personal podcast in the target language · **7-21**

## 18 · Dictionaries and linguistic reference tools

*In Lingua: Thesaurus › Dictionary (offline, six core languages) and Your words.*

- [x] `F1245` ⭐ Bilingual dictionary
- [x] `F1246` ⭐ Monolingual dictionary
- [ ] `F1247` Search by word, phrase or definition · **7-22** · partly there
- [ ] `F1248` Search with spelling mistakes · **7-22**
- [ ] `F1249` Fuzzy search · **7-22**
- [x] `F1250` Search for inflected word forms
- [x] `F1251` Lemmatization
- [x] `F1252` Multiple definitions
- [x] `F1253` Contextual meanings
- [x] `F1254` Usage examples
- [x] `F1255` Frequency information
- [x] `F1256` CEFR level information
- [x] `F1257` Pronunciation audio
- [x] `F1258` IPA transcription
- [ ] `F1259` Syllable division · **7-1**
- [x] `F1260` Grammatical information
- [x] `F1261` Verb conjugation
- [x] `F1262` Noun declension
- [x] `F1263` Adjective declension
- [x] `F1264` Plural forms
- [x] `F1265` Synonyms and antonyms
- [x] `F1266` Collocations
- [x] `F1267` Idioms and expressions
- [x] `F1268` Etymology
- [ ] `F1269` Word origin maps · **7-26**
- [ ] `F1270` Regional variations · **7-1** · partly there
- [ ] `F1271` Formality labels · **7-1** · partly there
- [ ] `F1272` Slang labels · **7-1** · partly there
- [x] `F1273` Corpus-based examples
- [x] `F1274` Sentence translation
- [ ] `F1275` Reverse dictionary, searching by concept · **7-22**
- [ ] `F1276` Search for a word from its definition · **7-22**
- [ ] `F1277` Search for rhymes · **7-22**
- [ ] `F1278` Search for words with similar sounds · **7-22**
- [ ] `F1279` Search for words with a particular prefix or suffix · **7-22**
- [ ] `F1280` Search by grammatical category · **7-22**
- [x] `F1281` Search across personal vocabulary
- [ ] `F1282` Search across saved texts · **7-22**
- [ ] `F1283` Search across notes and flashcards · **7-22** · partly there
- [x] `F1284` Dictionary history
- [ ] `F1285` Favorites and bookmarks · **7-22**
- [x] `F1286` Offline dictionary
- [ ] `F1287` Custom dictionary entries · **7-22**
- [ ] `F1288` Multiple dictionaries for the same language · **7-22**
- [ ] `F1289` Compare definitions from different sources · **7-22**
- [ ] `F1290` Report incorrect definitions or examples · **7-22**

## 19 · Language-specific tools

Different languages require different learning interfaces. This could become a major advantage over apps that treat every language as if it works like English.

#### Scripts and writing systems

*In Lingua: Alphabets, writing letters, typing practice, kana and pinyin over words, Grammatica's topics for Russian, the Romance languages, Mandarin and Arabic.*

- [x] `F1291` Alphabet trainer
- [x] `F1292` Letter recognition
- [x] `F1293` Handwriting practice
- [ ] `F1294` Stroke-order animations · **7-23** · partly there
- [ ] `F1295` Character decomposition · **7-23**
- [x] `F1296` Character recognition quizzes
- [x] `F1297` Keyboard training
- [ ] `F1298` Transliteration · **7-23** · partly there
- [ ] `F1299` Script conversion · **7-23** · partly there
- [ ] `F1300` Reading without transliteration · **7-23** · partly there
- [ ] `F1301` Gradually hide transliteration · **7-23**
- [ ] `F1302` Diacritic training · **7-23**
- [ ] `F1303` Accent-mark exercises · **7-23**
- [ ] `F1304` Ligature recognition · **7-23**
- [ ] `F1305` Cursive recognition · **7-23**
- [ ] `F1306` Unicode character reference · **7-23**

#### Russian and other Slavic languages

- [x] `F1307` Cyrillic alphabet trainer
- [ ] `F1308` Soft and hard sign exercises · **7-23**
- [ ] `F1309` Palatalization practice · **7-10**
- [ ] `F1310` Stress placement · **7-23** · partly there
- [ ] `F1311` Unstressed vowel recognition · **7-23**
- [x] `F1312` Noun case tables
- [x] `F1313` Case-selection exercises
- [ ] `F1314` Verb aspect comparison · **7-23** · partly there
- [ ] `F1315` Perfective and imperfective pairs · **7-23**
- [ ] `F1316` Motion verbs · **7-23** · partly there
- [ ] `F1317` Prefixes of motion verbs · **7-23**
- [x] `F1318` Verb conjugation
- [x] `F1319` Adjective agreement
- [x] `F1320` Pronoun declension
- [ ] `F1321` Numeral declension · **7-23**
- [ ] `F1322` Participles · **7-23**
- [ ] `F1323` Reflexive verbs · **7-23** · partly there
- [ ] `F1324` Word order flexibility · **7-23**
- [ ] `F1325` Natural stress in sentences · **7-23**

#### Spanish, Portuguese and other Romance languages

- [x] `F1326` Verb conjugation tables
- [x] `F1327` Subjunctive practice
- [x] `F1328` Tense selection
- [x] `F1329` Ser versus estar
- [x] `F1330` Por versus para
- [ ] `F1331` Clitic pronouns · **7-23** · partly there
- [x] `F1332` Gender and agreement
- [x] `F1333` Contractions
- [ ] `F1334` Accent placement · **7-23**
- [ ] `F1335` Regional vocabulary · **7-23** · partly there
- [x] `F1336` Formal versus informal address
- [ ] `F1337` Spanish dialect comparisons · **7-23**
- [ ] `F1338` European versus Brazilian Portuguese · **7-23** · partly there
- [ ] `F1339` Nasal vowel practice · **7-10**
- [ ] `F1340` Verb-preposition combinations · **7-23**
- [ ] `F1341` False friends between Romance languages · **7-13**

#### Chinese, Japanese and other East Asian languages

- [x] `F1342` Pinyin or kana training
- [ ] `F1343` Tone recognition · **7-23** · partly there
- [ ] `F1344` Tone production · **7-10**
- [ ] `F1345` Character decomposition · **7-23**
- [ ] `F1346` Radicals and components · **7-23**
- [ ] `F1347` Stroke order · **7-23** · partly there
- [ ] `F1348` Kanji readings · **7-23**
- [ ] `F1349` Hanzi recognition · **7-23** · partly there
- [ ] `F1350` Hanja reference where relevant · **7-23**
- [ ] `F1351` Pitch-accent training · **7-10**
- [ ] `F1352` Honorifics · **7-23**
- [ ] `F1353` Politeness levels · **7-23**
- [ ] `F1354` Measure words · **7-23** · partly there
- [ ] `F1355` Classifiers · **7-23**
- [ ] `F1356` Particles · **7-23** · partly there
- [x] `F1357` Character frequency
- [x] `F1358` Reading with furigana
- [ ] `F1359` Gradual removal of reading aids · **7-23**
- [ ] `F1360` Traditional versus simplified Chinese · **7-23** · partly there
- [ ] `F1361` Kana-to-kanji practice · **7-23**
- [ ] `F1362` Character handwriting recognition · **7-23** · partly there

#### Arabic and other languages with complex orthography

- [x] `F1363` Right-to-left interface support
- [x] `F1364` Connected letter forms
- [ ] `F1365` Short-vowel recognition · **7-23** · partly there
- [ ] `F1366` Diacritic training · **7-23**
- [ ] `F1367` Root-and-pattern morphology · **7-23**
- [ ] `F1368` Dialect versus standard language · **7-23**
- [ ] `F1369` Formal versus colloquial registers · **7-23**
- [x] `F1370` Arabic script handwriting
- [ ] `F1371` Transliteration controls · **7-23**
- [ ] `F1372` Pronunciation of emphatic consonants · **7-10**

## 20 · Exams and proficiency certification

*In Lingua: The CEFR course and Grammatica's placement.*

- [x] `F1373` CEFR-aligned learning paths
- [ ] `F1374` A1 through C2 progression · **7-14** · partly there
- [ ] `F1375` Placement tests · **7-18** · partly there
- [ ] `F1376` Diagnostic assessments by skill · **7-18**
- [ ] `F1377` Vocabulary placement tests · **7-18**
- [x] `F1378` Grammar placement tests
- [ ] `F1379` Reading comprehension tests · **7-18**
- [ ] `F1380` Listening comprehension tests · **7-18**
- [ ] `F1381` Speaking assessments · **7-18**
- [ ] `F1382` Writing assessments · **7-18**
- [ ] `F1383` Mock examinations · **7-18**
- [ ] `F1384` Timed exam simulations · **7-18**
- [ ] `F1385` Practice test libraries · **7-18**
- [ ] `F1386` Past-paper organization where legally available · **7-18**
- [ ] `F1387` IELTS preparation · **7-18**
- [ ] `F1388` TOEFL preparation · **7-18**
- [ ] `F1389` Cambridge English preparation · **7-18**
- [ ] `F1390` DELF and DALF preparation · **7-18**
- [ ] `F1391` DELE preparation · **7-18**
- [ ] `F1392` Goethe-Zertifikat preparation · **7-18**
- [ ] `F1393` TestDaF preparation · **7-18**
- [ ] `F1394` TORFL/TRKI preparation · **7-18**
- [ ] `F1395` HSK preparation · **7-18**
- [ ] `F1396` JLPT preparation · **7-18**
- [ ] `F1397` TOPIK preparation · **7-18**
- [ ] `F1398` Exam-specific vocabulary decks · **7-18**
- [ ] `F1399` Writing rubric feedback · **7-18**
- [ ] `F1400` Speaking rubric feedback · **7-18**
- [ ] `F1401` Estimated score ranges with uncertainty · **7-18**
- [ ] `F1402` Weakness reports · **7-18**
- [ ] `F1403` Study plans based on exam dates · **7-18**
- [ ] `F1404` Practice under time constraints · **7-18**
- [ ] `F1405` Performance history across mock exams · **7-18**
- [ ] `F1406` Printable revision plans · **7-18**

## 21 · Community and social learning

*In Lingua: Nothing is public: Lingua is private by design.*

- [ ] `F1407` Follow other learners · **7-27** · needs the user's word
- [ ] `F1408` Public learner profiles · **7-27** · needs the user's word
- [x] `F1409` Private learner profiles
- [ ] `F1410` Share vocabulary decks · **7-27** · partly there
- [ ] `F1411` Share learning resources · **7-27** · partly there
- [ ] `F1412` Publish reading lists · **7-27** · needs the user's word
- [ ] `F1413` Share personal study plans · **7-27** · needs the user's word
- [ ] `F1414` Collaborative flashcard decks · **7-27** · needs the user's word
- [ ] `F1415` Community-created courses · **7-27** · needs the user's word
- [ ] `F1416` Community quizzes · **7-27** · needs the user's word
- [ ] `F1417` Study groups · **7-27** · needs the user's word
- [ ] `F1418` Language-specific forums · **7-27** · needs the user's word
- [ ] `F1419` Topic-specific forums · **7-27** · needs the user's word
- [ ] `F1420` Discussion threads about grammar · **7-27** · needs the user's word
- [ ] `F1421` Native-speaker explanations · **7-27** · partly there
- [ ] `F1422` Peer correction of writing · **7-27** · partly there
- [ ] `F1423` Peer pronunciation feedback · **7-27** · needs the user's word
- [ ] `F1424` Language exchange matching · **7-27** · needs the user's word
- [ ] `F1425` Conversation partner matching · **7-27** · needs the user's word
- [ ] `F1426` Tandem-style text exchange · **7-27** · partly there
- [ ] `F1427` Voice-message exchanges · **7-27** · needs the user's word
- [ ] `F1428` Scheduled conversation sessions · **7-27** · needs the user's word
- [ ] `F1429` Community reading clubs · **7-27** · needs the user's word
- [ ] `F1430` Book clubs in the target language · **7-27** · needs the user's word
- [ ] `F1431` Group listening challenges · **7-27** · needs the user's word
- [ ] `F1432` Shared learning goals · **7-27** · needs the user's word
- [ ] `F1433` Accountability groups · **7-27** · needs the user's word
- [ ] `F1434` Community challenges · **7-27** · needs the user's word
- [ ] `F1435` Deck ratings and reviews · **7-27** · needs the user's word
- [ ] `F1436` Resource recommendations · **7-27** · needs the user's word
- [ ] `F1437` Moderation and reporting · **7-27** · needs the user's word
- [ ] `F1438` Blocking and privacy controls · **7-27** · needs the user's word
- [ ] `F1439` Age-appropriate safety measures · **7-27** · needs the user's word

## 22 · Personalization and adaptive learning

*In Lingua: The language profile, FSRS, Made for you, Mundus's picks and reasons.*

- [x] `F1440` ⭐ Personal learning profile
- [ ] `F1441` Adaptive difficulty · **7-16** · partly there
- [ ] `F1442` Adaptive vocabulary selection · **7-16** · partly there
- [x] `F1443` Adaptive review scheduling
- [ ] `F1444` Adaptive lesson length · **7-16** · partly there
- [ ] `F1445` Adaptive reading recommendations · **7-16** · partly there
- [ ] `F1446` Adaptive listening speed · **7-16**
- [ ] `F1447` Adaptive conversation complexity · **7-16** · partly there
- [ ] `F1448` Adaptive grammar exercises · **5.2-8** · planned in Lingua 5.2
- [ ] `F1449` Adaptive pronunciation drills · **7-16**
- [ ] `F1450` Native-language-aware explanations · **7-16**
- [ ] `F1451` Personalized examples · **7-16**
- [x] `F1452` Personalized vocabulary decks
- [ ] `F1453` Personalized reading lists · **7-16**
- [x] `F1454` Personalized media recommendations
- [x] `F1455` Personalized revision schedules
- [ ] `F1456` Personalized daily sessions · **7-16** · partly there
- [ ] `F1457` Detect recurring mistakes · **7-5**
- [ ] `F1458` Detect forgotten vocabulary · **7-5** · partly there
- [ ] `F1459` Detect recognition-versus-recall gaps · **7-5**
- [ ] `F1460` Detect weaknesses by skill · **7-5**
- [x] `F1461` Identify neglected skills
- [ ] `F1462` Balance receptive and productive practice · **7-16** · partly there
- [ ] `F1463` Adjust for learner confidence · **7-16**
- [ ] `F1464` Adjust for recent inactivity · **7-16** · partly there
- [ ] `F1465` Let users override recommendations · **5.2-7** · planned in Lingua 5.2
- [x] `F1466` Explain why recommendations were made
- [ ] `F1467` Compare different learning methods · **7-26**
- [ ] `F1468` Track which methods work best for each learner · **7-26**
- [ ] `F1469` Suggest an alternative approach when progress stalls · **7-16**
- [ ] `F1470` Build a learning plan around a trip, book or exam · **7-16**

## 23 · Importing, exporting and integrations

*In Lingua: Imports (CSV, Anki, text, PDF, EPUB, subtitles, audio, web articles); backups; device pairing; offline; shortcuts; voices and speech recognition.*

- [x] `F1471` Import vocabulary from CSV
- [x] `F1472` Import flashcards from Anki
- [ ] `F1473` Import supported Quizlet exports · **7-24** · partly there
- [x] `F1474` Import plain text
- [ ] `F1475` Import Markdown · **7-24** · partly there
- [x] `F1476` Import TXT documents
- [x] `F1477` Import PDFs
- [x] `F1478` Import EPUB files where supported
- [x] `F1479` Import subtitles
- [ ] `F1480` Import transcripts · **7-24** · partly there
- [ ] `F1481` Import word lists · **7-2** · partly there
- [ ] `F1482` Import personal dictionaries · **7-22**
- [ ] `F1483` Import grammar notes · **7-24**
- [x] `F1484` Import from a clipboard
- [x] `F1485` Import a web article
- [ ] `F1486` Import text through a browser extension · **7-24** · partly there
- [ ] `F1487` Import a document and extract vocabulary · **7-2** · partly there
- [x] `F1488` Import audio files
- [ ] `F1489` Import video transcripts · **5.2-4** · planned in Lingua 5.2
- [ ] `F1490` Export vocabulary to CSV · **7-24**
- [ ] `F1491` Export flashcards to Anki-compatible formats · **7-24**
- [ ] `F1492` Export notes to Markdown · **7-24**
- [ ] `F1493` Export vocabulary decks · **7-24**
- [ ] `F1494` Export learning statistics · **7-24**
- [ ] `F1495` Export reading highlights · **7-24**
- [ ] `F1496` Export conversation transcripts · **7-24**
- [ ] `F1497` Export a personal phrasebook · **7-24**
- [ ] `F1498` Export progress reports · **7-24** · partly there
- [x] `F1499` Backup and restore
- [ ] `F1500` Cloud synchronization · **7-27** · partly there
- [x] `F1501` Multi-device synchronization
- [x] `F1502` Offline-first learning
- [ ] `F1503` Browser extension · **5.2-4** · planned in Lingua 5.2
- [ ] `F1504` Mobile share-sheet integration · **7-27** · needs the user's word
- [x] `F1505` Keyboard shortcuts
- [x] `F1506` Text-to-speech integration
- [x] `F1507` Speech-to-text integration
- [x] `F1508` Dictionary API integration
- [ ] `F1509` Calendar integration for study planning · **7-24**
- [ ] `F1510` Reminder integration · **7-17**
- [ ] `F1511` Integration with note-taking tools · **7-24**
- [ ] `F1512` Integration with e-readers where supported · **7-24**

## 24 · Mobile, desktop and accessibility

*In Lingua: The installed desktop app (PWA), offline, background audio and the lock screen, light and dark, papers, typography, reduced motion, backups, sync status, Reset.*

- [x] `F1513` Responsive web app
- [x] `F1514` Installable progressive web app
- [ ] `F1515` iOS application · **7-27** · needs the user's word
- [ ] `F1516` Android application · **7-27** · needs the user's word
- [x] `F1517` Desktop application
- [x] `F1518` Offline vocabulary review
- [x] `F1519` Offline reading library
- [x] `F1520` Background audio
- [x] `F1521` Lock-screen audio controls
- [ ] `F1522` Home-screen widgets · **7-27** · needs the user's word
- [ ] `F1523` Quick vocabulary review · **7-25** · partly there
- [ ] `F1524` Daily word widget · **7-25**
- [ ] `F1525` Push notifications · **7-17**
- [x] `F1526` Keyboard shortcuts
- [x] `F1527` Dark mode
- [x] `F1528` Light mode
- [x] `F1529` Warm-paper reading mode
- [x] `F1530` Font-size adjustment
- [ ] `F1531` Dyslexia-friendly font options · **7-25** · partly there
- [x] `F1532` Adjustable line spacing
- [ ] `F1533` Screen-reader support · **7-25** · partly there
- [ ] `F1534` High-contrast mode · **7-25**
- [x] `F1535` Reduced-motion mode
- [ ] `F1536` Color-blind-friendly indicators · **7-25**
- [x] `F1537` Captions for audio and video
- [x] `F1538` Adjustable playback speed
- [ ] `F1539` VoiceOver support · **7-25** · partly there
- [ ] `F1540` TalkBack support · **7-27** · needs the user's word
- [ ] `F1541` Keyboard-only navigation · **7-25** · partly there
- [x] `F1542` Data export
- [x] `F1543` Account deletion
- [ ] `F1544` Privacy controls · **7-25** · partly there
- [x] `F1545` Synchronization status
- [ ] `F1546` Storage management · **7-25** · partly there
- [ ] `F1547` Battery-efficient audio · **7-25** · partly there
- [x] `F1548` Local data caching
- [ ] `F1549` Clear error messages · **7-25** · partly there
- [ ] `F1550` Undo for destructive actions · **7-25** · partly there

## 25 · Advanced and experimental features

These are more ambitious ideas for a language app that could grow into a genuinely sophisticated learning platform.

*In Lingua: Several languages side by side.*

- [ ] `F1551` AI-generated interactive novels · **7-26**
- [ ] `F1552` Persistent AI characters that remember previous conversations · **7-26**
- [ ] `F1553` Procedurally generated roleplaying worlds · **7-26**
- [ ] `F1554` An AI tutor that adapts to the learner’s personal knowledge graph · **7-26**
- [ ] `F1555` Semantic maps connecting vocabulary across languages · **7-26**
- [ ] `F1556` A visual map of grammatical relationships · **7-26**
- [ ] `F1557` An interactive morphology explorer · **7-26**
- [ ] `F1558` Automatic linguistic analysis of imported books · **7-26**
- [ ] `F1559` Personal corpus analysis · **7-26**
- [ ] `F1560` Compare vocabulary across authors · **7-26**
- [ ] `F1561` Compare language use across historical periods · **7-26**
- [ ] `F1562` Historical language evolution explorer · **7-26**
- [ ] `F1563` Dialect comparison maps · **7-26**
- [ ] `F1564` Speech waveform and spectrogram analysis · **7-26**
- [ ] `F1565` AI-assisted pronunciation coaching · **7-26**
- [ ] `F1566` Real-time conversation assistance · **7-26**
- [ ] `F1567` Simulated immersion environments · **7-26**
- [ ] `F1568` Virtual shops, cafés, stations and universities · **7-26**
- [ ] `F1569` Speech-based adventure games · **7-26**
- [ ] `F1570` Camera-based text recognition for signs and menus · **7-26** · partly there
- [ ] `F1571` Image-to-vocabulary exercises · **7-26**
- [ ] `F1572` Object-labeling mode for real-world environments · **7-26**
- [ ] `F1573` Context-aware phrase recommendations · **7-26**
- [ ] `F1574` Multilingual journaling · **7-26** · partly there
- [ ] `F1575` Cross-language word-family visualization · **7-26**
- [ ] `F1576` Personalized textbook generation · **7-26**
- [ ] `F1577` AI-generated audio dramas · **7-26**
- [ ] `F1578` Personalized audiobook difficulty · **7-26**
- [ ] `F1579` Adaptive subtitles · **7-9**
- [ ] `F1580` Automatic vocabulary extraction from permitted media · **7-2** · partly there
- [ ] `F1581` A personal language-learning research dashboard · **7-26**
- [ ] `F1582` Learning experiments comparing recall methods · **7-26**
- [ ] `F1583` A personal corpus of written and spoken output · **7-26**
- [ ] `F1584` Long-term language maintenance plans · **7-26**
- [ ] `F1585` Heritage-language learning pathways · **7-26**
- [x] `F1586` Multilingual learning across several target languages
- [ ] `F1587` Language transfer analysis between known languages · **7-26**
- [ ] `F1588` A personal multilingual knowledge graph · **7-26**

## 26 · The learning methods your app could support

So far, we’ve focused on features. But these are the underlying methods that determine how the features actually teach.

Spaced repetition — Review information at expanding or adaptive intervals.

Active recall — Retrieve information from memory rather than rereading it.

Interleaving — Mix related skills or problem types during practice.

Retrieval practice — Repeatedly attempt to remember learned information.

Comprehensible input — Read and listen to material that is understandable with some challenge.

Extensive reading — Read large amounts of relatively accessible material.

Intensive reading — Study short passages closely for vocabulary and structure.

Extensive listening — Listen to substantial amounts of accessible audio.

Intensive listening — Analyze short recordings in detail.

Shadowing — Repeat speech closely after a recording.

Dictation — Reconstruct spoken language in writing.

Sentence mining — Collect useful sentences from authentic material.

Translation — Move meaning between languages and compare structures.

Output practice — Produce spoken or written language.

Corrective feedback — Use corrections to improve future performance.

Task-based learning — Complete meaningful tasks using the language.

Communicative practice — Learn by exchanging information and meaning.

Pattern discovery — Infer grammatical rules from examples.

Explicit instruction — Study a rule before applying it.

Minimal-pair training — Learn to distinguish similar sounds.

Phonetic training — Practice hearing and producing specific speech sounds.

Interlinear reading — Align words, meanings and grammatical information.

Dual coding — Combine verbal material with useful visual representations.

Mnemonics — Use memorable associations to support recall.

Chunk learning — Learn common phrases and multiword expressions as units.

Incidental learning — Acquire language while engaging with meaningful content.

Deliberate practice — Focus effort on a specific weakness with feedback.

Self-explanation — Explain why an answer or construction works.

Peer learning — Practice and exchange feedback with other learners.

Immersion — Use the language extensively in meaningful contexts.

Reflective learning — Review errors, progress and learning strategies.

A strong app would combine these methods rather than treating one method as a universal solution. Flashcards are excellent for certain types of memory work, but they cannot replace conversation, sustained reading or spontaneous writing.

*Methods, not features. Step "The methods" in the plan says where Lingua teaches with each and which Lingua 7
step adds what's missing.*


## 27 · My recommended feature priorities

With this many possibilities, the danger is building a sprawling collection of tools that never feels cohesive. I’d develop the product in layers.

#### Phase 1: The learning core

#### Start here

*In Lingua: See the entries above: most of the core is there.*

- [x] `F1589` Vocabulary management and flashcards
- [x] `F1590` Reliable spaced repetition
- [x] `F1591` Sentence practice and translation
- [x] `F1592` Grammar reference and exercises
- [x] `F1593` Interactive reading with word lookup
- [x] `F1594` Audio pronunciation
- [ ] `F1595` Personal notes and phrasebook · **7-20** · partly there
- [x] `F1596` Basic progress tracking
- [x] `F1597` Import and export

#### Phase 2: Active language use

- [x] `F1598` AI conversation partner
- [x] `F1599` Writing assistant and error correction
- [ ] `F1600` Listening exercises and dictation · **7-9** · partly there
- [ ] `F1601` Speech recording and pronunciation practice · **7-10** · partly there
- [ ] `F1602` Graded reading library · **7-8** · partly there
- [ ] `F1603` Adaptive lessons · **7-16** · partly there
- [x] `F1604` Personalized recommendations

#### Phase 3: Immersion and intelligence

- [x] `F1605` Video and subtitle learning
- [x] `F1606` Authentic media library
- [ ] `F1607` Personal linguistic knowledge graph · **7-20**
- [ ] `F1608` Advanced learning analytics · **7-17** · partly there
- [ ] `F1609` AI-generated courses and interactive stories · **7-6** · partly there
- [ ] `F1610` Deep personalization · **7-16**
- [x] `F1611` Multi-language learning workspace

#### Phase 4: Ecosystem

- [ ] `F1612` Community decks and courses · **7-27** · needs the user's word
- [ ] `F1613` Language exchange · **7-27** · needs the user's word
- [ ] `F1614` Collaborative learning · **7-27** · needs the user's word
- [ ] `F1615` Advanced integrations · **7-24** · partly there
- [ ] `F1616` Offline-first mobile and desktop experiences · **7-27** · partly there
- [ ] `F1617` Specialized exam preparation · **7-18**
- [ ] `F1618` Advanced phonetics and linguistic analysis · **7-10**

> My strongest product recommendation: build a unified learning system, not a giant menu of unrelated features.

> For example, when a learner encounters an unfamiliar word in a Russian short story, the app could let them save it, inspect its grammar, hear its pronunciation, see related words, add it to a spaced-repetition queue, use it in an AI conversation and later encounter it in another reading passage.

> One word, connected to the entire learning experience. That’s the kind of integration that can make your app genuinely powerful.
