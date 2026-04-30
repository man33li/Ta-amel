# MindForge — context for Claude

This file is loaded into Claude Code on session start. Read it before doing anything; it captures decisions you can't reconstruct from code alone.

## What this is

A local-first personal note app. Rich text editing (Tiptap), a memory-palace navigation (wings → rooms → cards), and semantic recall over your own notes. Runs entirely on the user's machine — no Supabase, no OpenAI, no Vercel, no recurring bills.

GitHub: `man33li/Ta-amel`. Default branch is `main` (force-pushed 2026-04-28). The current line of work lives on `feat/v3.0-local-first`.

## Tech stack (v3.0 + v3.1)

- **Framework:** Next.js 16 (App Router) on React 19
- **Database:** SQLite via **`better-sqlite3-multiple-ciphers`** with SQLCipher v4 encryption. The user's passphrase is the AES-256 key. One file. Default `./data/mindforge.db`; override via `MINDFORGE_DB_PATH` or `MINDFORGE_DATA_DIR`. Set `MINDFORGE_DISABLE_ENCRYPTION=1` for plaintext (tests use this).
- **Embeddings:** `@xenova/transformers` running `Xenova/all-MiniLM-L6-v2` in-process (~25 MB ONNX, downloaded once). 384-dim. Set `MINDFORGE_EMBEDDINGS_DISABLED=1` to skip.
- **Vector search:** `card_embeddings` BLOB column + JS cosine. Single-user → bounded set → no index needed.
- **Hybrid retrieval:** semantic + keyword (SQLite LIKE) + recency, merged via Reciprocal Rank Fusion (k=60) in `src/lib/memory/merge.ts`.
- **Auth:** single-user passphrase. In production the passphrase IS the SQLCipher key — wrong passphrase = the DB doesn't open at all. Bcrypt hash in `settings` is defence-in-depth and the test-mode fallback (when encryption is disabled). `iron-session` cookie marks per-browser sessions. `/setup` on first run, `/login` after.
- **Editor:** Tiptap 3.
- **Styling:** Tailwind 4.
- **Testing:** Vitest + React Testing Library + jsdom. Fetch mocked in `src/__tests__/setup.ts` (which also sets `MINDFORGE_DISABLE_ENCRYPTION=1` so existing tests keep using plaintext :memory:).

## Architecture map

```
migrations/                       SQL files; applied idempotently on first DB open
src/
  app/
    (auth)/{login,setup}/         Public pages
    (main)/                       Layout enforces session; everything inside is gated
      layout.tsx                  Server-rendered auth gate (redirect to /setup or /login)
      page.tsx                    Notes grid (home)
      palace/page.tsx             Three-pane wings → rooms → cards
      notes/[id]/page.tsx         Single-note editor (debounced auto-save)
    api/
      auth/{setup,login,logout,session}/route.ts
      cards/{,[id]}/route.ts      CRUD over cards
      wings/{,[id]}/route.ts      CRUD over wings
      rooms/{,[id]}/route.ts      CRUD over rooms
      memory/{sync,search}/route.ts
    layout.tsx, error.tsx, not-found.tsx, globals.css
  components/
    notes/                        TiptapEditor, NoteCard
    palace/                       WingList, RoomList, CardList, PalaceSearch
    providers/                    ThemeProvider, ToastProvider
    ui/                           Header, ThemeToggle, Spinner
  lib/
    auth/                         passphrase.ts, session.ts, guard.ts
    db/                           sqlite.ts (singleton + migrator), repo.ts (typed CRUD)
    embed/embedder.ts             Lazy-loaded transformers.js pipeline
    hooks/                        useNotes, usePalace (fetch-based)
    memory/                       store.ts (embed+cosine), merge.ts (RRF)
    utils.ts                      cn, extractTextFromTiptap
  stores/useAppStore.ts           Zustand: theme, accentColor, active wing/room/note
  types/index.ts                  Card, Wing, Room, SearchHit, Database
  __tests__/                      Mirror src/ tree; setup.ts mocks fetch + next/{nav,headers}
.planning/                        Project history, milestone docs (read these for "why")
```

## Conventions (match these — don't rewrite them)

- No emojis in code, commits, or docs unless the user asks.
- Comments only when the WHY is non-obvious (a constraint, an invariant, a workaround). Don't restate WHAT the code does.
- No multi-paragraph docstrings. One short line max.
- Don't add error handling for impossible cases. Trust internal calls; validate at system boundaries (HTTP body, env vars).
- Optimistic updates with rollback in CRUD hooks (mirror `useNotes`/`usePalace` patterns exactly).
- `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` on every API route — `better-sqlite3` and `iron-session` need Node.
- `requireAuth()` at the top of every API route except `/api/auth/*`.
- API responses: success → `{ ok: true, ... }` or domain object (`{ card }`); failure → `{ ok: false, error: '<snake_case>' }` with appropriate status.

## Verify before claiming done

```bash
npx tsc --noEmit          # types
npx eslint .              # 0 errors expected
npx vitest run            # currently 294 passing
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build
```

If you can't reach Google Fonts (sandbox / offline), the `NEXT_TURBOPACK…` env var lets the build proceed. Without it the build fails on font fetch — that's an environment issue, not a code regression.

## Where data lives

