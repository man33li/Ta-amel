# MindForge

A personal note-taking app with rich text editing, semantic recall, and a spatial memory-palace navigation, built on Next.js and Supabase.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth & Database:** Supabase (email/password + Google OAuth)
- **State Management:** Zustand
- **Rich Text Editor:** Tiptap
- **Styling:** Tailwind CSS
- **AI memory:** [mem0ai](https://github.com/mem0ai/mem0) (`mem0ai/oss`) on PGVector + Supabase history
- **Hybrid retrieval:** semantic (mem0) + keyword (Postgres) + recency, merged via Reciprocal Rank Fusion

## Getting Started

```bash
git clone <repo-url>
cd mindforge
npm install
cp .env.example .env.local  # Then fill in your Supabase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file from `.env.example` and fill in the values:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api) → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api) → anon public key |
| `SUPABASE_DB_URL` | Postgres connection string for the memory layer (pgvector + history) | Supabase Dashboard → Database → Connection string |
| `OPENAI_API_KEY` | Powers mem0 embeddings + fact extraction. Optional — without it, the palace falls back to keyword + recency search. | [OpenAI Platform](https://platform.openai.com/api-keys) |

## Database setup

Run the migrations in `supabase/migrations/` against your Supabase project (via `supabase db push`, the SQL editor, or any migration runner). v2.0 expects the `vector` extension and `wings` / `rooms` tables.

## Deployment

This app is designed for [Vercel](https://vercel.com):

1. Connect your GitHub repository in the Vercel dashboard
2. Add both environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in **Settings → Environment Variables**
3. Deploy — Vercel auto-detects Next.js and handles the build

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
