-- Public marketing waitlist for schools interested in Smart Class.
-- This is used by the landing page before a user signs up.

create table if not exists public.waitlist_signups (
  id            uuid primary key default gen_random_uuid(),
  full_name     varchar(150) not null,
  email         varchar(255) not null unique,
  phone         varchar(30) not null,
  source        varchar(50) not null default 'landing_page',
  status        varchar(20) not null default 'new',
  contacted_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_waitlist_status on public.waitlist_signups(status);
create index if not exists idx_waitlist_created on public.waitlist_signups(created_at desc);
grant insert on public.waitlist_signups to anon, authenticated;
grant select on public.waitlist_signups to authenticated, service_role;

alter table public.waitlist_signups enable row level security;

drop policy if exists waitlist_insert on public.waitlist_signups;
create policy waitlist_insert on public.waitlist_signups
for insert
with check (true);

drop policy if exists waitlist_select on public.waitlist_signups;
create policy waitlist_select on public.waitlist_signups
for select
using (public.is_super_admin());
