-- Fix infinite recursion in profiles RLS after active-access hardening.
-- The previous policy joined public.profiles inside a policy on public.profiles,
-- which causes Postgres to recurse while evaluating select access.

create or replace function public.is_profile_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.is_active
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_profile_active(auth.uid())
    and exists (
      select 1
      from public.user_school_roles usr
      where usr.user_id = auth.uid()
        and usr.role = 'super_admin'
        and usr.is_active
    );
$$;

create or replace function public.user_has_school_role(p_school_id uuid, p_roles user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    public.is_profile_active(auth.uid())
    and exists (
      select 1
      from public.user_school_roles usr
      join public.schools s on s.id = usr.school_id
      where usr.user_id = auth.uid()
        and usr.school_id = p_school_id
        and usr.role = any(p_roles)
        and usr.is_active
        and s.is_active
        and s.deleted_at is null
    )
  ) or public.is_super_admin();
$$;

drop policy if exists profiles_same_school on public.profiles;
create policy profiles_same_school on public.profiles
for select
using (
  public.is_super_admin()
  or (
    public.is_profile_active(auth.uid())
    and public.is_profile_active(public.profiles.id)
    and exists (
      select 1
      from public.user_school_roles a
      join public.user_school_roles b on a.school_id = b.school_id
      join public.schools s on s.id = a.school_id
      where a.user_id = auth.uid()
        and b.user_id = public.profiles.id
        and a.is_active
        and b.is_active
        and s.is_active
        and s.deleted_at is null
    )
  )
);
