import React from 'react';

interface GameStatusProps {
  balance: number;
  currentBetAmount: number;
  crashPhase: string;
  currentMultiplier: number;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  balance,
  currentBetAmount,
  crashPhase,
  currentMultiplier,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h3 className="text-white font-bold text-lg">Game status</h3>
      </div>
      <div className="bg-gray-800 rounded p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Your balance:</span>
          <span className="text-yellow-400 font-bold">{balance} GC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Current bet:</span>
          <span className="text-white font-bold">{currentBetAmount} GC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className="text-yellow-400 font-bold">{crashPhase}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Multiplier:</span>
          <span className="text-white font-bold">{parseFloat(String(currentMultiplier)).toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
};
