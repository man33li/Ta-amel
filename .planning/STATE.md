# MindForge State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-28)
Stack & conventions: `/CLAUDE.md` at the repo root.

**Core value:** Local-first notes that survive subscription churn, with semantic recall and a memory-palace for finding things by where you put them.
**Current focus:** v3.1 smoke-test sections 1-9 confirmed green by user; merge to `main` + tag pending PAT.

## Current Position

Phase: v3.1 smoke-tested locally on `feat/v3.0-local-first`; awaiting user authorization to merge + tag + push
Plan: `.planning/milestones/v3.0-LOCAL-FIRST.md`
Status: branch up to date with `origin/feat/v3.0-local-first` (HEAD `af83d60`); working tree clean
Last activity: 2026-04-30 — re-baselined `tsc --noEmit` clean, `eslint .` clean, `vitest run` 294/294, `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build` clean (Next 16.1.4 / Turbopack, 22 dynamic routes).

## Progress

```
v1.0: ██████████ 100% ✓ SHIPPED            (2026-01-27)
v2.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v2.0-palace-memory)
v3.0: ██████████ 100% ✓ IMPLEMENTED        (2026-04-27, branch feat/v3.0-local-first)
v3.1: ██████████ 100% ✓ FOLLOW-UPS + REKEY (2026-04-28, on feat/v3.0-local-first)
v3.1 smoke: █████████░  90% — sections 1-9 green; §10 build verified locally; §10 Docker deferred
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

- Merge `feat/v3.0-local-first` -> `main` (user authorization required).
- Tag `v3.1` on `main`.
- Push `main` + tag `v3.1` to `origin` (needs fresh fine-grained PAT, Contents Read+write, 1 hour).
- Optional: walk §10.3 Docker check before tagging.

### Blockers / Concerns

- Sandbox cannot push to `man33li/Ta-amel` without a user-supplied PAT.
- Commit signing in this sandbox is environmental — only bypass with `-c commit.gpgsign=false` after explicit user approval.

### Tech Debt Backlog

Carried from v1.0/v2.0 and still open:
- TiptapEditor test coverage at 67.74% (jsdom limitations).
- Note-edit page kept its own fetch loop instead of going through `useNotes` (debounce constraint).

## Session Continuity

Last session: 2026-04-30
Stopped at: smoke-test §1-9 green + §10 build verified; awaiting user auth to merge `feat/v3.0-local-first` -> `main`, tag v3.1, and push (PAT required)
Resume file: `/CLAUDE.md` (loaded automatically) + this file

---
*State updated: 2026-04-30 after smoke-test pass + production-build re-baseline*
