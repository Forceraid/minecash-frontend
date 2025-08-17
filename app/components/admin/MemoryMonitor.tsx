interface MemoryStatsProps {
  memoryStats: any;
  loadingMemoryStats: boolean;
  onRefreshMemoryStats: () => void;
}

export const MemoryMonitor: React.FC<MemoryStatsProps> = ({
  memoryStats,
  loadingMemoryStats,
  onRefreshMemoryStats,
}) => {
  if (loadingMemoryStats) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading memory statistics...</p>
      </div>
    );
  }

  if (!memoryStats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Failed to load memory statistics</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Memory monitoring</h2>
      
      <div className="space-y-6">
        {/* Memory Usage Overview */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Memory usage</h3>
            <button
              onClick={onRefreshMemoryStats}
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
    </div>
  );
};
