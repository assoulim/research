-- Lectern — database schema for Supabase
-- Run once in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.

-- One row per article (full article JSON in `data`). Deletions are kept as
-- tombstones (deleted = true, data = null) so they propagate to other devices.
create table if not exists public.articles (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Small key-value records: topics, colours, settings, chats.
create table if not exists public.kv (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists articles_user_updated_idx on public.articles (user_id, updated_at);
create index if not exists kv_user_updated_idx       on public.kv (user_id, updated_at);

-- Server-side timestamps: the sync cursor never depends on device clocks.
create or replace function public.lectern_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before insert or update on public.articles
  for each row execute function public.lectern_touch_updated_at();

drop trigger if exists kv_touch on public.kv;
create trigger kv_touch before insert or update on public.kv
  for each row execute function public.lectern_touch_updated_at();

-- Row-level security: every user sees and changes only their own rows.
alter table public.articles enable row level security;
alter table public.kv       enable row level security;

drop policy if exists "articles: owner only" on public.articles;
create policy "articles: owner only" on public.articles
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "kv: owner only" on public.kv;
create policy "kv: owner only" on public.kv
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No access at all for anonymous (signed-out) requests.
revoke all on public.articles from anon;
revoke all on public.kv       from anon;
grant select, insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.kv       to authenticated;
