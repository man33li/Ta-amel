# MindForge v3.1 Smoke-Test Checklist

Run through this on `feat/v3.0-local-first` against `npm run dev`. Each item is a single user-visible behavior to verify. Tick items as you go. If something fails, capture the dev-server log + browser console for that step before moving on.

**Setup before you start:**
- [ ] `npm run dev` is running, no errors at startup
- [ ] Browser DevTools open (Network + Console tabs)
- [ ] You know which passphrase you set

---

## 1. Auth

- [ ] **Cold start** — kill the dev server, restart, hit `/`. You land on `/login` (not a crash).
- [ ] **Wrong passphrase** — enter a wrong passphrase. You see "Wrong passphrase". Cookie is not set.
- [ ] **Right passphrase** — enter the correct passphrase. You land on `/` (notes home).
- [ ] **Setup blocked when already set up** — visit `/setup`. Submitting any passphrase returns 409 and does nothing.
- [ ] **Direct URL navigation** — type `http://localhost:3000/palace` and `http://localhost:3000/settings` directly into the URL bar. Both render their page (this is the bug we just fixed; confirm it stays fixed).
- [ ] **Session JSON** — visit `/api/auth/session`. Response is `{"setUp":true,"authenticated":true}`.

## 2. Lock + logout

- [ ] **First Lock click** — header button shows "Confirm lock?".
- [ ] **3-second timeout** — wait 3 seconds without clicking again. Button reverts to "Lock".
- [ ] **Two-click confirm** — click Lock, then click "Confirm lock?" within 3 seconds. You land on `/login` and the iron-session cookie is gone (DevTools → Application → Cookies).
- [ ] **DB stays unlocked after Lock** — after locking, hit `/api/auth/session`. Should still report `setUp:true`. (Lock only clears the cookie; the cached DB handle stays open until process restart, by design.)

## 3. Notes — basic CRUD

- [ ] **Empty state** — on a fresh DB, home page shows "No notes yet" with a "Create First Note" button.
- [ ] **Create** — click "+ New Note". You're routed to `/notes/<id>` with a card titled "Untitled".
- [ ] **Title edit + debounced save** — type a title. After ~1 second of no typing, "Saving…" briefly shows, then disappears. Refresh the page; title persists.
- [ ] **Body edit** — type a paragraph in the Tiptap editor. Same debounce + persist behavior.
- [ ] **Rich text** — try **bold** (Ctrl+B), *italic* (Ctrl+I), bullet list, heading. All render and persist after refresh.
- [ ] **Back to home** — click `← Back`. You see the new card on the home grid, sorted newest-first.
- [ ] **Delete** — open a card, click Delete, confirm the dialog. You return to home and the card is gone.

## 4. Palace — wings → rooms → cards

- [ ] **Empty palace** — visit `/palace`. Three empty panes with create-wing prompt.
- [ ] **Create wing** — click "+ New Wing", enter a name. Wing appears, becomes active.
- [ ] **Create room** — middle pane prompts "Create your first room". Click "+ New Room", enter a name. Room appears, becomes active.
- [ ] **Create card from palace** — right pane prompts to create a card. Click "+ New Card". Routed to the editor; the card is already filed under the active room.
- [ ] **Card listed in room** — back to `/palace`. Card shows up in the active room.
- [ ] **Move card to a different room** — create a second room. From the card itself (in the right pane), move it to the new room. Card disappears from old room, appears in new.
- [ ] **Switch wings** — create a second wing. Switching wings shows that wing's rooms only.
- [ ] **Persists across refresh** — refresh `/palace`. Selections may reset (Zustand store is in-memory only) but data is intact.

## 5. Semantic search

> First search will be slow — the embedder downloads a ~25 MB ONNX model on the first card edit. After that, downloads are cached at `%LOCALAPPDATA%\huggingface\hub`.

- [ ] **Embed on edit** — make a small edit to any card. After save, `POST /api/memory/sync` runs in the background. Watch the dev-server log for it.
- [ ] **Keyword match** — in the palace search bar, type a word that appears verbatim in a card. The card shows up labeled as a keyword/recent hit.
- [ ] **Semantic match** — type a phrase that's *related* but doesn't appear verbatim (e.g. card text says "I bought groceries", search "shopping list"). The card shows up labeled as a semantic hit.
- [ ] **No results** — type gibberish. UI shows an empty result, no crash.
- [ ] **Embedder disabled** — set `MINDFORGE_EMBEDDINGS_DISABLED=1`, restart dev. Edits no longer trigger sync; search still returns keyword + recent results without crashing.

