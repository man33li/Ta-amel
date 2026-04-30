# MindForge

A local-first personal note app: rich text editing, semantic recall, and a memory-palace navigation. Runs entirely on your machine — no Supabase, no OpenAI, no Vercel, no recurring bills.

## Tech Stack

- **Framework:** Next.js 16 (App Router) on React 19
- **Database:** Encrypted SQLite via `better-sqlite3-multiple-ciphers` (SQLCipher v4) — one file on disk; the file is opaque without your passphrase
- **Embeddings:** `@xenova/transformers` running `Xenova/all-MiniLM-L6-v2` in-process (~25MB ONNX model, downloaded once)
- **Vector search:** in-process cosine similarity over a SQLite-backed embedding store
- **Hybrid retrieval:** semantic + keyword + recency, merged via Reciprocal Rank Fusion
- **Auth:** single-user passphrase. The passphrase IS the SQLCipher key; a bcrypt hash is kept as defence-in-depth and for the test-mode plaintext fallback. `iron-session` cookie marks per-browser sessions.
- **Editor:** Tiptap 3
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest + React Testing Library

## Getting Started

```bash
git clone <repo-url>
cd mindforge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch you'll be redirected to `/setup` to choose a passphrase. After that you go straight to your notes.

> **Important:** the passphrase you pick is also the encryption key for your data. There is no recovery. Lose it and the on-disk database is unreadable. Use a passphrase manager.

## Where your data lives

By default, MindForge stores everything in `./data/mindforge.db` next to the project. Override with either env var:

| Variable | Description |
|---|---|
| `MINDFORGE_DB_PATH` | Absolute path to a `.db` file. Wins over `MINDFORGE_DATA_DIR`. |
| `MINDFORGE_DATA_DIR` | Directory in which `mindforge.db` will live. Useful for `~/.mindforge`. |
| `MINDFORGE_EMBEDDINGS_DISABLED` | Set to `1` to skip the local embedder. Palace search falls back to keyword + recency. |
| `MINDFORGE_DISABLE_ENCRYPTION` | Set to `1` to open the SQLite file in plaintext. Used by the test suite; do not set in production. |

The encrypted SQLite file holds: notes, the wings/rooms taxonomy, embeddings (BLOB), the bcrypt passphrase hash, and the per-installation session secret. Nothing leaves your machine.

The transformers.js model lives in your platform cache (`~/.cache/huggingface` on Linux/Mac, `%LOCALAPPDATA%\huggingface\hub` on Windows) and is downloaded once on the first card edit.

## Backup and restore

`/settings` exposes Export and Import:

- **Export** downloads `mindforge-export-YYYY-MM-DD.json` containing every wing, room, card, and embedding (vectors are base64-encoded).
- **Import** accepts that same JSON and `INSERT OR IGNORE`s into the current database. Records with matching IDs are skipped, so re-importing the same backup is a no-op.

The backup file is **plaintext JSON** — store it the same way you store the rest of your sensitive files.

## Production

```bash
npm run build
npm start
```

Run on a home server, a Raspberry Pi, a tiny VPS — anywhere Node 20+ runs. There is no managed-service contract.

### Docker

A multi-stage `Dockerfile` ships with the repo. It compiles the SQLCipher native addon during the build and persists data to `/data` in the runtime image:

```bash
docker build -t mindforge .
docker run -d --name mindforge -p 3000:3000 -v mindforge-data:/data mindforge
```

## Local LLM (optional)

Toggle on in **Settings → Local LLM**, point it at a running [Ollama](https://ollama.com/) instance, and pick a model (e.g. `llama3.2:3b`). Two features become available:

- **Summarize** button on each note posts the card to `/api/llm/summarize` and renders the result inline.
- **Rerank** is exposed at `/api/llm/rerank` for clients that want to re-order their own search hits.

Off by default. Nothing is sent anywhere when the toggle is off.

## MCP server

A Model Context Protocol server lets external agents (Claude Desktop, Codex, custom clients) talk to your local notes directly. Start it from inside the project:

```bash
MINDFORGE_PASSPHRASE='your-passphrase' npm run mcp
```

Tools exposed:

- `list_wings`, `list_rooms`, `list_cards`
- `search_cards` (BM25 keyword search)
- `get_card`, `create_card`, `update_card`

Add it to a client by configuring an MCP stdio server entry that runs `npm run mcp` in this directory with `MINDFORGE_PASSPHRASE` set in the environment. The encrypted DB stays where it is — the server unlocks it in-process and serves a stdio JSON-RPC stream.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint |
| `npm run mcp` | Start the MindForge MCP server (stdio) |
