# MindForge

## What This Is

A local-first personal note app. Rich text editing, semantic recall over your own notes, and a memory-palace navigation (wings → rooms → cards). Runs entirely on the user's machine — no Supabase, no OpenAI, no Vercel, no recurring bills.

## Core Value

Notes are saved reliably, recoverable by recall (semantic + keyword + recency), and grouped where the user remembers them. No subscription can pull the rug.

## Current State

**Version:** v3.0 implemented (branch `feat/v3.0-local-first`, commit `c314027`, 2026-04-27). Awaiting user merge + first real local run.

**Tech Stack (v3.0):**
- Next.js 16.1.4 with App Router on React 19
- SQLite via `better-sqlite3` (one file on disk)
- `@xenova/transformers` running `Xenova/all-MiniLM-L6-v2` for in-process embeddings
- `iron-session` cookie + bcrypt-hashed passphrase for single-user auth
- Tiptap 3 editor, Zustand 5 store, Tailwind 4
- Vitest 4 + React Testing Library (104 tests passing)

**Detailed stack reference:** `/CLAUDE.md` at the repo root (loaded automatically by Claude Code).

**Milestones:**
- v1.0 (2026-01-27) — shipped cloud-backed app on Vercel + Supabase
- v2.0 (2026-04-27, `feat/v2.0-palace-memory`) — added mem0ai memory + palace UX, still cloud-backed
- v3.0 (2026-04-27, `feat/v3.0-local-first`) — current direction; dropped all subscription services

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ User can sign up with email/password — existing
- ✓ User can log in and stay logged in across sessions — existing
- ✓ User can sign in with Google OAuth — existing
- ✓ User can create notes with titles — existing
- ✓ User can edit notes with rich text (bold, italic, lists, etc.) — existing
- ✓ Notes auto-save with debouncing — existing
- ✓ User can delete notes — existing
- ✓ User can switch between dark/light theme — existing
- ✓ Theme preference persists across sessions — existing
- ✓ Comprehensive test coverage for all features — v1.0
- ✓ All bugs identified and fixed — v1.0
- ✓ App deploys cleanly to Vercel — v1.0
- ✓ No console errors or warnings in production build — v1.0
- ✓ Error boundary implemented and functional — v1.0
- ✓ Loading states for all async operations — v1.0
- ✓ Edge cases handled gracefully — v1.0
- ✓ Accessible keyboard navigation — v1.0

### Active

<!-- Current scope. Building toward these. -->

v3.0 — local-first follow-ups (post-implementation tightening):
- Server-side test coverage for new auth / repo / embedder / memory layers — v3.0
- Fix the session-secret race in `src/lib/auth/session.ts:getSessionPassword` — v3.0
- Add confirmation step to the Header Lock button — v3.0
- (Optional) Dockerfile for home-server deployment — v3.0
- (Optional) Export/import SQLite ↔ JSON — v3.0

v2.0 — AI memory + spatial UX (implemented, superseded by v3.0 for runtime):
- ✓ User can group notes into wings (top-level) and rooms (topics) — v2.0/v3.0
- ✓ User can browse a /palace page with three panes: wings → rooms → cards — v2.0/v3.0
- ✓ User can move a card between rooms from the card itself — v2.0/v3.0
- ✓ User can search the palace and see ranked results from semantic + keyword + recent lanes, each labeled by source — v2.0/v3.0
- ✓ Edits trigger a fire-and-forget memory sync that does not block the editor — v2.0/v3.0
- ✓ Memory degrades gracefully when the embedder is disabled — v2.0/v3.0

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Multi-user / family share — local-first answer is "second instance on a second device"
- Sync between devices — genuinely hard, not free
- Mobile-optimized palace view — desktop-first UX sufficient for v3.0
- Migration from v1/v2 Supabase data — user picked "fresh start" explicitly

## Constraints

- **Platform**: Any machine with Node.js 18+ and a writable filesystem — not Vercel-bound
- **Database**: SQLite via `better-sqlite3` — single file, native build required
- **Stack**: No subscription services — adding one violates the v3.0 thesis
- **Embedder**: Must work offline after first model download (~25 MB to transformers.js cache)

## Known Tech Debt

Carried from v1.0/v2.0 and new in v3.0:
- TiptapEditor test coverage at 67.74% (jsdom limitations)
- Note-edit page kept its own fetch loop instead of going through `useNotes` (debounce constraint)
- No tests for `src/lib/{auth,db,embed,memory/store}.ts` or `/api/*` routes
- Session-secret race in `src/lib/auth/session.ts:getSessionPassword` (being fixed in this wave)
- `.db` file is plaintext at rest; passphrase only gates the UI

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Drop Supabase/OpenAI/Vercel | Eliminate recurring bills, own data | ✓ Good — SQLite + transformers.js + iron-session ship in v3.0 |
| Single-user passphrase auth | Local-first means no multi-tenant complexity | ✓ Good — iron-session cookie + bcrypt hash in settings table |
| Xenova/all-MiniLM-L6-v2 over bge-small-en-v1.5 | Smaller, faster; 384-dim is enough at single-user scale | ✓ Good — ~25 MB first-call download |
| No knowledge graph, no LLM rerank, no auto-tag | Earn complexity with usage data | ✓ Good — Hybrid retrieval (semantic + keyword + recent) via RRF is enough for v3.0 |
| Fresh start, no v1/v2 data migration | User explicit choice | ✓ Good — Clean v3.0 schema, no migration code |

---
*Last updated: 2026-04-28 — v3.0 follow-up cleanup*
