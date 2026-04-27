# MindForge

A local-first personal note app: rich text editing, semantic recall, and a memory-palace navigation. Runs entirely on your machine — no Supabase, no OpenAI, no Vercel, no recurring bills.

## Tech Stack

- **Framework:** Next.js 16 (App Router) on React 19
- **Database:** SQLite (`better-sqlite3`) — one file on disk
- **Embeddings:** `@xenova/transformers` running `Xenova/all-MiniLM-L6-v2` in-process (~25MB ONNX model, downloaded once)
- **Vector search:** in-process cosine similarity over a SQLite-backed embedding store
- **Hybrid retrieval:** semantic + keyword + recency, merged via Reciprocal Rank Fusion
- **Auth:** single-user passphrase (bcrypt hash) with `iron-session` cookies
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

## Where your data lives

By default, MindForge stores everything in `./data/mindforge.db` next to the project. Override with either env var:

| Variable | Description |
|---|---|
| `MINDFORGE_DB_PATH` | Absolute path to a `.db` file. Wins over `MINDFORGE_DATA_DIR`. |
| `MINDFORGE_DATA_DIR` | Directory in which `mindforge.db` will live. Useful for `~/.mindforge`. |
| `MINDFORGE_EMBEDDINGS_DISABLED` | Set to `1` to skip the local embedder. Palace search falls back to keyword + recency. |

The SQLite file holds: notes, the wings/rooms taxonomy, embeddings (as BLOB), the passphrase hash, and the per-installation session secret. Nothing leaves your machine.

## Production

```bash
npm run build
npm start
```

Run on a home server, a Raspberry Pi, a tiny VPS — anywhere Node 20+ runs. There's no managed-service contract.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint |
