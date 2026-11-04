# Lemora and Lingua · Selective return of shared work

**2026-11-04 · PLANNED / WAITING.** Lemora is the user's separate reading-centred fork of Lingua, not a replacement for the full studio. [Lemora 1.1](https://github.com/sanchour/lemora/blob/main/docs/LEMORA-1.1-PLAN.md) collects relevant unfinished features. All remaining Lingua 6/7 scope is [Lingua 6.1](LINGUA-6.1-PLAN.md), waiting for explicit restart. This document describes a possible return, not an implemented integration or permission to merge now.

## What can return

Codex/reader/importers, Thesaurus/dictionary/decks/phrases, Ludus, Diarium, Atlas, alphabet tools, contextual helpers, core/data/services/workers and suitable design primitives can return as checked `[shared]` commits with their original provenance. Lemora's newer shared room designs may be adopted where they fit all Lingua functionality. Preserve full feature coverage and verify Lingua separately.

Home, onboarding, product flags, routes, branding, icons, manifest, storage namespace and responsive product choices are Lemora's own; evaluate their ideas rather than copying over Lingua's product layer. Lingua retains its course, grammar, audio/video, speaking, culture and other rooms, plus desktop-only implementation rules. No entire branch merge across products.

## Waiting integration sequence

1. After explicit restart, inspect current versions, branch history and actual shared diffs in both repositories. Keep a ledger of feature IDs, source commits, dependencies, conflicts and evidence; avoid redoing already inherited changes.
2. Prepare Lingua's own product seam before importing dependent shared changes: keep its existing database name, keys, cache prefix, brand and all rooms. Scope reset to Lingua data, addressing the extraction audit's same-origin localStorage risk without deleting Lemora data. A shared service must read product identity rather than hard-code Lemora.
3. Inventory storage and schema requirements. Lemora currently forbids independent Dexie versions/dropped tables; coordinate any required schema change explicitly, preserve existing migrations and test backups both ways. Compatibility is a check to perform, not a guarantee from similar table names.
4. On a throwaway Lingua branch/checkout, test a small representative `[shared]` commit (with source SHA), then the intended dependent sequence. Do not copy Lemora-only isolation/navigation commits wholesale. Resolve changes to the same lines while preserving both product intents.
5. Check typecheck/tests/build and actual Lingua room reachability, keyboard/RTL/non-Latin, offline, imports/exports/backup/restore and same-origin reset isolation. Use original performance and handbook gates, and record real-model/native/external limits. A Lemora test pass is not Lingua acceptance.
6. Only publish through Lingua's checked PR workflow when the user authorises that integration. Update features, decisions, architecture, handover and both provenance ledgers with what really returned.

## Source documentation

- [Lemora repository](https://github.com/sanchour/lemora) and [extraction audit](https://github.com/sanchour/lemora/blob/main/docs/EXTRACTION-AUDIT.md).
- [Lemora's reintegration strategy](https://github.com/sanchour/lemora/blob/main/docs/LINGUA-REINTEGRATION.md); its measured feasibility test is still open.
- [Lemora's current plan](https://github.com/sanchour/lemora/blob/main/docs/LEMORA-PLAN.md). Current Phase U work is not automatically stopped or marked complete by planning 1.1.

No files, learner data, commits or runtime behaviour are transferred by creating this plan.
