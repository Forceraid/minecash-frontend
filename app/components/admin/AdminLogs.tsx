interface AdminLog {
  id: number;
  message: string;
  level: string;
  details: any;
  timestamp: string;
  source: string;
}

interface AdminLogsProps {
  adminLogs: AdminLog[];
  loadingLogs: boolean;
  emergencyStopping: boolean;
  onRefreshLogs: () => void;
  onShowDisableModal: () => void;
  onShowEmergencyModal: () => void;
  onShowGCLimitsModal: () => void;
}

export const AdminLogs: React.FC<AdminLogsProps> = ({
  adminLogs,
  loadingLogs,
  emergencyStopping,
  onRefreshLogs,
  onShowDisableModal,
  onShowEmergencyModal,
  onShowGCLimitsModal,
}) => {
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Admin logs & tools</h2>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={onShowDisableModal}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-semibold flex items-center justify-center space-x-2 cursor-pointer"
        >
          <span>Disable access</span>
        </button>
        <button 
          onClick={onShowEmergencyModal}
          disabled={emergencyStopping}
          className={`bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-4 py-2 rounded font-semibold flex items-center justify-center space-x-2 cursor-pointer ${
            emergencyStopping ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {emergencyStopping ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Stopping...</span>
            </div>
          ) : (
            <span>Emergency stop</span>
          )}
        </button>
        <button 
          onClick={onShowGCLimitsModal}
          className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-4 py-2 rounded font-semibold flex items-center justify-center space-x-2 cursor-pointer"
        >
          <span>GC limits</span>
        </button>
      </div>

      {/* Admin Logs */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Backend logs</h3>
          <button 
            onClick={onRefreshLogs}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm cursor-pointer"
          >
            Refresh
          </button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
          {loadingLogs ? (
            <div className="text-gray-400 text-center py-4">Loading logs...</div>
          ) : adminLogs.length > 0 ? (
            adminLogs.map((log) => {
              const timestamp = new Date(log.timestamp).toLocaleString();
              const timeAgo = getTimeAgo(new Date(log.timestamp));
              
              return (
                <div key={log.id} className={`flex items-start space-x-4 p-3 rounded ${
                  log.level === 'error' ? 'bg-red-900/30 border border-red-500/30' :
                  log.level === 'warning' ? 'bg-yellow-900/30 border border-yellow-500/30' :
                  log.level === 'success' ? 'bg-green-900/30 border border-green-500/30' :
                  'bg-gray-700'
                }`}>
                  <div className="text-gray-400 text-sm w-32 flex-shrink-0">{timeAgo}</div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">{log.message}</div>
                    {log.details && (
                      <div className="text-gray-300 text-sm mt-1">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      </div>
                    )}
                  </div>
                  <div className={`text-sm flex-shrink-0 ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warning' ? 'text-yellow-400' :
                    log.level === 'success' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>
                    {log.level.toUpperCase()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-400 text-center py-4">No logs available</div>
          )}
        </div>
      </div>
    </div>
  );
};
