import type { Route } from "./+types/admin";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router";
import { useState, useEffect } from "react";
import { supabase, gcBalanceHelpers, gamemodeAccessHelpers, gcLimitsHelpers } from "../lib/supabase";
import { useUserStats } from "../lib/useUserStats";
import { backendApi } from "../lib/backend-api";
import { NotificationManager } from "../components/Notification";
import {
  AdminTabs,
  UserManagement,
  GCTracker,
  GCBalanceEditor,
  GamemodeStats,
  AdminLogs,
  GameConfig,
  MemoryMonitor,
  UserStatsModal,
  EmergencyStopModal,
  GCLimitsModal,
  DisableAccessModal,
  GameConfigModal
} from "../components/admin";

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
  game_stats?: {
    [key: string]: {
      total_bets: number;
      total_won: number;
      total_lost: number;
      net_profit: number;
      games_played: number;
      biggest_win: number;
      biggest_loss: number;
      avg_bet: number;
      win_rate: number;
    };
  };
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

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const { fetchForUser } = useUserStats();
  
  // State management
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [expandedGamemodes, setExpandedGamemodes] = useState<Set<string>>(new Set());
  const [gcAdjustments, setGcAdjustments] = useState<{ [key: number]: number }>({});
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
  const [emergencyStopping, setEmergencyStopping] = useState(false);
  const [gamemodeStats, setGamemodeStats] = useState<GamemodeStats[]>([]);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [loadingGameConfig, setLoadingGameConfig] = useState(true);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [loadingMemoryStats, setLoadingMemoryStats] = useState(true);
  const [gcLimits, setGcLimits] = useState({
    deposit: { min: 1, max: 1000000 },
    withdraw: { min: 1, max: 1000000 }
  });
  const [updatingLimits, setUpdatingLimits] = useState(false);
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
  const [updatingGameConfig, setUpdatingGameConfig] = useState(false);

  // Modal states
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showGCLimitsModal, setShowGCLimitsModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showGameConfigModal, setShowGameConfigModal] = useState(false);

  // Search states
  const [userSearch, setUserSearch] = useState("");
  const [gcSearch, setGcSearch] = useState("");

  // Notification states
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'error' | 'success' | 'warning';
  }>>([]);

  // Notification functions
  const addNotification = (message: string, type: 'error' | 'success' | 'warning') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Helper function to safely construct API URLs
  const getApiUrl = (endpoint: string) => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    // Remove trailing slash if present to prevent double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  };

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

  // Load users on component mount
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadGamemodeStats();
      loadGameConfig();
      loadMemoryStats();
      loadAdminLogs();
      loadGamemodeRestrictions();
      // Ensure GC limits are fetched on mount for admins
      (async () => {
        try {
          const limits = await gcLimitsHelpers.getGCLimits();
          setGcLimits(limits);
        } catch (e) {
          console.error('Error fetching GC limits on mount:', e);
        }
      })();
    }
  }, [isAdmin]);

  // Refresh logs when switching to Logs tab
  useEffect(() => {
    if (activeTab === 'logs') {
      loadAdminLogs();
    }
  }, [activeTab]);

  // Realtime subscription for backend logs (only when Logs tab is open)
  useEffect(() => {
    if (activeTab !== 'logs') return;
    
    const channel = supabase
      .channel(`admin_logs_${Date.now()}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'admin_logs' 
        },
        async (payload) => {
          try {
            const { data, error } = await supabase
              .from('admin_logs')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(50);
              
            if (error) return;
            
            setAdminLogs(data || []);
          } catch (e) {
            // Silent error handling
          }
        }
      )
      .subscribe();

    // Backup refresh every 15 seconds
    const backupRefresh = setInterval(() => {
      loadAdminLogs();
    }, 15000);

    return () => {
      try { 
        channel?.unsubscribe();
        clearInterval(backupRefresh);
      } catch (e) {
        // Silent cleanup
      }
    };
  }, [activeTab]);

  // Hook-driven user stats fetcher
  const fetchUserStats = async (userId: number) => {
    const stats = await fetchForUser(userId);
    setUserStats(stats);
  };

  // Helper: fetch total GC circulation from all users
  const fetchTotalGCCirculation = async () => {
    try {
      const totalCirculation = users.reduce((sum, u) => sum + (u.gc_balance || 0), 0);
      setGcStats((prev) => ({
        ...prev,
        totalCirculation,
      }));
    } catch (error) {
      console.error('Error calculating total GC circulation:', error);
    }
  };

  // Helper: derive latest known balance from transactions if no gc_balances row yet
  const getUserBalanceFromTransactions = async (userId: number): Promise<number> => {
    try {
      const { count, error: countError } = await supabase
        .from('gc_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError || !count) return 0;

      const { data, error } = await supabase
        .from('gc_transactions')
        .select('balance_after')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return 0;
      return Number(data[0]?.balance_after ?? 0) || 0;
    } catch (e) {
      console.error('Error deriving balance from transactions:', e);
      return 0;
    }
  };

  // Load users from database
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich users with actual GC balances
      const usersWithBalances = await Promise.all(
        (usersData || []).map(async (u) => {
          try {
            let balance = await gcBalanceHelpers.getUserBalance(u.id);
            if (!balance) {
              balance = await getUserBalanceFromTransactions(u.id);
            }
            return {
              ...u,
              gc_balance: balance,
              displayName: u.username || u.email?.split('@')[0] || 'Unknown'
            };
          } catch (e) {
            console.error('Error fetching balance for user', u.id, e);
            return {
              ...u,
              gc_balance: 0,
              displayName: u.username || u.email?.split('@')[0] || 'Unknown'
            };
          }
        })
      );

      setUsers(usersWithBalances);

      // Calculate GC stats from real balances
      const totalCirculation = usersWithBalances.reduce((sum, u) => sum + (u.gc_balance || 0), 0);
      setGcStats((prev) => ({
        ...prev,
        totalCirculation,
      }));
      

    } catch (error) {
      console.error('Error loading users:', error);
      addNotification('Failed to load users', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load gamemode statistics using backendApi
  const loadGamemodeStats = async () => {
    try {
      
      // Fetch crash game state
      const crashData = await backendApi.getCrashGameState();
      
      // Fetch hi-lo game state
      const hiLoData = await backendApi.getHiLoGameState();
      
      // Create gamemode stats array with real data
      const stats: GamemodeStats[] = [
        {
          gamemode: "Crash",
          icon: "🚀",
          uptime: crashData?.uptime || 99.7,
          playersOnline: crashData?.playersOnline || 0,
          houseProfit: 0, // Will be calculated from database
          houseExpense: 0, // Will be calculated from database
          totalBets: 0, // Will be calculated from database
          wins: 0, // Will be calculated from database
          losses: 0, // Will be calculated from database
          avgMultiplier: 1.5, // Default Crash multiplier
          isActive: crashData?.isActive !== false
        },
        {
          gamemode: "Blackjack",
          icon: "🃏",
          uptime: 0,
          playersOnline: 0,
          houseProfit: 0,
          houseExpense: 0,
          isActive: false
        },
        {
          gamemode: "Roulette",
          icon: "🎰",
          uptime: 0,
          playersOnline: 0,
          houseProfit: 0,
          houseExpense: 0,
          isActive: false
        },
        {
          gamemode: "Slots",
          icon: "🎰",
          uptime: 0,
          playersOnline: 0,
          houseProfit: 0,
          houseExpense: 0,
          isActive: false
        },
        {
          gamemode: "Hi-Lo",
          icon: "🎲",
          uptime: hiLoData?.uptime || 99.5,
          playersOnline: hiLoData?.playersOnline || 0,
          houseProfit: 0, // Will be calculated from database
          houseExpense: 0, // Will be calculated from database
          totalBets: 0, // Will be calculated from database
          wins: 0, // Will be calculated from database
          losses: 0, // Will be calculated from database
          avgMultiplier: 2.0, // Default Hi-Lo multiplier
          isActive: hiLoData?.isActive !== false
        }
      ];
      
      setGamemodeStats(stats);
      
      // Now fetch the database statistics for active gamemodes
      await fetchCrashStats();
      await fetchHiLoStats();
      

      
    } catch (error) {
      console.error('Error loading gamemode stats:', error);
      addNotification('Failed to load gamemode stats, using defaults', 'error');
      // Set default stats if API fails
      setGamemodeStats([
        {
          gamemode: 'crash',
          icon: '🚀',
          uptime: 99.8,
          playersOnline: 0,
          houseProfit: 0,
          houseExpense: 0,
          isActive: true
        }
      ]);
    }
  };

  // Fetch crash statistics from database
  const fetchCrashStats = async () => {
    try {
      // Get total bets count
      const { count: betsCount, error: betsError } = await supabase
        .from('game_bets')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', 'crash');
      
      if (betsError) {
        console.error('Error fetching crash bets count:', betsError);
        return;
      }
      
      // Get wins and losses
      const { count: winsCount, error: winsError } = await supabase
        .from('game_bets')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', 'crash')
        .eq('status', 'cashed_out');
      
      if (winsError) {
        console.error('Error fetching crash wins count:', winsError);
        return;
      }
      
      const { count: lossesCount, error: lossesError } = await supabase
        .from('game_bets')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', 'crash')
        .eq('status', 'crashed');
      
      if (lossesError) {
        console.error('Error fetching crash losses count:', lossesError);
        return;
      }
      
      // Calculate house profit/expense from transactions
      let houseProfit = 0;
      let houseExpense = 0;
      
      try {
        const { data: transactions, error: transError } = await supabase
          .from('gc_transactions')
          .select('amount, transaction_type')
          .eq('game_type', 'crash');
        
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
        console.error('Error fetching crash transaction stats:', dbError);
      }
      
      // Update gamemodeStats array with crash stats
      setGamemodeStats(prev => {
        return prev.map(stat => 
          stat.gamemode === 'Crash' 
            ? {
                ...stat,
                totalBets: betsCount || 0,
                wins: winsCount || 0,
                losses: lossesCount || 0,
                houseProfit,
                houseExpense
              }
            : stat
        );
      });
      
    } catch (error) {
      console.error('Failed to fetch crash stats:', error);
    }
  };

  // Fetch hi-lo statistics from database
  const fetchHiLoStats = async () => {
    try {
      // Get total bets count
      const { count: betsCount, error: betsError } = await supabase
        .from('game_bets')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', 'hi-lo');
      
      if (betsError) {
        console.error('Error fetching hi-lo bets count:', betsError);
        return;
      }
      
      // Get wins and losses
      const { count: winsCount, error: winsError } = await supabase
        .from('game_bets')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', 'hi-lo')
        .eq('status', 'won');
      
      if (winsError) {
        console.error('Error fetching hi-lo wins count:', winsError);
        return;
      }
      
      const { count: lossesCount, error: lossesError } = await supabase
        .from('game_bets')
        .select('*', { count: 'exact', head: true })
        .eq('game_type', 'hi-lo')
        .eq('status', 'lost');
      
      if (lossesError) {
        console.error('Error fetching hi-lo losses count:', lossesError);
        return;
      }
      
      // Calculate house profit/expense from transactions
      let houseProfit = 0;
      let houseExpense = 0;
      
      try {
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
        console.error('Error fetching hi-lo transaction stats:', dbError);
      }
      
      // Update gamemodeStats array with hi-lo stats
      setGamemodeStats(prev => {
        return prev.map(stat => 
          stat.gamemode === 'Hi-Lo' 
            ? {
                ...stat,
                totalBets: betsCount || 0,
                wins: winsCount || 0,
                losses: lossesCount || 0,
                houseProfit,
                houseExpense
              }
            : stat
        );
      });
      
    } catch (error) {
      console.error('Failed to fetch hi-lo stats:', error);
    }
  };

  // Load game configuration using backendApi
  const loadGameConfig = async () => {
    try {
      setLoadingGameConfig(true);
      
      const data = await backendApi.getGameConfig();
      setGameConfig(data);

    } catch (error) {
      console.error('Error loading game config:', error);
      addNotification('Failed to load game config, using defaults', 'error');
      // Set default config if API fails
      setGameConfig({
        betLimits: { crash: { min: 1, max: 1000 } },
        houseEdge: { crash: 0.02 },
        gameTiming: { bettingPhase: 30000, gamePhase: 0, resultPhase: 10000 },
        chatSettings: { messageRateLimit: 3, maxMessageLength: 200, maxHistoryLength: 100 },
        balanceLimits: { minBalance: 0, maxBalance: 1000000 },
        multiplierLimits: { crash: null }
      });
    } finally {
      setLoadingGameConfig(false);
    }
  };

  // Load memory statistics using backendApi
  const loadMemoryStats = async () => {
    try {
      setLoadingMemoryStats(true);
      
      const data = await backendApi.getMemoryStats();
      setMemoryStats(data);

    } catch (error) {
      console.error('Error loading memory stats:', error);
      addNotification('Failed to load memory stats, using defaults', 'error');
      // Set default memory stats if API fails
      setMemoryStats({
        memory: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, heapUsage: 0, memoryEfficiency: 0 },
        tracking: { userConnections: 0, gameStates: 0, activeGames: 0 }
      });
    } finally {
      setLoadingMemoryStats(false);
    }
  };

  // Load admin logs using backendApi
  const loadAdminLogs = async () => {
    try {
      setLoadingLogs(true);
      
      const data = await backendApi.getAdminLogs();
      const logs = data || [];
      setAdminLogs(logs);

    } catch (error) {
      console.error('Error loading admin logs:', error);
      addNotification('Failed to load admin logs, using defaults', 'error');
      // Set default logs if API fails
      setAdminLogs([
        {
          id: 1,
          message: "Admin dashboard loaded",
          level: "info",
          details: null,
          timestamp: new Date().toISOString(),
          source: "frontend"
        }
      ]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load gamemode restrictions directly from Supabase (old working path)
  const loadGamemodeRestrictions = async () => {
    try {
      setLoadingRestrictions(true);
      
      const data = await gamemodeAccessHelpers.getGamemodeRestrictions();
      // Fallback defaults if table is empty
      if (!data || data.length === 0) {
        setGamemodeRestrictions([
          { id: 1, gamemode: 'crash',    is_disabled: false, disabled_at: null, disabled_by: null, reason: null },
          { id: 2, gamemode: 'hi-lo',    is_disabled: false, disabled_at: null, disabled_by: null, reason: null },
          { id: 3, gamemode: 'blackjack',is_disabled: false, disabled_at: null, disabled_by: null, reason: null },
          { id: 4, gamemode: 'roulette', is_disabled: false, disabled_at: null, disabled_by: null, reason: null },
          { id: 5, gamemode: 'slots',    is_disabled: false, disabled_at: null, disabled_by: null, reason: null },
        ]);
      } else {
        setGamemodeRestrictions(data);
      }
    } catch (error) {
      console.error('Error loading gamemode restrictions:', error);
      addNotification('Failed to load gamemode restrictions, using defaults', 'error');
      setGamemodeRestrictions([
        { id: 1, gamemode: 'crash', is_disabled: false, disabled_at: null, disabled_by: null, reason: null }
      ]);
    } finally {
      setLoadingRestrictions(false);
    }
  };

  // Refresh restrictions when opening the modal and subscribe to changes
  useEffect(() => {
    if (!showDisableModal) return;
    loadGamemodeRestrictions();
    const channel: any = gamemodeAccessHelpers.subscribeToGamemodeRestrictions(async (rows: any[]) => {
      if (Array.isArray(rows) && rows.length > 0) {
        setGamemodeRestrictions(rows as any);
      }
    });
    return () => {
      try { (channel as any)?.unsubscribe?.(); } catch {}
    };
  }, [showDisableModal]);

  // User management handlers
  const handleToggleUserBan = async (userId: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;



      const { error } = await supabase
        .from('users')
        .update({ banned: !user.banned })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, banned: !u.banned } : u
      ));

      addNotification(
        `User ${user.displayName} ${user.banned ? 'unbanned' : 'banned'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling user ban:', error);
      addNotification('Failed to update user status', 'error');
    }
  };

  const handleResetUserGC = async (userId: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      const current = Number(user.gc_balance || 0);
      const adjustment = -current;
      

      
      const newBalance = await gcBalanceHelpers.updateBalance(
        userId,
        adjustment,
        adjustment < 0 ? 'refund' : 'bonus',
        'admin',
        'admin_reset',
        `GC balance reset by admin (was ${current})`
      );

      setUsers(users.map(u => 
        u.id === userId ? { ...u, gc_balance: newBalance } : u
      ));
      addNotification(`GC balance reset successfully for ${user.displayName}`, 'success');
      fetchTotalGCCirculation();
    } catch (error) {
      console.error('Error resetting user GC:', error);
      addNotification('Failed to reset user GC balance', 'error');
    }
  };

  const handleViewUserStats = async (user: User) => {
    setSelectedUser(user);
    setShowStatsModal(true);
    setLoadingStats(true);
    


    try {
      await fetchUserStats(user.id);

    } catch (error) {
      console.error('Error loading user stats:', error);
      addNotification('Failed to load user statistics', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  // GC management handlers
  const handleGCAdjustmentChange = (userId: number, value: number) => {
    setGcAdjustments(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const handleAdjustUserGC = async (userId: number, adjustment: number) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const numeric = Number(adjustment) || 0;
      const transactionType = numeric < 0 ? 'refund' : 'bonus';
      

      
      const newBalance = await gcBalanceHelpers.updateBalance(
        userId,
        numeric,
        transactionType,
        'admin',
        'admin_adjustment',
        `GC balance adjusted by admin: ${numeric > 0 ? '+' : ''}${numeric}`
      );

      setUsers(users.map(u => 
        u.id === userId ? { ...u, gc_balance: newBalance } : u
      ));

      setGcAdjustments(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      addNotification(`GC balance adjusted by ${numeric > 0 ? '+' : ''}${numeric} for ${user.displayName}`, 'success');
      fetchTotalGCCirculation();
    } catch (error) {
      console.error('Error adjusting user GC:', error);
      addNotification('Failed to adjust user GC balance', 'error');
    }
  };

  const handleResetGCAdjustment = (userId: number) => {
    setGcAdjustments(prev => {
      const newAdjustments = { ...prev };
      delete newAdjustments[userId];
      return newAdjustments;
    });
  };

  // Admin tools handlers
  const handleEmergencyStop = async () => {
    try {
      setEmergencyStopping(true);

      
      await backendApi.emergencyStop();
      addNotification('Emergency stop initiated successfully', 'success');
      setShowEmergencyModal(false);
    } catch (error) {
      console.error('Error initiating emergency stop:', error);
      addNotification('Failed to initiate emergency stop', 'error');
    } finally {
      setEmergencyStopping(false);
    }
  };

  const handleUpdateGCLimits = async (type: 'deposit' | 'withdraw', min: number, max: number) => {
    try {
      setUpdatingLimits(true);

      
      // Upsert directly via Supabase to avoid backend stubs and reflect instantly
      const { error } = await supabase
        .from('gc_limits')
        .upsert({
          limit_type: type,
          min_amount: min,
          max_amount: max,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'limit_type' });
      if (error) throw error;

      // Refresh from source of truth
      const limits = await gcLimitsHelpers.getGCLimits();
      setGcLimits(limits);
      addNotification(`${type} limits updated successfully`, 'success');
    } catch (error) {
      console.error('Error updating GC limits:', error);
      addNotification('Failed to update GC limits', 'error');
    } finally {
      setUpdatingLimits(false);
    }
  };

  const handleToggleGamemodeAccess = async (gamemode: string, isDisabled: boolean, reason?: string) => {
    try {
      setUpdatingGamemode(gamemode);

      
      // Write directly to Supabase to avoid stale backend responses
      const { error } = await supabase
        .from('gamemode_access_restrictions')
        .update({
          is_disabled: isDisabled,
          reason: reason ?? null,
          disabled_at: isDisabled ? new Date().toISOString() : null,
        })
        .eq('gamemode', gamemode);
      if (error) throw error;
      setGamemodeRestrictions(prev => 
        prev.map(r => 
          r.gamemode === gamemode 
            ? { ...r, is_disabled: isDisabled, disabled_at: isDisabled ? new Date().toISOString() : null, reason }
            : r
        )
      );
      addNotification(`Gamemode ${gamemode} ${isDisabled ? 'disabled' : 'enabled'} successfully`, 'success');
    } catch (error) {
      console.error('Error updating gamemode access:', error);
      addNotification('Failed to update gamemode access', 'error');
    } finally {
      setUpdatingGamemode(null);
    }
  };

  const handleSaveGameConfig = async (config: any) => {
    try {
      setUpdatingGameConfig(true);

      
      await backendApi.updateGameConfig(config);
      setGameConfig(config);
      addNotification('Game configuration updated successfully', 'success');
      setShowGameConfigModal(false);
    } catch (error) {
      console.error('Error updating game configuration:', error);
      addNotification('Failed to update game configuration', 'error');
    } finally {
      setUpdatingGameConfig(false);
    }
  };

  // Modal handlers
  const handleCloseStatsModal = () => {
    setShowStatsModal(false);
    setSelectedUser(null);
    setUserStats(null);
    setExpandedGamemodes(new Set());
  };

  const handleToggleGamemodeExpansion = (gamemode: string) => {
    setExpandedGamemodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gamemode)) {
        newSet.delete(gamemode);
      } else {
        newSet.add(gamemode);
      }
      return newSet;
    });
  };

  // Check if user is admin
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to access this page.</p>
          <Link to="/" className="text-yellow-400 hover:text-yellow-300">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16 sm:pt-20 md:pt-24">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "users" && (
            <UserManagement
              users={users}
              loadingUsers={loadingUsers}
              userSearch={userSearch}
              onUserSearchChange={setUserSearch}
              onToggleUserBan={handleToggleUserBan}
              onResetUserGC={handleResetUserGC}
              onViewUserStats={handleViewUserStats}
            />
          )}

          {activeTab === "gc" && (
            <div className="space-y-8">
              <GCTracker
                gcStats={gcStats}
              />
              <GCBalanceEditor
                users={users}
                gcSearch={gcSearch}
                gcAdjustments={gcAdjustments}
                onGCSearchChange={setGcSearch}
                onGCAdjustmentChange={handleGCAdjustmentChange}
                onAdjustUserGC={handleAdjustUserGC}
                onResetGCAdjustment={handleResetGCAdjustment}
              />
            </div>
          )}

          {activeTab === "stats" && (
            <GamemodeStats gamemodeStats={gamemodeStats} />
          )}

          {activeTab === "config" && (
            <GameConfig
              gameConfig={gameConfig}
              loadingGameConfig={loadingGameConfig}
              onShowGameConfigModal={() => setShowGameConfigModal(true)}
            />
          )}

          {activeTab === "memory" && (
            <MemoryMonitor
              memoryStats={memoryStats}
              loadingMemoryStats={loadingMemoryStats}
              onRefreshMemoryStats={loadMemoryStats}
            />
          )}

          {activeTab === "logs" && (
            <AdminLogs
              adminLogs={adminLogs}
              loadingLogs={loadingLogs}
              emergencyStopping={emergencyStopping}
              onRefreshLogs={loadAdminLogs}
              onShowDisableModal={() => setShowDisableModal(true)}
              onShowEmergencyModal={() => setShowEmergencyModal(true)}
              onShowGCLimitsModal={() => setShowGCLimitsModal(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <UserStatsModal
        isOpen={showStatsModal}
        user={selectedUser}
        userStats={userStats}
        loadingStats={loadingStats}
        expandedGamemodes={expandedGamemodes}
        onClose={handleCloseStatsModal}
        onToggleGamemodeExpansion={handleToggleGamemodeExpansion}
      />

      <EmergencyStopModal
        isOpen={showEmergencyModal}
        emergencyStopping={emergencyStopping}
        onClose={() => setShowEmergencyModal(false)}
        onEmergencyStop={handleEmergencyStop}
      />

      <GCLimitsModal
        isOpen={showGCLimitsModal}
        gcLimits={gcLimits}
        updatingLimits={updatingLimits}
        onClose={() => setShowGCLimitsModal(false)}
        onUpdateLimits={handleUpdateGCLimits}
        onLimitsChange={(type, field, value) => {
          setGcLimits(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
          }));
        }}
      />

      <DisableAccessModal
        isOpen={showDisableModal}
        gamemodeRestrictions={gamemodeRestrictions}
        loadingRestrictions={loadingRestrictions}
        updatingGamemode={updatingGamemode}
        onClose={() => setShowDisableModal(false)}
        onToggleGamemodeAccess={handleToggleGamemodeAccess}
      />

      <GameConfigModal
        isOpen={showGameConfigModal}
        gameConfig={gameConfig}
        updatingGameConfig={updatingGameConfig}
        onClose={() => setShowGameConfigModal(false)}
        onSave={handleSaveGameConfig}
        onConfigChange={setGameConfig}
      />

      {/* Notification Manager */}
      <NotificationManager
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
} 