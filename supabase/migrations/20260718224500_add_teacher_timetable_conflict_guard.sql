-- Prevent one teacher from being scheduled in two places at the same time.

create or replace function public.check_teacher_timetable_conflict()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.timetable_entries existing_entry
    where existing_entry.school_id = new.school_id
      and existing_entry.teacher_id = new.teacher_id
      and existing_entry.working_day_id = new.working_day_id
      and existing_entry.time_slot_id = new.time_slot_id
      and existing_entry.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'teacher already has another timetable entry in this day and time slot';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_teacher_timetable_conflict on public.timetable_entries;

create trigger trg_check_teacher_timetable_conflict
before insert or update on public.timetable_entries
for each row execute function public.check_teacher_timetable_conflict();
