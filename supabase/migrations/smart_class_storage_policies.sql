-- =====================================================================
-- SMART CLASS — SUPABASE STORAGE BUCKETS + RLS
-- Run after smart_class_schema.sql
-- Path convention everywhere: {school_id}/{...}/{filename}
-- so policies can pattern-match the school_id straight out of the path.
-- =====================================================================

insert into storage.buckets (id, name, public) values
  ('school-logos', 'school-logos', true),
  ('avatars', 'avatars', true),
  ('lesson-attachments', 'lesson-attachments', false),
  ('homework-submissions', 'homework-submissions', false),
  ('student-documents', 'student-documents', false),
  ('report-cards', 'report-cards', false)
on conflict (id) do nothing;

-- Helper: extract the school_id from the first path segment
create or replace function storage_school_id(path text)
returns uuid language sql immutable as $$
  select (regexp_match(path, '^([0-9a-fA-F-]{36})/'))[1]::uuid;
$$;

-- ---- school-logos: public read, School/Super Admin write ----
create policy "logos_public_read" on storage.objects for select
  using ( bucket_id = 'school-logos' );
create policy "logos_admin_write" on storage.objects for insert
  with check ( bucket_id = 'school-logos' and user_has_school_role(storage_school_id(name), array['school_admin']::user_role[]) );
create policy "logos_admin_update" on storage.objects for update
  using ( bucket_id = 'school-logos' and user_has_school_role(storage_school_id(name), array['school_admin']::user_role[]) );
create policy "logos_admin_delete" on storage.objects for delete
  using ( bucket_id = 'school-logos' and is_super_admin() );

-- ---- avatars: public read, owner write (path: {user_id}/avatar.png) ----
create policy "avatars_public_read" on storage.objects for select
  using ( bucket_id = 'avatars' );
create policy "avatars_owner_write" on storage.objects for insert
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
create policy "avatars_owner_update" on storage.objects for update
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

-- ---- lesson-attachments: mirrors the `lessons` table visibility ----
-- path: {school_id}/{lesson_id}/{filename}
create policy "lesson_files_select" on storage.objects for select using (
  bucket_id = 'lesson-attachments' and exists (
    select 1 from lessons l
    where l.id::text = (storage.foldername(name))[2]
      and (
        l.teacher_id = auth.uid()
        or user_has_school_role(l.school_id, array['school_admin']::user_role[])
        or exists (select 1 from class_enrollments ce where ce.class_id = l.class_id and (ce.student_id = auth.uid() or is_parent_of_student(ce.student_id)))
      )
  )
);
create policy "lesson_files_write" on storage.objects for insert with check (
  bucket_id = 'lesson-attachments' and exists (
    select 1 from lessons l
    where l.id::text = (storage.foldername(name))[2]
      and (l.teacher_id = auth.uid() or user_has_school_role(l.school_id, array['school_admin']::user_role[]))
  )
);
create policy "lesson_files_delete" on storage.objects for delete using (
  bucket_id = 'lesson-attachments' and exists (
    select 1 from lessons l
    where l.id::text = (storage.foldername(name))[2]
      and (l.teacher_id = auth.uid() or user_has_school_role(l.school_id, array['school_admin']::user_role[]))
  )
);

-- ---- homework-submissions: student (own) + teacher (assigned) + admin ----
-- path: {school_id}/{homework_id}/{student_id}/{filename}
create policy "hw_files_select" on storage.objects for select using (
  bucket_id = 'homework-submissions' and (
    (storage.foldername(name))[3] = auth.uid()::text
    or is_parent_of_student(((storage.foldername(name))[3])::uuid)
    or exists (
      select 1 from homework h join lessons l on l.id = h.lesson_id
      where h.id::text = (storage.foldername(name))[2]
        and (l.teacher_id = auth.uid() or user_has_school_role(l.school_id, array['school_admin']::user_role[]))
    )
  )
);
create policy "hw_files_write" on storage.objects for insert with check (
  bucket_id = 'homework-submissions' and (storage.foldername(name))[3] = auth.uid()::text
);

-- ---- student-documents: admin full; student/parent read own ----
-- path: {school_id}/{student_id}/{filename}
create policy "student_docs_select" on storage.objects for select using (
  bucket_id = 'student-documents' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or is_parent_of_student(((storage.foldername(name))[2])::uuid)
    or user_has_school_role(storage_school_id(name), array['school_admin']::user_role[])
  )
);
create policy "student_docs_write" on storage.objects for all using (
  bucket_id = 'student-documents' and user_has_school_role(storage_school_id(name), array['school_admin']::user_role[])
);

-- ---- report-cards: student/parent (own) + school admin ----
-- path: {school_id}/{student_id}/{academic_year_id}.pdf
create policy "report_cards_select" on storage.objects for select using (
  bucket_id = 'report-cards' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or is_parent_of_student(((storage.foldername(name))[2])::uuid)
    or user_has_school_role(storage_school_id(name), array['school_admin']::user_role[])
  )
);
-- report cards are only ever written by the finalize-report-cards Edge Function
-- (service role bypasses RLS), so no client-side insert policy is defined here.
