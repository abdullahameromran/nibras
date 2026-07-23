-- Fix announcement scope checks for seed/demo SQL and SQL editor runs.
-- The previous version checked auth.uid(), which fails when the current
-- session user is not the same as announcements.author_id.

create or replace function check_announcement_target_scope()
returns trigger
language plpgsql
as $$
declare
  v_author_id uuid;
  v_school_id uuid;
  v_is_admin boolean;
begin
  select a.author_id, a.school_id
    into v_author_id, v_school_id
  from announcements a
  where a.id = new.announcement_id;

  select exists (
    select 1
    from user_school_roles usr
    where usr.user_id = v_author_id
      and usr.is_active
      and (
        (usr.role = 'super_admin' and usr.school_id is null)
        or (usr.role = 'school_admin' and usr.school_id = v_school_id)
      )
  ) into v_is_admin;

  if not v_is_admin then
    if new.target_type <> 'class' then
      raise exception 'teachers may only target announcements at a specific class';
    end if;

    if not exists (
      select 1
      from teacher_subject_assignments tsa
      where tsa.teacher_id = v_author_id
        and tsa.class_id = new.target_id
    ) then
      raise exception 'teachers may only target classes they are assigned to';
    end if;
  end if;

  return new;
end $$;
