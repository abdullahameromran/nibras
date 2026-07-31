-- School administrators must be able to view an inactive member in order to
-- edit or reactivate that member, while ordinary members only see active peers.
create or replace function public.can_view_school_profile(p_target_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_target_user_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1
      from public.user_school_roles actor
      join public.user_school_roles target on target.school_id = actor.school_id
      join public.schools s on s.id = actor.school_id
      where actor.user_id = auth.uid() and target.user_id = p_target_user_id
        and actor.is_active and public.is_profile_active(auth.uid())
        and s.is_active and s.deleted_at is null
        and (
          actor.role = 'school_admin'
          or (target.is_active and public.is_profile_active(p_target_user_id))
        )
    );
$$;
revoke all on function public.can_view_school_profile(uuid) from public;
grant execute on function public.can_view_school_profile(uuid) to authenticated;

drop policy if exists profiles_same_school on public.profiles;
create policy profiles_same_school on public.profiles for select
using (public.can_view_school_profile(id));
