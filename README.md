# MindForge

A personal note-taking app with rich text editing, built with Next.js and Supabase.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth & Database:** Supabase (email/password + Google OAuth)
- **State Management:** Zustand
- **Rich Text Editor:** Tiptap
- **Styling:** Tailwind CSS

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
