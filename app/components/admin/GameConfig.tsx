interface GameConfigProps {
  gameConfig: any;
  loadingGameConfig: boolean;
  onShowGameConfigModal: () => void;
}

export const GameConfig: React.FC<GameConfigProps> = ({
  gameConfig,
  loadingGameConfig,
  onShowGameConfigModal,
}) => {
  if (loadingGameConfig) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading game configuration...</p>
      </div>
    );
  }

  if (!gameConfig) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Failed to load game configuration</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Game configuration</h2>
      
      <div className="space-y-6">
        {/* Bet Limits Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Bet limits</h3>
            <button
              onClick={onShowGameConfigModal}
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
                  {edge > 0.20 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ High house edge - frequent instant crashes
                    </p>
                  )}
                  {edge > 0.15 && edge <= 0.20 && (
                    <p className="text-xs text-orange-400 mt-1">
                      ⚠️ Moderate house edge - some instant crashes
                    </p>
                  )}
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
    </div>
  );
};
