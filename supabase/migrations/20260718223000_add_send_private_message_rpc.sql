-- Send private messages through one secure RPC instead of raw browser inserts.
-- This keeps the same school-membership rules, but avoids client-side RLS
-- failures on messages/message_recipients during normal chat usage.

create or replace function public.send_private_message(
  p_school_id uuid,
  p_recipient_id uuid,
  p_subject text default null,
  p_body text default null
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_school_id is null then
    raise exception 'school is required';
  end if;

  if p_recipient_id is null then
    raise exception 'recipient is required';
  end if;

  if coalesce(btrim(p_body), '') = '' then
    raise exception 'message body is required';
  end if;

  if not public.can_insert_message(p_school_id) then
    raise exception 'not authorized to send messages in this school';
  end if;

  if not exists (
    select 1
    from public.user_school_roles usr
    where usr.user_id = p_recipient_id
      and usr.school_id = p_school_id
      and usr.is_active
  ) then
    raise exception 'recipient does not belong to this school';
  end if;

  insert into public.messages (school_id, sender_id, subject, body)
  values (
    p_school_id,
    auth.uid(),
    nullif(btrim(p_subject), ''),
    btrim(p_body)
  )
  returning * into v_message;

  insert into public.message_recipients (message_id, recipient_id)
  values (v_message.id, p_recipient_id);

  return v_message;
end;
$$;

revoke all on function public.send_private_message(uuid, uuid, text, text) from public;
grant execute on function public.send_private_message(uuid, uuid, text, text) to authenticated;
grant execute on function public.send_private_message(uuid, uuid, text, text) to service_role;
