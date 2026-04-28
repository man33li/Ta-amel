# MindForge State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-28)
Stack & conventions: `/CLAUDE.md` at the repo root.

**Core value:** Local-first notes that survive subscription churn, with semantic recall and a memory-palace for finding things by where you put them.
**Current focus:** v3.0 — all open follow-ups (1–7) shipped on `feat/v3.0-local-first` and force-pushed to `main`.

## Current Position

Phase: v3.0 + all follow-ups shipped; awaiting user merge + first real local run
Plan: `.planning/milestones/v3.0-LOCAL-FIRST.md`
Status: 18 commits on `feat/v3.0-local-first`, also live on `main` (force-pushed 2026-04-28)
Last activity: 2026-04-28 — SQLCipher integration via better-sqlite3-multiple-ciphers

## Progress

```
v1.0: ██████████ 100% ✓ SHIPPED            (2026-01-27)
v2.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v2.0-palace-memory)
v3.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v3.0-local-first)
v3.1: ██████████ 100% ✓ FOLLOW-UPS SHIPPED (2026-04-28, on feat/v3.0-local-first / main)
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

### Pending Todos

None on the v3.0 follow-up list — all seven priorities shipped. Future work is whatever surfaces from real local use.

### Blockers / Concerns

- User has not yet pulled and run v3.0 locally — `better-sqlite3-multiple-ciphers` Windows native build verified during dev (smoke test + 8 encryption tests pass), but not under Next.js production runtime yet.

### Tech Debt Backlog

Carried from v1.0/v2.0 and still open:
- TiptapEditor test coverage at 67.74% (jsdom limitations).
- Note-edit page kept its own fetch loop instead of going through `useNotes` (debounce constraint).

## Session Continuity

Last session: 2026-04-28
Stopped at: All seven v3.0 follow-ups shipped, including SQLCipher; pushed to `main`
Resume file: `/CLAUDE.md` (loaded automatically) + this file

---
*State updated: 2026-04-28 after SQLCipher integration*
