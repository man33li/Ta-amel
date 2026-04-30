-- v3.3 schema additions for AI memory features.
-- Tags (manual + auto), Zettelkasten links, entities, and a temporal knowledge graph.

create table if not exists card_tags (
  card_id    text not null references cards(id) on delete cascade,
  tag        text not null,
  source     text not null check (source in ('auto', 'user')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (card_id, tag, source)
);
create index if not exists card_tags_tag_idx on card_tags(tag);

-- Cross-references parsed from [[card-id]] inside card content.
create table if not exists card_links (
  from_id    text not null references cards(id) on delete cascade,
  to_id      text not null references cards(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (from_id, to_id)
);
create index if not exists card_links_to_idx on card_links(to_id);

-- Entities discovered in card content. normalized = lowercase + trimmed name; the
-- (normalized, type) pair is unique so the same surface form does not duplicate.
create table if not exists entities (
  id            text primary key,
  name          text not null,
  normalized    text not null,
  type          text not null check (type in ('person', 'place', 'org', 'topic', 'other')),
  mention_count integer not null default 0,
  first_seen_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create unique index if not exists entities_norm_type_idx on entities(normalized, type);

-- Junction: which cards mention which entities, with per-card mention counts
-- so search can boost cards that mention an entity many times.
create table if not exists card_entities (
  card_id       text not null references cards(id) on delete cascade,
  entity_id     text not null references entities(id) on delete cascade,
  mention_count integer not null default 1,
  primary key (card_id, entity_id)
);
create index if not exists card_entities_entity_idx on card_entities(entity_id);

-- Knowledge graph edges with optional validity windows.
-- Heuristic predicates for now: 'co-occurs' (same card), 'mentioned-with' (within
-- a tighter window). LLM-derived predicates can use confidence < 1.0.
create table if not exists entity_relations (
  id              text primary key,
  subject_id      text not null references entities(id) on delete cascade,
  predicate       text not null,
  object_id       text not null references entities(id) on delete cascade,
  source_card_id  text references cards(id) on delete set null,
  confidence      real not null default 1.0,
  valid_from      text,
  valid_to        text,
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists entity_relations_subject_idx on entity_relations(subject_id);
create index if not exists entity_relations_object_idx on entity_relations(object_id);
create index if not exists entity_relations_predicate_idx on entity_relations(predicate);
