-- Create announcements and their audience targets in one authorized transaction.
-- The previous two-step browser insert could fail the announcements RLS check
-- for valid teachers/super admins and could leave an orphan row if target insert
-- authorization failed.

drop policy if exists ann_insert_phase3 on public.announcements;
create policy ann_insert_phase3
on public.announcements
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    public.is_super_admin()
    or public.user_has_school_role(
      school_id,
      array['school_admin', 'teacher']::public.user_role[]
    )
  )
);

create or replace function public.create_announcement_with_targets(
  p_school_id uuid,
  p_title text,
  p_body text,
  p_is_published boolean default false,
  p_targets jsonb default '[]'::jsonb
)
returns public.announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_is_super_admin boolean := false;
  v_is_school_admin boolean := false;
  v_is_teacher boolean := false;
  v_target jsonb;
  v_target_type text;
  v_target_id uuid;
  v_target_role text;
  v_announcement public.announcements;
begin
  if v_actor_id is null then
    raise exception 'not authenticated';
  end if;

  if p_school_id is null then
    raise exception 'school is required';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'announcement title is required';
  end if;

  if nullif(btrim(p_body), '') is null then
    raise exception 'announcement body is required';
  end if;

  if jsonb_typeof(coalesce(p_targets, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_targets, '[]'::jsonb)) = 0 then
    raise exception 'at least one announcement target is required';
  end if;

  select public.is_super_admin() into v_is_super_admin;

  select exists (
    select 1
    from public.user_school_roles usr
    join public.profiles p on p.id = usr.user_id and p.is_active
    join public.schools s on s.id = usr.school_id and s.is_active and s.deleted_at is null
    where usr.user_id = v_actor_id
      and usr.school_id = p_school_id
      and usr.role = 'school_admin'
      and usr.is_active
  ) into v_is_school_admin;

  select exists (
    select 1
    from public.user_school_roles usr
    join public.profiles p on p.id = usr.user_id and p.is_active
    join public.schools s on s.id = usr.school_id and s.is_active and s.deleted_at is null
    where usr.user_id = v_actor_id
      and usr.school_id = p_school_id
      and usr.role = 'teacher'
      and usr.is_active
  ) into v_is_teacher;

  if not (v_is_super_admin or v_is_school_admin or v_is_teacher) then
    raise exception 'not authorized to create announcements for this school';
  end if;

  -- Validate every audience row before inserting anything. Teachers are
  -- intentionally restricted to classes they actively teach.
  for v_target in
    select value from jsonb_array_elements(p_targets)
  loop
    v_target_type := v_target ->> 'target_type';
    v_target_role := nullif(v_target ->> 'target_role', '');
    v_target_id := case
      when nullif(v_target ->> 'target_id', '') is null then null
      else (v_target ->> 'target_id')::uuid
    end;

    if v_target_type is null or v_target_type not in ('school', 'grade_level', 'class', 'role') then
      raise exception 'invalid announcement target type';
    end if;

    if v_is_teacher
       and not (v_is_super_admin or v_is_school_admin)
       and not (v_target_type = 'class' and v_target_id is not null) then
      raise exception 'teachers may only target announcements at a specific class';
    end if;

    if v_target_type = 'school' then
      if v_target_id is not null or v_target_role is not null then
        raise exception 'invalid school announcement target';
      end if;
    elsif v_target_type = 'grade_level' then
      if v_target_id is null or v_target_role is not null or not exists (
        select 1 from public.grade_levels gl
        where gl.id = v_target_id and gl.school_id = p_school_id
      ) then
        raise exception 'grade level does not belong to this school';
      end if;
    elsif v_target_type = 'class' then
      if v_target_id is null or v_target_role is not null or not exists (
        select 1 from public.classes c
        where c.id = v_target_id and c.school_id = p_school_id
      ) then
        raise exception 'class does not belong to this school';
      end if;

      if v_is_teacher
         and not (v_is_super_admin or v_is_school_admin)
         and not exists (
        select 1
        from public.teacher_subject_assignments tsa
        where tsa.teacher_id = v_actor_id
          and tsa.school_id = p_school_id
          and (tsa.class_id = v_target_id or tsa.class_id is null)
      ) then
        raise exception 'teachers may only target classes they are assigned to';
      end if;
    elsif v_target_type = 'role' then
      if v_target_id is not null
         or v_target_role is null
         or v_target_role not in ('school_admin', 'teacher', 'student', 'parent') then
        raise exception 'invalid announcement role target';
      end if;
    end if;
  end loop;

  insert into public.announcements (
    school_id,
    author_id,
    title,
    body,
    is_published,
    published_at
  ) values (
    p_school_id,
    v_actor_id,
    btrim(p_title),
    btrim(p_body),
    coalesce(p_is_published, false),
    case when coalesce(p_is_published, false) then now() else null end
  )
  returning * into v_announcement;

  insert into public.announcement_targets (
    announcement_id,
    target_type,
    target_id,
    target_role
  )
  select
    v_announcement.id,
    (target ->> 'target_type')::public.announcement_target_type,
    nullif(target ->> 'target_id', '')::uuid,
    nullif(target ->> 'target_role', '')::public.user_role
  from jsonb_array_elements(p_targets) as targets(target);

  return v_announcement;
end;
$$;

revoke all on function public.create_announcement_with_targets(uuid, text, text, boolean, jsonb) from public;
grant execute on function public.create_announcement_with_targets(uuid, text, text, boolean, jsonb) to authenticated;
