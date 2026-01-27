# Phase 1 Research: Test Coverage

**Phase:** 01-test-coverage
**Researched:** 2026-01-27
**Discovery Level:** 1 (Quick Verification)

## Research Question

What do I need to know to PLAN comprehensive test coverage for MindForge?

## Findings

### Current Test Infrastructure

**Already Configured:**
- Vitest 4.0.18 with jsdom environment
- React Testing Library 16.3.2 with user-event 14.6.1
- jest-dom 6.9.1 for DOM matchers
- Setup file at `src/__tests__/setup.ts` with comprehensive mocks
- Path alias `@/*` configured for tests
- Coverage provider: v8

**Existing Mocks (from setup.ts):**
- `mockStore` for test data with `cards` array and `currentUser`
- `createMockSupabaseClient()` - comprehensive Supabase client mock
- `next/navigation` mock (useRouter, useSearchParams, etc.)
- `next/headers` mock (cookies, headers)

**Existing Tests:**
- `src/__tests__/example.test.tsx` - example/template
- `src/__tests__/components/HomePage.test.tsx` - home page
- `src/__tests__/components/NoteCard.test.tsx` - note card component
- `src/__tests__/hooks/useNotes.test.tsx` - useNotes hook
- `src/__tests__/pages/Login.test.tsx` - login page

### What Needs Testing

**Components (6 total):**
1. `ThemeProvider.tsx` - theme context
2. `ToastProvider.tsx` - toast notifications
3. `ThemeToggle.tsx` - theme switch button
4. `Header.tsx` - navigation header
5. `NoteCard.tsx` - note display card (has test)
6. `TiptapEditor.tsx` - rich text editor

**Hooks (1 total):**
1. `useNotes.ts` - CRUD operations (has test)

**Store (1 total):**
1. `useAppStore.ts` - Zustand theme store

**Pages (need integration tests):**
- Login flow (has test)
- Signup flow
- Dashboard with note CRUD
- Auth callback

### Standard Stack Decisions

**Keep existing patterns:**
- Vitest + React Testing Library (already configured)
- Mock Supabase client approach (setup.ts has comprehensive mock)
- jsdom environment for component testing
- File organization: `src/__tests__/{category}/{Name}.test.tsx`

**Testing patterns from Context7:**
- Use `render()` from RTL with `getByRole`, `getByText`, etc.
- Use `userEvent` for interactions (click, type, etc.)
- Use `vi.mock()` for module mocking
- Use `expect.element()` for async assertions in browser mode
- Mock child components to isolate parent logic

### Don't Hand Roll

- Use existing Supabase mock from setup.ts (don't recreate)
- Use existing next/navigation mock (don't recreate)
- Use RTL queries (don't use DOM manipulation)
- Use act() for async state updates in hooks

### Requirements Coverage

| Requirement | Test Strategy |
|-------------|---------------|
| TEST-01: Component coverage | Unit tests for all 6 components |
| TEST-02: Hook coverage | Unit test for useNotes + useAppStore |
| TEST-03: Auth integration | Integration tests for login/signup flows |
| TEST-04: Note CRUD integration | Integration test for dashboard note operations |
| TEST-05: Coverage script | Already exists: `npm run test:coverage` |

### Recommendations

1. **Skip TiptapEditor deep testing** - Third-party component, test integration not internals
2. **Test providers as integration points** - ThemeProvider wraps app, test with children
3. **Test useAppStore with Zustand patterns** - Direct store manipulation, not UI
4. **Group auth tests together** - Login, signup, callback share setup
5. **Group note tests together** - Create, update, delete share note context

## Next Steps

Plan 5-7 plans covering:
1. Provider/context tests (ThemeProvider, ToastProvider, useAppStore)
2. Component tests (ThemeToggle, Header)
3. TiptapEditor integration test
4. Auth flow integration tests (expand existing)
5. Note CRUD integration tests (expand existing)
6. Coverage verification

---
*Research completed: 2026-01-27*
