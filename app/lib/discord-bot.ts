import { supabase } from './supabase';

// Discord server invite link
export const DISCORD_INVITE_LINK = 'https://discord.gg/2GDmTAfWhT';

// Check if user is in Discord server
export async function checkUserInDiscord(userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('discord-bot', {
      body: {
        action: 'check_user',
        userId: userId
      }
    });

    if (error) {
      console.error('Discord bot function error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error checking user in Discord:', error);
    throw error;
  }
}

// Create a support ticket
export async function createSupportTicket(userId: string, description: string) {
  try {
    const { data, error } = await supabase.functions.invoke('discord-bot', {
      body: {
        action: 'create_ticket',
        userId: userId,
        type: 'support',
        amount: null,
        description: description
      }
    });

    if (error) {
      console.error('Discord bot function error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
}

// Create a deposit ticket
export async function createDepositTicket(userId: string, amount: number, description: string) {
  try {
    const { data, error } = await supabase.functions.invoke('discord-bot', {
      body: {
        action: 'create_ticket',
        userId: userId,
        type: 'deposit',
        amount: amount,
        description: description
      }
    });

    if (error) {
      console.error('Discord bot function error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating deposit ticket:', error);
    throw error;
  }
}

// Create a withdraw ticket
export async function createWithdrawTicket(userId: string, amount: number, description: string) {
  try {
    const { data, error } = await supabase.functions.invoke('discord-bot', {
      body: {
        action: 'create_ticket',
        userId: userId,
        type: 'withdraw',
        amount: amount,
        description: description
      }
    });

    if (error) {
      console.error('Discord bot function error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating withdraw ticket:', error);
    throw error;
  }
} 