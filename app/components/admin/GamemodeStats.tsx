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

interface GamemodeStatsProps {
  gamemodeStats: GamemodeStats[];
}

export const GamemodeStats: React.FC<GamemodeStatsProps> = ({ gamemodeStats }) => {
  const activeGamemodes = gamemodeStats.filter(stat => stat.isActive);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Gamemode statistics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeGamemodes.map((stat, index) => (
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
  );
};
