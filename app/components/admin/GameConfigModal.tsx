interface GameConfigModalProps {
  isOpen: boolean;
  gameConfig: any;
  updatingGameConfig: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  onConfigChange: (newConfig: any) => void;
}

export const GameConfigModal: React.FC<GameConfigModalProps> = ({
  isOpen,
  gameConfig,
  updatingGameConfig,
  onClose,
  onSave,
  onConfigChange,
}) => {
  if (!isOpen || !gameConfig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(75, 85, 99, 0.3) transparent'
      }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Edit game configuration</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

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
                          onConfigChange(newConfig);
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
                          onConfigChange(newConfig);
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
                        const inputValue = parseFloat(e.target.value);
                        
                        // SAFETY: Prevent extreme house edge values
                        let safeValue = inputValue;
                        if (inputValue > 25) {
                          safeValue = 25; // Cap at 25%
                          alert(`⚠️ House edge cannot exceed 25%. Value capped at 25%.`);
                        }
                        
                        newConfig.houseEdge[gamemode] = safeValue / 100;
                        onConfigChange(newConfig);
                      }}
                      className="w-full px-3 py-2 rounded bg-gray-600 text-white border border-gray-500"
                      min="0"
                      max="25"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Maximum allowed: 25%. Higher values break the game.
                    </p>
                    {edge > 0.20 && (
                      <p className="text-xs text-yellow-400 mt-1">
                        ⚠️ High house edge: {Math.round(edge * 100)}% will cause frequent instant crashes.
                      </p>
                    )}
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
                        onConfigChange(newConfig);
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
                        onConfigChange(newConfig);
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
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(gameConfig)}
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
      </div>
    </div>
  );
};
