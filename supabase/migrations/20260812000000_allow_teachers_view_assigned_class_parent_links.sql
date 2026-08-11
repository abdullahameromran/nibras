-- Teachers need the parent -> student relationship to build the direct-message
-- recipient directory. Limit visibility to parents of actively enrolled
-- students in classes assigned to the current teacher.

create or replace function public.can_view_parent_student_link_for_messaging(
  p_school_id uuid,
  p_parent_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or p_parent_id = auth.uid()
    or p_student_id = auth.uid()
    or public.user_has_school_role(
      p_school_id,
      array['school_admin']::public.user_role[]
    )
    or (
      public.user_has_school_role(
        p_school_id,
        array['teacher']::public.user_role[]
      )
      and exists (
        select 1
        from public.class_enrollments ce
        join public.teacher_subject_assignments tsa
          on tsa.school_id = ce.school_id
         and tsa.class_id = ce.class_id
        where ce.school_id = p_school_id
          and ce.student_id = p_student_id
          and ce.status = 'active'
          and tsa.teacher_id = auth.uid()
      )
    );
$$;

revoke all on function public.can_view_parent_student_link_for_messaging(uuid, uuid, uuid) from public;
grant execute on function public.can_view_parent_student_link_for_messaging(uuid, uuid, uuid) to authenticated;

drop policy if exists psl_select on public.parent_student_links;
drop policy if exists parent_student_links_select on public.parent_student_links;
drop policy if exists parent_student_links_messaging_select on public.parent_student_links;

-- Clean up the earlier manually applied helper after removing the policy that
-- depended on it. The replacement below also checks active enrollment and an
-- active teacher role, so this broader legacy helper must no longer be used.
drop function if exists public.is_teacher_of_student(uuid, uuid);

create policy parent_student_links_messaging_select
on public.parent_student_links
for select
to authenticated
using (
  public.can_view_parent_student_link_for_messaging(
    school_id,
    parent_id,
    student_id
  )
);
