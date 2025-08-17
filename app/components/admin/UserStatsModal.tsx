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

interface UserStatsModalProps {
  isOpen: boolean;
  user: User | null;
  userStats: UserStats | null;
  loadingStats: boolean;
  expandedGamemodes: Set<string>;
  onClose: () => void;
  onToggleGamemodeExpansion: (gamemode: string) => void;
}

export const UserStatsModal: React.FC<UserStatsModalProps> = ({
  isOpen,
  user,
  userStats,
  loadingStats,
  expandedGamemodes,
  onClose,
  onToggleGamemodeExpansion,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            Stats for {user.displayName || user.username || 'Unknown User'}
          </h3>
          <button
            onClick={onClose}
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
            {/* Overall Stats */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-bold text-white mb-3 text-center">Overall statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{userStats.games_played}</div>
                  <div className="text-gray-400 text-sm">Games played</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{userStats.total_bets.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">Total bet</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{userStats.total_won.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">Total won</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{userStats.total_lost.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">Total lost</div>
                </div>
              </div>

              <div className="bg-gray-700 rounded p-3 text-center mt-3">
                <div className={`text-2xl font-bold ${userStats.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {userStats.net_profit >= 0 ? '+' : ''}{userStats.net_profit.toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Net profit/loss</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-lg font-bold text-green-400">{userStats.biggest_win.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">Biggest win</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-lg font-bold text-red-400">{userStats.biggest_loss.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">Biggest loss</div>
                </div>
              </div>
            </div>

            {/* Per-Gamemode Stats */}
            {userStats.game_stats && (
              <div className="space-y-3">
                <h4 className="text-lg font-bold text-white text-center">Gamemode statistics</h4>
                
                {Object.entries(userStats.game_stats).map(([gamemode, stats]) => {
                  if (stats.games_played === 0) return null; // Skip gamemodes with no games
                  
                  const isExpanded = expandedGamemodes.has(gamemode);
                  const gamemodeIcon = {
                    'crash': '🚀',
                    'blackjack': '🃏',
                    'roulette': '🎰',
                    'slots': '🎰',
                    'hi-lo': '🎲'
                  }[gamemode] || '';
                  
                  return (
                    <div key={gamemode} className="bg-gray-800 rounded-lg border border-gray-700">
                      <button
                        onClick={() => onToggleGamemodeExpansion(gamemode)}
                        className="w-full p-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{gamemodeIcon}</span>
                          <span className="text-white font-semibold capitalize">{gamemode}</span>
                          <span className="text-gray-400 text-sm">({stats.games_played} games)</span>
                        </div>
                        <span className="text-gray-400 text-lg">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </button>
                      
                      {isExpanded && (
                        <div className="p-3 border-t border-gray-700 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className="text-lg font-bold text-blue-400">{stats.total_bets.toLocaleString()}</div>
                              <div className="text-gray-400 text-xs">Total bet</div>
                            </div>
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className="text-lg font-bold text-green-400">{stats.total_won.toLocaleString()}</div>
                              <div className="text-gray-400 text-xs">Total won</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className="text-lg font-bold text-red-400">{stats.total_lost.toLocaleString()}</div>
                              <div className="text-gray-400 text-xs">Total lost</div>
                            </div>
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className={`text-lg font-bold ${stats.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats.net_profit >= 0 ? '+' : ''}{stats.net_profit.toLocaleString()}
                              </div>
                              <div className="text-gray-400 text-xs">Net profit</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className="text-lg font-bold text-yellow-400">{stats.avg_bet.toFixed(2)}</div>
                              <div className="text-gray-400 text-xs">Avg bet</div>
                            </div>
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className="text-lg font-bold text-purple-400">{stats.win_rate.toFixed(1)}%</div>
                              <div className="text-gray-400 text-xs">Win rate</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className="text-lg font-bold text-green-400">{stats.biggest_win.toLocaleString()}</div>
                              <div className="text-gray-400 text-xs">Biggest win</div>
                            </div>
                            <div className="bg-gray-700 rounded p-2 text-center">
                              <div className="text-lg font-bold text-red-400">{stats.biggest_loss.toLocaleString()}</div>
                              <div className="text-gray-400 text-xs">Biggest loss</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No stats available for this user</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
