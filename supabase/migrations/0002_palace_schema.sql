-- 0002_palace_schema.sql
-- v2.0 milestone: spatial taxonomy (wings -> rooms -> cards) + pgvector for memories.

-- pgvector enables mem0ai/oss to store embeddings in this database.
create extension if not exists vector;

-- Wings: top-level grouping (e.g. project, person, area of life).
create table if not exists public.wings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists wings_user_id_idx on public.wings(user_id);

alter table public.wings enable row level security;

create policy "wings: owner read"   on public.wings for select using (auth.uid() = user_id);
create policy "wings: owner insert" on public.wings for insert with check (auth.uid() = user_id);
create policy "wings: owner update" on public.wings for update using (auth.uid() = user_id);
create policy "wings: owner delete" on public.wings for delete using (auth.uid() = user_id);

-- Rooms: a topic inside a wing. Cards live inside rooms.
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  wing_id     uuid not null references public.wings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rooms_wing_id_idx on public.rooms(wing_id);
create index if not exists rooms_user_id_idx on public.rooms(user_id);

alter table public.rooms enable row level security;

create policy "rooms: owner read"   on public.rooms for select using (auth.uid() = user_id);
create policy "rooms: owner insert" on public.rooms for insert with check (auth.uid() = user_id);
create policy "rooms: owner update" on public.rooms for update using (auth.uid() = user_id);
create policy "rooms: owner delete" on public.rooms for delete using (auth.uid() = user_id);

-- Cards gain optional room placement; null = unfiled.
alter table public.cards
  add column if not exists room_id uuid references public.rooms(id) on delete set null;

create index if not exists cards_room_id_idx on public.cards(room_id);

-- Full-text search index over title + extracted Tiptap text.
-- content->>'text' is a best-effort string view of the doc; the search route
-- falls back to ILIKE on the title for the common case.
create index if not exists cards_fts_idx on public.cards
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content->>'text', '')));
