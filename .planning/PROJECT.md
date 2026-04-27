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

- New features beyond v1.0 scope — focus was quality, not functionality
- Mobile app — web-first, Vercel deployment target
- Real-time collaboration — adds complexity, not needed for personal use
- Additional OAuth providers — Google is sufficient for v1

## Constraints

- **Platform**: Vercel deployment — must work with Vercel's build system
- **Database**: Supabase — already integrated, no changes to backend
- **Stack**: No major refactors — polish existing code, don't rewrite

## Known Tech Debt

Accumulated during v1.0, tracked for future cleanup:
- No logout button in Header (user has no UI path to sign out)
- TiptapEditor test coverage at 67.74% (jsdom limitations)
- Unused Database type export in types/index.ts
- Note page duplicates Supabase calls instead of reusing useNotes

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on quality over features | App is functional, needs hardening | ✓ Good — shipped solid v1.0 |
| Vercel as deployment target | Standard Next.js hosting, good DX | ✓ Good — deployed successfully |
| Keep existing architecture | 4-layer structure is sound per review | ✓ Good — no refactoring needed |
| Testing first in milestone | Tests catch regressions from fixes | ✓ Good — 114 tests, 0 regressions |
| Root layout force-dynamic | Supabase client needs runtime | ✓ Good — fixed build errors |

---
*Last updated: 2026-01-27 after v1.0 milestone complete*
