import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase, gcBalanceHelpers } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface GCBalanceContextType {
  balance: number
  isLoading: boolean
  error: string | null
  refreshBalance: () => Promise<void>
  robustRefreshBalance: () => Promise<void>
  updateBalance: (
    amount: number,
    transactionType: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss' | 'bonus' | 'refund',
    gameType?: string,
    gameId?: string,
    description?: string
  ) => Promise<number>
  transactions: Array<{
    id: number
    transaction_type: string
    amount: number
    balance_after: number
    game_type: string
    game_id: string
    description: string
    created_at: string
  }>
  loadTransactions: (limit?: number, offset?: number) => Promise<void>
}

const GCBalanceContext = createContext<GCBalanceContextType | undefined>(undefined)

export const useGCBalance = () => {
  const context = useContext(GCBalanceContext)
  if (!context) {
    throw new Error('useGCBalance must be used within a GCBalanceProvider')
  }
  return context
}

interface GCBalanceProviderProps {
  children: ReactNode
}

export const GCBalanceProvider: React.FC<GCBalanceProviderProps> = ({ children }) => {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [userDbId, setUserDbId] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Array<{
    id: number
    transaction_type: string
    amount: number
    balance_after: number
    game_type: string
    game_id: string
    description: string
    created_at: string
  }>>([])

  const refreshBalance = useCallback(async () => {
    if (authLoading || !user?.id || !userProfile?.id) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Use userProfile.id directly since it's already the database ID
      const newBalance = await gcBalanceHelpers.getUserBalance(userProfile.id)
      setBalance(newBalance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
      console.error('Error refreshing balance:', err)
    } finally {
      setIsLoading(false)
    }
  }, [authLoading, user?.id, userProfile?.id])

  const updateBalance = useCallback(async (
    amount: number,
    transactionType: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss' | 'bonus' | 'refund',
    gameType?: string,
    gameId?: string,
    description?: string
  ): Promise<number> => {
    if (!user?.id || !userProfile?.id) {
      throw new Error('User not authenticated')
    }

    try {
      const newBalance = await gcBalanceHelpers.updateBalance(
        userProfile.id,
        amount,
        transactionType,
        gameType,
        gameId,
        description
      )
      setBalance(newBalance)
      return newBalance
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update balance')
      throw err
    }
  }, [user?.id, userProfile?.id])

  const loadTransactions = useCallback(async (limit: number = 50, offset: number = 0) => {
    if (!user?.id || !userProfile?.id) return

    try {
      const userTransactions = await gcBalanceHelpers.getUserTransactions(userProfile.id, limit, offset)
      setTransactions(userTransactions)
    } catch (err) {
      console.error('Error loading transactions:', err)
    }
  }, [user?.id, userProfile?.id])

  // Subscribe to real-time balance updates
  useEffect(() => {
    // Don't set up subscription while auth is still loading
    if (authLoading || !user?.id || !userProfile?.id) return

    console.log('Setting up balance subscription for user:', userProfile.id);
    
    const subscription = gcBalanceHelpers.subscribeToBalance(userProfile.id, (newBalance) => {
      console.log('Balance update received:', newBalance);
      setBalance(newBalance);
    })

    return () => {
      console.log('Cleaning up balance subscription for user:', userProfile.id);
      subscription.unsubscribe()
    }
  }, [user?.id, userProfile?.id, authLoading])

  // Add a more aggressive balance refresh when the component mounts or user changes
  useEffect(() => {
    if (authLoading || !user?.id || !userProfile?.id) return;
    
    // Initial balance fetch
    refreshBalance();
    
    // Set up periodic balance refresh as a fallback (every 30 seconds)
    const interval = setInterval(() => {
      refreshBalance();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user?.id, userProfile?.id, authLoading, refreshBalance]);

  // Add a more robust balance refresh function that handles errors better
  const robustRefreshBalance = useCallback(async () => {
    if (authLoading || !user?.id || !userProfile?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const newBalance = await gcBalanceHelpers.getUserBalance(userProfile.id);
      console.log('Balance refreshed successfully:', newBalance);
      setBalance(newBalance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Error refreshing balance:', err);
      
      // Retry after a short delay if it's a network error
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setTimeout(() => {
          console.log('Retrying balance refresh...');
          refreshBalance();
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user?.id, userProfile?.id, refreshBalance]);

  // Load initial balance and transactions
  useEffect(() => {
    // Don't try to load data while auth is still loading
    if (authLoading) return
    
    if (user?.id && userProfile?.id) {
      // Use the userProfile.id directly since it's already the database ID
      setUserDbId(userProfile.id)
      refreshBalance()
      loadTransactions()
    } else {
      setBalance(0)
      setTransactions([])
      setIsLoading(false)
    }
  }, [user?.id, userProfile?.id, authLoading, refreshBalance, loadTransactions])

  const value: GCBalanceContextType = {
    balance,
    isLoading,
    error,
    refreshBalance,
    robustRefreshBalance,
    updateBalance,
    transactions,
    loadTransactions
  }

  return (
    <GCBalanceContext.Provider value={value}>
      {children}
    </GCBalanceContext.Provider>
  )
} 