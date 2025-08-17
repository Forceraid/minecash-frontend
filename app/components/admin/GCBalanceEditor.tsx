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

interface GCBalanceEditorProps {
  users: User[];
  gcSearch: string;
  gcAdjustments: { [key: number]: number };
  onGCSearchChange: (search: string) => void;
  onGCAdjustmentChange: (userId: number, value: number) => void;
  onAdjustUserGC: (userId: number, adjustment: number) => void;
  onResetGCAdjustment: (userId: number) => void;
}

export const GCBalanceEditor: React.FC<GCBalanceEditorProps> = ({
  users,
  gcSearch,
  gcAdjustments,
  onGCSearchChange,
  onGCAdjustmentChange,
  onAdjustUserGC,
  onResetGCAdjustment,
}) => {
  const filteredUsers = users.filter(u => {
    if (!gcSearch.trim()) return true;
    const q = gcSearch.trim().toLowerCase();
    const fields = [
      u.displayName || "",
      u.username || "",
      u.email || "",
      u.discord_id || ""
    ].map(s => (s || "").toLowerCase());
    return fields.some(f => f.includes(q));
  });

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h3 className="text-xl font-bold text-white">Individual GC balance editor</h3>
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={gcSearch}
            onChange={(e) => onGCSearchChange(e.target.value)}
            placeholder="Search by Discord username, username, or email"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto min-h-[300px] max-h-[calc(100vh-40rem)] overflow-y-auto scrollbar-hide">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-white whitespace-nowrap">User</th>
              <th className="text-left p-3 text-white whitespace-nowrap">Current balance</th>
              <th className="text-left p-3 text-white whitespace-nowrap">Adjustment</th>
              <th className="text-left p-3 text-white whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="p-3 text-white whitespace-nowrap">{user.displayName}</td>
                <td className="p-3 text-yellow-400 whitespace-nowrap">{user.gc_balance || 0} GC</td>
                <td className="p-3">
                  <input
                    type="number"
                    placeholder="±amount"
                    value={gcAdjustments[user.id] || ''}
                    onChange={(e) => onGCAdjustmentChange(user.id, parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white w-24 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </td>
                <td className="p-3 whitespace-nowrap">
                  <button 
                    onClick={() => onAdjustUserGC(user.id, gcAdjustments[user.id] || 0)}
                    className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-1 rounded text-sm font-semibold mr-2 cursor-pointer"
                  >
                    Apply
                  </button>
                  <button 
                    onClick={() => onResetGCAdjustment(user.id)}
                    className="bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-1 rounded text-sm font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 min-h-[300px] max-h-[calc(100vh-32rem)] overflow-y-auto scrollbar-hide">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">{user.displayName}</span>
                <span className="text-yellow-400 font-bold">{user.gc_balance || 0} GC</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Adjustment</label>
                  <input
                    type="number"
                    placeholder="±amount"
                    value={gcAdjustments[user.id] || ''}
                    onChange={(e) => onGCAdjustmentChange(user.id, parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => onAdjustUserGC(user.id, gcAdjustments[user.id] || 0)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                  >
                    Apply
                  </button>
                  <button 
                    onClick={() => onResetGCAdjustment(user.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


