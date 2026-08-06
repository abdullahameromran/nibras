-- Answer grading and score rollups must be able to update submission rows even
-- when the answer is submitted by a student whose RLS policy cannot edit scores.
alter function public.grade_homework_answer() security definer;
alter function public.grade_homework_answer() set search_path = public;
alter function public.compute_homework_score() security definer;
alter function public.compute_homework_score() set search_path = public;
alter function public.grade_test_answer() security definer;
alter function public.grade_test_answer() set search_path = public;

create or replace function public.compute_test_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  correct int;
begin
  select count(*) into total
  from public.test_questions
  where test_id = (select test_id from public.test_submissions where id = new.submission_id);

  select count(*) into correct
  from public.test_answers
  where submission_id = new.submission_id and is_correct;

  update public.test_submissions
  set score = case when total > 0 then round(100.0 * correct / total, 2) else null end,
      graded_at = now()
  where id = new.submission_id;
  return new;
end $$;

drop trigger if exists trg_compute_test_score on public.test_answers;
create trigger trg_compute_test_score
after insert or update on public.test_answers
for each row execute function public.compute_test_score();

-- Repair submissions that were accepted before the secured rollup triggers.
update public.homework_submissions hs
set score = totals.score,
    graded_at = now()
from (
  select hs2.id,
    case when count(distinct hq.id) > 0
      then round(100.0 * count(distinct ha.id) filter (where ha.is_correct) / count(distinct hq.id), 2)
      else null end as score
  from public.homework_submissions hs2
  join public.homework_questions hq on hq.homework_id = hs2.homework_id
  left join public.homework_answers ha on ha.submission_id = hs2.id and ha.question_id = hq.id
  group by hs2.id
) totals
where hs.id = totals.id and totals.score is not null;

update public.test_submissions ts
set score = totals.score,
    graded_at = now()
from (
  select ts2.id,
    case when count(distinct tq.id) > 0
      then round(100.0 * count(distinct ta.id) filter (where ta.is_correct) / count(distinct tq.id), 2)
      else null end as score
  from public.test_submissions ts2
  join public.test_questions tq on tq.test_id = ts2.test_id
  left join public.test_answers ta on ta.submission_id = ts2.id and ta.question_id = tq.id
  group by ts2.id
) totals
where ts.id = totals.id and totals.score is not null;
