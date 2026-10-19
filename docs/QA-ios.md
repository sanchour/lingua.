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
- [ ] No speaker buttons anywhere on cards, in Ludus or in the word drawer (the device voice is gone).
- [ ] Long-press a flashcard: the word drawer opens, and the card doesn't turn over.
- [ ] Grading a card: it slides away, then the next one comes in, with no overlap or flash.
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
      switches to typing; translate tiles fit the screen.
- [ ] The end of a lesson: "Another lesson" on top, "Done" below. After Recall: "Practise again",
      "Practise with Ludus", then "Done".
- [ ] Codex: long-press a word and slide across others: they highlight, the page doesn't scroll, and
      a bubble shows the translation with "Save as a card". Long-press and let go opens the drawer.
- [ ] Onboarding (Ordo › Learn another language): "What brings you here?" and "What do you enjoy
      most?" fit the screen; the choices show on Home's "Next up".

## Diarium, Ratio and the new icon

- [ ] Add to Home Screen with the phone in dark mode: the icon is the dark version; in light mode, the light one.
- [ ] After a new version is published, closing and reopening Lingua shows "Lingua was updated".
- [ ] Codex → Diarium: today's prompt shows; Write about this opens the editor; text survives leaving and coming back.
- [ ] Check my writing (with a key): changes are struck through and added in colour; tapping one explains it; + adds it to Journal.
- [ ] The floating bar sits above the tab bar and the keyboard doesn't hide the text.
- [ ] Ratio → Overview: the calendar and charts fit the width; tapping a bar or a day shows its numbers.
- [ ] Ratio → Tabula: Notion CSV import from Files works; dragging the handle reorders; a row opens its drawer.
- [ ] Ratio → Iter: Log time, Add a moment (with a photo) and a reading challenge appear on the page.
- [ ] Ordo → Reset: the confirm button stays disabled until the word is typed.

## Visio, Whisper on this device and Home

- [ ] Visio → Add → Video files: pick a video and its .srt files together; the card shows a frame and RU/EN badges.
- [ ] The player: tap a word in the subtitle for its translation (the video pauses); long-press opens the drawer.
- [ ] The English line is blurred; tapping it shows it. Settings (the sliders icon): Show / Blur / Hide, pause after each line, size.
- [ ] Previous / repeat / next line and Save line work; the line appears in Thesaurus › From Visio and its card plays the clip.
- [ ] Full screen (the corner button) opens the iPhone player with the subtitles of the language you learn.
- [ ] ⋯ → Keep subtitles only frees the space; the lines and cards stay; Attach the video file brings it back.
- [ ] Ordo → Listening → This device: Make subtitles downloads the model once (progress shows), then works offline.
- [ ] Home: Next up lists reviews, the book, episode and video in progress, and today's journal prompt; everything fits one column.

## Lingua 2.0-2: adding and editing, PDFs, news, dictionaries

- [ ] Tap one word, then another while the bubble is still open: each shows its own translation.
- [ ] Codex → + : Write / File / News / Goodreads fit on one line; the keyboard only opens when you
      tap the text box.
- [ ] File: a PDF from Files becomes a book with chapters; a scanned PDF says it has no text.
- [ ] News: the Latest list loads; tapping a story adds it and opens it; a link to an article
      shows a preview with its level first.
- [ ] A book's ⋯ → Edit: change the level, edit a chapter's text, remove one, add one; the reader
      shows the change.
- [ ] Words in a sentence: "perro" reads "dog" (not a long dictionary line); a word written with
      its pronouns ("dímelo") or a case ending still gets a meaning.
- [ ] Sonus → Discover: podcast rows fit the width. Ratio → All your languages: one line per
      language. Visio: the video's position bar is easy to drag with a finger.
- [ ] Ordo → About says Lingua 2.0.

## Lingua 2.0-3: Ordo

- [ ] Ordo opens on two short lists (Your learning, Lingua) with a line under each group; tapping
      one opens it as its own page, and Back returns to the list.
- [ ] Search "dark", "backup" or "key": tapping a result opens the right page and the setting
      glows briefly.
- [ ] A missing AI key's "Open Ordo" button lands on AI and translation.
- [ ] Everything fits the width in Paper and Nocturne; nothing scrolls sideways.

## Lingua 2.0-4: Cantus

- [ ] The tab bar has six tabs and every label fits; Cantus is rose when chosen.
- [ ] Cantus › search "Natalia Lafourcade": tap the artwork for the preview; tap a song: it opens
      full screen with the lyrics and the album's colour.
- [ ] Start, then − and +: the current line moves with the timer and stays a little above the
      middle; scroll away and "Back to the song" appears.
- [ ] Translate every line; switch English / Blurred / Hidden; a blurred line clears when tapped.
- [ ] Tap a word: its bubble. Tap a line's English: From here · Save line · Copy. A saved line
      shows a mark and a card in "From Cantus".
- [ ] Paste a YouTube link for the song (⋯ › Add a link): the video plays and the lyrics follow;
      the card of a saved line plays its line.
- [ ] Song games: fill in the lyric, put lines in order, the score at the end.
- [ ] Ordo › Music: the Spotify steps; with your own Client ID, Connect returns to Cantus with your
      liked songs in the language.
- [ ] Home shows a song for today once a song is saved.

## Lingua 2.0-4b: music in Sonus, Apple Music

