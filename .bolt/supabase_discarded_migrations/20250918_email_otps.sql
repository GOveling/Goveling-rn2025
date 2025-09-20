-- OTP storage
create table if not exists public.email_otps (
  id bigserial primary key,
  email text not null,
  code text not null,
  created_at timestamptz default now()
);
create index if not exists idx_email_otps_email on public.email_otps(email);
