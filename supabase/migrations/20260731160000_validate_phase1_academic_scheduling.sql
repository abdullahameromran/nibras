create or replace function public.validate_phase1_academic_row() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_table_name='academic_years' and new.start_date>new.end_date then raise exception 'academic year start date must be on or before end date'; end if;
  if tg_table_name='time_slots' and new.start_time>=new.end_time then raise exception 'time slot start time must be before end time'; end if;
  return new;
end; $$;
drop trigger if exists trg_validate_academic_year_dates on public.academic_years;
create trigger trg_validate_academic_year_dates before insert or update on public.academic_years for each row execute function public.validate_phase1_academic_row();
drop trigger if exists trg_validate_time_slot_times on public.time_slots;
create trigger trg_validate_time_slot_times before insert or update on public.time_slots for each row execute function public.validate_phase1_academic_row();

create or replace function public.validate_timetable_assignment() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.teacher_subject_assignments tsa where tsa.school_id=new.school_id and tsa.teacher_id=new.teacher_id and tsa.subject_id=new.subject_id and (tsa.class_id=new.class_id or tsa.class_id is null)) then
    raise exception 'teacher must be assigned to this subject and class before scheduling';
  end if;
  return new;
end; $$;
drop trigger if exists trg_validate_timetable_assignment on public.timetable_entries;
create trigger trg_validate_timetable_assignment before insert or update on public.timetable_entries for each row execute function public.validate_timetable_assignment();
