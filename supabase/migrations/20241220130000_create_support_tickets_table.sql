-- Migration: Create support tickets table
-- Purpose: Store Discord support tickets for user assistance
-- Affected tables: support_tickets
-- Special considerations: RLS enabled for security

create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  user_id text not null,
  type text not null check (type in ('deposit', 'withdraw', 'support')),
  amount integer,
  channel_id text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'closed', 'completed')),
  created_at timestamp with time zone default now(),
  closed_at timestamp with time zone,
  completed_at timestamp with time zone,
  processed_amount integer
);

comment on table public.support_tickets is 'Stores Discord support tickets for user assistance and transaction processing';

-- Enable RLS
alter table public.support_tickets enable row level security;

-- RLS Policies for support_tickets table

-- Allow authenticated users to view their own tickets
create policy "Users can view their own tickets" on support_tickets
for select
to authenticated
using (auth.uid()::text = user_id);

-- Allow authenticated users to create tickets
create policy "Users can create tickets" on support_tickets
for insert
to authenticated
with check (auth.uid()::text = user_id);

-- Allow authenticated users to update their own tickets
create policy "Users can update their own tickets" on support_tickets
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

-- Allow service role to manage all tickets (for Discord bot)
create policy "Service role can manage all tickets" on support_tickets
for all
to service_role
using (true)
with check (true);

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to automatically update updated_at
create trigger update_support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.update_updated_at_column(); 