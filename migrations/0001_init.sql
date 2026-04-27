-- v3.0 schema for the local-first stack. SQLite, single-user.

create table if not exists wings (
  id          text primary key,
  name        text not null,
  color       text,
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists rooms (
  id          text primary key,
  wing_id     text not null references wings(id) on delete cascade,
  name        text not null,
  description text,
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists rooms_wing_id_idx on rooms(wing_id);

create table if not exists cards (
  id          text primary key,
  title       text not null,
  content     text not null,                       -- Tiptap JSON serialised
  room_id     text references rooms(id) on delete set null,
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists cards_room_id_idx on cards(room_id);
create index if not exists cards_updated_at_idx on cards(updated_at desc);

-- Embeddings live in a side table so card writes don't have to round-trip
-- through the embedder. card_id is unique so each card has at most one row.
create table if not exists card_embeddings (
  card_id    text primary key references cards(id) on delete cascade,
  vector     blob not null,
  dim        integer not null,
  text       text not null,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Key/value bag for passphrase hash, session secret, last-used model, etc.
create table if not exists settings (
  key   text primary key,
  value text not null
);
