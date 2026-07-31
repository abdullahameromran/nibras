-- Enforce that Phase 1 foreign-key references never cross school boundaries.
create or replace function public.enforce_same_school_reference()
returns trigger language plpgsql set search_path = public as $$
declare referenced_id uuid; referenced_school_id uuid;
begin
  referenced_id := nullif(to_jsonb(new) ->> tg_argv[1], '')::uuid;
  if referenced_id is null then return new; end if;
  execute format('select school_id from public.%I where id = $1', tg_argv[0]) into referenced_school_id using referenced_id;
  if referenced_school_id is null or referenced_school_id <> new.school_id then
    raise exception '% must belong to the same school as %', tg_argv[1], tg_table_name using errcode = '23514';
  end if;
  return new;
end; $$;

create or replace function public.enforce_phase1_person_scope()
returns trigger language plpgsql set search_path = public as $$
declare person_id uuid; expected_role public.user_role;
begin
  person_id := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid;
  expected_role := tg_argv[1]::public.user_role;
  if person_id is null then return new; end if;
  if not exists (
    select 1 from public.user_school_roles usr join public.profiles p on p.id = usr.user_id
    where usr.user_id = person_id and usr.school_id = new.school_id and usr.role = expected_role and usr.is_active and p.is_active
  ) then raise exception '% must be an active % in the same school', tg_argv[0], expected_role using errcode = '23514'; end if;
  return new;
end; $$;

do $$ declare item text[]; begin
  foreach item slice 1 in array array[
    array['classes','academic_years','academic_year_id'], array['classes','grade_levels','grade_level_id'],
    array['class_enrollments','classes','class_id'], array['teacher_subject_assignments','subjects','subject_id'],
    array['teacher_subject_assignments','classes','class_id'], array['timetable_entries','academic_years','academic_year_id'],
    array['timetable_entries','working_days','working_day_id'], array['timetable_entries','time_slots','time_slot_id'],
    array['timetable_entries','classes','class_id'], array['timetable_entries','subjects','subject_id'],
    array['lessons','classes','class_id'], array['lessons','subjects','subject_id'], array['attendance_records','lessons','lesson_id']
  ] loop
    execute format('drop trigger if exists trg_same_school_%I_%I on public.%I', item[1], item[3], item[1]);
    execute format('create trigger trg_same_school_%I_%I before insert or update on public.%I for each row execute function public.enforce_same_school_reference(%L,%L)', item[1], item[3], item[1], item[2], item[3]);
  end loop;
end $$;

drop trigger if exists trg_enrollment_student_scope on public.class_enrollments;
create trigger trg_enrollment_student_scope before insert or update on public.class_enrollments for each row execute function public.enforce_phase1_person_scope('student_id','student');
drop trigger if exists trg_assignment_teacher_scope on public.teacher_subject_assignments;
create trigger trg_assignment_teacher_scope before insert or update on public.teacher_subject_assignments for each row execute function public.enforce_phase1_person_scope('teacher_id','teacher');
drop trigger if exists trg_timetable_teacher_scope on public.timetable_entries;
create trigger trg_timetable_teacher_scope before insert or update on public.timetable_entries for each row execute function public.enforce_phase1_person_scope('teacher_id','teacher');
drop trigger if exists trg_lesson_teacher_scope on public.lessons;
create trigger trg_lesson_teacher_scope before insert or update on public.lessons for each row execute function public.enforce_phase1_person_scope('teacher_id','teacher');

create or replace function public.manage_school_member(p_school_id uuid,p_user_id uuid,p_role public.user_role,p_first_name text,p_last_name text default null,p_phone text default null,p_role_active boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('teacher'::public.user_role,'student'::public.user_role,'parent'::public.user_role) then raise exception 'unsupported school member role'; end if;
  if not public.user_has_school_role(p_school_id,array['school_admin']::public.user_role[]) then raise exception 'not authorized' using errcode='42501'; end if;
  if not exists(select 1 from public.user_school_roles where user_id=p_user_id and school_id=p_school_id and role=p_role) then raise exception 'school member role not found'; end if;
  update public.profiles set first_name=nullif(btrim(p_first_name),''),last_name=nullif(btrim(coalesce(p_last_name,'')),''),phone=nullif(btrim(coalesce(p_phone,'')),''),updated_at=now() where id=p_user_id;
  update public.user_school_roles set is_active=p_role_active where user_id=p_user_id and school_id=p_school_id and role=p_role;
  insert into public.audit_logs(school_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_school_id,auth.uid(),'manage_school_member','profiles',p_user_id,jsonb_build_object('role',p_role,'role_active',p_role_active));
end; $$;
revoke all on function public.manage_school_member(uuid,uuid,public.user_role,text,text,text,boolean) from public;
grant execute on function public.manage_school_member(uuid,uuid,public.user_role,text,text,text,boolean) to authenticated;

create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.teacher_subject_assignments tsa
    join public.classes c on c.id=p_class_id and c.school_id=tsa.school_id
    join public.user_school_roles usr on usr.user_id=tsa.teacher_id and usr.school_id=tsa.school_id and usr.role='teacher' and usr.is_active
    join public.profiles p on p.id=usr.user_id and p.is_active
    join public.schools s on s.id=tsa.school_id and s.is_active and s.deleted_at is null
    where tsa.teacher_id=auth.uid() and (tsa.class_id=p_class_id or tsa.class_id is null)
  ) or public.is_super_admin();
$$;

create or replace function public.is_parent_of_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.parent_student_links psl
    join public.user_school_roles pr on pr.user_id=psl.parent_id and pr.school_id=psl.school_id and pr.role='parent' and pr.is_active
    join public.user_school_roles sr on sr.user_id=psl.student_id and sr.school_id=psl.school_id and sr.role='student' and sr.is_active
    join public.profiles pp on pp.id=psl.parent_id and pp.is_active
    join public.profiles sp on sp.id=psl.student_id and sp.is_active
    join public.schools s on s.id=psl.school_id and s.is_active and s.deleted_at is null
    where psl.parent_id=auth.uid() and psl.student_id=p_student_id
  ) or public.is_super_admin();
$$;
