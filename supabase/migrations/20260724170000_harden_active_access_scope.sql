-- Harden active/inactive access checks for Phase 1 RBAC and tenancy.
-- This ensures inactive profiles or inactive schools do not keep access
-- through stale role rows, while Super Admin still retains platform scope.

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.user_school_roles usr
    join public.profiles p on p.id = usr.user_id
    where usr.user_id = auth.uid()
      and usr.role = 'super_admin'
      and usr.is_active
      and p.is_active
  );
$$;

create or replace function public.user_has_school_role(p_school_id uuid, p_roles user_role[])
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.user_school_roles usr
    join public.profiles p on p.id = usr.user_id
    join public.schools s on s.id = usr.school_id
    where usr.user_id = auth.uid()
      and usr.school_id = p_school_id
      and usr.role = any(p_roles)
      and usr.is_active
      and p.is_active
      and s.is_active
      and s.deleted_at is null
  ) or public.is_super_admin();
$$;

drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools
for select
using (
  public.is_super_admin()
  or (
    deleted_at is null
    and public.user_has_school_role(id, array['school_admin','teacher','student','parent']::user_role[])
  )
);

drop policy if exists profiles_same_school on public.profiles;
create policy profiles_same_school on public.profiles
for select
using (
  exists (
    select 1
    from public.user_school_roles a
    join public.user_school_roles b on a.school_id = b.school_id
    join public.schools s on s.id = a.school_id
    join public.profiles actor_profile on actor_profile.id = a.user_id
    join public.profiles target_profile on target_profile.id = b.user_id
    where a.user_id = auth.uid()
      and b.user_id = public.profiles.id
      and a.is_active
      and b.is_active
      and actor_profile.is_active
      and target_profile.is_active
      and s.is_active
      and s.deleted_at is null
  )
  or public.is_super_admin()
);
