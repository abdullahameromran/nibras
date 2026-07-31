create or replace function public.enroll_school_student(p_school_id uuid, p_student_id uuid, p_class_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_year_id uuid;
begin
  if not public.user_has_school_role(p_school_id, array['school_admin']::public.user_role[]) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select academic_year_id into v_year_id from public.classes where id = p_class_id and school_id = p_school_id;
  if v_year_id is null then raise exception 'class does not belong to this school'; end if;
  if not exists (
    select 1 from public.user_school_roles
    where user_id = p_student_id and school_id = p_school_id and role = 'student'
  ) then raise exception 'student does not belong to this school'; end if;

  update public.class_enrollments ce set status = 'inactive', status_changed_at = now()
  where ce.school_id = p_school_id and ce.student_id = p_student_id and ce.status = 'active'
    and ce.class_id in (select id from public.classes where school_id = p_school_id and academic_year_id = v_year_id)
    and ce.class_id <> p_class_id;

  insert into public.class_enrollments(school_id, class_id, student_id, status, status_changed_at)
  values(p_school_id, p_class_id, p_student_id, 'active', now())
  on conflict(class_id, student_id) do update set status = 'active', status_changed_at = now();
end; $$;
revoke all on function public.enroll_school_student(uuid,uuid,uuid) from public;
grant execute on function public.enroll_school_student(uuid,uuid,uuid) to authenticated;
