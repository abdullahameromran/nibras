begin;

create or replace function pg_temp.seed_uuid(value text)
returns uuid language sql immutable as $$
  select (substr(md5(value),1,8)||'-'||substr(md5(value),9,4)||'-4'||substr(md5(value),14,3)||'-a'||substr(md5(value),18,3)||'-'||substr(md5(value),21,12))::uuid
$$;

-- Keep the Auth-created seed accounts visible in the application directory.
insert into public.profiles (id,email,first_name,last_name,is_active)
select id,email,raw_user_meta_data->>'first_name',raw_user_meta_data->>'last_name',true
from auth.users where email like 'seed.%@demo.nibrasedtech.com'
on conflict (id) do update set email=excluded.email,first_name=excluded.first_name,last_name=excluded.last_name,is_active=true;

insert into public.user_school_roles (id,user_id,school_id,role,is_active)
select pg_temp.seed_uuid('role:'||u.email),u.id,'75fec51d-e4a9-4695-b5a1-d13701c7f45b',
  case when u.email like 'seed.teacher.%' then 'teacher'::user_role when u.email like 'seed.student.%' then 'student'::user_role else 'parent'::user_role end,true
from auth.users u where u.email like 'seed.%@demo.nibrasedtech.com'
on conflict (user_id,school_id,role) do update set is_active=true;

