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

// Helper function to safely construct API URLs
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

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

  // Load gamemode statistics
  const loadGamemodeStats = async () => {
    try {
      const response = await fetch(getApiUrl('/admin/gamemode-stats'));
      if (response.ok) {
        const data = await response.json();
        setGamemodeStats(data);
      }
    } catch (error) {
      console.error('Error loading gamemode stats:', error);
    }
  };

  // Load game configuration
  const loadGameConfig = async () => {
    try {
      setLoadingGameConfig(true);
      const response = await fetch(getApiUrl('/admin/game-config'));
      if (response.ok) {
        const data = await response.json();
        setGameConfig(data);
      }
    } catch (error) {
      console.error('Error loading game config:', error);
    } finally {
      setLoadingGameConfig(false);
    }
  };

  // Load memory statistics
  const loadMemoryStats = async () => {
    try {
      setLoadingMemoryStats(true);
      const response = await fetch(getApiUrl('/admin/memory-stats'));
      if (response.ok) {
        const data = await response.json();
        setMemoryStats(data);
      }
    } catch (error) {
      console.error('Error loading memory stats:', error);
    } finally {
      setLoadingMemoryStats(false);
    }
  };

  // Load admin logs
  const loadAdminLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await fetch(getApiUrl('/admin/logs'));
      if (response.ok) {
        const data = await response.json();
        setAdminLogs(data);
      }
    } catch (error) {
      console.error('Error loading admin logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load gamemode restrictions
  const loadGamemodeRestrictions = async () => {
    try {
      setLoadingRestrictions(true);
      const response = await fetch(getApiUrl('/admin/gamemode-restrictions'));
      if (response.ok) {
        const data = await response.json();
        setGamemodeRestrictions(data);
      }
    } catch (error) {
      console.error('Error loading gamemode restrictions:', error);
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
      const response = await fetch(getApiUrl(`/admin/user-stats/${user.id}`));
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
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
      const response = await fetch(getApiUrl('/admin/emergency-stop'), {
        method: 'POST'
      });

      if (response.ok) {
        NotificationManager.success('Emergency stop initiated');
        setShowEmergencyModal(false);
      } else {
        throw new Error('Failed to initiate emergency stop');
      }
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
      const response = await fetch(getApiUrl('/admin/gc-limits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, min, max })
      });

      if (response.ok) {
        setGcLimits(prev => ({
          ...prev,
          [type]: { min, max }
        }));
        NotificationManager.success(`${type} limits updated successfully`);
      } else {
        throw new Error('Failed to update GC limits');
      }
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
      const response = await fetch(getApiUrl('/admin/gamemode-access'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamemode, isDisabled, reason })
      });

      if (response.ok) {
        setGamemodeRestrictions(prev => 
          prev.map(r => 
            r.gamemode === gamemode 
              ? { ...r, is_disabled: isDisabled, disabled_at: isDisabled ? new Date().toISOString() : null, reason }
              : r
          )
        );
        NotificationManager.success(`Gamemode ${gamemode} ${isDisabled ? 'disabled' : 'enabled'} successfully`);
      } else {
        throw new Error('Failed to update gamemode access');
      }
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
      const response = await fetch(getApiUrl('/admin/game-config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setGameConfig(config);
        NotificationManager.success('Game configuration updated successfully');
        setShowGameConfigModal(false);
      } else {
        throw new Error('Failed to update game configuration');
      }
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