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

**What's next:** v3.3 (AI memory layer) followed.

---

## v3.3 AI Memory Layer (Shipped: 2026-04-30)

**Delivered:** Eight features split across hybrid-retrieval polish, an entity / knowledge-graph layer, and external integrations. All local-first — no new cloud dependencies.

**T1 — hybrid retrieval polish:**
- BM25 keyword lane replaces SQL `LIKE` (Okapi, K1=1.5, B=0.75, RSJ-IDF). Computed in-process per query over the full bounded corpus.
- Continuous freshness multiplier `exp(-LN2 * ageDays / 90)` applied to RRF, replacing the prior step-function recency lane.
- Zettelkasten `[[card-id]]` cross-references parsed on save; backlinks panel + "Copy [[link]]" affordance on every note.

**T2 — entity & graph layer:**
- compromise.js extracts people / places / orgs / topics from card body + title; topic extraction supplements `topics()` with multi-mention nouns and multi-word noun phrases so "machine learning" and a repeated bare noun like "Acme" both bubble up.
- Top topics persist as auto-tags; manual `TagChips` UI on the note page distinguishes auto vs user tags. PK is `(card_id, tag, source)` so an auto and a user tag with the same name coexist.
- Co-occurrence relations form a heuristic temporal knowledge graph (`entity_relations` table). Source-card delete cascades the derived knowledge.
- `/palace/entities` browser lets the user filter by type, click an entity, and walk the neighbor graph or jump to source cards.

**T3 — external integrations:**
- Optional Ollama bridge for `summarize` and `rerank`, off by default. `/api/llm/*` routes return 503 `llm_disabled` when the toggle is off; nothing in the rest of the app calls Ollama. Settings UI exposes endpoint, model, and a Test connection button.
- `bin/mindforge-mcp.ts` is a stdio MCP server that opens the encrypted DB in-process and registers seven tools: `list_wings`, `list_rooms`, `list_cards`, `search_cards`, `get_card`, `create_card`, `update_card`. Smoke-tested with a tmp DB and a real protocol round-trip.

**Verification (2026-04-30):**
- `tsc --noEmit` clean, `eslint .` clean, `vitest run` 339/339 passing across 44 files (added BM25, links, entities, KG, LLM, and MCP test files), `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build` exit 0 with 30 dynamic routes.
- User waived smoke-test pass for v3.3 ("Assume all passed"), mirroring the v3.1 ship flow.

**Schema (`migrations/0002_ai_memory.sql`):** new tables `card_tags`, `card_links`, `entities`, `card_entities`, `entity_relations`. All idempotent, all FK-cascading from `cards`.

**Commits on `feat/v3.3-ai-memory`:**
- `081d6bb` deps + schema
- `03c4960` BM25 + time-decay
- `4075811` `[[card-id]]` cross-references
- `3040b62` entity extraction + auto-tags + tag chips
- `3c39dbc` temporal knowledge graph + entities browser
- `c6097e3` Ollama bridge
- `c0534ac` MCP server

**Branch:** `feat/v3.3-ai-memory` and `main` both at `c0534ac` on origin.
**Status:** v3.3 shipped 2026-04-30. Tag `v3.3` published.

**What's next:** No active backlog. Real-world soak before deciding which v3.3 surfaces need polish (entity-merge UI, BM25 tuning, summarize prompt tuning, MCP tool gaps). Future direction goes through `/gsd-new-milestone`.
