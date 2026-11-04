# Lingua

**Current scheduling · 2026-11-04:** [Lingua 6.1](docs/LINGUA-6.1-PLAN.md) consolidates all unfinished Lingua 6/7 features and design work and is **WAITING, not started**. Older “continue/claim next” instructions below are historical until the user explicitly resumes. The user is focusing on [Lemora 1.1](https://github.com/sanchour/lemora/blob/main/docs/LEMORA-1.1-PLAN.md); reusable improvements may later [return to Lingua](docs/LEMORA-INTEGRATION.md). No implementation or reintegration is authorised by this planning checkpoint.

A calm, local-first language-learning studio: an interactive reader (Codex), flashcards and
exercises (Thesaurus), audio with transcripts (Sonus), dual-subtitle video (Visio), stats (Ratio)
and settings (Ordo). Installs as an app on Windows and iPhone from one URL. Russian and Greek have
full support.

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

- Working on it from another computer (and with Claude): [docs/SETUP.md](docs/SETUP.md), [CLAUDE.md](CLAUDE.md)
- The plan, now Lingua 3.0 (twenty languages, a phone-first look with themes, a working music
  room, natural voices and sync, Grammatica with alphabets and writing, radio, Mundus, comics,
  audiobooks and AI conversation): [docs/ROADMAP.md](docs/ROADMAP.md)
- Architecture, data schema and phase plan: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 60 fps budget and rules: [docs/PERFORMANCE.md](docs/PERFORMANCE.md)
- Decisions: [docs/DECISIONS.md](docs/DECISIONS.md)
- Putting it on your iPhone: [docs/DEPLOY.md](docs/DEPLOY.md), then [docs/QA-ios.md](docs/QA-ios.md)
