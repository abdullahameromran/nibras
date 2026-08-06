-- A polymorphic trigger record cannot safely reference columns that do not
-- exist on every table using the function. Keep validation table-specific.

drop trigger if exists trg_validate_academic_year_dates on public.academic_years;
drop trigger if exists trg_validate_time_slot_times on public.time_slots;
drop function if exists public.validate_phase1_academic_row();

create or replace function public.validate_academic_year_dates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.start_date > new.end_date then
    raise exception 'academic year start date must be on or before end date';
  end if;
  return new;
end;
$$;

create or replace function public.validate_time_slot_times()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.start_time >= new.end_time then
    raise exception 'time slot start time must be before end time';
  end if;
  return new;
end;
$$;

create trigger trg_validate_academic_year_dates
before insert or update on public.academic_years
for each row execute function public.validate_academic_year_dates();

create trigger trg_validate_time_slot_times
before insert or update on public.time_slots
for each row execute function public.validate_time_slot_times();
