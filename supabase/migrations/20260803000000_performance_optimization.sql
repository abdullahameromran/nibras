-- Performance hardening based on live pg_stat_statements, index, and policy review.

-- ---------------------------------------------------------------------------
-- Consolidate hot RLS helpers so each check scans active actor state once.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_school_roles usr
    join public.profiles p on p.id = usr.user_id
    where usr.user_id = (select auth.uid())
      and usr.role = 'super_admin'
      and usr.is_active
      and p.is_active
  );
$$;

create or replace function public.user_has_school_role(p_school_id uuid, p_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_school_roles usr
    join public.profiles p on p.id = usr.user_id and p.is_active
    left join public.schools s on s.id = usr.school_id
    where usr.user_id = (select auth.uid())
      and usr.is_active
      and (
        usr.role = 'super_admin'
        or (
          usr.school_id = p_school_id
          and usr.role = any(p_roles)
          and s.is_active
          and s.deleted_at is null
        )
      )
  );
$$;

create or replace function public.teacher_assigned_to(
  p_teacher_id uuid,
  p_school_id uuid,
  p_class_id uuid,
  p_subject_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_subject_assignments tsa
    join public.user_school_roles usr
      on usr.user_id = tsa.teacher_id
     and usr.school_id = tsa.school_id
     and usr.role = 'teacher'
     and usr.is_active
    join public.profiles p on p.id = tsa.teacher_id and p.is_active
    join public.schools s on s.id = tsa.school_id and s.is_active and s.deleted_at is null
    where tsa.teacher_id = p_teacher_id
      and tsa.school_id = p_school_id
      and tsa.subject_id = p_subject_id
      and (tsa.class_id = p_class_id or tsa.class_id is null)
  );
$$;

