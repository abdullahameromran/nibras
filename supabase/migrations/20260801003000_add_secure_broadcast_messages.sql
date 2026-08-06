create or replace function public.send_broadcast_message(
  p_school_id uuid,
  p_target_role public.user_role,
  p_body text,
  p_subject text default null,
  p_class_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_body), '') = '' then raise exception 'message body is required'; end if;
  v_is_admin := public.user_has_school_role(p_school_id, array['school_admin']::public.user_role[]);

  if not v_is_admin then
    if p_target_role <> 'student'::public.user_role or p_class_id is null or not exists (
      select 1 from public.teacher_subject_assignments tsa
      where tsa.school_id=p_school_id and tsa.teacher_id=auth.uid() and tsa.class_id=p_class_id
    ) then raise exception 'not authorized to broadcast to this audience' using errcode='42501'; end if;
  end if;

  insert into public.messages(school_id,sender_id,subject,body,is_broadcast)
  values(p_school_id,auth.uid(),nullif(btrim(p_subject),''),btrim(p_body),true)
  returning id into v_message_id;

  insert into public.message_recipients(message_id,recipient_id)
  select distinct v_message_id, usr.user_id
  from public.user_school_roles usr
  where usr.school_id=p_school_id and usr.role=p_target_role and usr.is_active and usr.user_id<>auth.uid()
    and exists(select 1 from public.profiles p where p.id=usr.user_id and p.is_active)
    and (p_class_id is null or (
      p_target_role='student'::public.user_role and exists(
        select 1 from public.class_enrollments ce
        where ce.school_id=p_school_id and ce.class_id=p_class_id and ce.student_id=usr.user_id and ce.status='active'
      )
    ));

  if not exists(select 1 from public.message_recipients where message_id=v_message_id) then
    delete from public.messages where id=v_message_id;
    raise exception 'no active recipients found for this broadcast';
  end if;
  return v_message_id;
end $$;

revoke all on function public.send_broadcast_message(uuid,public.user_role,text,text,uuid) from public;
grant execute on function public.send_broadcast_message(uuid,public.user_role,text,text,uuid) to authenticated;
