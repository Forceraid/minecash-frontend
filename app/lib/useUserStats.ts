import { useCallback } from 'react'
import { supabase } from './supabase'

export interface UserStats {
  total_bets: number
  total_won: number
  total_lost: number
  net_profit: number
  games_played: number
  biggest_win: number
  biggest_loss: number
  game_stats?: {
    [key: string]: {
      total_bets: number
      total_won: number
      total_lost: number
      net_profit: number
      games_played: number
      biggest_win: number
      biggest_loss: number
      avg_bet: number
      win_rate: number
    }
  }
}

export function useUserStats() {
  const fetchForUser = useCallback(async (userId: number): Promise<UserStats | null> => {
    try {
      const { data: gameBets, error } = await (supabase as any)
        .from('game_bets')
        .select('game_type, bet_amount, payout_amount, status, cashout_value, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('useUserStats: error fetching game_bets', error)
        return null
      }

      const games = ['crash', 'blackjack', 'roulette', 'slots', 'hi-lo']
      const gameStats: Record<string, any> = {}
      games.forEach((g) => {
        gameStats[g] = {
          total_bets: 0,
          total_won: 0,
          total_lost: 0,
          net_profit: 0,
          games_played: 0,
          biggest_win: 0,
          biggest_loss: 0,
          avg_bet: 0,
          win_rate: 0,
        }
      })

      ;(gameBets || []).forEach((bet: any) => {
        const gameType = String(bet.game_type)
        if (!gameStats[gameType]) return
        const betAmount = Number(bet.bet_amount || 0)
        const payoutAmount = Number(bet.payout_amount || 0)
        const cashoutValue = Number(bet.cashout_value || 0)

        gameStats[gameType].total_bets += betAmount
        gameStats[gameType].games_played += 1

        if (gameType === 'crash') {
          if (bet.status === 'cashed_out' && cashoutValue > 0) {
            const winAmount = betAmount * cashoutValue - betAmount
            gameStats[gameType].total_won += winAmount
            gameStats[gameType].biggest_win = Math.max(gameStats[gameType].biggest_win, winAmount)
          } else if (bet.status === 'crashed') {
            gameStats[gameType].total_lost += betAmount
            gameStats[gameType].biggest_loss = Math.max(gameStats[gameType].biggest_loss, betAmount)
          }
        } else {
          if (payoutAmount > betAmount) {
            const winAmount = payoutAmount - betAmount
            gameStats[gameType].total_won += winAmount
            gameStats[gameType].biggest_win = Math.max(gameStats[gameType].biggest_win, winAmount)
          } else if (payoutAmount < betAmount) {
            const lossAmount = betAmount - payoutAmount
            gameStats[gameType].total_lost += lossAmount
            gameStats[gameType].biggest_loss = Math.max(gameStats[gameType].biggest_loss, lossAmount)
          }
        }
      })

      games.forEach((g) => {
        const s = gameStats[g]
        s.net_profit = s.total_won - s.total_lost
        s.avg_bet = s.games_played > 0 ? s.total_bets / s.games_played : 0
        s.win_rate = s.games_played > 0 ? ((s.total_won > 0 ? 1 : 0) / s.games_played) * 100 : 0
      })

      const overall: UserStats = {
        total_bets: games.reduce((sum, g) => sum + gameStats[g].total_bets, 0),
        total_won: games.reduce((sum, g) => sum + gameStats[g].total_won, 0),
        total_lost: games.reduce((sum, g) => sum + gameStats[g].total_lost, 0),
        net_profit: games.reduce((sum, g) => sum + gameStats[g].net_profit, 0),
        games_played: games.reduce((sum, g) => sum + gameStats[g].games_played, 0),
        biggest_win: Math.max(...games.map((g) => gameStats[g].biggest_win)),
        biggest_loss: Math.max(...games.map((g) => gameStats[g].biggest_loss)),
        game_stats: gameStats,
      }

      return overall
    } catch (e) {
      console.error('useUserStats: unexpected error', e)
      return null
    }
  }, [])

  return { fetchForUser }
}


