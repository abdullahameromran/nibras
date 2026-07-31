create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_entity_id uuid := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);
  v_school_id uuid;
begin
  -- Never retain an audit_logs FK to a school row being deleted. The entity
  -- id and complete snapshot remain available in metadata.
  if tg_table_name = 'schools' then
    v_school_id := null;
  else
    v_school_id := coalesce((v_new ->> 'school_id')::uuid, (v_old ->> 'school_id')::uuid);
  end if;

  insert into public.audit_logs (school_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_school_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_build_object(
      'school_id', case when tg_table_name = 'schools' then v_entity_id else v_school_id end,
      'old', v_old,
      'new', v_new
    )
  );

  return coalesce(new, old);
end;
$$;
