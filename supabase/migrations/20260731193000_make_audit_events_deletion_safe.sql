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
  v_original_school_id uuid := case
    when tg_table_name = 'schools' then v_entity_id
    else coalesce((v_new ->> 'school_id')::uuid, (v_old ->> 'school_id')::uuid)
  end;
begin
  -- Audit events must survive both direct and cascading school deletion.
  -- Keep the original school id in metadata instead of an FK column, because
  -- cascade triggers execute while the referenced school is being removed.
  insert into public.audit_logs (school_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    null,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_build_object('school_id', v_original_school_id, 'old', v_old, 'new', v_new)
  );

  return coalesce(new, old);
end;
$$;
