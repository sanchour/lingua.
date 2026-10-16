# iPhone QA checklist

Run on a real iPhone with Lingua installed from Safari (Share → Add to Home Screen) and opened from
the home-screen icon. Paste the Device lab report back into the chat after each phase.

## Phase 1

- [ ] App opens full-screen with no Safari chrome; launch screen matches the theme.
- [ ] Status bar text is readable in Paper and in Nocturne (after relaunching).
- [ ] Nothing hides under the notch / Dynamic Island or the home indicator (header, tab bar, sheets).
- [ ] Tab bar: tapping each of Home, Codex, Thesaurus, Sonus, Visio switches instantly; the active
      pill slides smoothly.
- [ ] Header buttons open Ratio and Ordo.
- [ ] Large page title collapses into the header when scrolling.
- [ ] Bottom sheets open with a spring, can be dragged down to dismiss, and don't scroll the page behind.
- [ ] Onboarding: languages, level, theme. Relaunch → onboarding does not show again.
- [ ] Ordo → Reading: Russian and Greek preview text renders in every reader font.
- [ ] Ordo → Backup: Export → Share → Save to Files works. Restore from Files works.
- [ ] Device lab: background audio keeps playing with the screen locked; lock-screen controls
      (play/pause, ±seek) work; the verdict line says "kept playing".
- [ ] Device lab: long-press target triggers without the iOS callout or text selection.
- [ ] Device lab: animation benchmark reports ≥ 58 fps average and p95 ≤ 17.5 ms.
- [ ] Airplane mode: app still opens and navigates (offline shell).

## Phase 2

- [ ] First launch after onboarding: the dictionary pill appears and finishes; then airplane mode →
      tapping words still shows translations.
- [ ] Codex → read the sample: tap a word → bubble with translation, Known / Learning pills.
- [ ] Long-press a word → details sheet (no iOS copy menu, no text selection).
- [ ] Swipe left/right turns pages smoothly; the page follows the finger.
- [ ] Tap empty space → the top bar appears; "Aa" changes font, size and spacing instantly.
- [ ] Import an EPUB from Files; it opens with its cover; chapters list works.
- [ ] Leave the reader → Home shows minutes read, words read and the book under Continue.

## Phase 3

- [ ] Thesaurus → Ready-made → Top 100: the sheet lists words with meanings; "Add" makes a deck.
- [ ] Review: tap the card → it turns over smoothly in 3D; the four grades sit within thumb reach.
- [ ] Ludus: multiple choice, match the pairs, fill the gap, build the sentence and typing all work
      with the on-screen keyboard (it doesn't cover the Check button).
- [ ] Listening exercises speak (Settings › Accessibility › Spoken Content › Voices adds voices).
- [ ] Ordo › Flashcards: font, style and colour change the preview and the study card at once.
- [ ] Import an Anki .apkg from Files: decks appear with their cards and progress.
- [ ] Home → Review shows today's cards and opens the session.

## Phase 4

- [ ] Sonus → Discover: suggested podcasts for your language appear; + follows one.
- [ ] Play an episode, lock the phone: audio keeps playing; the lock screen shows the artwork with
      play/pause, skip back/forward, and previous/next jump by sentence when there is a transcript.
- [ ] Repeat on (2×) with the screen locked: sentences repeat (without the pause, by design).
- [ ] ⋯ → Save for offline, then turn on airplane mode: the episode still plays.
- [ ] Add audio files from Files (MP3/M4A): title and cover come from the file's tags.
- [ ] Add a transcript (.srt/.vtt/.txt) or Make a transcript (Groq key): the sentence lights up and
      words brighten as they're spoken; tapping a word shows its translation; long-press opens it.
- [ ] Tap between words to jump to that sentence; the transcript follows; Back to now returns.
- [ ] Commute mode: big controls; Keep screen on works; the sentence is readable at arm's length.
- [ ] The mini player above the tab bar stays while moving between sections; × closes it.
- [ ] A Spotify episode link plays in the embedded player (signed in to Spotify in Safari).
- [ ] Home → Continue listening opens the episode where you left it.

## Codex, Thesaurus and Ludus refinements

- [ ] Tap words quickly, including near their edges: each tap lands (a soft ring flashes).
- [ ] Long-press a verb: the drawer shows Meaning (+ Deck), Dictionary, then Forms with I / you /
      he·she / we rows; "All forms" opens the rest; "+ Deck" adds the word to the chosen deck.
- [ ] Codex → + opens the Add page; the Write / File / Goodreads tabs fit; a cloth and an ornament
      show on the cover preview; "Use a picture" picks a photo.
- [ ] Book menu → Cover & details: title, author, shelf and cover changes stay after going back.
- [ ] The back button in the top bar goes to the section (no second back link on the page).
- [ ] Thesaurus → Discover: the vocabulary journey scrolls to "You are here"; a ready-made deck
      opens full screen and its add bar sits above the tab bar.
- [ ] Ludus: say it out loud asks for the microphone once and accepts the word; "Can’t speak now"
      switches to typing; translate and tap-what-you-hear tiles fit the screen.
- [ ] The end of a lesson: "Another lesson" on top, "Done" below.
