import type { Route } from "./+types/admin";
import { useAuth } from "../contexts/AuthContext";
import { GoldButton, LightButton } from "../components/Button";
import { Link } from "react-router";
import { useState, useEffect } from "react";
import { supabase, gcBalanceHelpers, gamemodeAccessHelpers } from "../lib/supabase";
import { backendApi } from "../lib/backend-api";
import { NotificationManager } from "../components/Notification";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin dashboard - MINECASH" },
    { name: "description", content: "Admin dashboard for managing MINECASH platform." },
  ];
}

interface User {
  id: number;
  username: string | null;
  email: string;
  discord_id: string | null;
  banned: boolean;
  created_at: string;
  gc_balance?: number;
  displayName?: string;
}

interface UserStats {
  total_bets: number;
  total_won: number;
  total_lost: number;
  net_profit: number;
  games_played: number;
  biggest_win: number;
  biggest_loss: number;
}

interface GamemodeStats {
  gamemode: string;
  icon: string;
  uptime: number;
  playersOnline: number;
  houseProfit: number;
  houseExpense: number;
  totalBets?: number;
  wins?: number;
  losses?: number;
  avgMultiplier?: number;
  isActive: boolean;
}

const adminLogs = [
  { timestamp: "2024-01-15 14:32", action: "User banned", details: "SpamBot banned for spam", admin: "AdminUser" },
  { timestamp: "2024-01-15 14:28", action: "GC adjustment", details: "Manual GC adjustment: +500 to HighRoller", admin: "AdminUser" },
  { timestamp: "2024-01-15 14:15", action: "Rate change", details: "Blackjack RTP changed from 98.0% to 98.5%", admin: "AdminUser" },
  { timestamp: "2024-01-15 13:45", action: "Ticket response", details: "Support ticket #123 resolved", admin: "AdminUser" },
];

