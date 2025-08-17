import React from 'react';

interface Tab {
  id: string;
  name: string;
  icon: string;
}

interface AdminTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabs: Tab[] = [
  { id: "users", name: "👥 User management", icon: "👥" },
  { id: "gc", name: "💰 GC tracker", icon: "💰" },
  { id: "stats", name: "📊 Gamemode stats", icon: "📊" },
  { id: "config", name: "⚙️ Game config", icon: "⚙️" },
  { id: "memory", name: "🧠 Memory monitor", icon: "🧠" },
  { id: "logs", name: "📋 Admin logs & tools", icon: "📋" },
];

export const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-gray-700 flex-shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center ${
            activeTab === tab.id
              ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-800'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <span className="text-2xl">{tab.icon}</span>
        </button>
      ))}
    </div>
  );
};
