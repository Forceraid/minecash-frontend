interface EmergencyStopModalProps {
  isOpen: boolean;
  emergencyStopping: boolean;
  onClose: () => void;
  onEmergencyStop: () => void;
}

export const EmergencyStopModal: React.FC<EmergencyStopModalProps> = ({
  isOpen,
  emergencyStopping,
  onClose,
  onEmergencyStop,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-red-500/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <span className="text-red-400">⚠️</span>
            <span>Emergency stop</span>
          </h3>
          <button
            onClick={onClose}
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
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onEmergencyStop}
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
  );
};
