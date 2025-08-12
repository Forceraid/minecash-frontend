-- Migration: Create chat messages table for gamemode chat persistence
-- Purpose: Store chat messages for each gamemode to provide message history when users rejoin
-- Affected tables: chat_messages
-- Special considerations: Messages are automatically cleaned up after 24 hours to prevent database bloat

-- create chat messages table
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id bigint references public.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  message text not null check (length(message) > 0 and length(message) <= 300),
  gamemode text not null check (gamemode in ('crash', 'blackjack', 'roulette', 'slots', 'hi-lo')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
comment on table public.chat_messages is 'Stores chat messages for gamemode-specific chat rooms with automatic cleanup after 24 hours';

-- add indexes for efficient querying
create index if not exists chat_messages_gamemode_created_at_idx 
on public.chat_messages(gamemode, created_at desc);

create index if not exists chat_messages_user_id_idx 
on public.chat_messages(user_id);

create index if not exists chat_messages_created_at_idx 
on public.chat_messages(created_at);

-- enable rls on chat messages table
alter table public.chat_messages enable row level security;

-- rls policy: anyone can read chat messages (for gamemode chat visibility)
create policy "Chat messages are viewable by everyone" 
on public.chat_messages 
for select 
to authenticated, anon 
using (true);

-- rls policy: authenticated users can insert their own chat messages
create policy "Authenticated users can send chat messages" 
on public.chat_messages 
for insert 
to authenticated 
with check (
  auth.uid() = (select auth_user_id from public.users where id = user_id)
);

-- rls policy: users can update their own messages (for potential edit functionality)
create policy "Users can update their own chat messages" 
on public.chat_messages 
for update 
to authenticated 
using (
  auth.uid() = (select auth_user_id from public.users where id = user_id)
) 
with check (
  auth.uid() = (select auth_user_id from public.users where id = user_id)
);

-- rls policy: users can delete their own messages
create policy "Users can delete their own chat messages" 
on public.chat_messages 
for delete 
to authenticated 
using (
  auth.uid() = (select auth_user_id from public.users where id = user_id)
);

-- function to clean up old chat messages (older than 24 hours)
create or replace function public.cleanup_old_chat_messages()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- delete messages older than 24 hours
  delete from public.chat_messages 
  where created_at < now() - interval '24 hours';
  
  -- log cleanup action
  raise notice 'Cleaned up old chat messages older than 24 hours';
end;
$$;

-- function to get recent chat messages for a gamemode
create or replace function public.get_recent_chat_messages(
  p_gamemode text,
  p_limit integer default 50
)
returns table (
  id bigint,
  user_id bigint,
  username text,
  avatar_url text,
  message text,
  gamemode text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select 
    cm.id,
    cm.user_id,
    cm.username,
    cm.avatar_url,
    cm.message,
    cm.gamemode,
    cm.created_at
  from public.chat_messages cm
  where cm.gamemode = p_gamemode
  order by cm.created_at desc
  limit p_limit;
end;
$$;

-- function to insert a new chat message
create or replace function public.insert_chat_message(
  p_user_id bigint,
  p_username text,
  p_avatar_url text,
  p_message text,
  p_gamemode text
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  message_id bigint;
begin
  -- validate input parameters
  if p_user_id is null or p_username is null or p_message is null or p_gamemode is null then
    raise exception 'Required parameters cannot be null';
  end if;
  
  if length(trim(p_message)) = 0 then
    raise exception 'Message cannot be empty';
  end if;
  
  if length(p_message) > 300 then
    raise exception 'Message too long (max 300 characters)';
  end if;
  
  if p_gamemode not in ('crash', 'blackjack', 'roulette', 'slots', 'hi-lo') then
    raise exception 'Invalid gamemode';
  end if;
  
  -- insert the message
  insert into public.chat_messages (user_id, username, avatar_url, message, gamemode)
  values (p_user_id, p_username, p_avatar_url, trim(p_message), p_gamemode)
  returning id into message_id;
  
  return message_id;
end;
$$;