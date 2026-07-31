create or replace function public.get_visible_teacher_profiles(p_school_id uuid)
returns table(id uuid,email text,first_name text,last_name text,avatar_url text)
language sql stable security definer set search_path=public as $$
  with visible_classes as (
    select ce.class_id from public.class_enrollments ce where ce.school_id=p_school_id and ce.status='active' and ce.student_id=auth.uid()
    union
    select ce.class_id from public.parent_student_links psl join public.class_enrollments ce on ce.student_id=psl.student_id and ce.school_id=psl.school_id and ce.status='active' where psl.school_id=p_school_id and psl.parent_id=auth.uid()
  )
  select distinct p.id,p.email::text,p.first_name::text,p.last_name::text,p.avatar_url
  from public.teacher_subject_assignments tsa
  join visible_classes vc on tsa.class_id=vc.class_id or tsa.class_id is null
  join public.profiles p on p.id=tsa.teacher_id and p.is_active
  join public.user_school_roles usr on usr.user_id=tsa.teacher_id and usr.school_id=tsa.school_id and usr.role='teacher' and usr.is_active
  where tsa.school_id=p_school_id and public.user_has_school_role(p_school_id,array['student','parent']::public.user_role[]);
$$;
revoke all on function public.get_visible_teacher_profiles(uuid) from public;
grant execute on function public.get_visible_teacher_profiles(uuid) to authenticated;
