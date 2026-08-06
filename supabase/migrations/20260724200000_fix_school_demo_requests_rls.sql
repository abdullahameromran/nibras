-- ============================================================
-- FIX: Ensure school_demo_requests table exists with correct
--      RLS policies so the landing page form can save data.
-- Run this in the Supabase SQL Editor on your live project.
-- ============================================================

-- 1. Create the table if it doesn't exist
create table if not exists public.school_demo_requests (
  id                uuid primary key default gen_random_uuid(),
  school_name       varchar(255) not null,
  director_name     varchar(255) not null,
  phone             varchar(30) not null,
  email             varchar(255),
  address           text,
  governorate       varchar(100),
  student_count     varchar(50),
  school_type       varchar(50),
  message           text,
  agreed_to_contact boolean not null default false,
  source            varchar(50) not null default 'landing_page_modal',
  status            varchar(20) not null default 'new',
  contacted_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- 2. Useful indexes
create index if not exists idx_school_demo_requests_status  on public.school_demo_requests(status);
create index if not exists idx_school_demo_requests_created on public.school_demo_requests(created_at desc);
create index if not exists idx_school_demo_requests_email   on public.school_demo_requests(email);

-- 3. Grant permissions to anonymous and authenticated users
grant insert on public.school_demo_requests to anon, authenticated;
grant select on public.school_demo_requests to authenticated, service_role;

-- 4. Enable RLS
alter table public.school_demo_requests enable row level security;

-- 5. INSERT policy — anyone (even unauthenticated visitors) can submit a lead
drop policy if exists school_demo_requests_insert on public.school_demo_requests;
create policy school_demo_requests_insert on public.school_demo_requests
  for insert
  with check (true);

-- 6. SELECT policy — only super admins can read leads
drop policy if exists school_demo_requests_select on public.school_demo_requests;
create policy school_demo_requests_select on public.school_demo_requests
  for select
  using (public.is_super_admin());
