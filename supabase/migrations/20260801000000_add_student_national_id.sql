alter table public.profiles
  add column if not exists national_id varchar(14);

alter table public.profiles
  drop constraint if exists profiles_national_id_format_check;

alter table public.profiles
  add constraint profiles_national_id_format_check
  check (national_id is null or national_id ~ '^[0-9]{14}$');

create unique index if not exists profiles_national_id_unique_idx
  on public.profiles (national_id)
  where national_id is not null;

drop function if exists public.manage_school_member(uuid,uuid,public.user_role,text,text,text,boolean);

create function public.manage_school_member(
  p_school_id uuid,
  p_user_id uuid,
  p_role public.user_role,
  p_first_name text,
  p_last_name text default null,
  p_phone text default null,
  p_role_active boolean default true,
  p_national_id text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  normalized_national_id text := nullif(btrim(coalesce(p_national_id, '')), '');
begin
  if p_role not in ('teacher'::public.user_role,'student'::public.user_role,'parent'::public.user_role) then
    raise exception 'unsupported school member role';
  end if;
  if not public.user_has_school_role(p_school_id,array['school_admin']::public.user_role[]) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if not exists(select 1 from public.user_school_roles where user_id=p_user_id and school_id=p_school_id and role=p_role) then
    raise exception 'school member role not found';
  end if;
  if p_role = 'student'::public.user_role and (normalized_national_id is null or normalized_national_id !~ '^[0-9]{14}$') then
    raise exception 'National ID must contain exactly 14 digits' using errcode='23514';
  end if;
  if normalized_national_id is not null and exists (
    select 1 from public.profiles where national_id=normalized_national_id and id<>p_user_id
  ) then
    raise exception 'This National ID is already used by another student' using errcode='23505';
  end if;

  update public.profiles
  set first_name=nullif(btrim(p_first_name),''),
      last_name=nullif(btrim(coalesce(p_last_name,'')),''),
      phone=nullif(btrim(coalesce(p_phone,'')),''),
      national_id=case when p_role='student'::public.user_role then normalized_national_id else national_id end,
      updated_at=now()
  where id=p_user_id;

  update public.user_school_roles set is_active=p_role_active
  where user_id=p_user_id and school_id=p_school_id and role=p_role;

  insert into public.audit_logs(school_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_school_id,auth.uid(),'manage_school_member','profiles',p_user_id,jsonb_build_object('role',p_role,'role_active',p_role_active));
end; $$;

revoke all on function public.manage_school_member(uuid,uuid,public.user_role,text,text,text,boolean,text) from public;
grant execute on function public.manage_school_member(uuid,uuid,public.user_role,text,text,text,boolean,text) to authenticated;
