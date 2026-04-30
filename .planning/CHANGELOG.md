# MindForge Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [3.3.0] - 2026-04-30 — AI Memory Layer

### Added
- **BM25 keyword scoring** — replaces SQL `LIKE` with full Okapi BM25 (K1=1.5, B=0.75, RSJ-IDF) computed in-process per query. `src/lib/memory/bm25.ts`, wired into `/api/memory/search` (`03c4960`).
- **Continuous time-decay in RRF** — freshness multiplier `exp(-LN2 * ageDays / 90)` replaces the prior step-function recency lane (`03c4960`).
- **Zettelkasten `[[card-id]]` cross-references** — parsed on every save, persisted to `card_links`. Backlinks panel + Copy `[[link]]` affordance on every note. `src/lib/links.ts`, `/api/cards/[id]/links` GET (`4075811`).
- **Entity extraction** — compromise.js pulls people / places / orgs / topics from card body + title. Topic extraction supplements `topics()` with multi-mention nouns and multi-word noun phrases. `src/lib/entities.ts` (`3040b62`).
- **Auto-tags + manual tag UI** — top topics persist as auto-tags; `TagChips` component on the note page differentiates auto vs user tags and supports add/remove. `card_tags` PK is `(card_id, tag, source)` so an auto and a user tag with the same name coexist (`3040b62`).
- **Temporal knowledge graph** — every pair of entities mentioned in the same card becomes a `co-occurs` edge in `entity_relations`. `/api/entities` and `/api/entities/[id]` plus a `/palace/entities` browser. Source-card delete cascades the derived edges (`3c39dbc`).
- **Optional Ollama bridge** — off by default. Settings UI exposes endpoint, model, and a Test connection button. `/api/llm/summarize` (cardId or text in, summary out), `/api/llm/rerank` (query + items in, reordered items out). `Summarize` button on the note page renders the result inline. `/api/llm/*` returns 503 `llm_disabled` when the toggle is off (`c6097e3`).
- **MCP stdio server** — `bin/mindforge-mcp.ts` opens the encrypted DB in-process and registers seven tools (`list_wings`, `list_rooms`, `list_cards`, `search_cards`, `get_card`, `create_card`, `update_card`). Run via `npm run mcp` with `MINDFORGE_PASSPHRASE` set. Smoke test boots the server, sends `initialize` + `tools/list`, asserts the protocol round-trips (`c0534ac`).

### Schema (`migrations/0002_ai_memory.sql`)
- New tables: `card_tags`, `card_links`, `entities`, `card_entities`, `entity_relations`. All idempotent, all FK-cascading from `cards`.

### Tests
- 294 → 339 passing across 44 files. New test files: `bm25.test.ts`, `links.test.ts`, `entities.test.ts`, `kg.test.ts`, `llm.test.ts`, `bin/mcp-server.test.ts`.

### Dependencies
- `+@modelcontextprotocol/sdk` (^1.29.0) for the MCP server.
- `+compromise` (^14.15.0) for entity extraction.
- `+tsx` (devDep) so `npm run mcp` can execute the TypeScript bin.

### Verified
- 2026-04-30: `tsc --noEmit` clean, `eslint .` clean, `vitest run` 339/339, `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build` exit 0 with 30 dynamic routes. User waived smoke-test pass.

---

## [Unreleased]

(empty — last unreleased batch shipped as v3.3.0)

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
