---
phase: 04-deployment
plan: 01
subsystem: infra
tags: [next.js, supabase, deployment, build, env-vars]

requires:
  - phase: 03-polish
    provides: Loading states and accessibility polish
provides:
  - Clean production build with zero errors
  - Environment variable documentation (.env.example)
  - Project README with deployment instructions
affects: [04-02 deployment plan]

tech-stack:
  added: []
  patterns:
    - "force-dynamic on root layout for Supabase runtime env vars"

key-files:
  created:
    - ".env.example"
  modified:
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(auth)/signup/page.tsx"
    - "src/app/layout.tsx"
    - "README.md"

key-decisions:
  - "Root layout dynamic export instead of per-page only — client components with use client dont respect page-level dynamic exports during build prerendering"

patterns-established:
  - "force-dynamic at root layout level for apps that depend on runtime env vars"

duration: 7min
completed: 2026-01-27
---

# Phase 4 Plan 1: Build Fix & Env Docs Summary

**force-dynamic export on root layout to fix Supabase prerender failures, plus .env.example and project README with deployment guide**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-27T13:35:49Z
- **Completed:** 2026-01-27T18:02:58Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Production build completes with zero errors (DEP-01 satisfied)
- All routes render dynamically, avoiding Supabase client initialization at build time
- Environment variables documented with sourcing instructions (DEP-02 satisfied)
- README replaced with project-specific content including deployment guide

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix build prerender failures on auth pages** - `8a64e6a` (fix)
2. **Task 2: Document environment variables and deployment** - `b738c6a` (docs)

## Files Created/Modified
- `.env.example` - Template with both Supabase env vars and dashboard link
- `src/app/(auth)/login/page.tsx` - Added dynamic export
- `src/app/(auth)/signup/page.tsx` - Added dynamic export
- `src/app/layout.tsx` - Added root-level dynamic export for all routes
- `README.md` - Project docs with tech stack, env vars, and Vercel deployment

## Decisions Made
- Added `export const dynamic = 'force-dynamic'` to root layout instead of only auth pages. Client components (`'use client'`) don't respect page-level dynamic exports during Next.js build prerendering — the root layout export is needed to prevent all Supabase-dependent pages from failing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root layout needed dynamic export, not just auth pages**
- **Found during:** Task 1 (build verification)
- **Issue:** Per-page `export const dynamic` on `'use client'` pages was ignored by Next.js build. After fixing auth pages, the root `/` page also failed with same Supabase URL error.
- **Fix:** Added `export const dynamic = 'force-dynamic'` to `src/app/layout.tsx` (root layout) which applies to all routes. Kept per-page exports on auth pages as well for explicit intent.
- **Files modified:** src/app/layout.tsx
- **Verification:** `npm run build` succeeds, all 114 tests pass
- **Committed in:** 8a64e6a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for build to succeed. No scope creep.

## Issues Encountered
- `.env.example` was matched by `.gitignore` (likely a `*.env*` pattern). Used `git add -f` to force-add it since example files with no secrets should be tracked.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Build is clean, ready for Vercel deployment (04-02-PLAN.md)
- All env vars documented for deployment configuration

---
*Phase: 04-deployment*
*Completed: 2026-01-27*
