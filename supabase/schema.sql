-- kyofile schema v1 (Supabase Postgres)
-- Metadata only. Bytes live in Supabase Storage pool (bucket 'uploads' per backend project).

create table if not exists backends (
  id text primary key,                       -- 'pool-a', 'pool-b', ...
  supabase_url text not null,
  anon_key text not null,                    -- safe-ish; used for public downloads if needed
  quota_bytes bigint not null default 1073741824,  -- 1GB free tier default
  used_bytes bigint not null default 0,      -- tracked by us, updated on finalize/janitor
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists files (
  slug text primary key,                     -- 6-8 char url-safe
  ext text not null default '',
  size_bytes bigint not null,
  mime_type text not null default 'application/octet-stream',
  sha256 text not null,                      -- dedup key (contentHash)
  expires_at timestamptz,                    -- null = never (subject to inactive purge)
  last_access_at timestamptz not null default now(),
  download_count bigint not null default 0,
  backend text not null references backends(id),
  path text not null,                        -- object path inside bucket 'uploads'
  ip_hash text not null default '',          -- sha256(ip + salt), abuse control
  created_at timestamptz not null default now()
);
create index if not exists files_sha256_idx on files (sha256);
create index if not exists files_expires_idx on files (expires_at);
create index if not exists files_last_access_idx on files (last_access_at);

create table if not exists bans (
  ip_hash text primary key,
  reason text not null default '',
  until timestamptz,                         -- null = permanent
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id bigserial primary key,
  slug text not null,
  reason text not null default '',
  status text not null default 'open',       -- open | reviewed | actioned | dismissed
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on reports (status);
