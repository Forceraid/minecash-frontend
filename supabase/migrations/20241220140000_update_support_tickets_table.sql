-- Migration: Update support tickets table
-- Purpose: Add missing fields for ticket completion tracking
-- Affected tables: support_tickets
-- Special considerations: Adding nullable columns to existing table

-- Add missing columns to support_tickets table
alter table public.support_tickets 
add column if not exists closed_at timestamp with time zone,
add column if not exists completed_at timestamp with time zone,
add column if not exists processed_amount numeric;

-- Update status check constraint to include 'completed'
alter table public.support_tickets 
drop constraint if exists support_tickets_status_check;

alter table public.support_tickets 
add constraint support_tickets_status_check 
check (status in ('pending', 'approved', 'rejected', 'completed', 'closed'));

-- Add indexes for better performance
create index if not exists idx_support_tickets_user_id on public.support_tickets (user_id);
create index if not exists idx_support_tickets_ticket_type on public.support_tickets (ticket_type);
create index if not exists idx_support_tickets_status on public.support_tickets (status);
create index if not exists idx_support_tickets_created_at on public.support_tickets (created_at);
create index if not exists idx_support_tickets_discord_channel_id on public.support_tickets (discord_channel_id); 