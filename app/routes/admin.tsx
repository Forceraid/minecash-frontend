import type { Route } from "./+types/admin";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router";
import { useState, useEffect } from "react";
import { supabase, gcBalanceHelpers, gamemodeAccessHelpers } from "../lib/supabase";
import { backendApi } from "../lib/backend-api";
import { NotificationManager } from "../components/Notification";
import {
  AdminTabs,
  UserManagement,
  GCTracker,
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
    }
  }, [isAdmin]);

  // Load users from database
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithDisplayNames = usersData?.map(user => ({
        ...user,
        displayName: user.username || user.email?.split('@')[0] || 'Unknown'
      })) || [];

      setUsers(usersWithDisplayNames);
      
      // Calculate GC stats
      const totalCirculation = usersWithDisplayNames.reduce((sum, user) => sum + (user.gc_balance || 0), 0);
      setGcStats({
        totalCirculation,
        totalDeposits: totalCirculation * 1.2, // Placeholder
        totalWithdrawals: totalCirculation * 0.2 // Placeholder
      });
    } catch (error) {
      console.error('Error loading users:', error);
      NotificationManager.error('Failed to load users');
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
      setAdminLogs(data);
    } catch (error) {
      console.error('Error loading admin logs:', error);
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

  // Load gamemode restrictions using backendApi
  const loadGamemodeRestrictions = async () => {
    try {
      setLoadingRestrictions(true);
      const data = await backendApi.getGamemodeRestrictions();
      setGamemodeRestrictions(data);
    } catch (error) {
      console.error('Error loading gamemode restrictions:', error);
      // Set default restrictions if API fails
      setGamemodeRestrictions([
        {
          id: 1,
          gamemode: 'crash',
          is_disabled: false,
          disabled_at: null,
          disabled_by: null,
          reason: null
        }
      ]);
    } finally {
      setLoadingRestrictions(false);
    }
  };

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

      NotificationManager.success(
        `User ${user.banned ? 'unbanned' : 'banned'} successfully`
      );
    } catch (error) {
      console.error('Error toggling user ban:', error);
      NotificationManager.error('Failed to update user status');
    }
  };

  const handleResetUserGC = async (userId: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ gc_balance: 0 })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, gc_balance: 0 } : u
      ));

      NotificationManager.success('User GC balance reset successfully');
    } catch (error) {
      console.error('Error resetting user GC:', error);
      NotificationManager.error('Failed to reset user GC');
    }
  };

  const handleViewUserStats = async (user: User) => {
    setSelectedUser(user);
    setShowStatsModal(true);
    setLoadingStats(true);

    try {
      const data = await backendApi.getUserStats(user.id);
      setUserStats(data);
    } catch (error) {
      console.error('Error loading user stats:', error);
      NotificationManager.error('Failed to load user statistics');
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

      const newBalance = (user.gc_balance || 0) + adjustment;
      if (newBalance < 0) {
        NotificationManager.error('Cannot set negative balance');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ gc_balance: newBalance })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, gc_balance: newBalance } : u
      ));

      setGcAdjustments(prev => {
        const newAdjustments = { ...prev };
        delete newAdjustments[userId];
        return newAdjustments;
      });

      NotificationManager.success(`GC balance adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}`);
    } catch (error) {
      console.error('Error adjusting user GC:', error);
      NotificationManager.error('Failed to adjust user GC');
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
      NotificationManager.success('Emergency stop initiated');
      setShowEmergencyModal(false);
    } catch (error) {
      console.error('Error initiating emergency stop:', error);
      NotificationManager.error('Failed to initiate emergency stop');
    } finally {
      setEmergencyStopping(false);
    }
  };

  const handleUpdateGCLimits = async (type: 'deposit' | 'withdraw', min: number, max: number) => {
    try {
      setUpdatingLimits(true);
      await backendApi.updateGCLimits(type, min, max);
      setGcLimits(prev => ({
        ...prev,
        [type]: { min, max }
      }));
      NotificationManager.success(`${type} limits updated successfully`);
    } catch (error) {
      console.error('Error updating GC limits:', error);
      NotificationManager.error('Failed to update GC limits');
    } finally {
      setUpdatingLimits(false);
    }
  };

  const handleToggleGamemodeAccess = async (gamemode: string, isDisabled: boolean, reason?: string) => {
    try {
      setUpdatingGamemode(gamemode);
      await backendApi.updateGamemodeAccess(gamemode, isDisabled, reason);
      setGamemodeRestrictions(prev => 
        prev.map(r => 
          r.gamemode === gamemode 
            ? { ...r, is_disabled: isDisabled, disabled_at: isDisabled ? new Date().toISOString() : null, reason }
            : r
        )
      );
      NotificationManager.success(`Gamemode ${gamemode} ${isDisabled ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      console.error('Error updating gamemode access:', error);
      NotificationManager.error('Failed to update gamemode access');
    } finally {
      setUpdatingGamemode(null);
    }
  };

  const handleSaveGameConfig = async (config: any) => {
    try {
      setUpdatingGameConfig(true);
      await backendApi.updateGameConfig(config);
      setGameConfig(config);
      NotificationManager.success('Game configuration updated successfully');
      setShowGameConfigModal(false);
    } catch (error) {
      console.error('Error updating game configuration:', error);
      NotificationManager.error('Failed to update game configuration');
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
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to access this page.</p>
          <Link to="/" className="text-yellow-400 hover:text-yellow-300">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400">Manage MINECASH platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.email}</span>
              <Link to="/" className="text-yellow-400 hover:text-yellow-300">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

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
            <GCTracker
              users={users}
              gcSearch={gcSearch}
              gcStats={gcStats}
              gcAdjustments={gcAdjustments}
              onGCSearchChange={setGcSearch}
              onGCAdjustmentChange={handleGCAdjustmentChange}
              onAdjustUserGC={handleAdjustUserGC}
              onResetGCAdjustment={handleResetGCAdjustment}
            />
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
    </div>
  );
} 