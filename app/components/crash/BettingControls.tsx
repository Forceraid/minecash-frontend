import React from 'react';

interface BettingControlsProps {
  bet: number;
  betInput: string;
  autoCashout: number;
  crashPhase: string;
  onBetInputChange: (value: string) => void;
  onUpdateBet: (newBet: number) => void;
  onAutoCashoutChange: (value: number) => void;
  onButtonClick: () => void;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  bet,
  betInput,
  autoCashout,
  crashPhase,
  onBetInputChange,
  onUpdateBet,
  onAutoCashoutChange,
  onButtonClick,
}) => {
  return (
    <div className="h-full flex flex-col">
      <h3 className="text-white font-bold text-lg mb-4">Place your bet</h3>
      <div className="space-y-3">
        {/* Bet Amount Input */}
        <div>
          <label className="text-white text-sm block mb-1">Bet amount:</label>
          <div className="flex items-center space-x-1 sm:space-x-2 w-full">
            <button 
              onClick={() => {
                onUpdateBet(Math.max(1, bet - 1));
                onButtonClick();
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors cursor-pointer flex-shrink-0 text-sm"
            >
              -1
            </button>
            <input
              type="number"
              value={betInput}
              onChange={(e) => onBetInputChange(e.target.value)}
              className="bg-gray-800 border border-gray-600 px-2 sm:px-4 py-2 rounded text-center flex-1 text-yellow-400 font-bold focus:outline-none focus:border-yellow-400 text-sm sm:text-base"
              min="1"
              placeholder="0"
            />
            <span className="text-gray-400 flex-shrink-0 text-sm sm:text-base">GC</span>
            <button 
              onClick={() => {
                onUpdateBet(bet + 1);
                onButtonClick();
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors cursor-pointer flex-shrink-0 text-sm"
            >
              +1
            </button>
          </div>
          
          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-5 gap-1 mt-2">
            <button onClick={() => { onUpdateBet(bet + 5); onButtonClick(); }} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+5</button>
            <button onClick={() => { onUpdateBet(bet + 10); onButtonClick(); }} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+10</button>
            <button onClick={() => { onUpdateBet(bet + 25); onButtonClick(); }} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+25</button>
            <button onClick={() => { onUpdateBet(bet + 50); onButtonClick(); }} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+50</button>
            <button onClick={() => { onUpdateBet(bet + 100); onButtonClick(); }} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+100</button>
          </div>
        </div>

        {/* Auto Cashout Settings */}
        <div>
          <label className="text-white text-sm block mb-1">Auto cashout at:</label>
          <div className="flex items-center space-x-1 sm:space-x-2 w-full">
            <button 
              onClick={() => {
                onAutoCashoutChange(Math.max(1.1, autoCashout - 0.1));
                onButtonClick();
              }}
              className={`bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors cursor-pointer flex-shrink-0 text-sm ${
                crashPhase === 'playing' || crashPhase === 'crashed' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={crashPhase === 'playing' || crashPhase === 'crashed'}
            >
              -0.1
            </button>
            <input
              type="number"
              value={autoCashout}
              onChange={(e) => onAutoCashoutChange(parseFloat(e.target.value) || 1.5)}
              className={`bg-gray-800 border border-gray-600 px-2 sm:px-4 py-2 rounded text-center flex-1 text-yellow-400 font-bold focus:outline-none focus:border-yellow-400 text-sm sm:text-base ${
                crashPhase === 'playing' || crashPhase === 'crashed' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              min="1.1"
              step="0.1"
              placeholder="1.5"
              disabled={crashPhase === 'playing' || crashPhase === 'crashed'}
            />
            <span className="text-gray-400 flex-shrink-0 text-sm sm:text-base">x</span>
            <button 
              onClick={() => {
                onAutoCashoutChange(autoCashout + 0.1);
                onButtonClick();
              }}
              className={`bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors cursor-pointer flex-shrink-0 text-sm ${
                crashPhase === 'playing' || crashPhase === 'crashed' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={crashPhase === 'playing' || crashPhase === 'crashed'}
            >
              +0.1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
