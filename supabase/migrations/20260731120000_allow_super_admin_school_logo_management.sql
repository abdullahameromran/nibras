-- Keep school-logo storage management explicit for both School Admin and Super Admin.
drop policy if exists "logos_admin_write" on storage.objects;
drop policy if exists "logos_admin_update" on storage.objects;
drop policy if exists "logos_admin_delete" on storage.objects;

create policy "logos_admin_write" on storage.objects for insert
with check (
  bucket_id = 'school-logos'
  and public.user_has_school_role(public.storage_school_id(name), array['school_admin']::public.user_role[])
);
create policy "logos_admin_update" on storage.objects for update
using (
  bucket_id = 'school-logos'
  and public.user_has_school_role(public.storage_school_id(name), array['school_admin']::public.user_role[])
)
with check (
  bucket_id = 'school-logos'
  and public.user_has_school_role(public.storage_school_id(name), array['school_admin']::public.user_role[])
);
create policy "logos_admin_delete" on storage.objects for delete
using (
  bucket_id = 'school-logos'
  and public.user_has_school_role(public.storage_school_id(name), array['school_admin']::public.user_role[])
);
