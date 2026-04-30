# MindForge Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Fixed
- Cold-start auth flow: `(main)` layout redirects to `/login` when the DB is locked instead of crashing on `getSession`; login page calls `router.refresh()` to clear stale RSC cache (`04df435`, 2026-04-29).
- Next.js bundling: externalize `better-sqlite3-multiple-ciphers` and `better-sqlite3` from server bundles via `serverExternalPackages`; `unlockDb` now surfaces native errors via `console.error` instead of swallowing (`4f6a86b`, 2026-04-29).
- Dev-mode auth: `globalThis.__mindforge_db_cached` backs the singleton so Turbopack route-bundle re-instantiation no longer drops the unlocked handle (`af83d60`, 2026-04-30).

### Tests
- Added coverage for the locked-DB cold-start short-circuit in `GET /api/auth/session` and `requireAuth` (291 → 294 passing).

### Verified
- 2026-04-30: smoke-test §1-9 green per user; baselines re-confirmed locally — `tsc --noEmit` clean, `eslint .` clean, `vitest run` 294/294, `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build` clean (Next 16.1.4 / Turbopack, 22 dynamic routes).

---

## [3.1.0] - 2026-04-28 — Local-First Polish

### Added
- SQLCipher v4 encryption at rest via `better-sqlite3-multiple-ciphers`; passphrase doubles as the AES-256 key. `MINDFORGE_DISABLE_ENCRYPTION=1` for tests/plaintext.
- Backup and restore via `/api/export` and `/api/import` + `/settings` UI.
- One-command Docker deploy (`Dockerfile`, `output: "standalone"`).
- Rekey UI in `/settings` backed by `POST /api/auth/rekey`. Verifies current passphrase via bcrypt (the cached encrypted handle short-circuits `unlockDb`), drops to DELETE journal mode for `PRAGMA rekey`, restores WAL.
- Setup page warns the passphrase is the encryption key and there is no recovery.
- Two-click lock confirmation before logging out.

### Changed
- README rewritten to cover SQLCipher, /settings, export/import, env vars, and Docker.
- Test count: 114 → 291 passing across server-side auth, repo, embedder, memory, and API routes.

### Fixed
- Session-secret race in `getSessionPassword` (`812c84a`).

---

## [3.0.0] - 2026-04-27 — Local-First

### Added
- SQLite database via `better-sqlite3` (one file at `./data/mindforge.db`, configurable via `MINDFORGE_DB_PATH`/`MINDFORGE_DATA_DIR`).
- Local embeddings via `@xenova/transformers` running `Xenova/all-MiniLM-L6-v2` (~25 MB ONNX, 384-dim).
- Custom memory store: embed → upsert → cosine top-K with RRF over semantic + keyword + recency.
- Single-user passphrase auth: bcrypt hash in `settings`, `iron-session` cookie.
- Server-only API routes for cards/wings/rooms/auth/memory (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`).
- `/setup` first-run flow.

### Removed
- `@supabase/ssr`, `@supabase/supabase-js`, `mem0ai`.
- Vercel deployment config, Supabase middleware, Supabase migrations, OAuth callback, signup page.

### Decided
- No knowledge graph, no LLM rerank, no auto-tag — earn complexity with usage data.
- Fresh start, no v1/v2 Supabase data migration.

**Anchor:** `c314027` on branch `feat/v3.0-local-first`.

---

## [2.0.0] - 2026-04-27 — AI Memory + Palace UX

### Added
- Wings (top-level) and rooms (topics) for grouping cards.
- `/palace` page with three-pane wings → rooms → cards navigation.
- Card moves between rooms from the card itself.
- Hybrid retrieval (semantic + keyword + recency) merged via Reciprocal Rank Fusion (k=60).
- Fire-and-forget memory sync on edit; graceful degradation when embedder is disabled.
- mem0ai-backed memory layer (replaced in v3.0 by a local custom store).

**Anchor:** `839b11f` on branch `feat/v2.0-palace-memory`.

---

## [1.0.0] - 2026-01-27 — Production Ready

### Added
- 114 tests, 89.41% statement coverage (Vitest + RTL).
- Error boundary (`error.tsx`) and auth middleware redirect to `/login`.
- Optimistic updates with server-error rollback in `useNotes`.
- Loading spinners on auth and notes pages, retry button on note errors.
- Keyboard-accessible focus styles on toolbar buttons and `NoteCard`.
- Vercel deployment at https://mindforge-eight.vercel.app, env-var docs, `vercel.json`.

**Range:** `aa04797` → `ec7d06e`.

---

## [0.1.0] - 2026-01-26

### Added
- Initial Next.js project with TypeScript and Tailwind CSS.
- Supabase integration with SSR support.
- Authentication system (email/password + Google OAuth).
- Notes CRUD via `useNotes` hook.
- Tiptap rich text editor.
- Theme system with dark/light mode (Zustand + localStorage).
- Vitest + React Testing Library.
