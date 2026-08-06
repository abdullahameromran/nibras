-- Phase 1 role visibility: enforce assigned/own class access in the database.
create or replace function public.can_view_phase1_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id and (
      public.user_has_school_role(c.school_id, array['school_admin']::public.user_role[])
      or public.is_teacher_of_class(c.id)
      or exists (
        select 1 from public.class_enrollments ce
        where ce.school_id = c.school_id and ce.class_id = c.id and ce.status = 'active'
          and (
            (ce.student_id = auth.uid() and public.user_has_school_role(c.school_id, array['student']::public.user_role[]))
            or public.is_parent_of_student(ce.student_id)
          )
      )
    )
  ) or public.is_super_admin();
$$;
revoke all on function public.can_view_phase1_class(uuid) from public;
grant execute on function public.can_view_phase1_class(uuid) to authenticated;

drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select using (
  public.can_view_phase1_class(id)
);

drop policy if exists tsa_select on public.teacher_subject_assignments;
create policy tsa_select on public.teacher_subject_assignments for select using (
  public.user_has_school_role(school_id, array['school_admin']::public.user_role[])
  or teacher_id = auth.uid()
  or (class_id is not null and public.can_view_phase1_class(class_id))
);

drop policy if exists tte_select on public.timetable_entries;
create policy tte_select on public.timetable_entries for select using (
  public.can_view_phase1_class(class_id)
);

-- A school member may only update their own profile. School administrators use
-- manage_school_member(), which validates the target school and role.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone, avatar_url, notification_preferences, updated_at) on public.profiles to authenticated;
