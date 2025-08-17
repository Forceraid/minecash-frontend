import React from 'react';
import { GoldButton } from '../Button';

interface GameActionsProps {
  isConnected: boolean;
  crashPhase: string;
  autoCashout: number;
  autoCashoutActive: boolean;
  onPlaceBet: () => void;
  onCashout: () => void;
  onToggleAutoCashout: () => void;
  onButtonClick: () => void;
}

export const GameActions: React.FC<GameActionsProps> = ({
  isConnected,
  crashPhase,
  autoCashout,
  autoCashoutActive,
  onPlaceBet,
  onCashout,
  onToggleAutoCashout,
  onButtonClick,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h3 className="text-white font-bold text-lg">Actions</h3>
      </div>
      <div className="space-y-2">
        {/* Status Notifications */}
        {autoCashoutActive && (
          <div className="bg-green-600 text-white px-3 py-2 rounded text-sm font-semibold text-center">
            Auto cashout enabled at {autoCashout}x
          </div>
        )}
        
        {crashPhase !== 'betting' && (
          <div className="bg-red-600 text-white px-3 py-2 rounded text-sm font-semibold text-center">
            Betting is {crashPhase === 'playing' ? 'closed - game in progress' : 'closed'}
          </div>
        )}
        
        <GoldButton 
          className="w-full" 
          onClick={() => {
            onPlaceBet();
            onButtonClick();
          }}
          disabled={!isConnected || crashPhase !== 'betting'}
        >
          {crashPhase === 'betting' ? 'Bet' : 'Betting closed'}
        </GoldButton>
        
        <button 
          className={`w-full px-4 py-2 rounded font-semibold transition-colors cursor-pointer relative ${
            autoCashoutActive 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          } ${autoCashoutActive ? 'opacity-50' : ''}`}
          onClick={() => {
            onCashout();
            onButtonClick();
          }}
          disabled={!isConnected || autoCashoutActive}
        >
          Cash out
          {autoCashoutActive && (
            <div className="absolute inset-0 bg-black opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)'
            }}></div>
          )}
        </button>
        
        <button 
          className={`w-full px-4 py-2 rounded font-semibold transition-colors cursor-pointer ${
            autoCashoutActive 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          } ${crashPhase === 'playing' || crashPhase === 'crashed' ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => {
            onToggleAutoCashout();
            onButtonClick();
          }}
          disabled={!isConnected || crashPhase === 'playing' || crashPhase === 'crashed'}
        >
          Auto cashout
        </button>
      </div>
    </div>
  );
};