-- ---------------------------------------------------------------------------
-- Atomic assessment creation removes the frontend question/choice N+1 loop.
-- ---------------------------------------------------------------------------
create or replace function public.create_test_with_questions(p_test jsonb, p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test public.monthly_tests%rowtype;
  v_question public.test_questions%rowtype;
  v_question_json jsonb;
  v_choice_json jsonb;
  v_school_id uuid := (p_test->>'school_id')::uuid;
  v_class_id uuid := (p_test->>'class_id')::uuid;
  v_subject_id uuid := (p_test->>'subject_id')::uuid;
  v_teacher_id uuid := (p_test->>'teacher_id')::uuid;
begin
  if nullif(trim(p_test->>'title'), '') is null then
    raise exception 'test title is required' using errcode = '22023';
  end if;
  if not public.user_has_school_role(v_school_id, array['school_admin']::public.user_role[])
     and not (
       v_teacher_id = (select auth.uid())
       and public.teacher_assigned_to(v_teacher_id, v_school_id, v_class_id, v_subject_id)
     ) then
    raise exception 'not authorized to create this test' using errcode = '42501';
  end if;

  insert into public.monthly_tests (
    school_id, class_id, subject_id, teacher_id, title, test_date, duration_minutes, kind
  ) values (
    v_school_id,
    v_class_id,
    v_subject_id,
    v_teacher_id,
    trim(p_test->>'title'),
    (p_test->>'test_date')::date,
    coalesce((p_test->>'duration_minutes')::smallint, 60),
    coalesce((p_test->>'kind')::public.exam_type, 'monthly'::public.exam_type)
  ) returning * into v_test;

  for v_question_json in select value from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    insert into public.test_questions (test_id, question_text, sort_order)
    values (
      v_test.id,
      trim(v_question_json->>'question_text'),
      coalesce((v_question_json->>'sort_order')::smallint, 0)
    ) returning * into v_question;

    for v_choice_json in select value from jsonb_array_elements(coalesce(v_question_json->'choices', '[]'::jsonb)) loop
      insert into public.test_choices (question_id, choice_text, is_correct, sort_order)
      values (
        v_question.id,
        trim(v_choice_json->>'choice_text'),
        coalesce((v_choice_json->>'is_correct')::boolean, false),
        coalesce((v_choice_json->>'sort_order')::smallint, 0)
      );
    end loop;
  end loop;

  return to_jsonb(v_test);
end;
$$;

create or replace function public.create_homework_with_questions(p_homework jsonb, p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_homework public.homework%rowtype;
  v_lesson public.lessons%rowtype;
  v_question public.homework_questions%rowtype;
  v_question_json jsonb;
  v_choice_json jsonb;
  v_school_id uuid := (p_homework->>'school_id')::uuid;
  v_lesson_id uuid := (p_homework->>'lesson_id')::uuid;
begin
  select * into v_lesson
  from public.lessons
  where id = v_lesson_id and school_id = v_school_id and deleted_at is null;

  if not found then
    raise exception 'lesson does not belong to this school' using errcode = '23503';
  end if;
  if nullif(trim(p_homework->>'title'), '') is null then
    raise exception 'homework title is required' using errcode = '22023';
  end if;
  if not public.user_has_school_role(v_school_id, array['school_admin']::public.user_role[])
     and not (
       v_lesson.teacher_id = (select auth.uid())
       and public.teacher_assigned_to(v_lesson.teacher_id, v_school_id, v_lesson.class_id, v_lesson.subject_id)
     ) then
    raise exception 'not authorized to create this homework' using errcode = '42501';
  end if;

  insert into public.homework (school_id, lesson_id, title, due_date)
  values (v_school_id, v_lesson_id, trim(p_homework->>'title'), (p_homework->>'due_date')::timestamptz)
  returning * into v_homework;

  for v_question_json in select value from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    insert into public.homework_questions (homework_id, question_text, sort_order)
    values (
      v_homework.id,
      trim(v_question_json->>'question_text'),
      coalesce((v_question_json->>'sort_order')::smallint, 0)
    ) returning * into v_question;

    for v_choice_json in select value from jsonb_array_elements(coalesce(v_question_json->'choices', '[]'::jsonb)) loop
      insert into public.homework_choices (question_id, choice_text, is_correct, sort_order)
      values (
        v_question.id,
        trim(v_choice_json->>'choice_text'),
        coalesce((v_choice_json->>'is_correct')::boolean, false),
        coalesce((v_choice_json->>'sort_order')::smallint, 0)
      );
    end loop;
  end loop;

  return to_jsonb(v_homework);
end;
$$;

revoke all on function public.create_test_with_questions(jsonb,jsonb) from public;
revoke all on function public.create_homework_with_questions(jsonb,jsonb) from public;
grant execute on function public.create_test_with_questions(jsonb,jsonb) to authenticated;
grant execute on function public.create_homework_with_questions(jsonb,jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- One paginated message query replaces two unbounded reads and profile N+1.
-- ---------------------------------------------------------------------------
create or replace function public.get_message_page(
  p_school_id uuid,
  p_before timestamptz default null,
  p_limit integer default 100
)
returns table (
  message_id uuid,
  school_id uuid,
  sender_id uuid,
  recipient_id uuid,
  partner_id uuid,
  subject text,
  body text,
  is_broadcast boolean,
  created_at timestamptz,
  recipient_row_id uuid,
  is_read boolean,
  read_at timestamptz,
  partner_email text,
  partner_first_name text,
  partner_last_name text,
  partner_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.school_id,
    m.sender_id,
    mr.recipient_id,
    partner.id,
    m.subject::text,
    m.body,
    m.is_broadcast,
    m.created_at,
    mr.id,
    mr.is_read,
    mr.read_at,
    partner.email::text,
    partner.first_name::text,
    partner.last_name::text,
    partner.avatar_url::text
  from public.messages m
  join public.message_recipients mr on mr.message_id = m.id
  left join public.profiles partner
    on partner.id = case when m.sender_id = (select auth.uid()) then mr.recipient_id else m.sender_id end
  where m.school_id = p_school_id
    and m.deleted_at is null
    and (p_before is null or m.created_at < p_before)
    and (m.sender_id = (select auth.uid()) or mr.recipient_id = (select auth.uid()))
    and public.user_has_school_role(
      p_school_id,
      array['school_admin','teacher','student','parent']::public.user_role[]
    )
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

revoke all on function public.get_message_page(uuid,timestamptz,integer) from public;
grant execute on function public.get_message_page(uuid,timestamptz,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Roll scores up once per answer statement rather than once per answer row.
-- ---------------------------------------------------------------------------
create or replace function public.compute_homework_scores_statement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  with affected as (
    select distinct submission_id from new_answer_rows
  ), calculated as (
    select
      hs.id,
      count(distinct hq.id) as total,
      count(distinct ha.id) filter (where ha.is_correct) as correct
    from affected x
    join public.homework_submissions hs on hs.id = x.submission_id
    join public.homework_questions hq on hq.homework_id = hs.homework_id
    left join public.homework_answers ha
      on ha.submission_id = hs.id and ha.question_id = hq.id
    group by hs.id
  )
  update public.homework_submissions hs
  set score = case when c.total > 0 then round(100.0 * c.correct / c.total, 2) else null end,
      graded_at = case when c.total > 0 then now() else null end
  from calculated c
  where hs.id = c.id;
  return null;
end;
$$;

create or replace function public.compute_test_scores_statement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  with affected as (
    select distinct submission_id from new_answer_rows
  ), calculated as (
    select
      ts.id,
      count(distinct tq.id) as total,
      count(distinct ta.id) filter (where ta.is_correct) as correct
    from affected x
    join public.test_submissions ts on ts.id = x.submission_id
    join public.test_questions tq on tq.test_id = ts.test_id
    left join public.test_answers ta
      on ta.submission_id = ts.id and ta.question_id = tq.id
    group by ts.id
  )
  update public.test_submissions ts
  set score = case when c.total > 0 then round(100.0 * c.correct / c.total, 2) else null end,
      graded_at = case when c.total > 0 then now() else null end
  from calculated c
  where ts.id = c.id;
  return null;
end;
$$;

drop trigger if exists trg_compute_homework_score on public.homework_answers;
drop trigger if exists trg_compute_test_score on public.test_answers;
drop trigger if exists trg_compute_test_submission_score on public.test_answers;

create trigger trg_compute_homework_scores_insert
after insert on public.homework_answers
referencing new table as new_answer_rows
for each statement execute function public.compute_homework_scores_statement();
create trigger trg_compute_homework_scores_update
after update on public.homework_answers
referencing new table as new_answer_rows
for each statement execute function public.compute_homework_scores_statement();
create trigger trg_compute_test_scores_insert
after insert on public.test_answers
referencing new table as new_answer_rows
for each statement execute function public.compute_test_scores_statement();
create trigger trg_compute_test_scores_update
after update on public.test_answers
referencing new table as new_answer_rows
for each statement execute function public.compute_test_scores_statement();

-- ---------------------------------------------------------------------------
-- Query- and policy-shaped indexes.
-- ---------------------------------------------------------------------------
create index if not exists idx_test_questions_test_sort
  on public.test_questions(test_id, sort_order);
create index if not exists idx_test_choices_question_sort
  on public.test_choices(question_id, sort_order);
create index if not exists idx_hw_questions_homework_sort
  on public.homework_questions(homework_id, sort_order);
create index if not exists idx_hw_choices_question_sort
  on public.homework_choices(question_id, sort_order);
create index if not exists idx_usr_user_active_role_school
  on public.user_school_roles(user_id, role, school_id) where is_active;
create index if not exists idx_tsa_teacher_subject_class_exact
  on public.teacher_subject_assignments(teacher_id, school_id, subject_id, class_id)
  where class_id is not null;
create index if not exists idx_tsa_teacher_subject_global
  on public.teacher_subject_assignments(teacher_id, school_id, subject_id)
  where class_id is null;
create index if not exists idx_messages_school_sender_created
  on public.messages(school_id, sender_id, created_at desc) where deleted_at is null;
create index if not exists idx_message_recipients_recipient_message
  on public.message_recipients(recipient_id, message_id) include (is_read, read_at);
create index if not exists idx_enrollments_school_active_enrolled
  on public.class_enrollments(school_id, class_id, enrolled_at desc, student_id)
  where status = 'active';
create index if not exists idx_attendance_school_recorded
  on public.attendance_records(school_id, recorded_at desc);
create index if not exists idx_lessons_teacher_active_date
  on public.lessons(school_id, teacher_id, lesson_date desc) where deleted_at is null;
create index if not exists idx_tests_class_kind_active_date
  on public.monthly_tests(school_id, class_id, kind, test_date desc) where deleted_at is null;
create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_id, created_at desc);
create index if not exists idx_timetable_school_year_class
  on public.timetable_entries(school_id, academic_year_id, class_id);
create index if not exists idx_timetable_teacher_conflict
  on public.timetable_entries(school_id, teacher_id, working_day_id, time_slot_id);

-- Prefix-only indexes duplicated by unique/composite indexes.
drop index if exists public.idx_ar_lesson;
drop index if exists public.idx_audit_actor;
drop index if exists public.idx_dt_user;
drop index if exists public.idx_psl_parent;
drop index if exists public.idx_slp_lesson;
drop index if exists public.idx_tsa_teacher;
drop index if exists public.idx_usr_user;

analyze public.test_questions;
analyze public.test_choices;
analyze public.homework_questions;
analyze public.homework_choices;
analyze public.messages;
analyze public.message_recipients;
