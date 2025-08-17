import { useState, useEffect } from "react";
import { CrashRocketScene } from "./CrashRocketScene";

// GameLiveView component with real-time integration
function GameLiveView({ gameState, crashState, isConnected, lastRounds, interpolatedMultiplier }: { 
  gameState: string; 
  crashState: any; 
  isConnected: boolean; 
  lastRounds: Array<{multiplier: number, roundNumber: number}>;
  interpolatedMultiplier: number;
}) {
  const multiplier = crashState?.currentMultiplier ? parseFloat(crashState.currentMultiplier) : 1.0;
  const phase = crashState?.phase || 'betting';
  const roundNumber = crashState?.currentRoundNumber || 1;
  
  const getVisibleRounds = () => {
    if (typeof window === 'undefined') return 20;
    const width = window.innerWidth;
    if (width < 640) return 8;
    if (width < 768) return 12;
    if (width < 1024) return 16;
    return 20;
  };
  
  const [visibleRounds, setVisibleRounds] = useState(getVisibleRounds());
  
  useEffect(() => {
    const handleResize = () => setVisibleRounds(getVisibleRounds());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const getPhaseText = () => {
    switch (phase) {
      case 'betting': return 'Place your bets!';
      case 'playing': return 'Flying to the Moon!';
      case 'crashed': return 'Crashed!';
      case 'waiting': return 'Preparing next Round...';
      default: return `Phase: ${phase}`;
    }
  };

  return (
    <div className="w-full h-[500px] bg-[#F5F5F5] rounded-lg relative overflow-hidden">
      {/* 3D Rocket Scene */}
      <div className="absolute inset-0 z-0">
        <CrashRocketScene 
          multiplier={parseFloat(multiplier.toString())} 
          phase={phase} 
          className="w-full h-full"
        />
      </div>
      
      {/* UI Overlay */}
      <div className={`absolute z-10 pointer-events-none transition-all duration-500 ${
        phase === 'playing' 
          ? 'top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 flex flex-col items-end' 
          : 'inset-0 flex items-center justify-center'
      }`}>
        <div className={`text-black ${phase === 'playing' ? 'text-right' : 'text-center'}`}>
          {/* Multiplier Display */}
          <div className="mb-2 sm:mb-4 lg:mb-6">
            <div className={`font-bold text-yellow-400 mb-1 sm:mb-2 drop-shadow-lg ${
              phase === 'playing' 
                ? 'text-lg sm:text-2xl md:text-3xl lg:text-4xl' 
                : 'text-4xl sm:text-6xl md:text-8xl lg:text-9xl'
            }`}>
              {multiplier.toFixed(2)}x
            </div>
          </div>

          {/* Round Info - Hide during playing */}
          {phase !== 'playing' && (
            <div className="mb-2 sm:mb-4 lg:mb-6">
              <div className="text-xs opacity-70 break-all max-w-[150px] sm:max-w-[200px] md:max-w-xs mx-auto mb-1 sm:mb-2">
                {crashState?.serverSeedHash || crashState?.gameHash || 'Loading...'}
              </div>
              <div className="text-xs sm:text-sm font-mono text-gray-600 mb-1">Round</div>
              <div className="text-sm sm:text-lg md:text-xl font-bold text-black">
                {crashState?.currentRoundNumber || 1}
              </div>
            </div>
          )}

          {/* Game Status Indicators */}
          <div className={`flex space-x-2 sm:space-x-3 md:space-x-4 ${phase === 'playing' ? 'justify-end' : 'justify-center'}`}>
            {phase === 'playing' && (
              <div className="bg-green-600 rounded-lg w-10 h-5 sm:w-12 sm:h-6 md:w-16 md:h-8 flex items-center justify-center text-white font-bold text-xs sm:text-sm md:text-base animate-pulse">
                LIVE
              </div>
            )}
            {phase === 'crashed' && (
              <div className="bg-red-600 rounded-lg w-12 h-8 sm:w-16 sm:h-10 md:w-24 md:h-16 flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl animate-bounce">
                CRASH
              </div>
            )}
            {phase === 'betting' && (
              <div className="bg-blue-600 rounded-lg w-12 h-8 sm:w-16 sm:h-10 md:w-20 md:h-16 flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl">
                BET
              </div>
            )}
          </div>

          {/* Connection Warning */}
          {!isConnected && (
            <div className="mt-2 sm:mt-3 md:mt-4 p-2 sm:p-3 bg-red-600 rounded-lg">
              <div className="text-xs sm:text-sm md:text-base font-semibold text-white">Connection lost</div>
              <div className="text-xs opacity-80 text-white">Reconnecting...</div>
            </div>
          )}
        </div>
      </div>

      {/* Last Rounds Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-sm">
        <div className="flex justify-center items-center h-12 px-2">
          <div 
            className="flex space-x-1 overflow-x-auto max-w-full scrollbar-hide sm:scrollbar-auto"
            ref={(el) => {
              if (el && lastRounds.length > 0) {
                el.scrollLeft = el.scrollWidth;
              }
            }}
          >
            {lastRounds.slice(0, visibleRounds).map((round, index) => (
              <div
                key={`${round.roundNumber}-${index}`}
                className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-xs ${
                  round.multiplier >= 2 ? 'bg-green-600' : 'bg-red-600'
                }`}
                title={`Round ${round.roundNumber}: ${round.multiplier.toFixed(2)}x`}
              >
                {round.multiplier.toFixed(2)}
              </div>
            ))}
            {lastRounds.length === 0 && (
              <div className="text-white text-xs opacity-70">Loading recent rounds...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { GameLiveView };