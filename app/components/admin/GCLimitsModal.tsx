interface GCLimitsModalProps {
  isOpen: boolean;
  gcLimits: {
    deposit: { min: number; max: number };
    withdraw: { min: number; max: number };
  };
  updatingLimits: boolean;
  onClose: () => void;
  onUpdateLimits: (type: 'deposit' | 'withdraw', min: number, max: number) => void;
  onLimitsChange: (type: 'deposit' | 'withdraw', field: 'min' | 'max', value: number) => void;
}

export const GCLimitsModal: React.FC<GCLimitsModalProps> = ({
  isOpen,
  gcLimits,
  updatingLimits,
  onClose,
  onUpdateLimits,
  onLimitsChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">GC limits management</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <p className="text-gray-300 mb-4">
            Configure the minimum and maximum GC amounts for deposits and withdrawals. These limits will be applied to all user transactions.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deposit Limits */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">
                Deposit limits
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Minimum amount (GC)</label>
                  <input
                    type="number"
                    value={gcLimits.deposit.min}
                    onChange={(e) => onLimitsChange('deposit', 'min', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Maximum amount (GC)</label>
                  <input
                    type="number"
                    value={gcLimits.deposit.max}
                    onChange={(e) => onLimitsChange('deposit', 'max', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    min="1"
                  />
                </div>
                
                <button
                  onClick={() => onUpdateLimits('deposit', gcLimits.deposit.min, gcLimits.deposit.max)}
                  disabled={updatingLimits}
                  className={`w-full px-4 py-2 rounded font-semibold cursor-pointer ${
                    updatingLimits 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {updatingLimits ? 'Updating...' : 'Update deposit limits'}
                </button>
              </div>
            </div>

            {/* Withdrawal Limits */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">
                Withdrawal limits
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Minimum amount (GC)</label>
                  <input
                    type="number"
                    value={gcLimits.withdraw.min}
                    onChange={(e) => onLimitsChange('withdraw', 'min', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Maximum amount (GC)</label>
                  <input
                    type="number"
                    value={gcLimits.withdraw.max}
                    onChange={(e) => onLimitsChange('withdraw', 'max', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    min="1"
                  />
                </div>
                
                <button
                  onClick={() => onUpdateLimits('withdraw', gcLimits.withdraw.min, gcLimits.withdraw.max)}
                  disabled={updatingLimits}
                  className={`w-full px-4 py-2 rounded font-semibold cursor-pointer ${
                    updatingLimits 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {updatingLimits ? 'Updating...' : 'Update withdrawal limits'}
                </button>
              </div>
            </div>
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
      </div>
    </div>
  );
};
