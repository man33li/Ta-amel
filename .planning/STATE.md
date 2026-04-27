# MindForge State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-27)
Stack & conventions: `/CLAUDE.md` at the repo root.

**Core value:** Local-first notes that survive subscription churn, with semantic recall and a memory-palace for finding things by where you put them.
**Current focus:** v3.0 — local-first stack shipped on `feat/v3.0-local-first`; tightening before merge.

## Current Position

Phase: post-v3.0 implementation, awaiting user merge + run
Plan: `.planning/milestones/v3.0-LOCAL-FIRST.md`
Status: branch pushed, PR not yet opened
Last activity: 2026-04-27 — v3.0 commit `c314027` pushed to GitHub

## Progress

```
v1.0: ██████████ 100% ✓ SHIPPED            (2026-01-27)
v2.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v2.0-palace-memory)
v3.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v3.0-local-first)
```

## Accumulated Context

### Recent Decisions (v3.0)

- Drop Supabase, OpenAI, Vercel. Single-user passphrase, SQLite, local embeddings.
- Single-user mode: keep `user_id` field in types as a fixed `'me'` for forward-compat with the v2.0 shape.
- Embedder: `Xenova/all-MiniLM-L6-v2` (smaller, faster) over `bge-small-en-v1.5`. First-call download ~25 MB.
- No knowledge graph, no LLM rerank, no auto-tag — earn them with usage data.
- `dynamic = 'force-dynamic'` + `runtime = 'nodejs'` on every API route.
- Tiptap content stored as `TEXT` (JSON string) in SQLite; parse on read.
- Fresh start (no v1/v2 data migration); user picked this explicitly.

### Pending Todos (in priority order)

1. Server-side test coverage — auth, repo, embedder, memory store, every `/api/*` route. v2.0 was 89%; v3.0 is below.
2. Fix the session-secret race in `src/lib/auth/session.ts:getSessionPassword`.
3. Add confirmation to the Header Lock button.
4. Update top-level `.planning/PROJECT.md` (this file's neighbour).
5. Dockerfile for home-server deployment.
6. Export/import (SQLite → JSON).
7. Encrypted-at-rest SQLite (sqlcipher).

### Blockers / Concerns

- User has not yet merged `feat/v3.0-local-first` into `master`.
- User has not yet pulled and run v3.0 locally — first real test of `better-sqlite3` Windows native build is still pending.
- The PAT used for the v3.0 push appears identical to the one from v2.0; user was asked to revoke. Status of revocation unknown from sandbox.

### Tech Debt Backlog

Carried from v1.0/v2.0 and not addressed in v3.0:
- TiptapEditor test coverage at 67.74% (jsdom limitations).
- Note-edit page used to duplicate Supabase calls; v3.0 rewrote it but didn't refactor it through `useNotes` (still its own fetch loop because of the debounce).

New v3.0 tech debt:
- No tests for `src/lib/{auth,db,embed,memory/store}.ts` or any new API route.
- Session secret race condition (priority 2 above).

## Session Continuity

Last session: 2026-04-27
Stopped at: v3.0 pushed, user reviewing follow-ups
Resume file: `/CLAUDE.md` (loaded automatically) + this file

---
*State updated: 2026-04-27 after v3.0 push*
