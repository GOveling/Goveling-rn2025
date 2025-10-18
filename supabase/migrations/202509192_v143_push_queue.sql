
-- push_queue + trigger to enqueue on notifications_inbox insert
create table if not exists public.push_queue (
  id bigserial primary key,
  inbox_id bigint references public.notifications_inbox(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  data jsonb,
  created_at timestamptz default now(),
  sent_at timestamptz
);

create or replace function public.on_inbox_insert_enqueue_push()
returns trigger language plpgsql as $$
begin
  insert into public.push_queue(inbox_id, user_id, title, body, data)
  values (NEW.id, NEW.user_id, NEW.title, NEW.body, NEW.data);
  return NEW;
end;
$$;

drop trigger if exists trg_inbox_insert_enqueue_push on public.notifications_inbox;
create trigger trg_inbox_insert_enqueue_push
after insert on public.notifications_inbox
for each row execute function public.on_inbox_insert_enqueue_push();
