-- Enforce the same per-file limit as the lesson attachment UI. Keeping the
-- limit on the private bucket prevents oversized uploads from bypassing the
-- browser-side validation through another client.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-attachments', 'lesson-attachments', false, 10485760)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;
