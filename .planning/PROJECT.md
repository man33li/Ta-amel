# MindForge

## What This Is

A personal note-taking application with rich text editing, built on Next.js and Supabase. Currently functional but needs comprehensive testing, code quality review, and production hardening before deployment.

## Core Value

Notes are saved reliably and the app deploys without issues. If nothing else works, data persistence and deployment must be solid.

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

### Active

<!-- Current scope. Building toward these. -->

- [ ] Comprehensive test coverage for all features
- [ ] Code quality audit completed (no bad patterns, security issues, or tech debt)
- [ ] All bugs identified and fixed
- [ ] App deploys cleanly to Vercel
- [ ] No console errors or warnings in production build
- [ ] Error boundary implemented and functional
- [ ] Loading states for all async operations
- [ ] Edge cases handled gracefully

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- New features — focus is quality, not functionality
- Mobile app — web-first, Vercel deployment target
- Real-time collaboration — adds complexity, not needed for personal use
- Additional OAuth providers — Google is sufficient for v1

## Context

**Current State:**
- Next.js 16.1.4 with App Router
- Supabase for auth and database
- Tiptap 3.17.1 for rich text editing
- Zustand 5.0.10 for UI state
- Vitest + React Testing Library configured but coverage unknown
- Error boundary file exists but not implemented

**Codebase Analysis Completed:**
- `.planning/codebase/ARCHITECTURE.md` — 4-layer architecture documented
- `.planning/codebase/CONVENTIONS.md` — naming and style patterns documented
- `.planning/codebase/INTEGRATIONS.md` — Supabase integration documented
- `.planning/codebase/STACK.md` — full technology stack documented
- `.planning/codebase/STRUCTURE.md` — directory layout documented

**Known Gaps (from review):**
- `error.tsx` not implemented (empty error boundary)
- No auth redirect in middleware for unauthenticated users
- No optimistic update rollback on server error
- Test coverage unknown

## Constraints

- **Platform**: Vercel deployment — must work with Vercel's build system
- **Database**: Supabase — already integrated, no changes to backend
- **Timeline**: Quality focus — thorough over fast
- **Stack**: No major refactors — polish existing code, don't rewrite

## Current Milestone: v1.0 Production Ready

**Goal:** Harden the application for production deployment with comprehensive testing, bug fixes, and polish.

**Target deliverables:**
- All identified bugs fixed
- Error boundaries and loading states implemented
- Test coverage established
- Clean Vercel deployment
- No console errors/warnings in production build

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on quality over features | App is functional, needs hardening | — Pending |
| Vercel as deployment target | Standard Next.js hosting, good DX | — Pending |
| Keep existing architecture | 4-layer structure is sound per review | — Pending |

---
*Last updated: 2026-01-27 after milestone v1.0 started*
