-- ============================================================
-- FIX: school_demo_requests — fix SELECT and UPDATE policies
-- so super admins can read and update leads in the dashboard.
-- Run this in the Supabase SQL Editor on your live project.
-- ============================================================

-- 1. Drop old policies
drop policy if exists school_demo_requests_insert on public.school_demo_requests;
drop policy if exists school_demo_requests_select on public.school_demo_requests;
drop policy if exists school_demo_requests_update on public.school_demo_requests;

-- 2. INSERT: anyone (anon + authenticated) can submit the landing page form
create policy school_demo_requests_insert on public.school_demo_requests
  for insert
  with check (true);

-- 3. SELECT: super admins can read all rows
create policy school_demo_requests_select on public.school_demo_requests
  for select
  using (
    exists (
      select 1
      from public.user_school_roles
      where user_id  = auth.uid()
        and role     = 'super_admin'
        and is_active
    )
  );

-- 4. UPDATE: super admins can update lead status / contacted_at
create policy school_demo_requests_update on public.school_demo_requests
  for update
  using (
    exists (
      select 1
      from public.user_school_roles
      where user_id  = auth.uid()
        and role     = 'super_admin'
        and is_active
    )
  )
  with check (true);

-- 5. Make sure grants are in place
grant insert                  on public.school_demo_requests to anon, authenticated;
grant select, update          on public.school_demo_requests to authenticated, service_role;