create temp table seed_ctx on commit drop as
select '75fec51d-e4a9-4695-b5a1-d13701c7f45b'::uuid school_id,
       'b83ebdb7-fa86-4c9e-bfb1-938792ccd414'::uuid admin_id,
       coalesce((select id from academic_years where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b' and is_current limit 1),
                pg_temp.seed_uuid('loadtest:academic-year')) academic_year_id;

insert into academic_years(id,school_id,name,start_date,end_date,is_current)
select academic_year_id,school_id,'2026/2027','2026-09-01','2027-06-30',true from seed_ctx
where not exists(select 1 from academic_years where school_id=seed_ctx.school_id and is_current)
on conflict(id) do nothing;

insert into working_days(id,school_id,day_of_week,label)
select pg_temp.seed_uuid('loadtest:day:'||n),c.school_id,n,case n when 0 then 'الأحد' when 1 then 'الاثنين' when 2 then 'الثلاثاء' when 3 then 'الأربعاء' else 'الخميس' end
from seed_ctx c cross join generate_series(0,4) n on conflict(id) do update set label=excluded.label;

insert into time_slots(id,school_id,label,start_time,end_time,sort_order)
select pg_temp.seed_uuid('loadtest:slot:'||n),c.school_id,'الحصة التجريبية '||n,start_time::time,end_time::time,n+10
from seed_ctx c cross join (values
 (1,'06:00','06:40'),(2,'06:45','07:25'),(3,'07:30','08:10'),(4,'08:15','08:55'),
 (5,'11:10','11:50'),(6,'11:55','12:35'),(7,'12:40','13:20'),(8,'13:25','14:05')
) slots(n,start_time,end_time)
on conflict(id) do update set label=excluded.label,start_time=excluded.start_time,end_time=excluded.end_time,sort_order=excluded.sort_order;

insert into grade_levels(id,school_id,name,sort_order)
select pg_temp.seed_uuid('loadtest:grade:'||n),c.school_id,'الصف '||case n when 2 then 'الثاني' when 3 then 'الثالث' when 4 then 'الرابع' else 'الخامس' end,n
from seed_ctx c cross join generate_series(2,5) n on conflict(id) do update set name=excluded.name,sort_order=excluded.sort_order;

insert into classes(id,school_id,academic_year_id,grade_level_id,name)
select pg_temp.seed_uuid('loadtest:class:'||g||':'||s),c.school_id,c.academic_year_id,pg_temp.seed_uuid('loadtest:grade:'||g),'الصف '||g||' - الشعبة '||s
from seed_ctx c cross join generate_series(2,5) g cross join (values('أ'),('ب')) v(s)
on conflict(id) do update set name=excluded.name,academic_year_id=excluded.academic_year_id;

insert into subjects(id,school_id,name,code)
select pg_temp.seed_uuid('loadtest:subject:'||code),c.school_id,name,code from seed_ctx c cross join
(values ('Arabic','اللغة العربية'),('MATH','الرياضيات'),('SCI','العلوم'),('ENG','اللغة الإنجليزية'),('SOC','الدراسات الاجتماعية'),('ICT','تكنولوجيا المعلومات')) s(code,name)
on conflict(id) do update set name=excluded.name,code=excluded.code;

create temp table seed_teachers on commit drop as
select id,row_number() over(order by email)::int rn from profiles where email='civokor984@bejum.com' or email like 'seed.teacher.%@demo.nibrasedtech.com';
create temp table seed_classes on commit drop as
select id,row_number() over(order by name)::int rn from classes where id in (select pg_temp.seed_uuid('loadtest:class:'||g||':'||s) from generate_series(2,5) g cross join (values('أ'),('ب')) v(s));
create temp table seed_subjects on commit drop as
select id,code,row_number() over(order by code)::int rn from subjects where id in (select pg_temp.seed_uuid('loadtest:subject:'||x) from unnest(array['Arabic','MATH','SCI','ENG','SOC','ICT']) x);

insert into teacher_subject_assignments(id,school_id,teacher_id,subject_id,class_id)
select pg_temp.seed_uuid('loadtest:assignment:'||cl.id||':'||su.id),c.school_id,t.id,su.id,cl.id
from seed_ctx c cross join seed_classes cl cross join seed_subjects su join seed_teachers t on t.rn=su.rn
on conflict(teacher_id,subject_id,class_id) do nothing;

create temp table seed_students on commit drop as
select id,row_number() over(order by email)::int rn from profiles where email like 'seed.student.%@demo.nibrasedtech.com';
insert into class_enrollments(id,school_id,class_id,student_id,status)
select pg_temp.seed_uuid('loadtest:enrollment:'||st.id),c.school_id,cl.id,st.id,'active'
from seed_ctx c join seed_students st on true join seed_classes cl on cl.rn=1+((st.rn-1)%8)
on conflict(class_id,student_id) do update set status='active';

create temp table seed_parents on commit drop as
select id,row_number() over(order by email)::int rn from profiles where email='a.b.dullah.omran1010@gmail.com' or email like 'seed.parent.%@demo.nibrasedtech.com';
insert into parent_student_links(id,school_id,parent_id,student_id,relationship)
select pg_temp.seed_uuid('loadtest:parent-link:'||p.id||':'||st.id),c.school_id,p.id,st.id,case when p.rn%2=0 then 'mother' else 'father' end
from seed_ctx c join seed_parents p on true join seed_students st on st.rn in (p.rn*2-1,p.rn*2)
on conflict(parent_id,student_id) do update set relationship=excluded.relationship;

insert into timetable_entries(id,school_id,academic_year_id,working_day_id,time_slot_id,class_id,subject_id,teacher_id)
select pg_temp.seed_uuid('loadtest:timetable:'||cl.id||':'||d),c.school_id,c.academic_year_id,
 pg_temp.seed_uuid('loadtest:day:'||d),pg_temp.seed_uuid('loadtest:slot:'||cl.rn),cl.id,su.id,t.id
from seed_ctx c cross join seed_classes cl cross join generate_series(0,4) d
join seed_subjects su on su.rn=1+((cl.rn+d-1)%6) join seed_teachers t on t.rn=su.rn
on conflict(class_id,working_day_id,time_slot_id) do update set subject_id=excluded.subject_id,teacher_id=excluded.teacher_id;

insert into lessons(id,school_id,class_id,subject_id,teacher_id,title,description,video_url,lesson_date)
select pg_temp.seed_uuid('loadtest:lesson:'||cl.id||':'||n),c.school_id,cl.id,su.id,t.id,
 'درس تجريبي '||n||' - '||su.code,'محتوى تعليمي تجريبي غني لاختبار لوحة التحكم والتقارير.',case when n=1 then 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' end,
 current_date-(20-n*4)
from seed_ctx c cross join seed_classes cl cross join generate_series(1,3) n
join seed_subjects su on su.rn=1+((cl.rn+n-2)%6) join seed_teachers t on t.rn=su.rn
on conflict(id) do update set title=excluded.title,description=excluded.description;

insert into attendance_records(id,school_id,lesson_id,student_id,status,recorded_by,recorded_at)
select pg_temp.seed_uuid('loadtest:attendance:'||l.id||':'||e.student_id),c.school_id,l.id,e.student_id,
 (case (abs(hashtext(l.id::text||e.student_id::text))%12) when 0 then 'absent' when 1 then 'late' when 2 then 'excused' else 'present' end)::attendance_status,l.teacher_id,l.lesson_date+interval '10 hours'
from seed_ctx c join lessons l on l.id in (select pg_temp.seed_uuid('loadtest:lesson:'||cl.id||':'||n) from seed_classes cl cross join generate_series(1,3)n)
join class_enrollments e on e.class_id=l.class_id
on conflict(lesson_id,student_id) do update set status=excluded.status;

insert into student_lesson_progress(id,school_id,lesson_id,student_id,completed_at,last_viewed_at)
select pg_temp.seed_uuid('loadtest:progress:'||l.id||':'||e.student_id),c.school_id,l.id,e.student_id,now()-interval '1 day',now()-interval '1 day'
from seed_ctx c join lessons l on l.title like 'درس تجريبي%'
join class_enrollments e on e.class_id=l.class_id where abs(hashtext(l.id::text||e.student_id::text))%10<7
on conflict(lesson_id,student_id) do update set last_viewed_at=excluded.last_viewed_at;

insert into homework(id,school_id,lesson_id,title,due_date,created_at)
select pg_temp.seed_uuid('loadtest:homework:'||l.id),l.school_id,l.id,'واجب '||l.title,l.lesson_date+interval '7 days',l.created_at
from lessons l where l.title like 'درس تجريبي%' on conflict(id) do update set title=excluded.title,due_date=excluded.due_date;
insert into homework_questions(id,homework_id,question_text,sort_order)
select pg_temp.seed_uuid('loadtest:hwq:'||h.id||':'||n),h.id,'سؤال الواجب رقم '||n,n from homework h cross join generate_series(1,3)n where h.title like 'واجب درس تجريبي%'
on conflict(id) do update set question_text=excluded.question_text;
insert into homework_choices(id,question_id,choice_text,is_correct,sort_order)
select pg_temp.seed_uuid('loadtest:hwc:'||q.id||':'||n),q.id,'الاختيار '||n,n=1,n from homework_questions q cross join generate_series(1,4)n
where q.id in(select pg_temp.seed_uuid('loadtest:hwq:'||h.id||':'||x) from homework h cross join generate_series(1,3)x where h.title like 'واجب درس تجريبي%')
on conflict(id) do update set is_correct=excluded.is_correct;
insert into homework_submissions(id,homework_id,student_id,submitted_at,score,graded_at)
select pg_temp.seed_uuid('loadtest:hws:'||h.id||':'||e.student_id),h.id,e.student_id,h.due_date-interval '1 day',
 (50+(abs(hashtext(h.id::text||e.student_id::text))%51))::numeric, h.due_date-interval '1 day'
from homework h join lessons l on l.id=h.lesson_id join class_enrollments e on e.class_id=l.class_id
where h.title like 'واجب درس تجريبي%' and abs(hashtext(h.id::text||e.student_id::text))%10<8
on conflict(homework_id,student_id) do update set score=excluded.score,graded_at=excluded.graded_at;
insert into homework_answers(id,submission_id,question_id,selected_choice_id,is_correct)
select pg_temp.seed_uuid('loadtest:hwa:'||s.id||':'||q.id),s.id,q.id,
 pg_temp.seed_uuid('loadtest:hwc:'||q.id||':'||(case when s.score>=70 then 1 else 2 end)),s.score>=70
from homework_submissions s join homework_questions q on q.homework_id=s.homework_id
where s.id=pg_temp.seed_uuid('loadtest:hws:'||s.homework_id||':'||s.student_id)
on conflict(submission_id,question_id) do update set selected_choice_id=excluded.selected_choice_id,is_correct=excluded.is_correct;

insert into monthly_tests(id,school_id,class_id,subject_id,teacher_id,title,test_date,duration_minutes,kind)
select pg_temp.seed_uuid('loadtest:test:'||cl.id||':'||n),c.school_id,cl.id,su.id,t.id,'اختبار شهري تجريبي '||n,current_date-(15-n*5),45,'monthly'
from seed_ctx c cross join seed_classes cl cross join generate_series(1,2)n
join seed_subjects su on su.rn=1+((cl.rn+n-2)%6) join seed_teachers t on t.rn=su.rn
on conflict(id) do update set title=excluded.title,test_date=excluded.test_date;
insert into test_questions(id,test_id,question_text,sort_order)
select pg_temp.seed_uuid('loadtest:tq:'||t.id||':'||n),t.id,'سؤال الاختبار رقم '||n,n from monthly_tests t cross join generate_series(1,5)n where t.title like 'اختبار شهري تجريبي%'
on conflict(id) do update set question_text=excluded.question_text;
insert into test_choices(id,question_id,choice_text,is_correct,sort_order)
select pg_temp.seed_uuid('loadtest:tc:'||q.id||':'||n),q.id,'الإجابة '||n,n=1,n from test_questions q cross join generate_series(1,4)n
where q.id in(select pg_temp.seed_uuid('loadtest:tq:'||t.id||':'||x) from monthly_tests t cross join generate_series(1,5)x where t.title like 'اختبار شهري تجريبي%')
on conflict(id) do update set is_correct=excluded.is_correct;
insert into test_submissions(id,test_id,student_id,submitted_at,score,graded_at)
select pg_temp.seed_uuid('loadtest:ts:'||t.id||':'||e.student_id),t.id,e.student_id,t.test_date+interval '10 hours',
 (40+(abs(hashtext(t.id::text||e.student_id::text))%61))::numeric,t.test_date+interval '10 hours'
from monthly_tests t join class_enrollments e on e.class_id=t.class_id where t.title like 'اختبار شهري تجريبي%' and abs(hashtext(t.id::text||e.student_id::text))%10<9
on conflict(test_id,student_id) do update set score=excluded.score,graded_at=excluded.graded_at;
insert into test_answers(id,submission_id,question_id,selected_choice_id,is_correct)
select pg_temp.seed_uuid('loadtest:ta:'||s.id||':'||q.id),s.id,q.id,pg_temp.seed_uuid('loadtest:tc:'||q.id||':'||(case when s.score>=60 then 1 else 2 end)),s.score>=60
from test_submissions s join test_questions q on q.test_id=s.test_id where s.id=pg_temp.seed_uuid('loadtest:ts:'||s.test_id||':'||s.student_id)
on conflict(submission_id,question_id) do update set selected_choice_id=excluded.selected_choice_id,is_correct=excluded.is_correct;

insert into final_grades(id,school_id,academic_year_id,class_id,subject_id,student_id,grade_value,grade_letter,remarks,status,submitted_by,submitted_at,approved_by,approved_at)
select pg_temp.seed_uuid('loadtest:grade-final:'||e.student_id||':'||su.id),c.school_id,c.academic_year_id,e.class_id,su.id,e.student_id,v,
 case when v>=90 then 'أ+' when v>=80 then 'ب' when v>=70 then 'ج' when v>=60 then 'د' else 'و' end,'أداء تجريبي لاختبار التقارير',
 case when e.student_id::text<'8' then 'approved'::grade_status else 'submitted'::grade_status end,t.id,now()-interval '3 days',
 case when e.student_id::text<'8' then c.admin_id end,case when e.student_id::text<'8' then now()-interval '2 days' end
from seed_ctx c join class_enrollments e on e.student_id in(select id from seed_students)
cross join lateral(select (55+abs(hashtext(e.student_id::text))%46)::numeric v) x
join seed_subjects su on su.rn in (1+abs(hashtext(e.class_id::text))%6,1+((abs(hashtext(e.class_id::text))+1)%6))
join seed_teachers t on t.rn=su.rn
on conflict(academic_year_id,class_id,subject_id,student_id) do update set grade_value=excluded.grade_value,grade_letter=excluded.grade_letter,status=excluded.status,submitted_by=excluded.submitted_by,submitted_at=excluded.submitted_at,approved_by=excluded.approved_by,approved_at=excluded.approved_at;

insert into announcements(id,school_id,author_id,title,body,is_published,published_at,created_at)
select pg_temp.seed_uuid('loadtest:announcement:'||n),c.school_id,c.admin_id,'إعلان مدرسي تجريبي '||n,'تفاصيل الإعلان التجريبي رقم '||n||' لاختبار آخر الأخبار والتنبيهات.',true,now()-n*interval '1 day',now()-n*interval '1 day'
from seed_ctx c cross join generate_series(1,12)n on conflict(id) do update set title=excluded.title,body=excluded.body,is_published=true,published_at=excluded.published_at;
insert into announcement_targets(id,announcement_id,target_type)
select pg_temp.seed_uuid('loadtest:announcement-target:'||n),pg_temp.seed_uuid('loadtest:announcement:'||n),'school' from generate_series(1,12)n on conflict(id) do nothing;

insert into messages(id,school_id,sender_id,subject,body,is_broadcast,created_at)
select pg_temp.seed_uuid('loadtest:message:'||st.id),c.school_id,t.id,'متابعة أكاديمية','رسالة تجريبية للطالب حول الواجبات والتقدم الدراسي.',false,now()-st.rn*interval '1 hour'
from seed_ctx c join seed_students st on true join seed_teachers t on t.rn=1+((st.rn-1)%6)
on conflict(id) do update set body=excluded.body;
insert into message_recipients(id,message_id,recipient_id,is_read,read_at)
select pg_temp.seed_uuid('loadtest:recipient:'||st.id),pg_temp.seed_uuid('loadtest:message:'||st.id),st.id,st.rn%3=0,case when st.rn%3=0 then now()-interval '30 minutes' end
from seed_students st on conflict(id) do update set is_read=excluded.is_read,read_at=excluded.read_at;

commit;

select
 (select count(*) from user_school_roles where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b' and role='teacher') teachers,
 (select count(*) from user_school_roles where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b' and role='student') students,
 (select count(*) from user_school_roles where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b' and role='parent') parents,
 (select count(*) from classes where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') classes,
 (select count(*) from lessons where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') lessons,
 (select count(*) from homework where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') homework,
 (select count(*) from homework_submissions s join homework h on h.id=s.homework_id where h.school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') homework_submissions,
 (select count(*) from monthly_tests where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') tests,
 (select count(*) from test_submissions s join monthly_tests t on t.id=s.test_id where t.school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') test_submissions,
 (select count(*) from final_grades where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') final_grades,
 (select count(*) from attendance_records where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') attendance,
 (select count(*) from announcements where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') announcements,
 (select count(*) from messages where school_id='75fec51d-e4a9-4695-b5a1-d13701c7f45b') messages;