- [ ] The tab bar has five tabs again; Sonus opens on Music, with Library and Podcasts beside it.
- [ ] An old Cantus link (or a bookmark) opens the song in Sonus.
- [ ] A song from the charts: the dock shows "Play in Apple Music"; it opens the Music app on the
      song. Play it there, come back: "Tap the line you're hearing" waits; tap the line being
      sung and the lyrics run on from there.
- [ ] The target button turns line tapping on and off; − and + still nudge.
- [ ] A song LRCLIB lacks: the lyrics come from lyrics.ovh (credit under them), or "On Genius"
      opens Genius's search; copy the words, ⋯ › Find other lyrics › Paste them yourself.
- [ ] Podcasts: followed podcasts, then Find podcasts below; ＋ Add › Find a podcast lands there.
- [ ] On an iPad or Mac: Apple Music's player in the song page; pressing its Play starts the
      lyrics, pressing again pauses them; its artwork opens the song in Apple Music without pausing.

## Lingua 3.0-2: Liquid Glass, themes, commute

- [ ] Tab bar: glass capsule over content, lens slides and stretches between tabs, follows a drag
      along the bar and settles on the nearest tab; no lens on Ordo or Ratio.
- [ ] Settings › Accessibility › Reduce Transparency: the bar turns solid. Reduce Motion: the lens
      jumps instead of sliding.
- [ ] Look and feel: each of the twelve themes; the status bar follows the page colour after reopening.
- [ ] Commute mode: the moon/sun button switches Paper and Nocturne; the phone button keeps the
      screen on.
- [ ] Sonus and Thesaurus: the section bar fits the width, nothing scrolls sideways.

## Lingua 3.0-3: Sonus and music

- [ ] Sonus opens on Library: recently played, your songs, podcasts you follow, new episodes.
- [ ] Music: the styles sit right under the search; one tap searches that style.
- [ ] A song page: nothing moves but the lyrics; the header, song and player stay put, and the
      lyrics scroll between them without the page bouncing.
- [ ] "Playing Apple's preview" plays straight away; the first time, tap the line you hear and
      the lyrics run on from there (and next time they start in the right place).
- [ ] Hold a word in the lyrics, then slide across a few more: the phrase lights up and its
      translation appears (save as a card, copy). The same in a podcast transcript and over a
      video's subtitles (the video waits while you choose).
- [ ] A song with plain (untimed) lyrics: they scroll gently with the music; a tap on a line
      puts them right.
- [ ] An open podcast: the player stays, only the transcript scrolls.
- [ ] Learn it: words first, the song last; at the end, "Add N words to your cards", then the
      cards show in Thesaurus with the sung line.

## Lingua 3.0-4: voices and your devices

- [ ] With a Gemini key: Ordo › Languages › Voice names a Gemini voice and the flag's accent;
      "Hear a sample" plays (the first time after a moment, then at once).
- [ ] Change the flag (Spain → Mexico): the voice changes accent; "Choose another voice" lists
      voices to hear and pick.
- [ ] The speaker in the word drawer, the phrase bubble and on a flashcard plays on the first tap
      (the phone allows it), and a word heard before plays offline.
- [ ] Without a key: an Enhanced or Premium iOS voice for that accent reads aloud (Settings ›
      Accessibility › Spoken Content › Voices to download one); with none, no speaker buttons.
- [ ] Pair with the desktop app: the desktop shows the code; the iPhone scans it with the camera
      (allow the camera), or types it. Both say they're paired and synced.
- [ ] Mark a word on the iPhone, open the desktop app: it's there within a moment ("Sync now"
      too). Try once on Wi-Fi and once on mobile data.
- [ ] Restoring a backup on a third device doesn't pair it: pairings never travel in backups.

## Lingua 3.0-5: Radio

- [ ] Sonus shows four tabs (Library · Music · Podcasts · Radio) on one line.
- [ ] Radio: the map draws the world in faint dots and the language's stations as lights; a tap on
      a light lists that place's stations; "World" and "Closer" switch the view.
- [ ] A station plays on the first tap; the mini player says "Live"; the lock screen shows the
      station (and the song, when it shares one) with play and pause.
- [ ] With the screen locked, the station keeps playing; after a pause of a minute, play starts
      from what's live now.
- [ ] The heart keeps a station: it shows under "Your stations" and in Library, and on the other
      paired device after a sync.
- [ ] A country chip and a search ("jazz") list their stations.

## Lingua 3.0-6, part 1: Radio and Music

- [ ] Radio: the map shows the countries in the app's colours; drag it, pinch to zoom, double-tap
      to zoom in. It follows light and dark (Ordo › Look).
- [ ] Tap a country's node: the map flies to it and its stations show under the map. A node with a
      white ring holds several countries: a tap flies in until they part.
- [ ] Zoomed in, towns glow; a tap lists that town's stations.
- [ ] Play a station, then tap the mini player: the station opens full screen; the arrow closes it.
- [ ] Live text without a Groq key: it turns itself off and says where to add one. With a key: lines
      appear about fifteen seconds after they're said; tap a word for its meaning.
- [ ] The bike button opens commute mode: previous and next go through your stations; Save and Live
      text work with big buttons.
- [ ] Library › Recently played shows the station with "Live"; a tap plays it and opens it.
- [ ] Music: no "Songs you love" card. Explore today shows songs; the round button plays 30 seconds
      (Sonus pauses); the shuffle button brings other songs; "Surprise me" opens one.
- [ ] Open three songs twice each (a minute apart): "Most played by you" appears with the counts.
