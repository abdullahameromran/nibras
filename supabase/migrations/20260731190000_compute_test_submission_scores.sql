-- Grade tests on the database side. Students may submit answers but must never
-- be allowed to write their own score directly.
create or replace function public.compute_test_submission_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_correct integer;
begin
  select count(*)
    into v_total
  from public.test_questions q
  join public.test_submissions s on s.test_id = q.test_id
  where s.id = new.submission_id;

  select count(*)
    into v_correct
  from public.test_answers a
  where a.submission_id = new.submission_id
    and a.is_correct is true;

  update public.test_submissions
  set score = case when v_total > 0 then round(100.0 * v_correct / v_total, 2) else null end,
      graded_at = case when v_total > 0 then now() else null end
  where id = new.submission_id;

  return new;
end;
$$;

drop trigger if exists trg_compute_test_submission_score on public.test_answers;
create trigger trg_compute_test_submission_score
after insert or update on public.test_answers
for each row execute function public.compute_test_submission_score();

-- Repair submissions created before the trigger existed.
update public.test_submissions s
set score = calculated.score,
    graded_at = now()
from (
  select
    s2.id,
    case
      when count(distinct q.id) > 0
        then round(100.0 * count(distinct a.id) filter (where a.is_correct is true) / count(distinct q.id), 2)
      else null
    end as score
  from public.test_submissions s2
  join public.test_questions q on q.test_id = s2.test_id
  left join public.test_answers a on a.submission_id = s2.id and a.question_id = q.id
  group by s2.id
) calculated
where s.id = calculated.id
  and s.score is null;
