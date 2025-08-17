interface GCTrackerProps {
  gcStats: {
    totalCirculation: number;
    totalDeposits: number;
    totalWithdrawals: number;
  };
}

export const GCTracker: React.FC<GCTrackerProps> = ({
  gcStats,
}) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">GC tracker</h2>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-yellow-400">{gcStats.totalCirculation.toLocaleString()}</div>
          <div className="text-gray-400">Total GC in circulation</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-400">{gcStats.totalDeposits.toLocaleString()}</div>
          <div className="text-gray-400">Total deposited</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-red-400">{gcStats.totalWithdrawals.toLocaleString()}</div>
          <div className="text-gray-400">Total withdrawn</div>
        </div>
      </div>
    </div>
  );
};
