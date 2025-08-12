import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Helper function to safely construct API URLs
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  // Remove trailing slash if present to prevent double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://avpgfvdloupgfckpqxuq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cGdmdmRsb3VwZ2Zja3BxeHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODkyMTIsImV4cCI6MjA2ODk2NTIxMn0.7x-eDvqxYUdeI9_SIGwBItsi6HWVwoTuYTL1rybV7yA'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  // Add better error handling
  global: {
    headers: {
      'X-Client-Info': 'minecash-frontend'
    }
  }
})

// GC Balance helper functions
export const gcBalanceHelpers = {
  // Get user's current GC balance
  async getUserBalance(userId: number): Promise<number> {
    try {
      // First try to get existing balance
      const { data, error } = await supabase
        .from('gc_balances')
        .select('balance')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        // If no balance exists, create one
        if (error.code === 'PGRST116') { // No rows returned
          const { data: balanceData, error: createError } = await supabase
            .from('gc_balances')
            .insert({
              user_id: userId,
              balance: 0
            })
            .select('balance')
            .single()
         
          if (createError) {
            console.error('Error creating user balance:', createError)
            return 0
          }
          
          return balanceData?.balance || 0
        } else {
          console.error('Error fetching user balance:', error)
          return 0
        }
      }
      
      return data?.balance || 0
    } catch (error) {
      console.error('Error in getUserBalance:', error)
      return 0
    }
  },

  // Update user's GC balance (for games, deposits, withdrawals)
  async updateBalance(
    userId: number,
    amount: number,
    transactionType: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss' | 'bonus' | 'refund',
    gameType?: string,
    gameId?: string,
    description?: string
  ): Promise<number> {
    const { data, error } = await supabase
      .rpc('update_gc_balance', {
        p_user_id: userId,
        p_amount: amount,
        p_transaction_type: transactionType,
        p_game_type: gameType,
        p_game_id: gameId,
        p_description: description
      })
    
    if (error) {
      console.error('Error updating balance:', error)
      throw new Error('Failed to update balance')
    }
    
    return data
  },

  // Get user's transaction history
  async getUserTransactions(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ) {
    const { data, error } = await supabase
      .rpc('get_user_transactions', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      })
    
    if (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
    
    return data || []
  },

  // Subscribe to real-time balance updates
  subscribeToBalance(userId: number, callback: (balance: number) => void) {
    console.log('Setting up balance subscription for user:', userId);
    
    const channel = supabase
      .channel(`gc_balance_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gc_balances',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          console.log('Balance change detected:', payload);
          const newBalance = payload.new?.balance || 0;
          callback(newBalance);
        }
      )
      .on('system', { event: 'disconnect' }, () => {
        console.log('Balance subscription disconnected, attempting to reconnect...');
        // Attempt to resubscribe after a delay
        setTimeout(() => {
          console.log('Reconnecting balance subscription...');
          this.subscribeToBalance(userId, callback);
        }, 2000);
      })
      .subscribe((status) => {
        console.log('Balance subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Balance subscription established successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Balance subscription error, attempting to reconnect...');
          // Attempt to resubscribe after a delay
          setTimeout(() => {
            console.log('Reconnecting balance subscription after error...');
            this.subscribeToBalance(userId, callback);
          }, 3000);
        }
      });
    
    return {
      unsubscribe: () => {
        console.log('Unsubscribing from balance updates for user:', userId);
        channel.unsubscribe();
      }
    };
  }
}

// Review helper functions
export const reviewHelpers = {
  // Get all reviews for display
  async getReviews(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.error('Error fetching reviews:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching reviews:', error)
      return []
    }
  },

  // Check if user has already submitted a review
  async hasUserReviewed(authUserId: string) {
    try {
      // First get the user's ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single()
      
      if (userError || !userData) {
        return false
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', userData.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user review:', error)
        return false
      }
      
      return !!data
    } catch (error) {
      console.error('Error checking user review:', error)
      return false
    }
  },

  // Subscribe to real-time review updates
  subscribeToReviews(callback: (reviews: any[]) => void) {
    try {
      return supabase
        .channel('reviews')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reviews'
          },
          async () => {
            // Refetch reviews when there are changes
            const reviews = await reviewHelpers.getReviews()
            callback(reviews)
          }
        )
        .subscribe()
    } catch (error) {
      console.error('Error subscribing to reviews:', error)
      // Return a dummy subscription that does nothing
      return {
        unsubscribe: () => {}
      }
    }
  }
}

// GC Limits helper functions
export const gcLimitsHelpers = {
  // Get current GC limits
  async getGCLimits() {
    const { data, error } = await (supabase as any)
      .from('gc_limits')
      .select('*')

    if (error) {
      console.error('Error fetching GC limits:', error)
      return {
        deposit: { min: 50, max: 500 },
        withdraw: { min: 50, max: 500 }
      }
    }

    const limits = {
      deposit: { min: 50, max: 500 },
      withdraw: { min: 50, max: 500 }
    }

    ;(data as any[])?.forEach((limit: any) => {
      const key = String(limit.limit_type) as 'deposit' | 'withdraw'
      limits[key] = {
        min: Number(limit.min_amount),
        max: Number(limit.max_amount)
      }
    })

    return limits
  },

  // Subscribe to real-time GC limits updates
  subscribeToGCLimits(callback: (limits: any) => void) {
    return supabase
      .channel('gc_limits')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gc_limits'
        },
        async () => {
          const limits = await gcLimitsHelpers.getGCLimits()
          callback(limits)
        }
      )
      .subscribe()
  }
}

// Gamemode access helper functions
export const gamemodeAccessHelpers = {
  // Check if a gamemode is disabled for users
  async isGamemodeDisabled(gamemode: string): Promise<boolean> {
    const { data, error } = await (supabase as any)
      .from('gamemode_access_restrictions')
      .select('is_disabled')
      .eq('gamemode', gamemode)
      .single()
    
    if (error) {
      console.error('Error checking gamemode access:', error)
      return false // Default to enabled if error
    }
    
    const result = data?.is_disabled || false;
    return result
  },

  // Get all gamemode restrictions
  async getGamemodeRestrictions() {
    const { data, error } = await (supabase as any)
      .from('gamemode_access_restrictions')
      .select('*')
      .order('gamemode')
    
    if (error) {
      console.error('Error fetching gamemode restrictions:', error)
      return []
    }
    
    return data || []
  },

  // Subscribe to gamemode restriction changes
  subscribeToGamemodeRestrictions(callback: (restrictions: any[]) => void) {
    return supabase
      .channel('gamemode_restrictions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gamemode_access_restrictions'
        },
        async () => {
          // Refetch restrictions when there are changes
          const restrictions = await gamemodeAccessHelpers.getGamemodeRestrictions()
          callback(restrictions)
        }
      )
      .subscribe()
  }
}

// User statistics helper functions
export const userStatsHelpers = {
  // Get user statistics for crash game
  async getCrashStats(userId: number) {
    const { data, error } = await (supabase as any)
      .from('game_bets')
      .select(`
        id,
        bet_amount,
        payout_amount,
        status,
        cashout_value,
        created_at
      `)
      .eq('user_id', userId)
      .eq('game_type', 'crash')
    
    if (error) {
      console.error('Error fetching crash stats:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    const totalGames = data.length
    const gamesWon = (data as any[]).filter((bet: any) => bet.status === 'cashed_out').length
    const gamesLost = (data as any[]).filter((bet: any) => bet.status === 'crashed').length
    const gcWon = (data as any[])
      .filter((bet: any) => bet.payout_amount && bet.payout_amount > 0)
      .reduce((sum: number, bet: any) => sum + Number(bet.payout_amount), 0)
    const gcLost = (data as any[])
      .filter((bet: any) => bet.bet_amount)
      .reduce((sum: number, bet: any) => sum + Number(bet.bet_amount), 0)

    return {
      totalGames,
      gamesWon,
      gamesLost,
      gcWon,
      gcLost
    }
  },

  // Get all user statistics for games with backend data
  async getUserStats(userId: number) {
    const crashStats = await userStatsHelpers.getCrashStats(userId)
    
    return {
      crash: crashStats,
      // Other games will be null since they don't have backend data yet
      blackjack: null,
      roulette: null,
      slots: null,
      'hi-lo': null
    }
  }
}

// Crash rounds helper functions
export const crashRoundsHelpers = {
  // Get the last crash rounds
  async getLastRounds(limit = 20) {
    try {
      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
              const resp = await fetch(getApiUrl(`/game/crash-main/history?limit=${encodeURIComponent(String(limit))}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!resp.ok) {
        console.error('Error fetching last rounds from backend:', resp.status, resp.statusText)
        return []
      }
      const rows = await resp.json()
      if (!Array.isArray(rows)) return []
      // Prefer explicit crash point from game_data; ignore rows without a valid multiplier
      const mapped = rows
        .map((r: any) => {
          const rawMultiplier = r?.game_data?.crash_multiplier ?? r?.crash_multiplier
          const roundNumber = Number(r?.round_number ?? r?.roundNumber ?? 0)
          const multiplier = rawMultiplier != null ? Number(rawMultiplier) : NaN
          return { multiplier, roundNumber }
        })
        // Drop rows without a valid round number or multiplier
        .filter((r: any) => Number.isFinite(r.multiplier) && r.roundNumber > 0)
      
      // Deduplicate by roundNumber (keep the latest occurrence)
      const uniqByRound: Record<number, { multiplier: number; roundNumber: number }> = {}
      for (const r of mapped) {
        uniqByRound[r.roundNumber] = r
      }
      const unique = Object.values(uniqByRound)
      
      // Ensure chronological order oldest->newest and cap to requested limit
      return unique
        .sort((a, b) => a.roundNumber - b.roundNumber)
        .slice(-limit)
    } catch (e) {
      console.error('Error fetching last rounds:', e)
      // Fallback: fetch directly from Supabase if backend is unreachable
      try {
    const { data, error } = await (supabase as any)
      .from('game_rounds')
          .select('round_number, game_data')
          .eq('game_type', 'crash')
          .eq('status', 'completed')
          .order('round_number', { ascending: false })
          .limit(limit)
        if (error || !Array.isArray(data)) return []
        const mapped = data
          .map((r: any) => ({
            multiplier: Number(r?.game_data?.crash_multiplier ?? 1.0),
            roundNumber: Number(r?.round_number ?? 0)
          }))
          .filter((r: any) => Number.isFinite(r.multiplier) && r.roundNumber > 0)
          .reverse()
        return mapped
      } catch {
        return []
      }
    }
  }
}

export default supabase

// Types for our database
export interface UserProfile {
  id: number
  auth_user_id: string
  email: string
  username: string | null
  avatar_url: string | null
  role_id: number
  created_at: string
  updated_at: string
  user_roles?: {
    id: number
    name: string
    description: string | null
  }
}

export interface UserRole {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: number
  user_id: number
  username: string
  rating: number
  description: string
  created_at: string
  updated_at: string
} 