-- Fix recursive message RLS checks and align them with the app's workspace behavior.
-- School admins and super admins can review school messages.
-- Teachers/students/parents can read messages they sent or received.

create or replace function can_access_message(p_message_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from messages m
    where m.id = p_message_id
      and (
        is_super_admin()
        or user_has_school_role(m.school_id, array['school_admin']::user_role[])
        or m.sender_id = auth.uid()
        or exists (
          select 1
          from message_recipients r
          where r.message_id = m.id
            and r.recipient_id = auth.uid()
        )
      )
  );
$$;

create or replace function can_access_message_recipient(p_message_id uuid, p_recipient_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from messages m
    where m.id = p_message_id
      and (
        is_super_admin()
        or user_has_school_role(m.school_id, array['school_admin']::user_role[])
        or m.sender_id = auth.uid()
        or p_recipient_id = auth.uid()
      )
  );
$$;

drop policy if exists msg_select on messages;
create policy msg_select on messages for select using (
  (deleted_at is null or is_super_admin()) and can_access_message(id)
);

drop policy if exists mr_select on message_recipients;
create policy mr_select on message_recipients for select using (
  can_access_message_recipient(message_id, recipient_id)
);

drop policy if exists mr_update on message_recipients;
create policy mr_update on message_recipients for update using (
  recipient_id = auth.uid()
);
