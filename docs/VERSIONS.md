# Lingua's versions

Lingua is still in alpha, so its version starts with **0** (the user, 2026-10-25). Every push to
`main` gets its own version, checkpoints and claims included, so the app, the commit and the tag
always say which build is live.

## The scheme: `0.<Lingua>.<part>-alpha.<push>`

| Part | Means | Example |
| --- | --- | --- |
| `0` | Alpha: not yet released to the public. It becomes `1` at the first public release, when the user says so. | `0` |
| Lingua | The plan's generation (Lingua 5). | `5` |
| part | The part of that plan being built (5.1, 5.2). | `2` |
| `-alpha.N` | The Nth push in this part, counting every push. | `-alpha.3` |

- `0.5.2-alpha.1`, `0.5.2-alpha.2`, … are the pushes while 5.2 is built.
- When a part's check passes (5.2-10), the suffix goes: **`0.5.2`** is that part, finished and checked.
- The next part starts at `-alpha.1` again: `0.5.3-alpha.1`, or a new Lingua's line.
- **Lingua 7 is built before Lingua 6** (the user, 2026-10-26), and versions only go up: Lingua 7 · Features is
  `0.7.0-alpha.N` (`--line 0.7.0`), then Lingua 6 · Design takes `0.8.0-alpha.N` (`--line 0.8.0`). The names stay.
- **Lingua 5.1** was checked on 2026-10-25 (5.1-5) as 5.1.0; in this scheme it is **`0.5.1`**
  (tagged at that commit). The versions before it (2.0, 3.0, 5.1.0) keep their old numbers in
  the history.

It's ordinary semantic versioning, so tools sort it right: `0.5.2-alpha.9 < 0.5.2 < 0.5.3-alpha.1`.

## Every push

1. `node scripts/version.ts "What this push is"` raises `-alpha.N` by one and writes
   `package.json`, `package-lock.json` and a line at the top of [CHANGELOG.md](../CHANGELOG.md).
   (`--line 0.5.3` starts a new part; `--release` finishes one after its check.)
2. Commit those with the work.
3. `git fetch origin && git rebase origin/main`. If another account pushed a version first, the
   rebase stops on `package.json`: keep origin's files (during a rebase that is
   `git checkout --ours package.json package-lock.json CHANGELOG.md`), run step 1 again, `git add`
   them, and `git rebase --continue`.
4. Tag the commit and push both: `git tag v0.5.2-alpha.3` and
   `git push origin HEAD:main v0.5.2-alpha.3`.

The version shows in Settings › About and in the Lab's reports (`__APP_VERSION__`, from
`package.json`), so the installed app says which push it is running.
