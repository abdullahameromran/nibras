create or replace function public.validate_time_slot_times()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.start_time >= new.end_time then
    raise exception 'time slot start time must be before end time';
  end if;

  if exists (
    select 1
    from public.time_slots existing
    where existing.school_id = new.school_id
      and existing.id <> new.id
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception 'time slot overlaps an existing time slot';
  end if;

  return new;
end;
$$;