// Helper function to safely construct API URLs
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  // Remove trailing slash if present to prevent double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [gcAdjustments, setGcAdjustments] = useState<{ [key: number]: number }>({});
  const [totalGCCirculation, setTotalGCCirculation] = useState(0);
  const [gcStats, setGcStats] = useState({
    totalCirculation: 0,
    totalDeposits: 0,
    totalWithdrawals: 0
  });
  const [adminLogs, setAdminLogs] = useState<Array<{
    id: number;
    message: string;
    level: string;
    details: any;
    timestamp: string;
    source: string;
  }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [gamemodeRestrictions, setGamemodeRestrictions] = useState<Array<{
    id: number;
    gamemode: string;
    is_disabled: boolean;
    disabled_at: string | null;
    disabled_by: number | null;
    reason: string | null;
  }>>([]);
  const [loadingRestrictions, setLoadingRestrictions] = useState(false);
  const [updatingGamemode, setUpdatingGamemode] = useState<string | null>(null);
  const [emergencyStopping, setEmergencyStopping] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showGCLimitsModal, setShowGCLimitsModal] = useState(false);
  const [gcLimits, setGcLimits] = useState({
    deposit: { min: 50, max: 500 },
    withdraw: { min: 50, max: 500 }
  });
  const [updatingLimits, setUpdatingLimits] = useState(false);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [loadingGameConfig, setLoadingGameConfig] = useState(false);
  const [showGameConfigModal, setShowGameConfigModal] = useState(false);
  const [updatingGameConfig, setUpdatingGameConfig] = useState(false);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [loadingMemoryStats, setLoadingMemoryStats] = useState(false);
  
  // Notification state management
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'error' | 'success' | 'warning';
  }>>([]);
  
  // Notification function
  const addNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };
  
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Search queries
  const [userSearch, setUserSearch] = useState("");
  const [gcSearch, setGcSearch] = useState("");
  const [gamemodeStats, setGamemodeStats] = useState<GamemodeStats[]>([
    { 
      gamemode: "Crash", 
      icon: "🚀", 
      uptime: 99.7, 
      playersOnline: 0, 
      houseProfit: 0, 
      houseExpense: 0,
      totalBets: 0,
      wins: 0,
      losses: 0,
      avgMultiplier: 0,
      isActive: true
    },
    { 
      gamemode: "Blackjack", 
      icon: "", 
      uptime: 0, 
      playersOnline: 0, 
      houseProfit: 0, 
      houseExpense: 0,
      isActive: false
    },
    { 
      gamemode: "Roulette", 
      icon: "", 
      uptime: 0, 
      playersOnline: 0, 
      houseProfit: 0, 
      houseExpense: 0,
      isActive: false
    },
    { 
      gamemode: "Slots", 
      icon: "", 
      uptime: 0, 
      playersOnline: 0, 
      houseProfit: 0, 
      houseExpense: 0,
      isActive: false
    },
    { 
      gamemode: "Hi-Lo", 
      icon: "🎲", 
      uptime: 0, 
      playersOnline: 0, 
      houseProfit: 0, 
      houseExpense: 0,
      totalBets: 0,
      wins: 0,
      losses: 0,
      avgMultiplier: 0,
      isActive: true
    },
  ]);

  // Helper function to get authentication headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No session token available');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch users on component mount
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchTotalGCCirculation();
      fetchAdminLogs();
      fetchGamemodeRestrictions();
      fetchGCLimits();
      fetchGameConfig();
      fetchCrashStats();
      fetchHiLoStats();
      fetchMemoryStats();
    }
  }, [isAdmin]);

  // Refresh crash stats every 30 seconds
  useEffect(() => {
    if (isAdmin) {
      const interval = setInterval(() => {
        fetchCrashStats();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Refresh hi-lo stats every 30 seconds
  useEffect(() => {
    if (isAdmin) {
      const interval = setInterval(() => {
        fetchHiLoStats();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Refresh memory stats every 10 seconds
  useEffect(() => {
    if (isAdmin) {
      const interval = setInterval(() => {
        fetchMemoryStats();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const fetchGameConfig = async () => {
    try {
      setLoadingGameConfig(true);
      const response = await fetch(getApiUrl('/game-config'), {
        headers: await getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Game config response:', data); // Debug log
        // Handle both response formats for backward compatibility
        const config = data.config || data;
        console.log('Extracted config:', config); // Debug log
        setGameConfig(config);
      } else {
        console.error('Failed to fetch game config - response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch game config:', error);
    } finally {
      setLoadingGameConfig(false);
    }
  };

  const updateGameConfig = async (newConfig: any) => {
    try {
      const response = await fetch(getApiUrl('/game-config'), {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify(newConfig)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchGameConfig();
          addNotification('Game configuration updated successfully', 'success');
        } else {
          addNotification('Failed to update game configuration', 'error');
        }
      } else {
        addNotification('Failed to update game configuration', 'error');
      }
    } catch (error) {
      console.error('Failed to update game config:', error);
      addNotification('Failed to update game configuration', 'error');
    }
  };

  const resetGameConfig = async () => {
    try {
      const response = await fetch(getApiUrl('/game-config/reset'), {
        method: 'POST',
        headers: await getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchGameConfig();
          addNotification('Game configuration reset successfully', 'success');
        } else {
          addNotification('Failed to reset game configuration', 'error');
        }
      } else {
        addNotification('Failed to reset game configuration', 'error');
      }
    } catch (error) {
      console.error('Failed to reset game config:', error);
      addNotification('Failed to reset game configuration', 'error');
    }
  };

  const fetchMemoryStats = async () => {
    try {
      const response = await fetch(getApiUrl('/stats/memory'), {
        headers: await getAuthHeaders()
      });
      if (response.ok) {
        const stats = await response.json();
        setMemoryStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch memory stats:', error);
    }
  };

  const fetchGamemodeRestrictions = async () => {
    try {
      setLoadingRestrictions(true);
      const data = await gamemodeAccessHelpers.getGamemodeRestrictions();
      setGamemodeRestrictions(data);
    } catch (error) {
      console.error('Error fetching gamemode restrictions:', error);
    } finally {
      setLoadingRestrictions(false);
    }
  };

  const fetchGCLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('gc_limits')
        .select('*');

      if (error) {
        console.error('Error fetching GC limits:', error);
        return;
      }

      const limits = {
        deposit: { min: 50, max: 500 },
        withdraw: { min: 50, max: 500 }
      };

      data?.forEach(limit => {
        limits[limit.limit_type] = {
          min: limit.min_amount,
          max: limit.max_amount
        };
      });

      setGcLimits(limits);
    } catch (error) {
      console.error('Error fetching GC limits:', error);
    }
  };

  const updateGCLimits = async (type: 'deposit' | 'withdraw', min: number, max: number) => {
    try {
      setUpdatingLimits(true);

      // Get the current user's ID from the users table
      let adminUserId = null;
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (userError) {
          console.error('Error getting admin user ID:', userError);
        } else {
          adminUserId = userData?.id;
        }
      }

      const { error } = await supabase
        .from('gc_limits')
        .update({
          min_amount: min,
          max_amount: max,
          updated_at: new Date().toISOString(),
          updated_by: adminUserId
        })
        .eq('limit_type', type);

      if (error) {
        console.error('Error updating GC limits:', error);
        return;
      }

      // Update local state
      setGcLimits(prev => ({
        ...prev,
        [type]: { min, max }
      }));

      // Log the action
      const { error: logError } = await supabase
        .from('admin_logs')
        .insert({
          message: `GC ${type} limits updated: min ${min}, max ${max}`,
          level: 'info',
          details: { type, min, max },
          source: 'admin_panel'
        });

      if (logError) {
        console.error('Error logging admin action:', logError);
      }

      console.log(`Successfully updated ${type} GC limits`);
    } catch (error) {
      console.error('Error updating GC limits:', error);
    } finally {
      setUpdatingLimits(false);
    }
  };

  const toggleGamemodeAccess = async (gamemode: string, isDisabled: boolean, reason?: string) => {
    try {
      setUpdatingGamemode(gamemode);
      
      // Get the current user's ID from the users table
      let adminUserId = null;
      if (isDisabled && user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (userError) {
          console.error('Error getting admin user ID:', userError);
        } else {
          adminUserId = userData?.id;
        }
      }

      console.log('Updating gamemode restriction:', { gamemode, isDisabled, adminUserId });
      
      const { error } = await supabase
        .from('gamemode_access_restrictions')
        .update({
          is_disabled: isDisabled,
          disabled_at: isDisabled ? new Date().toISOString() : null,
          disabled_by: adminUserId,
          reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('gamemode', gamemode);

      if (error) {
        console.error('Error updating gamemode restriction:', error);
        return;
      }

      console.log('Successfully updated gamemode restriction');

      // Refresh the restrictions
      await fetchGamemodeRestrictions();

      // Log the action
      const { error: logError } = await supabase
        .from('admin_logs')
        .insert({
          message: `Gamemode ${gamemode} ${isDisabled ? 'disabled' : 'enabled'} for users`,
          level: 'info',
          details: { gamemode, is_disabled: isDisabled, reason },
          source: 'admin_panel'
        });

      if (logError) {
        console.error('Error logging admin action:', logError);
      }

      // Show success feedback
      console.log(`Successfully ${isDisabled ? 'disabled' : 'enabled'} ${gamemode} gamemode`);
    } catch (error) {
      console.error('Error toggling gamemode access:', error);
    } finally {
      setUpdatingGamemode(null);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      setEmergencyStopping(true);
      setShowEmergencyModal(false);
      
      // Call the emergency stop API using the backend client
      const result = await backendApi.emergencyStop();
      
      alert('Emergency stop initiated. Server will shutdown in 5 seconds.');
      // The page will become unresponsive as the server shuts down
    } catch (error) {
      console.error('Error initiating emergency stop:', error);
      alert(`Emergency stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEmergencyStopping(false);
    }
  };

  const fetchAdminLogs = async () => {
    try {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching admin logs:', error);
        setAdminLogs([]);
        return;
      }

      setAdminLogs(data || []);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      setAdminLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchCrashStats = async () => {
    try {
      const stateResp = await fetch(getApiUrl('/game/crash-main/state'), {
        headers: await getAuthHeaders()
      });
      if (stateResp.ok) {
        const stateData = await stateResp.json();
        setGamemodeStats(prev => {
          if (!Array.isArray(prev)) {
            console.error('gamemodeStats is not an array:', prev);
            return prev;
          }
          
          return prev.map(stat => 
            stat.gamemode === 'Crash' 
              ? {
                  ...stat,
                  isActive: stateData.isActive || false,
                  playersOnline: stateData.playersOnline || 0,
                  uptime: stateData.uptime || 0
                }
              : stat
          );
        });
      }
    } catch (error) {
      console.error('Failed to fetch crash stats:', error);
    }
  };

  const fetchHiLoStats = async () => {
    try {
      // Fetch Hi-Lo game state from backend
      const stateResp = await fetch(getApiUrl('/game/hi-lo-main/state'), {
        headers: await getAuthHeaders()
      });
      
      let isActive = true; // Default to true since Hi-Lo is now implemented
      let playersOnline = 0;
      let uptime = 99.5; // Default uptime for Hi-Lo
      
      if (stateResp.ok) {
        try {
          const stateData = await stateResp.json();
          isActive = stateData.isActive !== undefined ? stateData.isActive : true;
          playersOnline = stateData.playersOnline || 0;
          uptime = stateData.uptime || 99.5;
        } catch (parseError) {
          console.error('Error parsing Hi-Lo state response:', parseError);
        }
      }
      
      // Fetch Hi-Lo statistics from database
      let totalBets = 0;
      let wins = 0;
      let losses = 0;
      let houseProfit = 0;
      let houseExpense = 0;
      
      try {
        // Get total bets count
        const { count: betsCount, error: betsError } = await supabase
          .from('game_bets')
          .select('*', { count: 'exact', head: true })
          .eq('game_type', 'hi-lo');
        
        if (!betsError && betsCount !== null) {
          totalBets = betsCount;
        }
        
        // Get wins and losses
        const { count: winsCount, error: winsError } = await supabase
          .from('game_bets')
          .select('*', { count: 'exact', head: true })
          .eq('game_type', 'hi-lo')
          .eq('status', 'won');
        
        if (!winsError && winsCount !== null) {
          wins = winsCount;
        }
        
        const { count: lossesCount, error: lossesError } = await supabase
          .from('game_bets')
          .select('*', { count: 'exact', head: true })
          .eq('game_type', 'hi-lo')
          .eq('status', 'lost');
        
        if (!lossesError && lossesCount !== null) {
          losses = lossesCount;
        }
        
        // Calculate house profit/expense from transactions
        const { data: transactions, error: transError } = await supabase
          .from('gc_transactions')
          .select('amount, transaction_type')
          .eq('game_type', 'hi-lo');
        
        if (!transError && transactions) {
          transactions.forEach(trans => {
            if (trans.transaction_type === 'game_win') {
              houseExpense += Math.abs(trans.amount);
            } else if (trans.transaction_type === 'game_loss') {
              houseProfit += Math.abs(trans.amount);
            }
          });
        }
        
      } catch (dbError) {
        console.error('Error fetching Hi-Lo database stats:', dbError);
      }
      
      // Update gamemodeStats array correctly
      setGamemodeStats(prev => {
        if (!Array.isArray(prev)) {
          console.error('gamemodeStats is not an array:', prev);
          return prev;
        }
        
        return prev.map(stat => 
          stat.gamemode === 'Hi-Lo' 
            ? {
                ...stat,
                isActive,
                playersOnline,
                uptime,
                totalBets,
                wins,
                losses,
                houseProfit,
                houseExpense,
                avgMultiplier: wins > 0 ? 2.0 : 0 // Default Hi-Lo multiplier
              }
            : stat
        );
      });
      
    } catch (error) {
      console.error('Failed to fetch hi-lo stats:', error);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getUserBalanceFromTransactions = async (userId: number): Promise<number> => {
    try {
      // First check if user has any transactions
      const { count, error: countError } = await supabase
        .from('gc_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError || count === 0) {
        return 0;
      }

      // If user has transactions, get the latest balance
      const { data, error } = await supabase
        .from('gc_transactions')
        .select('balance_after')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return 0;
      }

      return parseFloat(data[0].balance_after || '0');
    } catch (error) {
      console.error('Error fetching balance from transactions:', error);
      return 0;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          email,
          discord_id,
          banned,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Fetch balances for each user using the proper helper function
      const formattedUsers = await Promise.all(
        usersData?.map(async (user) => {
          try {
            let balance = await gcBalanceHelpers.getUserBalance(user.id);
            
            // If balance is 0, try to get it from transactions
            if (balance === 0) {
              balance = await getUserBalanceFromTransactions(user.id);
            }
            
            return {
              ...user,
              gc_balance: balance,
              // Provide a better fallback for username
              displayName: user.username || user.email?.split('@')[0] || `User-${user.id}`
            };
          } catch (error) {
            console.error(`Error fetching balance for user ${user.id}:`, error);
            return {
              ...user,
              gc_balance: 0,
              displayName: user.username || user.email?.split('@')[0] || `User-${user.id}`
            };
          }
        }) || []
      );

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTotalGCCirculation = async () => {
    try {
      // Calculate total circulation from actual user balances
      const { data: balanceData, error: balanceError } = await supabase
        .from('gc_balances')
        .select('balance');

      if (balanceError) {
        console.error('Error fetching GC balances:', balanceError);
        return;
      }

      // Calculate total deposits and withdrawals for reference
      const { data: transactionData, error: transactionError } = await supabase
        .from('gc_transactions')
        .select('transaction_type, amount, game_type');

      if (transactionError) {
        console.error('Error fetching GC transactions:', transactionError);
        return;
      }

      // Calculate actual total circulation (what users have)
      const totalCirculation = balanceData?.reduce((sum, balance) => 
        sum + parseFloat(balance.balance || '0'), 0
      ) || 0;

      // Calculate total deposits and withdrawals for reference (exclude admin transactions)
      let totalDeposits = 0;
      let totalWithdrawals = 0;

      transactionData?.forEach(transaction => {
        const amount = parseFloat(transaction.amount || '0');
        const gameType = transaction.game_type;
        
        // Only count real deposits/withdrawals, exclude admin adjustments
        if (transaction.transaction_type === 'deposit' && gameType !== 'admin') {
          totalDeposits += amount;
        } else if (transaction.transaction_type === 'withdrawal' && gameType !== 'admin') {
          totalWithdrawals += amount;
        }
      });

      setTotalGCCirculation(totalCirculation);
      
      // Store deposit/withdrawal totals for display
      setGcStats({
        totalCirculation,
        totalDeposits,
        totalWithdrawals
      });
    } catch (error) {
      console.error('Error fetching GC circulation:', error);
    }
  };

  const fetchUserStats = async (userId: number) => {
    try {
      setLoadingStats(true);
      
      // Get crash game stats
      const { data: crashBets, error: crashError } = await supabase
        .from('crash_bets')
        .select('bet_amount, payout_amount, status')
        .eq('user_id', userId);

      if (crashError) {
        console.error('Error fetching crash bets:', crashError);
        return;
      }

      // Calculate stats from crash bets
      let totalBets = 0;
      let totalWon = 0;
      let totalLost = 0;
      let biggestWin = 0;
      let biggestLoss = 0;
      let gamesPlayed = 0;

      crashBets?.forEach(bet => {
        const betAmount = parseFloat(bet.bet_amount || '0');
        const payoutAmount = parseFloat(bet.payout_amount || '0');
        
        totalBets += betAmount;
        
        if (bet.status === 'cashed_out' && payoutAmount > 0) {
          totalWon += payoutAmount;
          biggestWin = Math.max(biggestWin, payoutAmount);
        } else if (bet.status === 'crashed') {
          totalLost += betAmount;
          biggestLoss = Math.max(biggestLoss, betAmount);
        }
        
        gamesPlayed++;
      });

      const netProfit = totalWon - totalLost;

      setUserStats({
        total_bets: totalBets,
        total_won: totalWon,
        total_lost: totalLost,
        net_profit: netProfit,
        games_played: gamesPlayed,
        biggest_win: biggestWin,
        biggest_loss: biggestLoss
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const toggleUserBan = async (userId: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ banned: !user.banned })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user ban status:', error);
        return;
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, banned: !u.banned } : u
      ));
    } catch (error) {
      console.error('Error toggling user ban:', error);
    }
  };

  const resetUserGC = async (userId: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const currentBalance = user.gc_balance || 0;
      
      // Calculate the adjustment needed to reach 0
      const adjustment = -currentBalance; // Negative to reduce to 0
      
      // Use the proper balance update method with admin transaction type
      const newBalance = await gcBalanceHelpers.updateBalance(
        userId,
        adjustment,
        'refund', // Use refund type for admin resets
        'admin',
        'admin_reset',
        `GC balance reset by admin (was ${currentBalance})`
      );

      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, gc_balance: newBalance } : u
      ));

      // Refresh total GC circulation
      fetchTotalGCCirculation();
    } catch (error) {
      console.error('Error resetting user GC:', error);
    }
  };

  const adjustUserGC = async (userId: number, adjustment: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      let transactionType = 'bonus';
      if (adjustment < 0) {
        transactionType = 'refund'; // Use refund for negative admin adjustments
      }

      // Use the proper balance update method
      const newBalance = await gcBalanceHelpers.updateBalance(
        userId,
        adjustment,
        transactionType,
        'admin',
        'admin_adjustment',
        `GC balance adjusted by admin: ${adjustment > 0 ? '+' : ''}${adjustment}`
      );

      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, gc_balance: newBalance } : u
      ));

      // Refresh total GC circulation
      fetchTotalGCCirculation();
    } catch (error) {
      console.error('Error adjusting user GC:', error);
    }
  };

  const handleViewStats = async (user: User) => {
    setSelectedUser(user);
    setShowStatsModal(true);
    await fetchUserStats(user.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
              <div className="text-center text-white max-w-md mx-auto px-4">
        <div className="text-6xl mb-6">🚫</div>
        <h2 className="text-3xl font-bold mb-4">Access denied</h2>
        <p className="text-lg mb-8 text-gray-300">You need admin privileges to access this page.</p>
        <Link to="/">
          <LightButton>← Back to Home</LightButton>
        </Link>
      </div>
      </div>
    );
  }

  const tabs = [
    { id: "users", name: "👥 User management", icon: "👥" },
    { id: "gc", name: "💰 GC tracker", icon: "💰" },
    { id: "stats", name: "📊 Gamemode stats", icon: "📊" },
    { id: "config", name: "⚙️ Game config", icon: "⚙️" },
    { id: "memory", name: "🧠 Memory monitor", icon: "🧠" },
    { id: "logs", name: "📋 Admin logs & tools", icon: "📋" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] bg-black">
      <div className="max-w-7xl mx-auto px-4 pt-24 sm:pt-28 md:pt-32 pb-0">

        {/* Tab Navigation */}
        <div className="bg-gray-900 rounded-lg border border-yellow-500/20 flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-9rem)] md:h-[calc(100vh-10rem)] overflow-hidden">
          <div className="flex border-b border-gray-700 flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center ${
                  activeTab === tab.id
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-800'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-2xl">{tab.icon}</span>
              </button>
            ))}
          </div>

          <div className="p-6 flex-1 overflow-y-auto scrollbar-hide pb-6">
            {/* User Management Tab */}
            {activeTab === "users" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                  <h2 className="text-2xl font-bold text-white">User management</h2>
                  <div className="w-full sm:w-80">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by Discord username, username, or email"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
                
                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading users...</p>
                  </div>
                ) : (
                  <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto min-h-[300px] max-h-[calc(100vh-24rem)] overflow-y-auto scrollbar-hide">
                  <table className="w-full bg-gray-800 rounded-lg min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-4 text-white whitespace-nowrap">Username</th>
                        <th className="text-left p-4 text-white whitespace-nowrap">Discord ID</th>
                        <th className="text-left p-4 text-white whitespace-nowrap">Email</th>
                        <th className="text-left p-4 text-white whitespace-nowrap">GC balance</th>
                        <th className="text-left p-4 text-white whitespace-nowrap">Status</th>
                        <th className="text-left p-4 text-white whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users || []).filter(u => {
                        if (!userSearch.trim()) return true;
                        const q = userSearch.trim().toLowerCase();
                        const fields = [
                          u.displayName || "",
                          u.username || "",
                          u.email || "",
                          u.discord_id || ""
                        ].map(s => (s || "").toLowerCase());
                        return fields.some(f => f.includes(q));
                      }).map((user) => (
                        <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700">
                              <td className="p-4 text-white whitespace-nowrap">{user.displayName}</td>
                              <td className="p-4 text-gray-300 whitespace-nowrap">{user.discord_id || 'N/A'}</td>
                          <td className="p-4 text-gray-300 whitespace-nowrap">{user.email}</td>
                              <td className="p-4 text-yellow-400 whitespace-nowrap">{user.gc_balance || 0} GC</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              user.banned ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                            }`}>
                              {user.banned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => toggleUserBan(user.id)}
                                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap ${
                                  user.banned 
                                    ? 'bg-green-600 hover:bg-green-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white' 
                                    : 'bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white'
                                }`}
                              >
                                {user.banned ? 'Unban' : 'Ban'}
                              </button>
                              <button
                                onClick={() => resetUserGC(user.id)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                Reset GC
                              </button>
                                  <button
                                    onClick={() => handleViewStats(user)}
                                    className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
                                  >
                                  View stats
                                </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 min-h-[300px] max-h-[calc(100vh-24rem)] overflow-y-auto scrollbar-hide">
                  {(users || []).filter(u => {
                    if (!userSearch.trim()) return true;
                    const q = userSearch.trim().toLowerCase();
                    const fields = [
                      u.displayName || "",
                      u.username || "",
                      u.email || "",
                      u.discord_id || ""
                    ].map(s => (s || "").toLowerCase());
                    return fields.some(f => f.includes(q));
                  }).map((user) => (
                    <div key={user.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                              <span className="text-white font-semibold">{user.displayName}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.banned ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                          }`}>
                            {user.banned ? 'Banned' : 'Active'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Discord ID:</span>
                                <span className="text-gray-300">{user.discord_id || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-gray-300 truncate">{user.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">GC Balance:</span>
                                <span className="text-yellow-400">{user.gc_balance || 0} GC</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                          <button
                            onClick={() => toggleUserBan(user.id)}
                            className={`px-3 py-2 rounded text-sm font-semibold cursor-pointer ${
                              user.banned 
                                ? 'bg-green-600 hover:bg-green-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white' 
                                : 'bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white'
                            }`}
                          >
                            {user.banned ? 'Unban' : 'Ban'}
                          </button>
                          <button
                            onClick={() => resetUserGC(user.id)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                          >
                            Reset GC
                          </button>
                              <button
                                onClick={() => handleViewStats(user)}
                                className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                              >
                              View stats
                            </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                  </>
                )}
              </div>
            )}

            {/* GC Tracker Tab */}
            {activeTab === "gc" && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">GC tracker</h2>
                
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-yellow-400">{gcStats.totalCirculation.toLocaleString()}</div>
                    <div className="text-gray-400">Total GC in circulation</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-green-400">{gcStats.totalDeposits.toLocaleString()}</div>
                    <div className="text-gray-400">Total deposited</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-red-400">{gcStats.totalWithdrawals.toLocaleString()}</div>
                    <div className="text-gray-400">Total withdrawn</div>
                  </div>
                </div>

                {/* Individual User GC Editor */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                    <h3 className="text-xl font-bold text-white">Individual GC balance editor</h3>
                    <div className="w-full sm:w-80">
                      <input
                        type="text"
                        value={gcSearch}
                        onChange={(e) => setGcSearch(e.target.value)}
                        placeholder="Search by Discord username, username, or email"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto min-h-[300px] max-h-[calc(100vh-24rem)] overflow-y-auto scrollbar-hide">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-white whitespace-nowrap">User</th>
                          <th className="text-left p-3 text-white whitespace-nowrap">Current balance</th>
                          <th className="text-left p-3 text-white whitespace-nowrap">Adjustment</th>
                          <th className="text-left p-3 text-white whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(users || []).filter(u => {
                          if (!gcSearch.trim()) return true;
                          const q = gcSearch.trim().toLowerCase();
                          const fields = [
                            u.displayName || "",
                            u.username || "",
                            u.email || "",
                            u.discord_id || ""
                          ].map(s => (s || "").toLowerCase());
                          return fields.some(f => f.includes(q));
                        }).map((user) => (
                          <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700">
                            <td className="p-3 text-white whitespace-nowrap">{user.displayName}</td>
                            <td className="p-3 text-yellow-400 whitespace-nowrap">{user.gc_balance || 0} GC</td>
                            <td className="p-3">
                              <input
                                type="number"
                                placeholder="±amount"
                                value={gcAdjustments[user.id] || ''}
                                onChange={(e) => setGcAdjustments(prev => ({ 
                                  ...prev, 
                                  [user.id]: parseFloat(e.target.value) || 0 
                                }))}
                                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white w-24 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              />
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <button 
                                onClick={() => adjustUserGC(user.id, gcAdjustments[user.id] || 0)}
                                className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-1 rounded text-sm font-semibold mr-2 cursor-pointer"
                              >
                                Apply
                              </button>
                              <button 
                                onClick={() => setGcAdjustments(prev => ({ ...prev, [user.id]: 0 }))}
                                className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-1 rounded text-sm font-semibold cursor-pointer"
                              >
                                Reset
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4 min-h-[300px] max-h-[calc(100vh-24rem)] overflow-y-auto scrollbar-hide">
                    {(users || []).filter(u => {
                      if (!gcSearch.trim()) return true;
                      const q = gcSearch.trim().toLowerCase();
                      const fields = [
                        u.displayName || "",
                        u.username || "",
                        u.email || "",
                        u.discord_id || ""
                      ].map(s => (s || "").toLowerCase());
                      return fields.some(f => f.includes(q));
                    }).map((user) => (
                      <div key={user.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">{user.displayName}</span>
                            <span className="text-yellow-400 font-bold">{user.gc_balance || 0} GC</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Adjustment</label>
                              <input
                                type="number"
                                placeholder="±amount"
                                value={gcAdjustments[user.id] || ''}
                                onChange={(e) => setGcAdjustments(prev => ({ 
                                  ...prev, 
                                  [user.id]: parseFloat(e.target.value) || 0 
                                }))}
                                className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              />
                            </div>
                            
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => adjustUserGC(user.id, gcAdjustments[user.id] || 0)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                              >
                                Apply
                              </button>
                              <button 
                                onClick={() => setGcAdjustments(prev => ({ ...prev, [user.id]: 0 }))}
                                className="flex-1 bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Gamemode Stats Tab */}
            {activeTab === "stats" && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Gamemode statistics</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {(gamemodeStats || []).filter(stat => stat.isActive).map((stat, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <span className="text-2xl">{stat.icon}</span>
                        <h3 className="text-xl font-bold text-white">{stat.gamemode}</h3>
                        {stat.isActive ? (
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">Active</span>
                        ) : (
                          <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">Inactive</span>
                        )}
                      </div>
                      
                      {stat.isActive ? (
                        // Active gamemode - show real stats
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Uptime:</span>
                          <span className={`font-bold ${stat.uptime >= 99.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {stat.uptime}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Players online:</span>
                          <span className="text-white font-bold">{stat.playersOnline}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">House profit:</span>
                          <span className="text-green-400 font-bold">+{stat.houseProfit} GC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">House expense:</span>
                          <span className="text-red-400 font-bold">-{stat.houseExpense} GC</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-700 pt-2">
                          <span className="text-gray-400">Net profit:</span>
                          <span className="text-yellow-400 font-bold">
                            +{stat.houseProfit - stat.houseExpense} GC
                          </span>
                        </div>
                          
                          {/* Additional real stats for active gamemodes */}
                          {stat.totalBets && (
                            <>
                              <div className="border-t border-gray-700 pt-2 mt-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Total bets:</span>
                                  <span className="text-white font-bold">{stat.totalBets}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Wins:</span>
                                  <span className="text-green-400 font-bold">{stat.wins}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Losses:</span>
                                  <span className="text-red-400 font-bold">{stat.losses}</span>
                                </div>
                                {stat.avgMultiplier && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Avg multiplier:</span>
                                    <span className="text-yellow-400 font-bold">{stat.avgMultiplier}x</span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        // Inactive gamemode - show placeholder
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="text-gray-500 font-bold">Not implemented</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Players online:</span>
                            <span className="text-gray-500 font-bold">-</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">House profit:</span>
                            <span className="text-gray-500 font-bold">-</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">House expense:</span>
                            <span className="text-gray-500 font-bold">-</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-700 pt-2">
                            <span className="text-gray-400">Net profit:</span>
                            <span className="text-gray-500 font-bold">-</span>
                        </div>
                      </div>
                      )}

                      {/* Chart placeholder - only show for active gamemodes */}
                      {stat.isActive && (
                      <div className="mt-4 bg-gray-700 rounded p-3">
                        <div className="text-sm text-gray-400 mb-2">24h trend</div>
                        <div className="flex items-end h-16 w-full">
                          {[...Array(24)].map((_, i) => (
                            <div
                              key={i}
                              className="bg-yellow-400 flex-1 mx-px rounded-t"
                              style={{ height: `${Math.random() * 100}%` }}
                            ></div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Logs & Tools Tab */}
            {activeTab === "logs" && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Admin logs & tools</h2>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <GoldButton 
                    onClick={() => setShowDisableModal(true)}
                    className="flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Disable access</span>
                  </GoldButton>
                  <button 
                    onClick={() => setShowEmergencyModal(true)}
                    disabled={emergencyStopping}
                    className={`bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-4 py-2 rounded font-semibold flex items-center justify-center space-x-2 cursor-pointer ${
                      emergencyStopping ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {emergencyStopping ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Stopping...</span>
                      </div>
                    ) : (
                      <span>Emergency stop</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowGCLimitsModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-4 py-2 rounded font-semibold flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>GC limits</span>
                  </button>
                </div>

                {/* Admin Logs */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Backend logs</h3>
                    <button 
                      onClick={fetchAdminLogs}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                    {loadingLogs ? (
                      <div className="text-gray-400 text-center py-4">Loading logs...</div>
                    ) : adminLogs.length > 0 ? (
                      adminLogs.map((log) => {
                        const timestamp = new Date(log.timestamp).toLocaleString();
                        const timeAgo = getTimeAgo(new Date(log.timestamp));
                        
                        return (
                          <div key={log.id} className={`flex items-start space-x-4 p-3 rounded ${
                            log.level === 'error' ? 'bg-red-900/30 border border-red-500/30' :
                            log.level === 'warning' ? 'bg-yellow-900/30 border border-yellow-500/30' :
                            log.level === 'success' ? 'bg-green-900/30 border border-green-500/30' :
                            'bg-gray-700'
                          }`}>
                            <div className="text-gray-400 text-sm w-32 flex-shrink-0">{timeAgo}</div>
                        <div className="flex-1">
                              <div className="text-white font-semibold">{log.message}</div>
                              {log.details && (
                                <div className="text-gray-300 text-sm mt-1">
                                  {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                                </div>
                              )}
                            </div>
                            <div className={`text-sm flex-shrink-0 ${
                              log.level === 'error' ? 'text-red-400' :
                              log.level === 'warning' ? 'text-yellow-400' :
                              log.level === 'success' ? 'text-green-400' :
                              'text-blue-400'
                            }`}>
                              {log.level.toUpperCase(        )}
      </div>
      
      {/* Notification Manager */}
      <NotificationManager notifications={notifications} onRemove={removeNotification} />
    </div>
  );
})
                    ) : (
                      <div className="text-gray-400 text-center py-4">No logs available</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Game Configuration Tab */}
            {activeTab === "config" && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Game configuration</h2>
                
                {loadingGameConfig ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading game configuration...</p>
                  </div>
                ) : gameConfig ? (
                  <div className="space-y-6">
                    {/* Bet Limits Section */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Bet limits</h3>
                        <button
                          onClick={() => setShowGameConfigModal(true)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-semibold cursor-pointer"
                        >
                          Edit settings
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(gameConfig.betLimits || {}).map(([gamemode, limits]: [string, any]) => (
                          <div key={gamemode} className="bg-gray-700 rounded p-4">
                            <h4 className="text-lg font-semibold text-white mb-2 capitalize">{gamemode}</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Min:</span>
                                <span className="text-white font-bold">{limits.min} GC</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Max:</span>
                                <span className="text-white font-bold">{limits.max} GC</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* House Edge Section */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">House edge</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(gameConfig.houseEdge || {}).map(([gamemode, edge]: [string, any]) => (
                          <div key={gamemode} className="bg-gray-700 rounded p-4">
                            <h4 className="text-lg font-semibold text-white mb-2 capitalize">{gamemode}</h4>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-yellow-400">{(edge * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Game Timing Section */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Game timing</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(gameConfig.gameTiming || {}).map(([phase, duration]: [string, any]) => (
                          <div key={phase} className="bg-gray-700 rounded p-4">
                            <h4 className="text-lg font-semibold text-white mb-2">
                              {phase === 'bettingPhase' ? 'Betting phase' : 
                               phase === 'gamePhase' ? 'Game phase' : 
                               phase === 'resultPhase' ? 'Result phase' : 
                               phase.charAt(0).toUpperCase() + phase.slice(1)}
                            </h4>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-blue-400">{Math.round(duration / 1000)}s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chat Settings Section */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Chat settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(gameConfig.chatSettings || {}).map(([setting, value]: [string, any]) => (
                          <div key={setting} className="bg-gray-700 rounded p-4">
                            <h4 className="text-lg font-semibold text-white mb-2">
                              {setting === 'messageRateLimit' ? 'Message rate limit' : 
                               setting === 'maxMessageLength' ? 'Max message length' : 
                               setting === 'maxHistoryLength' ? 'Max history length' : 
                               setting.charAt(0).toUpperCase() + setting.slice(1)}
                            </h4>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-green-400">{value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Balance Limits Section */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Balance limits</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded p-4">
                          <h4 className="text-lg font-semibold text-white mb-2">Minimum balance</h4>
                          <div className="text-center">
                            <span className="text-2xl font-bold text-red-400">{gameConfig.balanceLimits?.minBalance || 0} GC</span>
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded p-4">
                          <h4 className="text-lg font-semibold text-white mb-2">Maximum balance</h4>
                          <div className="text-center">
                            <span className="text-2xl font-bold text-green-400">{gameConfig.balanceLimits?.maxBalance || 1000000} GC</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Multiplier Limits Section */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Multiplier limits</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(gameConfig.multiplierLimits || {}).map(([gamemode, limit]: [string, any]) => (
                          <div key={gamemode} className="bg-gray-700 rounded p-4">
                            <h4 className="text-lg font-semibold text-white mb-2 capitalize">{gamemode}</h4>
                            <div className="text-center">
                              {limit === null || limit === undefined ? (
                                <span className="text-2xl font-bold text-gray-400">No limit</span>
                              ) : (
                                <span className="text-2xl font-bold text-purple-400">{limit}x</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Failed to load game configuration</p>
                  </div>
                )}
              </div>
            )}

            {/* Memory Monitoring Tab */}
            {activeTab === "memory" && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Memory monitoring</h2>
                
                {loadingMemoryStats ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading memory statistics...</p>
                  </div>
                ) : memoryStats ? (
                  <div className="space-y-6">
                    {/* Memory Usage Overview */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Memory usage</h3>
                        <button
                          onClick={fetchMemoryStats}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm cursor-pointer"
                        >
                          Refresh
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-700 rounded p-4 text-center">
                          <div className="text-2xl font-bold text-blue-400">{memoryStats?.memory?.heapUsed || 0} MB</div>
                          <div className="text-gray-400 text-sm">Heap used</div>
                        </div>
                        <div className="bg-gray-700 rounded p-4 text-center">
                          <div className="text-2xl font-bold text-green-400">{memoryStats?.memory?.heapTotal || 0} MB</div>
                          <div className="text-gray-400 text-sm">Heap total</div>
                        </div>
                        <div className="bg-gray-700 rounded p-4 text-center">
                          <div className="text-2xl font-bold text-yellow-400">{memoryStats?.memory?.external || 0} MB</div>
                          <div className="text-gray-400 text-sm">External</div>
                        </div>
                        <div className="bg-gray-700 rounded p-4 text-center">
                          <div className="text-2xl font-bold text-purple-400">{memoryStats?.memory?.rss || 0} MB</div>
                          <div className="text-gray-400 text-sm">RSS</div>
                        </div>
                      </div>
                    </div>

                    {/* Memory Usage Progress Bars */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Memory utilization</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Heap usage</span>
                            <span className="text-blue-400 font-bold">
                              {memoryStats?.memory?.heapUsage || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-3">
                            <div 
                              className="bg-blue-400 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(memoryStats?.memory?.heapUsage || 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Memory efficiency</span>
                            <span className="text-green-400 font-bold">
                              {memoryStats?.memory?.memoryEfficiency || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-3">
                            <div 
                              className="bg-green-400 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(memoryStats?.memory?.memoryEfficiency || 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Internal Data Structures */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Internal data structures</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">User connections</span>
                            <span className="text-yellow-400 font-bold">{memoryStats?.tracking?.userConnections || 0}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((memoryStats?.tracking?.userConnections || 0) / 1000 * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 rounded p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Game states</span>
                            <span className="text-blue-400 font-bold">{memoryStats?.tracking?.gameStates || 0}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((memoryStats?.tracking?.gameStates || 0) / 100 * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 rounded p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Active games</span>
                            <span className="text-green-400 font-bold">{memoryStats?.tracking?.activeGames || 0}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-green-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((memoryStats?.tracking?.activeGames || 0) / 50 * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 rounded p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Game instances</span>
                            <span className="text-purple-400 font-bold">{memoryStats?.tracking?.gameStates || 0}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(((memoryStats?.tracking?.gameStates || 0) / 100) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Memory Health Status */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Memory health status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`rounded p-4 text-center ${
                          (memoryStats?.memory?.heapUsed || 0) < 500 ? 'bg-green-900/30 border border-green-500/30' :
                          (memoryStats?.memory?.heapUsed || 0) < 1000 ? 'bg-yellow-900/30 border border-yellow-500/30' :
                          'bg-red-900/30 border border-red-500/30'
                        }`}>
                          <div className={`text-2xl font-bold ${
                            (memoryStats?.memory?.heapUsed || 0) < 500 ? 'text-green-400' :
                            (memoryStats?.memory?.heapUsed || 0) < 1000 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {(memoryStats?.memory?.heapUsed || 0) < 500 ? 'Healthy' :
                             (memoryStats?.memory?.heapUsed || 0) < 1000 ? 'Warning' :
                             'Critical'}
                          </div>
                          <div className="text-gray-400 text-sm">Heap usage</div>
                        </div>
                        
                        <div className={`rounded p-4 text-center ${
                          (memoryStats?.memory?.heapUsage || 0) < 70 ? 'bg-green-900/30 border border-green-500/30' :
                          (memoryStats?.memory?.heapUsage || 0) < 90 ? 'bg-yellow-900/30 border border-yellow-500/30' :
                          'bg-red-900/30 border border-red-500/30'
                        }`}>
                          <div className={`text-2xl font-bold ${
                            (memoryStats?.memory?.heapUsage || 0) < 70 ? 'text-green-400' :
                            (memoryStats?.memory?.heapUsage || 0) < 90 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {memoryStats?.memory?.heapUsage || 0}%
                          </div>
                          <div className="text-gray-400 text-sm">Heap utilization</div>
                        </div>
                        
                        <div className={`rounded p-4 text-center ${
                          (memoryStats?.tracking?.userConnections || 0) < 500 ? 'bg-green-900/30 border border-green-500/30' :
                          (memoryStats?.tracking?.userConnections || 0) < 1000 ? 'bg-yellow-900/30 border border-yellow-500/30' :
                          'bg-red-900/30 border border-red-500/30'
                        }`}>
                          <div className={`text-2xl font-bold ${
                            (memoryStats?.tracking?.userConnections || 0) < 500 ? 'text-green-400' :
                            (memoryStats?.tracking?.userConnections || 0) < 1000 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {memoryStats?.tracking?.userConnections || 0}
                          </div>
                          <div className="text-gray-400 text-sm">Active users</div>
                        </div>
                      </div>
                    </div>

                    {/* Crash Game State */}
                    {memoryStats?.crashState && (
                      <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Crash game state</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gray-700 rounded p-4 text-center">
                            <div className="text-2xl font-bold text-blue-400">{memoryStats.crashState.phase}</div>
                            <div className="text-gray-400 text-sm">Current phase</div>
                          </div>
                          <div className="bg-gray-700 rounded p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">{memoryStats.crashState.currentMultiplier}x</div>
                            <div className="text-gray-400 text-sm">Current multiplier</div>
                          </div>
                          <div className="bg-gray-700 rounded p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-400">{memoryStats.crashState.activePlayersCount}</div>
                            <div className="text-gray-400 text-sm">Active players</div>
                          </div>
                          <div className="bg-gray-700 rounded p-4 text-center">
                            <div className="text-2xl font-bold text-purple-400">{memoryStats.crashState.totalBetAmount}</div>
                            <div className="text-gray-400 text-sm">Total bet amount</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Failed to load memory statistics</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Disable Access Modal */}
        {showDisableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Disable gamemode access</h3>
                <button
                  onClick={() => setShowDisableModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {loadingRestrictions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading gamemode restrictions...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300 mb-4">
                    Select which gamemodes to disable for users with the "user" role. Disabled gamemodes will not be accessible to regular users.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gamemodeRestrictions.map((restriction) => (
                      <div key={restriction.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-white capitalize">
                            {restriction.gamemode}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              restriction.is_disabled 
                                ? 'bg-red-600 text-white' 
                                : 'bg-green-600 text-white'
                            }`}>
                              {restriction.is_disabled ? 'Disabled' : 'Enabled'}
                            </span>
                          </div>
                        </div>
                        
                        {restriction.is_disabled && restriction.disabled_at && (
                          <div className="text-sm text-gray-400 mb-3">
                            Disabled: {new Date(restriction.disabled_at).toLocaleString()}
                            {restriction.reason && (
                              <div className="mt-1">
                                Reason: {restriction.reason}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleGamemodeAccess(restriction.gamemode, !restriction.is_disabled)}
                            disabled={updatingGamemode === restriction.gamemode}
                            className={`px-3 py-2 rounded text-sm font-semibold cursor-pointer ${
                              restriction.is_disabled
                                ? 'bg-green-600 hover:bg-green-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white'
                                : 'bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white'
                            } ${updatingGamemode === restriction.gamemode ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {updatingGamemode === restriction.gamemode ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Updating...</span>
                              </div>
                            ) : (
                              restriction.is_disabled ? 'Enable' : 'Disable'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDisableModal(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Stats Modal */}
        {showStatsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  Stats for {selectedUser.displayName || selectedUser.username || 'Unknown User'}
                </h3>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {loadingStats ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading stats...</p>
                </div>
              ) : userStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-400">{userStats.games_played}</div>
                      <div className="text-gray-400 text-sm">Games played</div>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-blue-400">{userStats.total_bets.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm">Total bet</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{userStats.total_won.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm">Total won</div>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-red-400">{userStats.total_lost.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm">Total lost</div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded p-3 text-center">
                    <div className={`text-2xl font-bold ${userStats.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {userStats.net_profit >= 0 ? '+' : ''}{userStats.net_profit.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Net profit/loss</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-lg font-bold text-green-400">{userStats.biggest_win.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm">Biggest win</div>
                    </div>
                    <div className="bg-gray-800 rounded p-3 text-center">
                      <div className="text-lg font-bold text-red-400">{userStats.biggest_loss.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm">Biggest loss</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No stats available for this user</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Stop Modal */}
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-red-500/30">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span className="text-red-400">⚠️</span>
                  <span>Emergency stop</span>
                </h3>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-red-900/30 border border-red-500/30 rounded p-4 mb-4">
                  <p className="text-red-300 text-sm font-semibold mb-2">⚠️ Warning</p>
                  <p className="text-gray-300 text-sm">
                    This action will immediately shutdown the backend server. All active games will be terminated and users will be disconnected.
                  </p>
                </div>
                
                <p className="text-gray-300 text-sm">
                  Are you sure you want to initiate an emergency stop? This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmergencyStop}
                  disabled={emergencyStopping}
                  className={`bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold cursor-pointer flex items-center space-x-2 ${
                    emergencyStopping ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {emergencyStopping ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Stopping...</span>
                    </>
                  ) : (
                    <span>Emergency stop</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GC Limits Modal */}
        {showGCLimitsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Gc limits management</h3>
                <button
                  onClick={() => setShowGCLimitsModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-gray-300 mb-4">
                  Configure the minimum and maximum gc amounts for deposits and withdrawals. These limits will be applied to all user transactions.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Deposit Limits */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      Deposit limits
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Minimum amount (GC)</label>
                        <input
                          type="number"
                          value={gcLimits.deposit.min}
                          onChange={(e) => setGcLimits(prev => ({
                            ...prev,
                            deposit: { ...prev.deposit, min: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Maximum amount (GC)</label>
                        <input
                          type="number"
                          value={gcLimits.deposit.max}
                          onChange={(e) => setGcLimits(prev => ({
                            ...prev,
                            deposit: { ...prev.deposit, max: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          min="1"
                        />
                      </div>
                      
                      <button
                        onClick={() => updateGCLimits('deposit', gcLimits.deposit.min, gcLimits.deposit.max)}
                        disabled={updatingLimits}
                        className={`w-full px-4 py-2 rounded font-semibold cursor-pointer ${
                          updatingLimits 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {updatingLimits ? 'Updating...' : 'Update deposit limits'}
                      </button>
                    </div>
                  </div>

                  {/* Withdrawal Limits */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      Withdrawal limits
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Minimum amount (GC)</label>
                        <input
                          type="number"
                          value={gcLimits.withdraw.min}
                          onChange={(e) => setGcLimits(prev => ({
                            ...prev,
                            withdraw: { ...prev.withdraw, min: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Maximum amount (GC)</label>
                        <input
                          type="number"
                          value={gcLimits.withdraw.max}
                          onChange={(e) => setGcLimits(prev => ({
                            ...prev,
                            withdraw: { ...prev.withdraw, max: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          min="1"
                        />
                      </div>
                      
                      <button
                        onClick={() => updateGCLimits('withdraw', gcLimits.withdraw.min, gcLimits.withdraw.max)}
                        disabled={updatingLimits}
                        className={`w-full px-4 py-2 rounded font-semibold cursor-pointer ${
                          updatingLimits 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {updatingLimits ? 'Updating...' : 'Update withdrawal limits'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowGCLimitsModal(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Config Editing Modal */}
        {showGameConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(75, 85, 99, 0.3) transparent'
            }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit game configuration</h3>
                <button
                  onClick={() => setShowGameConfigModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {gameConfig && (
                <div className="space-y-6">
                  {/* Bet Limits Editing */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4">Bet limits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(gameConfig.betLimits || {}).map(([gamemode, limits]: [string, any]) => (
                        <div key={gamemode} className="bg-gray-700 rounded p-4">
                          <h5 className="text-md font-semibold text-white mb-3 capitalize">{gamemode}</h5>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">Min bet (GC)</label>
                              <input
                                type="number"
                                value={limits.min}
                                onChange={(e) => {
                                  const newConfig = { ...gameConfig };
                                  newConfig.betLimits[gamemode].min = parseInt(e.target.value) || 1;
                                  setGameConfig(newConfig);
                                }}
                                className="w-full px-3 py-2 rounded bg-gray-600 text-white border border-gray-500"
                                min="1"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-300 mb-1">Max bet (GC)</label>
                              <input
                                type="number"
                                value={limits.max}
                                onChange={(e) => {
                                  const newConfig = { ...gameConfig };
                                  newConfig.betLimits[gamemode].max = parseInt(e.target.value) || 1000;
                                  setGameConfig(newConfig);
                                }}
                                className="w-full px-3 py-2 rounded bg-gray-600 text-white border border-gray-500"
                                min="1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* House Edge Editing */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4">House edge (%)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(gameConfig.houseEdge || {}).map(([gamemode, edge]: [string, any]) => (
                        <div key={gamemode} className="bg-gray-700 rounded p-4">
                          <h5 className="text-md font-semibold text-white mb-3 capitalize">{gamemode}</h5>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">House edge (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={(edge * 100).toFixed(1)}
                              onChange={(e) => {
                                const newConfig = { ...gameConfig };
                                newConfig.houseEdge[gamemode] = parseFloat(e.target.value) / 100;
                                setGameConfig(newConfig);
                              }}
                              className="w-full px-3 py-2 rounded bg-gray-600 text-white border border-gray-500"
                              min="0"
                              max="10"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Game Timing Editing */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4">Game timing (seconds)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(gameConfig.gameTiming || {}).map(([phase, duration]: [string, any]) => (
                        <div key={phase} className="bg-gray-700 rounded p-4">
                          <h5 className="text-md font-semibold text-white mb-3">
                            {phase === 'bettingPhase' ? 'Betting phase' : 
                             phase === 'gamePhase' ? 'Game phase' : 
                             phase === 'resultPhase' ? 'Result phase' : 
                             phase.charAt(0).toUpperCase() + phase.slice(1)}
                          </h5>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">
                              {phase === 'gamePhase' ? 'Duration (0 = unlimited for crash)' : 'Duration (seconds)'}
                            </label>
                            <input
                              type="number"
                              value={Math.round(duration / 1000)}
                              onChange={(e) => {
                                const newConfig = { ...gameConfig };
                                newConfig.gameTiming[phase] = parseInt(e.target.value) * 1000;
                                setGameConfig(newConfig);
                              }}
                              className="w-full px-3 py-2 rounded bg-gray-600 text-white border border-gray-500"
                              min={phase === 'gamePhase' ? "0" : "1"}
                              max="300"
                            />
                            {phase === 'gamePhase' && (
                              <p className="text-xs text-gray-400 mt-1">
                                Set to 0 for unlimited (crash games only)
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Multiplier Limits Editing */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4">Multiplier limits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(gameConfig.multiplierLimits || {}).map(([gamemode, limit]: [string, any]) => (
                        <div key={gamemode} className="bg-gray-700 rounded p-4">
                          <h5 className="text-md font-semibold text-white mb-3 capitalize">{gamemode}</h5>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Max multiplier (x)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={limit === null || limit === undefined ? '' : limit}
                              onChange={(e) => {
                                const newConfig = { ...gameConfig };
                                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                newConfig.multiplierLimits[gamemode] = value;
                                setGameConfig(newConfig);
                              }}
                              className="w-full px-3 py-2 rounded bg-gray-600 text-white border border-gray-500"
                              min="1.0"
                              max="100000"
                              placeholder="No limit"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Leave empty for no limit. Prevents games from exceeding this multiplier.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowGameConfigModal(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        updateGameConfig(gameConfig);
                        setShowGameConfigModal(false);
                      }}
                      disabled={updatingGameConfig}
                      className={`px-4 py-2 rounded font-semibold cursor-pointer ${
                        updatingGameConfig 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {updatingGameConfig ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Notification Manager */}
      <NotificationManager notifications={notifications} onRemove={removeNotification} />
    </div>
  );
} 