-- v126: Push device tokens + inbox notifications
create table if not exists public.device_tokens (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  token text not null unique,
  platform text check (platform in ('ios','android')) not null,
  locale text,
  last_seen timestamptz default now()
);

create index if not exists idx_device_tokens_user on public.device_tokens(user_id);

create table if not exists public.notifications_inbox (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_inbox_user on public.notifications_inbox(user_id);
