# MindForge State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-28)
Stack & conventions: `/CLAUDE.md` at the repo root.

**Core value:** Local-first notes that survive subscription churn, with semantic recall and a memory-palace for finding things by where you put them.
**Current focus:** v3.3 shipped to `main` + annotated tag `v3.3` published. Awaiting next idea.

## Current Position

Phase: v3.3 shipped (2026-04-30 evening)
Plan: closed; v3.3 commits on `feat/v3.3-ai-memory`, FF-merged into `main`.
Status: `origin/main` at `e9abcd2` (eight feature commits + planning docs on top of v3.1); `origin/feat/v3.3-ai-memory` retained at `c0534ac` for reference; annotated tag `v3.3` on origin pointing at `c0534ac`.
Last activity: 2026-04-30 — shipped v3.3 (T1 hybrid retrieval polish, T2 entity / KG layer, T3 Ollama bridge + MCP server). FF-merged to main, tagged, pushed.

## Progress

```
v1.0:  ██████████ 100% ✓ SHIPPED                (2026-01-27)
v2.0:  ██████████ 100% ✓ IMPLEMENTED            (2026-04-27, branch feat/v2.0-palace-memory)
v3.0:  ██████████ 100% ✓ IMPLEMENTED            (2026-04-27, branch feat/v3.0-local-first)
v3.1:  ██████████ 100% ✓ FOLLOW-UPS + REKEY     (2026-04-28, on feat/v3.0-local-first)
v3.1 ship:  ██████████ 100% ✓ TAGGED + PUSHED   (2026-04-30 morning, tag v3.1 -> 12c5ca3)
v3.3:  ██████████ 100% ✓ AI MEMORY LAYER        (2026-04-30 evening, branch feat/v3.3-ai-memory)
v3.3 ship:  ██████████ 100% ✓ TAGGED + PUSHED   (2026-04-30 evening, tag v3.3 -> c0534ac)
```

## Accumulated Context

### Recent Decisions (v3.3)

- BM25 keyword scoring over a bounded single-user corpus is computed in-process per query; no inverted index at this scale.
- Continuous freshness multiplier `exp(-LN2 * ageDays / 90)` replaced the v2.0 step-function recency lane.
- `[[card-id]]` cross-references store as a directed `card_links` table with FK cascade on card delete.
- compromise.js handles entity extraction; topic detection supplements `topics()` with multi-mention nouns and multi-word noun phrases.
- `card_tags` PK is `(card_id, tag, source)` so an auto-tag and a user-tag with the same name coexist; `removeUserTag` only deletes the user-source row.
- Knowledge-graph relations cascade on card delete (`source_card_id ON DELETE CASCADE`). Deleting a card removes the derived knowledge.
- Local LLM is opt-in. All `/api/llm/*` routes return 503 `llm_disabled` when off; nothing in the rest of the app calls Ollama unless the toggle is on.
- MCP server runs as a separate stdio process spawned by the client (Claude Desktop, etc.); shares the same encrypted DB but does not require Next.js.

### Earlier Decisions (v3.0 / v3.1)

- Drop Supabase, OpenAI, Vercel. Single-user passphrase, SQLite, local embeddings.
- Single-user mode: keep `user_id` field in types as a fixed `'me'` for forward-compat with the v2.0 shape.
- Embedder: `Xenova/all-MiniLM-L6-v2` (smaller, faster). First-call download ~25 MB.
- `dynamic = 'force-dynamic'` + `runtime = 'nodejs'` on every API route.
- Tiptap content stored as `TEXT` (JSON string) in SQLite; parse on read.
- Fresh start (no v1/v2 data migration); user picked this explicitly.
- `globalThis.__mindforge_db_cached` is load-bearing in dev mode (Turbopack instantiates a fresh module per route bundle on first compile). Don't refactor back to a module-local `let cached`.

### Pending Todos

None mandatory. Optional follow-ups:
- Promote `v3.3` annotated tag to a GitHub Release page (needs release-scope PAT).
- Real-world soak: use the app for a week before deciding which v3.3 surfaces need polish (entity-merge UI, BM25 tuning, summarize prompt tuning, MCP tool gaps).
- Optional Docker check from v3.1 §10.3 (still parked).

### Blockers / Concerns

None. Pre-existing constraints (per-session PAT for pushes, unsigned commits) still apply.

### Tech Debt Backlog

Carried from v1.0 / v2.0 and still open:
- TiptapEditor test coverage at 67.74% (jsdom limitations).
- Note-edit page kept its own fetch loop instead of going through `useNotes` (debounce constraint).

New from v3.3:
- Entity extraction relies on compromise.js heuristics; multi-word topic coverage uses a noun-frequency fallback that may surface noise on short notes.
- BM25 stop-word list is minimal (English-only) and computed per query — fine for personal-scale corpora, but flagged here in case the corpus grows.

## Session Continuity

Last session: 2026-04-30
Stopped at: v3.3 shipped — `origin/main` at `e9abcd2`, tag `v3.3` published (-> `c0534ac`). Working tree clean. No active backlog.
Resume file: `/CLAUDE.md` (loaded automatically) + this file + `.planning/.continue-here.md`.

### Verification snapshot at v3.3 ship

- `tsc --noEmit` clean.
- `eslint .` clean.
- `vitest run` 339/339 passing across 44 files.
- `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build` exit 0, 30 dynamic routes generated.
- Smoke test waived by user ("Assume all passed"), mirroring v3.1 ship flow.

---
*State updated: 2026-04-30 after v3.3 ship (FF-merge to main + annotated tag + push)*
