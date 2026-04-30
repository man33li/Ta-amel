# MindForge State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-28)
Stack & conventions: `/CLAUDE.md` at the repo root.

**Core value:** Local-first notes that survive subscription churn, with semantic recall and a memory-palace for finding things by where you put them.
**Current focus:** v3.1 shipped to `main` + annotated tag `v3.1` published. Awaiting next idea.

## Current Position

Phase: v3.1 shipped (2026-04-30)
Plan: `.planning/milestones/v3.0-LOCAL-FIRST.md` — closed
Status: `origin/main` and `origin/feat/v3.0-local-first` both at `12c5ca3`; tag `v3.1` (object `af45008`) on origin
Last activity: 2026-04-30 — FF-merged feat branch into `main`, created annotated tag, pushed all refs.

## Progress

```
v1.0: ██████████ 100% ✓ SHIPPED            (2026-01-27)
v2.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v2.0-palace-memory)
v3.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v3.0-local-first)
v3.1: ██████████ 100% ✓ FOLLOW-UPS + REKEY (2026-04-28, on feat/v3.0-local-first)
v3.1 smoke: █████████░  90% — §1-9 green, §10 build verified, §10.3 Docker deferred (non-blocking)
v3.1 ship:  ██████████ 100% ✓ TAGGED + PUSHED        (2026-04-30, tag v3.1 -> 12c5ca3)
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

None mandatory. Optional follow-ups:
- §10.3 Docker check when Docker Desktop daemon is up.
- Promote `v3.1` annotated tag to a GitHub Release page (needs release-scope PAT).

### Blockers / Concerns

None. Pre-existing constraints (per-session PAT for pushes, unsigned commits) still apply.

### Tech Debt Backlog

Carried from v1.0/v2.0 and still open:
- TiptapEditor test coverage at 67.74% (jsdom limitations).
- Note-edit page kept its own fetch loop instead of going through `useNotes` (debounce constraint).

## Session Continuity

Last session: 2026-04-30
Stopped at: v3.1 shipped — `origin/main` + `origin/feat/v3.0-local-first` at `12c5ca3`, tag `v3.1` (object `af45008`) published. No active backlog.
Resume file: `/CLAUDE.md` (loaded automatically) + this file

---
*State updated: 2026-04-30 after v3.1 ship (FF-merge to main + annotated tag + push)*
