interface GamemodeRestriction {
  id: number;
  gamemode: string;
  is_disabled: boolean;
  disabled_at: string | null;
  disabled_by: number | null;
  reason: string | null;
}

interface DisableAccessModalProps {
  isOpen: boolean;
  gamemodeRestrictions: GamemodeRestriction[];
  loadingRestrictions: boolean;
  updatingGamemode: string | null;
  onClose: () => void;
  onToggleGamemodeAccess: (gamemode: string, isDisabled: boolean, reason?: string) => void;
}

export const DisableAccessModal: React.FC<DisableAccessModalProps> = ({
  isOpen,
  gamemodeRestrictions,
  loadingRestrictions,
  updatingGamemode,
  onClose,
  onToggleGamemodeAccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Disable gamemode access</h3>
          <button
            onClick={onClose}
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
                      onClick={() => onToggleGamemodeAccess(restriction.gamemode, !restriction.is_disabled)}
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
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
