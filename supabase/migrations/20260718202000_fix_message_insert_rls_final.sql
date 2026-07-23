-- Final message insert RLS fix.
-- Run this after any earlier message-policy migrations.
-- It safely replaces older insert policies, including the old
-- can_insert_message(uuid, uuid) version.

begin;

drop policy if exists msg_insert on public.messages;
drop policy if exists mr_insert on public.message_recipients;

drop trigger if exists trg_set_message_sender on public.messages;

drop function if exists public.can_insert_message(uuid, uuid);
drop function if exists public.can_insert_message(uuid);
drop function if exists public.set_message_sender();

create or replace function public.set_message_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.sender_id := auth.uid();
  end if;

  return new;
end;
$$;

create trigger trg_set_message_sender
before insert on public.messages
for each row execute function public.set_message_sender();

create or replace function public.can_insert_message(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and p_school_id is not null
    and (
      public.is_super_admin()
      or exists (
        select 1
        from public.user_school_roles usr
        where usr.user_id = auth.uid()
          and usr.school_id = p_school_id
          and usr.is_active
          and usr.role = any (array['school_admin','teacher','student','parent']::public.user_role[])
      )
    );
$$;

create policy msg_insert on public.messages
for insert
with check (public.can_insert_message(school_id));

create policy mr_insert on public.message_recipients
for insert
with check (public.can_access_message_recipient(message_id, recipient_id));

commit;