## 6. Settings — export / import / rekey

- [ ] **Settings page renders** — visit `/settings`. Three sections (or whatever the current panel shows): Export, Import, Change passphrase.
- [ ] **Export** — click Export. A file `mindforge-export-YYYY-MM-DD.json` downloads. Open it in a text editor — it contains a JSON object with wings, rooms, cards, and base64 embeddings.
- [ ] **Import same file** — click Import, select the file you just exported. Result message indicates 0 records inserted (everything was a duplicate).
- [ ] **Import into a fresh DB** — stop the server, delete `data/mindforge.db*`, run setup with the same passphrase, then import the export. All your notes/wings/rooms come back.
- [ ] **Reject malformed import** — try importing any random `.json` (e.g. `{"foo":"bar"}`). UI shows an error, nothing changes.
- [ ] **Rekey — wrong current passphrase** — enter a wrong "current passphrase" + a valid new one. Result: error, nothing changes.
- [ ] **Rekey — short new passphrase** — enter the right current passphrase + a 1-char new passphrase. Error: minimum 8 chars.
- [ ] **Rekey — happy path** — enter the right current passphrase + a different valid new one. Success message. You stay logged in.
- [ ] **Rekey survives restart** — kill the dev server, restart. Old passphrase rejected at `/login`. New passphrase logs you in. (This is the v3.1 SQLCipher rekey flow.)

## 7. Encryption at rest

- [ ] **DB file is opaque** — open `data/mindforge.db` in a hex viewer (or `xxd | head`). The file does NOT start with `SQLite format 3\0`. It looks like random bytes.
- [ ] **Wrong passphrase rejected on disk-only access** — copy `data/mindforge.db` aside, run `sqlite3 mindforge.db .schema` (without the SQLCipher CLI). Should fail with "file is not a database" or similar.
- [ ] **Plaintext mode for tests only** — confirm `MINDFORGE_DISABLE_ENCRYPTION=1` is **only** set in `src/__tests__/setup.ts`, never in `.env*` files.

## 8. Error / recovery edges

- [ ] **Refresh mid-save** — type into a card, then refresh before the 1-second debounce fires. Last typed character may be lost (acceptable per design); no crash.
- [ ] **Two tabs editing same card** — open the same card in two tabs, edit in tab A, then edit in tab B. Last writer wins. Refresh both — both show the latest content.
- [ ] **Network blip on save** — open DevTools → Network → throttle to "Offline", type, wait, restore. Toast/error message shows; refresh shows the old content (because save failed). No data corruption.
- [ ] **Delete a wing** — deleting a wing cascades: rooms in it are removed, but the cards keep their content (they just go to `room_id: null`). They show up on the home grid but not in any room.

## 9. Cold-restart sanity

After all the above:

- [ ] Kill the dev server.
- [ ] Run `npm run dev` again.
- [ ] Hit `/` in a *fresh* browser session (incognito/private window) — should redirect to `/login` (no cached cookie).
- [ ] Hit `/api/auth/session` in your existing tab — should report `{"setUp":true,"authenticated":false}` immediately, no crash. (This exercises the `04df435` cold-start short-circuit.)
- [ ] Log in. Type `/palace` and `/settings` directly into the URL bar in fresh tabs. Both render the page, neither bounces to `/login`. (This is the dev-mode singleton fix from this session.)

## 10. Build + production

- [ ] `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build` completes with zero errors.
- [ ] `npm start` (after build) — repeat at least items in §1, §2, §3, §6 in production mode.
- [ ] (Optional) `docker build -t mindforge .` succeeds, and `docker run -p 3000:3000 -v mindforge-data:/data mindforge` lets you do `/setup` and persist a card across `docker stop` / `docker start`.

---

**If anything fails:** paste the dev-server log + browser console for that step into the chat. I'll diagnose.

**If everything passes:** you're clear to commit the working tree, push, and merge `feat/v3.0-local-first` to `main`.
