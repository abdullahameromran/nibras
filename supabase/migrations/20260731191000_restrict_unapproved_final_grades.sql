-- Students and parents may only read final grades after school approval.
drop policy if exists fg_select on public.final_grades;
create policy fg_select on public.final_grades
for select
using (
  (deleted_at is null or public.is_super_admin())
  and (
    public.user_has_school_role(school_id, array['school_admin']::public.user_role[])
    or public.is_super_admin()
    or (
      status = 'approved'
      and (student_id = auth.uid() or public.is_parent_of_student(student_id))
    )
    or exists (
      select 1
      from public.teacher_subject_assignments tsa
      where tsa.school_id = final_grades.school_id
        and tsa.subject_id = final_grades.subject_id
        and tsa.teacher_id = auth.uid()
        and (tsa.class_id = final_grades.class_id or tsa.class_id is null)
    )
  )
);
