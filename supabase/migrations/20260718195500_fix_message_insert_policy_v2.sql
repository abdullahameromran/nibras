-- Safer message insert fix:
-- do not depend on sender_id inside the RLS policy check.
-- We only check the current signed-in user and the selected school.

create or replace function set_message_sender()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.sender_id = auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_set_message_sender on messages;
create trigger trg_set_message_sender
before insert on messages
for each row execute function set_message_sender();

drop policy if exists msg_insert on messages;
drop policy if exists mr_insert on message_recipients;

drop function if exists can_insert_message(uuid, uuid);

create or replace function can_insert_message(p_school_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select auth.uid() is not null
    and (
      is_super_admin()
      or exists (
        select 1
        from user_school_roles usr
        where usr.user_id = auth.uid()
          and usr.school_id = p_school_id
          and usr.is_active
          and usr.role = any(array['school_admin','teacher','student','parent']::user_role[])
      )
    );
$$;

create policy msg_insert on messages
for insert
with check (can_insert_message(school_id));

create policy mr_insert on message_recipients
for insert
with check (can_access_message_recipient(message_id, recipient_id));
