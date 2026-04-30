# Project Milestones: MindForge

## v1.0 Production Ready (Shipped: 2026-01-27)

**Delivered:** Production-hardened note-taking app with comprehensive testing, bug fixes, polish, and live Vercel deployment.

**Phases completed:** 1-4 (12 plans total)

**Key accomplishments:**
- Comprehensive test suite: 114 tests, 89.41% statement coverage
- Error boundary and auth middleware for protected routes
- Optimistic updates with rollback on server errors
- Loading spinners, error retry buttons, keyboard accessibility
- Live deployment at https://mindforge-eight.vercel.app

**Stats:** 35 files created/modified, 11,227 lines of TypeScript/React, 4 phases, 12 plans, ~25 tasks, 1 day from start to ship.

**Git range:** `aa04797` → `ec7d06e`

---

## v2.0 AI Memory + Palace UX (Implemented: 2026-04-27)

**Delivered:** Memory layer (mem0ai) and memory-palace navigation (wings → rooms → cards) layered on top of v1.0's cloud stack. Implemented but superseded for runtime by v3.0 — kept on `feat/v2.0-palace-memory` for reference.

**Key accomplishments:**
- Wings (top-level) and rooms (topics) for grouping cards
- Three-pane palace at `/palace`: wings → rooms → cards
- Card moves between rooms from the card itself
- Hybrid search: semantic + keyword + recency, ranked via Reciprocal Rank Fusion (RRF)
- Fire-and-forget memory sync on edit (non-blocking)
- Graceful degradation when embedder is disabled

**Branch:** `feat/v2.0-palace-memory`
**Anchor commit:** `839b11f` — `feat(v2.0): mem0 memory backbone + palace UX`

---

## v3.0 Local-First (Implemented: 2026-04-27)

**Delivered:** Same product, zero subscription dependencies. Drops Supabase, OpenAI, and Vercel. Runs end-to-end on the user's machine.

**Stack swap:**
- Database: Supabase Postgres → SQLite (`better-sqlite3`), single file at `./data/mindforge.db`
- Vector store: Supabase pgvector → `card_embeddings` BLOB + JS cosine
- Embeddings: OpenAI `text-embedding-3-small` → `Xenova/all-MiniLM-L6-v2` via `@xenova/transformers` (~25 MB ONNX, 384-dim)
- Memory: `mem0ai/oss` → custom `src/lib/memory/store.ts`
- Auth: Supabase Auth → single-user passphrase + `iron-session` cookie + bcrypt hash
- Hosting: Vercel → `npm start` on user's machine

**Branch:** `feat/v3.0-local-first`
**Anchor commit:** `c314027` — `feat(v3.0): local-first stack — drop Supabase, OpenAI, Vercel`
**Detail:** `.planning/milestones/v3.0-LOCAL-FIRST.md`

---

## v3.1 Local-First Polish (Shipped: 2026-04-28)

**Delivered:** All eight v3.0 follow-ups, including encryption-at-rest and rekey UI.

**Key accomplishments:**
- Server-side test coverage on auth, repo, embedder, memory, and API routes (114 → 291 tests passing)
- Session-secret race fixed in `getSessionPassword`
- Lock confirms before logging out (two-click)
- One-command Docker deploy
- Backup and restore via `/api/export` and `/api/import` + `/settings` UI
- SQLCipher v4 encryption at rest via `better-sqlite3-multiple-ciphers` (passphrase = AES-256 key)
- Setup page warns the passphrase is the encryption key with no recovery path
- Rekey UI in `/settings` backed by `POST /api/auth/rekey`
- README rewrite covering SQLCipher, /settings, export/import, `MINDFORGE_DISABLE_ENCRYPTION`, Docker

**Post-merge fixes (2026-04-29):**
- Externalize `better-sqlite3-multiple-ciphers` from Next bundling and surface `unlockDb` errors (`4f6a86b`)
- Handle locked-DB cold start and stale RSC cache after login (`04df435`)

**Dev-mode singleton fix (2026-04-30):**
- `globalThis.__mindforge_db_cached` backing for the unlocked-DB cache so Turbopack route-bundle re-instantiation in `npm run dev` does not drop the handle and bounce authenticated requests to `/login` (`af83d60`).

**Smoke test + ship (2026-04-30):**
- Smoke-test §1-9 confirmed green; §10 production build re-verified locally (Next 16.1.4 / Turbopack, 22 dynamic routes, 6.2s compile).
- Doc commit `12c5ca3` records the smoke-test pass.
- FF-merged `feat/v3.0-local-first` → `main`; annotated tag `v3.1` (tag object `af45008`) covers the local-first stack + SQLCipher + rekey + dev-mode singleton fix.
- All refs pushed to `origin`.

**Branch:** `feat/v3.0-local-first` and `main` both at `12c5ca3` on origin.
**Status:** v3.1 shipped 2026-04-30. Tag `v3.1` published.

**What's next:** No active backlog. §10.3 Docker check still optional. Future direction goes through `/gsd-new-milestone`.