- **Notes, wings, rooms, embeddings:** Encrypted SQLite at the path resolved by `src/lib/db/sqlite.ts:resolveDbPath`. The on-disk file is opaque without the user's passphrase.
- **Bcrypt hash & iron-session secret:** `settings` table inside the same encrypted file.
- **Embedder model:** transformers.js cache (`~/.cache/huggingface` on Linux/Mac, `%LOCALAPPDATA%\huggingface\hub` on Windows). First card edit downloads ~25 MB.

## Auth lifecycle (encrypted DB nuances)

- **Cold start:** the DB is locked. `/api/auth/session GET` short-circuits to `{ authenticated: false }` without trying to read settings. Any other authenticated route returns 401 (`requireAuth()` checks `isDbUnlocked()` first).
- **Login:** `verifyPassphrase` calls `unlockDb(passphrase)`. SQLCipher rejects the wrong key with `SQLITE_NOTADB`, which the helper turns into a `false` return.
- **After login:** the unlocked handle is cached on `globalThis.__mindforge_db_cached` (NOT a module-local `let`) for the rest of the process lifetime. All requests share it. The `globalThis` backing is load-bearing in dev mode: Next.js 16 / Turbopack instantiates a fresh copy of `src/lib/db/sqlite.ts` per route bundle on first compile, which would reset a module-local cache to `null` and force a redirect to `/login` for every newly-compiled segment. **Don't refactor it back to `let cached`.**
- **Logout:** clears the iron-session cookie but does NOT lock the DB — other open tabs may still need it. Process restart is the way to fully relock.

## Milestones

| Tag | Status | Branch | Summary |
|---|---|---|---|
| v1.0 | shipped 2026-01-27 | merged | Cloud-backed: Supabase auth + Postgres, Tiptap, Vercel. 114 tests, 89% coverage. |
| v2.0 | implemented 2026-04-27 | `feat/v2.0-palace-memory` | mem0ai memory layer + wings/rooms/cards palace UX. Still cloud-backed. |
| v3.0 | implemented 2026-04-27 | `feat/v3.0-local-first` | Drops Supabase, OpenAI, Vercel. SQLite + local embeddings + passphrase auth. |
| v3.1 | shipped 2026-04-28 | `feat/v3.0-local-first` | All v3.0 follow-ups: server test coverage, session-race fix, lock confirm, Dockerfile, export/import, SQLCipher at rest, rekey UI, setup-page recovery warning, README rewrite. |
| v3.1.x | in progress 2026-04-29 | `feat/v3.0-local-first` (uncommitted) | Cold-start auth fix, Next externalization, Node-20 engines pin, locked-DB short-circuit tests, **dev-mode globalThis singleton fix**. 294 tests passing. |

v3.0 milestone notes live in `.planning/milestones/v3.0-LOCAL-FIRST.md`.

## Open work for next session — checkpoint 2026-04-29

User is mid-way through the **first real local run** of v3.1 on `npm run dev` (Windows 11). They got past `/login`, navigated `/`, and confirmed `/palace` and `/settings` no longer bounce to login after the dev-mode singleton fix.

**Working tree (uncommitted):**
- `M CLAUDE.md` — this file
- `M package.json` — added `"engines": { "node": ">=20.0.0" }` (Next 16 dropped Node 18)
- `M src/lib/db/sqlite.ts` — singleton now backed by `globalThis.__mindforge_db_cached` (see Auth-lifecycle section)
- `M src/__tests__/api/auth-session.test.ts` — added locked-DB cold-start test
- `?? src/__tests__/lib/auth-guard.test.ts` — new file, 2 tests for `requireAuth` locked-DB and unauth paths
- `M .planning/{PROJECT,MILESTONES,CHANGELOG,.continue-here}.md` — brought current
- `?? .planning/SMOKE-TEST.md` — new, **the test plan the user is working through**

**Recent committed-but-unpushed fixes** on `feat/v3.0-local-first`:
- `04df435` fix(auth): handle locked DB cold-start and stale RSC cache after login
- `4f6a86b` fix(next): externalize SQLite native addons and surface unlockDb errors

**Resume protocol:**
1. Ask the user where they are in `.planning/SMOKE-TEST.md`. The file is sectioned 1-10; tick boxes track progress.
2. If a step in the smoke test failed, ask for the dev-server log + browser console for that step. Diagnose, fix, ask them to retry.
3. When sections 1-9 are all green, prompt the user to commit (single commit covering test+config + a docs commit covering `.planning/*.md` reads cleanly) and push. Per Don't-do-without-permission rules, ask for the PAT before pushing.
4. Section 10 (build + production / Docker) is optional and can be deferred until after merge to `main`.

**Do not** refactor the `globalThis` singleton in `sqlite.ts` back to a module-local `let` — see the Auth lifecycle section. That was the root cause of "logged in but `/palace` redirects to `/login`" reported on 2026-04-29.

## Things explicitly out of scope

- Multi-user / family share — local-first answer is "second instance on a second device".
- Sync between devices — genuinely hard, not free.
- Mobile-optimized palace view.
- Migration from v1/v2 Supabase data — user picked "fresh start".
- Bypassing commit signing or git remote auth secrets — never proactively.

## Don't do these without explicit permission

- Push to `man33li/Ta-amel`. Sandbox can't authenticate; if asked to push, ask the user for a fresh fine-grained PAT (Contents: Read+write, 1 hour) and remind them to revoke it immediately after.
- Bypass commit signing. The sandbox's signing service is broken; signing failures are environmental. Only bypass with `-c commit.gpgsign=false` after the user explicitly authorizes it.
- Add subscription-based services. The whole point of v3.0 was eliminating them.
