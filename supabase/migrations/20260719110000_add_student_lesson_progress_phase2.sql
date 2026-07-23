-- Phase 2 lesson completion tracking for students.
-- This lets students mark lesson materials complete and gives teachers/admins
-- a simple progress view per lesson.

create table if not exists public.student_lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  lesson_id      uuid not null references public.lessons(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  completed_at   timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create index if not exists idx_slp_school on public.student_lesson_progress(school_id);
create index if not exists idx_slp_lesson on public.student_lesson_progress(lesson_id);
create index if not exists idx_slp_student on public.student_lesson_progress(student_id);

alter table public.student_lesson_progress enable row level security;

drop policy if exists la_select on public.lesson_attachments;
create policy la_select on public.lesson_attachments
for select
using (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_attachments.lesson_id
      and (
        public.user_has_school_role(l.school_id, array['school_admin']::user_role[])
        or l.teacher_id = auth.uid()
        or exists (
          select 1
          from public.class_enrollments ce
          where ce.class_id = l.class_id
            and (ce.student_id = auth.uid() or public.is_parent_of_student(ce.student_id))
        )
      )
  )
);

drop policy if exists la_write on public.lesson_attachments;
create policy la_write on public.lesson_attachments
for all
using (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_attachments.lesson_id
      and (l.teacher_id = auth.uid() or public.user_has_school_role(l.school_id, array['school_admin']::user_role[]))
  )
)
with check (
  exists (
    select 1
    from public.lessons l
    where l.id = lesson_attachments.lesson_id
      and (l.teacher_id = auth.uid() or public.user_has_school_role(l.school_id, array['school_admin']::user_role[]))
  )
);

drop policy if exists slp_select on public.student_lesson_progress;
create policy slp_select on public.student_lesson_progress
for select
using (
  public.user_has_school_role(school_id, array['school_admin']::user_role[])
  or exists (
    select 1
    from public.lessons l
    where l.id = student_lesson_progress.lesson_id
      and l.teacher_id = auth.uid()
  )
  or student_id = auth.uid()
  or public.is_parent_of_student(student_id)
);

drop policy if exists slp_insert on public.student_lesson_progress;
create policy slp_insert on public.student_lesson_progress
for insert
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.lessons l
    join public.class_enrollments ce on ce.class_id = l.class_id
    where l.id = student_lesson_progress.lesson_id
      and l.school_id = student_lesson_progress.school_id
      and ce.school_id = student_lesson_progress.school_id
      and ce.student_id = student_lesson_progress.student_id
  )
);

drop policy if exists slp_update on public.student_lesson_progress;
create policy slp_update on public.student_lesson_progress
for update
using (
  student_id = auth.uid()
  or public.user_has_school_role(school_id, array['school_admin']::user_role[])
)
with check (
  student_id = auth.uid()
  or public.user_has_school_role(school_id, array['school_admin']::user_role[])
);
