# MindForge

## What This Is

A personal note-taking application with rich text editing, built on Next.js and Supabase. Production-ready with comprehensive testing, error handling, and live deployment.

## Core Value

Notes are saved reliably and the app deploys without issues.

## Current State

**Version:** v1.0 Production Ready (shipped 2026-01-27)
**Live at:** https://mindforge-eight.vercel.app

**Tech Stack:**
- Next.js 16.1.4 with App Router
- Supabase for auth and database
- Tiptap 3.17.1 for rich text editing
- Zustand 5.0.10 for UI state
- Vitest + React Testing Library (114 tests, 89% coverage)

**Codebase:**
- 35 files, ~11,000 lines TypeScript/React
- 4-layer architecture (documented in `.planning/codebase/`)

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

v2.0 — AI memory + spatial UX:
- User can group notes into wings (top-level) and rooms (topics) — v2.0
- User can browse a /palace page with three panes: wings → rooms → cards — v2.0
- User can move a card between rooms from the card itself — v2.0
- User can search the palace and see ranked results from semantic + keyword + recent lanes, each labeled by source — v2.0
- Edits trigger a fire-and-forget memory sync that does not block the editor — v2.0
- Without OPENAI_API_KEY the palace still works on keyword + recency only — v2.0

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
