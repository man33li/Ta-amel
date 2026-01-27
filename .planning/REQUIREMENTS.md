# Requirements: MindForge

**Defined:** 2026-01-27
**Core Value:** Notes are saved reliably and the app deploys without issues

## v1.0 Requirements

Requirements for production-ready release. Focus on quality, stability, and deployment.

### Testing

- [x] **TEST-01**: All components have unit test coverage
- [x] **TEST-02**: All hooks have unit test coverage  
- [x] **TEST-03**: Auth flows have integration tests
- [x] **TEST-04**: Note CRUD has integration tests
- [x] **TEST-05**: Test coverage report available via npm script

### Bug Fixes

- [x] **BUG-01**: error.tsx boundary properly catches and displays errors
- [x] **BUG-02**: Middleware redirects unauthenticated users to /login
- [x] **BUG-03**: Optimistic updates rollback on server error
- [x] **BUG-04**: All console errors/warnings resolved

### Polish

- [x] **POL-01**: Loading states for all async operations (notes, auth)
- [x] **POL-02**: Error states for failed operations with retry options
- [x] **POL-03**: Edge cases handled gracefully (empty states, long content)
- [x] **POL-04**: Accessible keyboard navigation

### Deployment

- [ ] **DEP-01**: Clean production build with no errors
- [ ] **DEP-02**: Environment variables documented
- [ ] **DEP-03**: Vercel deployment successful
- [ ] **DEP-04**: Production smoke test passes

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Features

- **FEAT-01**: Note organization (folders/tags)
- **FEAT-02**: Search notes by title/content
- **FEAT-03**: Note sharing via public links
- **FEAT-04**: Offline support with sync

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New features | Focus is quality, not functionality |
| Mobile app | Web-first, Vercel deployment target |
| Real-time collaboration | Adds complexity, not needed for personal use |
| Additional OAuth providers | Google is sufficient for v1 |
| Major refactors | Polish existing code, don't rewrite |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 1 | Complete |
| TEST-04 | Phase 1 | Complete |
| TEST-05 | Phase 1 | Complete |
| BUG-01 | Phase 2 | Complete |
| BUG-02 | Phase 2 | Complete |
| BUG-03 | Phase 2 | Complete |
| BUG-04 | Phase 2 | Complete |
| POL-01 | Phase 3 | Complete |
| POL-02 | Phase 3 | Complete |
| POL-03 | Phase 3 | Complete |
| POL-04 | Phase 3 | Complete |
| DEP-01 | Phase 4 | Pending |
| DEP-02 | Phase 4 | Pending |
| DEP-03 | Phase 4 | Pending |
| DEP-04 | Phase 4 | Pending |

**Coverage:**
- v1.0 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after milestone v1.0 started*
