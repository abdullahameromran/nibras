create or replace function public.update_my_school_details(
  p_school_id uuid,
  p_name text default null,
  p_timezone text default null,
  p_settings jsonb default null,
  p_logo_url text default null
)
returns public.schools
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.schools;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.is_super_admin()
    or public.user_has_school_role(p_school_id, array['school_admin']::public.user_role[])
  ) then
    raise exception 'You are not allowed to update this school';
  end if;

  update public.schools
  set
    name = coalesce(p_name, name),
    timezone = coalesce(p_timezone, timezone),
    settings = case
      when p_settings is null then settings
      else coalesce(settings, '{}'::jsonb) || p_settings
    end,
    logo_url = case
      when p_logo_url is null then logo_url
      else p_logo_url
    end
  where id = p_school_id
    and deleted_at is null
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'School not found';
  end if;

  return updated_row;
end;
$$;

grant execute on function public.update_my_school_details(uuid, text, text, jsonb, text) to authenticated;
