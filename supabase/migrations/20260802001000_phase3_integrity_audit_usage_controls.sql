-- Phase 3 follow-up: database-enforced usage limits, assessment integrity,
-- and an audit trail for every permanent deletion path.

create or replace function public.check_teacher_quota()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.role <> 'teacher' or new.school_id is null or not new.is_active then
    return new;
  end if;
  if tg_op='UPDATE' and old.role='teacher' and old.school_id=new.school_id and old.is_active then
    return new;
  end if;

  select sp.max_teachers into v_max
  from school_subscriptions ss join subscription_plans sp on sp.id=ss.plan_id
  where ss.school_id=new.school_id and ss.status in ('trialing','active')
  order by ss.created_at desc limit 1;

  if v_max is not null and v_max > 0 then
    select count(distinct user_id) into v_count from user_school_roles
    where school_id=new.school_id and role='teacher' and is_active;
    if v_count >= v_max then
      raise exception 'teacher quota (%) reached for this school plan', v_max;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_check_teacher_quota on public.user_school_roles;
create trigger trg_check_teacher_quota before insert or update of role,school_id,is_active on public.user_school_roles
for each row execute function public.check_teacher_quota();

create or replace function public.validate_homework_answer_scope()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(
    select 1 from homework_submissions s
    join homework_questions q on q.homework_id=s.homework_id
    where s.id=new.submission_id and q.id=new.question_id
  ) then raise exception 'question does not belong to the submitted homework'; end if;
  if new.selected_choice_id is not null and not exists(
    select 1 from homework_choices c where c.id=new.selected_choice_id and c.question_id=new.question_id
  ) then raise exception 'choice does not belong to the homework question'; end if;
  return new;
end $$;
drop trigger if exists trg_validate_homework_answer_scope on public.homework_answers;
create trigger trg_validate_homework_answer_scope before insert or update on public.homework_answers
for each row execute function public.validate_homework_answer_scope();

create or replace function public.validate_test_answer_scope()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(
    select 1 from test_submissions s join test_questions q on q.test_id=s.test_id
    where s.id=new.submission_id and q.id=new.question_id
  ) then raise exception 'question does not belong to the submitted test'; end if;
  if new.selected_choice_id is not null and not exists(
    select 1 from test_choices c where c.id=new.selected_choice_id and c.question_id=new.question_id
  ) then raise exception 'choice does not belong to the test question'; end if;
  return new;
end $$;
drop trigger if exists trg_validate_test_answer_scope on public.test_answers;
create trigger trg_validate_test_answer_scope before insert or update on public.test_answers
for each row execute function public.validate_test_answer_scope();

-- Direct hard deletes are Super Admin-only through RLS. These triggers make
-- their audit trail mandatory even when a caller bypasses the preferred Edge
-- Function soft-delete workflow.
drop trigger if exists trg_audit_lessons_delete on public.lessons;
create trigger trg_audit_lessons_delete after delete on public.lessons for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_homework_delete on public.homework;
create trigger trg_audit_homework_delete after delete on public.homework for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_monthly_tests_delete on public.monthly_tests;
create trigger trg_audit_monthly_tests_delete after delete on public.monthly_tests for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_announcements_delete on public.announcements;
create trigger trg_audit_announcements_delete after delete on public.announcements for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_messages_delete on public.messages;
create trigger trg_audit_messages_delete after delete on public.messages for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_enrollments_delete on public.class_enrollments;
create trigger trg_audit_enrollments_delete after delete on public.class_enrollments for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_assignments_delete on public.teacher_subject_assignments;
create trigger trg_audit_assignments_delete after delete on public.teacher_subject_assignments for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_parent_links_delete on public.parent_student_links;
create trigger trg_audit_parent_links_delete after delete on public.parent_student_links for each row execute function public.audit_row_change();
drop trigger if exists trg_audit_student_documents_delete on public.student_documents;
create trigger trg_audit_student_documents_delete after delete on public.student_documents for each row execute function public.audit_row_change();

