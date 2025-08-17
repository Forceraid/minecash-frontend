import React from 'react';

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

interface UserManagementProps {
  users: User[];
  loadingUsers: boolean;
  userSearch: string;
  onUserSearchChange: (search: string) => void;
  onToggleUserBan: (userId: number) => void;
  onResetUserGC: (userId: number) => void;
  onViewUserStats: (user: User) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  loadingUsers,
  userSearch,
  onUserSearchChange,
  onToggleUserBan,
  onResetUserGC,
  onViewUserStats,
}) => {
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.trim().toLowerCase();
    const fields = [
      u.displayName || "",
      u.username || "",
      u.email || "",
      u.discord_id || ""
    ].map(s => (s || "").toLowerCase());
    return fields.some(f => f.includes(q));
  });

  if (loadingUsers) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-white">User management</h2>
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={userSearch}
            onChange={(e) => onUserSearchChange(e.target.value)}
            placeholder="Search by Discord username, username, or email"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto min-h-[300px] max-h-[calc(100vh-24rem)] overflow-y-auto scrollbar-hide">
        <table className="w-full bg-gray-800 rounded-lg min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-4 text-white whitespace-nowrap">Username</th>
              <th className="text-left p-4 text-white whitespace-nowrap">Discord ID</th>
              <th className="text-left p-4 text-white whitespace-nowrap">Email</th>
              <th className="text-left p-4 text-white whitespace-nowrap">GC balance</th>
              <th className="text-left p-4 text-white whitespace-nowrap">Status</th>
              <th className="text-left p-4 text-white whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="p-4 text-white whitespace-nowrap">{user.displayName}</td>
                <td className="p-4 text-gray-300 whitespace-nowrap">{user.discord_id || 'N/A'}</td>
                <td className="p-4 text-gray-300 whitespace-nowrap">{user.email}</td>
                <td className="p-4 text-yellow-400 whitespace-nowrap">{user.gc_balance || 0} GC</td>
                <td className="p-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    user.banned ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                  }`}>
                    {user.banned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onToggleUserBan(user.id)}
                      className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        user.banned 
                          ? 'bg-green-600 hover:bg-green-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white' 
                          : 'bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white'
                      }`}
                    >
                      {user.banned ? 'Unban' : 'Ban'}
                    </button>
                    <button
                      onClick={() => onResetUserGC(user.id)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Reset GC
                    </button>
                    <button
                      onClick={() => onViewUserStats(user)}
                      className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      View stats
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 min-h-[300px] max-h-[calc(100vh-24rem)] overflow-y-auto scrollbar-hide">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">{user.displayName}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  user.banned ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  {user.banned ? 'Banned' : 'Active'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Discord ID:</span>
                  <span className="text-gray-300">{user.discord_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-gray-300 truncate">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">GC Balance:</span>
                  <span className="text-yellow-400">{user.gc_balance || 0} GC</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                <button
                  onClick={() => onToggleUserBan(user.id)}
                  className={`px-3 py-2 rounded text-sm font-semibold cursor-pointer ${
                    user.banned 
                      ? 'bg-green-600 hover:bg-green-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white' 
                      : 'bg-red-600 hover:bg-red-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white'
                  }`}
                >
                  {user.banned ? 'Unban' : 'Ban'}
                </button>
                <button
                  onClick={() => onResetUserGC(user.id)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                >
                  Reset GC
                </button>
                <button
                  onClick={() => onViewUserStats(user)}
                  className="bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] text-white px-3 py-2 rounded text-sm font-semibold cursor-pointer"
                >
                  View stats
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
