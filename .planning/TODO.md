# MindForge TODO — features not yet implemented

This is the honest list as of 2026-04-29. The project was scoped tightly on purpose ("earn complexity with usage data"), so most of what's missing is *intentionally* missing. The sections below distinguish:

- **Acknowledged tech debt** — code known to be sub-ideal, not yet addressed
- **Deferred features** — discussed during v2/v3 planning, deliberately punted to "if usage demands it"
- **Out of scope** — explicit project boundaries (do NOT silently add these)

If you (Claude or the user) want to pull something out of "deferred" into the active backlog, do it via `/gsd-add-backlog` or `/gsd-new-milestone`, not by appending here.

---

## 1. Acknowledged tech debt

These are real-but-tolerated rough edges. Tests + types are green despite them.

- [ ] **TiptapEditor test coverage at 67.74%** — limitations of jsdom around Tiptap's contenteditable/Range API. Either move these tests to Playwright (real browser) or accept the gap. Source: CLAUDE.md "Known Tech Debt".
- [ ] **Note-edit page (`src/app/(main)/notes/[id]/page.tsx`) reimplements its own fetch + debounced save loop** instead of going through `useNotes`. Reason: `useNotes` is built around the home grid and doesn't support per-note debounced patches. Either: (a) extract a `useNote(id)` hook that mirrors the existing useNotes patterns including optimistic rollback, (b) keep the duplication and document it. Don't try (a) without first writing tests for the existing behavior — debounce + optimistic rollback + delete confirmation + memory-sync fire-and-forget is more subtle than it looks. Source: CLAUDE.md "Known Tech Debt".
- [ ] **No test for the note-edit page itself.** The page is non-trivial (loading skeleton, error retry, debounced save, fire-and-forget memory sync, delete confirmation) and currently has zero direct test coverage. Adding it would need a `useDebouncedCallback` mock or fake timers. Source: gap discovered 2026-04-29.

## 2. Deferred features (could come back if usage justifies it)

Each was explicitly considered and pushed out of v3.0/v3.1.

- [ ] **Knowledge graph over notes** — discussed in v2.0 planning; dropped because RRF over semantic + keyword + recency is empirically enough at single-user scale. Bring it back if the user reports "I can never find related notes by topic." Source: PROJECT.md "Key Decisions" + v3.0-LOCAL-FIRST.md.
- [ ] **LLM rerank / summarization** — would require a network call OR a local LLM. Adding either re-introduces the subscription/install burden v3.0 fought to remove. Out for now; revisit if local LLMs become trivially shippable. Source: PROJECT.md "Key Decisions".
- [ ] **Auto-tagging on save** — same reasoning as LLM rerank. Tags are a high-leverage feature but auto-tagging needs an LLM. A user-driven tag UI (manual tags) is a smaller increment that could ship first; it just doesn't exist yet.
- [ ] **Trash / soft delete / undo** — current Delete is hard. SQLite makes a `deleted_at TIMESTAMP NULL` column trivial to add; the UI for "Trash" view is the bigger lift.
- [ ] **Per-note version history** — write a `card_revisions` table, snapshot on save, expose a sidebar. Out of scope for v3.0 ("earn with usage").
- [ ] **Card pinning / favoriting** — single boolean column + UI affordance. Cheap, just hasn't been asked for.
- [ ] **Tags on notes** — would supplement (not replace) the wing/room palace. Schema: `card_tags(card_id, tag)` with a unique constraint. UI would need a tag chip in `NoteCard` and a tag-filter in the home grid + palace.
- [ ] **Search highlighting** — ranking results is implemented; rendering matched substrings as `<mark>` in the snippet is not.
- [ ] **Backup automation / scheduled export** — `/api/export` is manual via the Settings UI. A simple node-cron + filesystem write would automate it. Skipped because v3.0 doesn't run a background process beyond the Next server.
- [ ] **Import from external note apps** (Notion, Obsidian, Apple Notes…) — `/api/import` only accepts MindForge's own export format. Each external format would need its own adapter.
- [ ] **Drag-and-drop card reorganization** — palace currently uses a "Move to room" menu on the card. Drag-drop is purely UX polish.
- [ ] **Print / single-note PDF export** — Tiptap content can be rendered server-side; turning that into a PDF needs a deps bump (e.g. puppeteer or pdfkit). Big runtime cost for a small feature.
- [ ] **Rich-media in notes (images, audio, file attachments)** — Tiptap supports image extensions; we don't ship them. Storage decision (inline base64 vs a `data/blobs/` directory referenced by hash) is the design question.
- [ ] **Internationalization** — all UI strings are English-only and inline. Pulling them through a `t()` helper is doable but invasive.
- [ ] **Settings page UX expansion** — `/settings` currently has Export, Import, and Change Passphrase. Reasonable adds: theme accent color picker (the Zustand store already has `accentColor`, just no UI), embedder enable/disable toggle, embedder cache location, "lock now and end this process" hard-lock control.
- [ ] **Mobile-optimized palace view** — *out-of-scope today, but listed here because it's an obvious "if mobile becomes a priority"* item. Per CLAUDE.md it's currently in the "out of scope" list.

## 3. Hardening (not features, but worth doing before a public release)

- [ ] **Rate-limit `/api/auth/login`** — currently unlimited attempts. Local-first reduces but doesn't eliminate the brute-force risk if the host is exposed (a home server on a LAN with weak passphrases).
- [ ] **CSP / security headers** — none configured in `next.config.ts`. Add at least `X-Frame-Options`, `Referrer-Policy`, and a strict CSP.
- [ ] **Backup file is plaintext JSON** — README warns the user; the long-term fix is to support an encrypted-at-rest export (e.g. age-encrypted with a derived key, or just SQLCipher-encrypted SQLite dump).
- [ ] **Session invalidation on rekey** — current `rekeyPassphrase` keeps the iron-session cookie valid (per design — "user stays logged in"). If the rekey was triggered because the *old passphrase was compromised*, leaving the existing session valid undermines the rekey. Add an explicit "rekey + re-authenticate" mode.
- [ ] **No CSRF protection on state-changing API routes.** iron-session + sameSite=lax cookies blunt the worst of it, but a CSRF token on `/api/auth/{login,logout,setup,rekey}` and on destructive `/api/cards/[id] DELETE` would be belt-and-braces.

## 4. Out of scope (do NOT add silently)

These are *explicit* boundaries. Per CLAUDE.md and PROJECT.md, adding any of these without an explicit user request is a violation of project intent, not progress.

- **Multi-user / family share.** The local-first answer is "second instance on a second device".
- **Cross-device sync.** Hard, not free, would defeat the no-subscription thesis.
- **Migration from v1/v2 Supabase data.** User picked "fresh start" explicitly.
- **Any subscription-based service** (managed embedding API, hosted DB, OAuth provider, paid CDN). The whole point of v3.0 was eliminating these.
- **Pushing to `man33li/Ta-amel`** without an explicit, freshly-issued PAT from the user.
- **Bypassing commit signing** unless the user explicitly authorizes a one-shot bypass for a known-environmental reason.

---

*Last updated: 2026-04-29*
