import type { Route } from "./+types/crash";
import { useAuth } from "../../contexts/AuthContext";
import { useGCBalance } from "../../contexts/GCBalanceContext";
import { LightButton, GoldButton } from "../../components/Button";
import { ChatSidebar } from "../../components/ChatSidebar";
import { NotificationManager } from "../../components/Notification";
import { GamemodeAccessCheck } from "../../components/GamemodeAccessCheck";
import { BettingControls, GameActions, GameStatus, CrashRocketScene, GameLiveView } from "../../components/crash";
import Particles from "../../components/Particles";
import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import { websocketService } from "../../lib/websocket";
import soundSystem from "../../lib/sound-system";
import { useCrashNotifications } from "../../hooks/useCrashNotifications";
import { useCrashSettings } from "../../hooks/useCrashSettings";
import { useCrashWebSocket } from "../../hooks/useCrashWebSocket";

export { meta } from "./+types/crash";

// Helper function to safely construct API URLs
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  // Remove trailing slash if present to prevent double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};



export default function Crash() {
  const { user, loading, session, userProfile } = useAuth();
  const { balance, refreshBalance, updateBalance } = useGCBalance();
  
  // Local balance state for immediate UI updates (like Hi-Lo)
  const [localBalance, setLocalBalance] = useState(balance);
  
  // Sync local balance with server balance
  useEffect(() => {
    setLocalBalance(balance);
  }, [balance]);
  
  // Additional effect to ensure global balance stays in sync
  useEffect(() => {
    if (localBalance !== balance) {
      // If local balance differs from global, refresh global to sync
      refreshBalance();
    }
  }, [localBalance, balance, refreshBalance]);
  
  // Update local balance immediately for UI responsiveness
  const updateLocalBalance = (amount: number) => {
    setLocalBalance(prev => {
      const newBalance = Math.round((prev + amount) * 100) / 100;
      return newBalance;
    });
  };
  
  // Handle balance updates from server - now also updates global context
  const handleBalanceUpdate = async (newBalance: number) => {
    if (!user || !session?.access_token) {
      console.warn('Cannot update balance - user not authenticated');
      return;
    }
    // Update local balance immediately
    setLocalBalance(newBalance);
    // Also refresh from server to ensure consistency
    await refreshBalance();
  };
  
  // Settings management
  const {
    bet,
    betInput,
    setBet,
    setBetInput,
    handleBetInputChange,
    updateBet,
    autoCashout,
    autoCashoutActive,
    setAutoCashout,
    setAutoCashoutActive,
    soundEnabled,
    soundVolume,
    setSoundEnabled,
    setSoundVolume
  } = useCrashSettings();
  
  // Game State
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState('waiting');
  const [currentBetAmount, setCurrentBetAmount] = useState(0);
  const [lastRounds, setLastRounds] = useState<Array<{multiplier: number, roundNumber: number}>>([]);
  
  const [crashState, setCrashState] = useState({
    phase: 'betting',
    currentMultiplier: 1.0,
    currentRoundNumber: 1,
    activePlayersCount: 0,
    totalBetAmount: 0.00,
    currentCrashPoint: 1.0,
    gameHash: null,
    serverSeedHash: null,
    clientSeed: null,
    nonce: 1,
    phaseStartTime: Date.now()
  });

  // Animation State
  const [interpolatedMultiplier, setInterpolatedMultiplier] = useState(1.0);
  const [lastWebSocketUpdate, setLastWebSocketUpdate] = useState<number>(0);
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  
  // Refs for optimization
  const lastPhaseForSound = useRef('betting');
  const lastTensionSound = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);
  const lastAutoNotifyAtRef = useRef<number>(0);
  
  // State tracking
  const [betProcessed, setBetProcessed] = useState(false);
  const [lastRoundNumber, setLastRoundNumber] = useState(1);
  const [gameConfig, setGameConfig] = useState({
    betLimits: { min: 1, max: 1000 },
    gameTiming: { bettingPhase: 10000 }
  });
  
  // Remove localBalance state and use the global balance directly
  // This ensures the header and all components stay in sync

  // Notification management
  const { notifications, addNotification, removeNotification } = useCrashNotifications(soundEnabled);

  // WebSocket management
  useCrashWebSocket({
    user,
    session,
    loading,
    userProfile,
    bet,
    refreshBalance,
    handleBalanceUpdate,
    updateLocalBalance,
    isConnected,
    setIsConnected,
    setGameState,
    crashState,
    setCrashState,
    setLastWebSocketUpdate,
    betProcessed,
    setBetProcessed,
    lastRoundNumber,
    setLastRoundNumber,
    setCurrentBetAmount,
    setLastRounds,
    setAutoCashoutActive,
    setAutoCashout,
    addNotification,
    soundEnabledRef,
    lastAutoNotifyAtRef,
    animationFrameId,
    setGameConfig
  });



  // Fetch recent rounds from API
  useEffect(() => {
    const fetchRecentRounds = async () => {
      if (user && session?.access_token) {
        try {
          const response = await fetch(getApiUrl('/game/crash-main/history?limit=20'), {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const apiRounds = await response.json();
            if (Array.isArray(apiRounds) && apiRounds.length > 0) {
              const currentRoundNumber = crashState?.currentRoundNumber || 1;
              const convertedRounds = apiRounds
                .filter((round: any) => {
                  const roundNumber = round.round_number || 1;
                  const isCompleted = round.status === 'completed';
                  const isNotCurrent = roundNumber !== currentRoundNumber;
                  return isCompleted && isNotCurrent;
                })
                .map((round: any) => ({
                  multiplier: parseFloat(round.game_data?.currentCrashPoint || 1.0),
                  roundNumber: round.round_number || 1
                }))
                .sort((a: any, b: any) => b.roundNumber - a.roundNumber)
                .slice(0, 20);
              
              if (convertedRounds.length > 0) {
                setLastRounds(convertedRounds);
              }
            }
          }
        } catch (error) {
          // Silent error handling
        }
      }
    };
    
    fetchRecentRounds();
  }, [crashState?.currentRoundNumber, user, session?.access_token]);







  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);



  // Sound system setup
  useEffect(() => {
    soundSystem.setEnabled(soundEnabled);
    soundSystem.setVolume(soundVolume);
    
    if (typeof window !== 'undefined') {
      const handleUserInteraction = () => {
        soundSystem.initializeAfterUserInteraction();
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
      
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      
      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [soundEnabled, soundVolume]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (crashState.phase === 'playing' && crashState.currentMultiplier > 1.0) {
        const targetMultiplier = crashState.currentMultiplier;
        const currentInterpolated = interpolatedMultiplier;
        const newInterpolated = currentInterpolated + (targetMultiplier - currentInterpolated) * 0.6;
        
        setInterpolatedMultiplier(newInterpolated);
        
        if (newInterpolated >= lastTensionSound.current + 0.2) {
          if (soundEnabled) {
            soundSystem.playTensionSound(newInterpolated);
          }
          lastTensionSound.current = newInterpolated;
        }
      } else {
        setInterpolatedMultiplier(crashState.currentMultiplier);
      }
      
      setAnimationFrameId(requestAnimationFrame(animate));
    };

    if (isConnected) {
      setAnimationFrameId(requestAnimationFrame(animate));
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isConnected, crashState.phase, crashState.currentMultiplier, soundEnabled]);

  // Phase change sounds
  useEffect(() => {
    if (crashState.phase !== lastPhaseForSound.current) {
      switch (crashState.phase) {
        case 'playing':
          if (soundEnabled) soundSystem.playRocketLaunch();
          break;
        case 'crashed':
          if (soundEnabled) soundSystem.playCrashSound(crashState.currentMultiplier);
          break;
        case 'waiting':
          if (soundEnabled) soundSystem.play('game_waiting');
          break;
      }
      lastPhaseForSound.current = crashState.phase;
    }
  }, [crashState.phase, crashState.currentMultiplier, soundEnabled]);







  // Event handlers

  const placeBet = async () => {
    if (!isConnected) {
      addNotification('Not connected to game server', 'error');
      return;
    }

    if (crashState.phase !== 'betting') {
      addNotification('Cannot place bet while betting is closed', 'error');
      return;
    }

    if (betProcessed) {
      addNotification('Bet already processed for this round', 'error');
      return;
    }

    if (bet <= 0) {
      addNotification('Bet amount must be greater than 0', 'error');
      return;
    }

    if (bet > localBalance) {
      addNotification('Insufficient balance for this bet', 'error');
      return;
    }

    // Double-check bet limits with explicit values
    const minBet = gameConfig.betLimits.min || 1;
    const maxBet = gameConfig.betLimits.max || 1000;
    
    console.log('Bet validation:', { bet, minBet, maxBet, gameConfig: gameConfig.betLimits });
    
    if (bet < minBet || bet > maxBet) {
      addNotification(`Bet must be between ${minBet} and ${maxBet} GC`, 'error');
      return;
    }

    try {
      // Update local balance immediately for UI responsiveness
      updateLocalBalance(-bet);
      
      // Also update global balance context for header consistency
      await refreshBalance();
      
      websocketService.placeBet(bet);
      
      // Don't set betProcessed here - wait for server confirmation
      // The WebSocket handler will update the UI when bet is confirmed or failed
    } catch (error) {
      // Revert local balance if bet placement fails
      updateLocalBalance(bet);
      // Also refresh global balance to ensure consistency
      await refreshBalance();
      addNotification('Failed to place bet', 'error');
      console.error('Error placing bet:', error);
    }
  };

  const handleCashout = async () => {
    if (!isConnected) {
      addNotification('Not connected to game server', 'error');
      return;
    }

    if (currentBetAmount === 0) {
      addNotification('No active bet to cashout', 'error');
      return;
    }

    if (crashState.phase !== 'crashing') {
      addNotification('Can only cashout during crashing phase', 'error');
      return;
    }

    try {
      // Calculate and update local balance immediately for UI responsiveness
      const estimatedPayout = currentBetAmount * crashState.currentMultiplier;
      updateLocalBalance(estimatedPayout);
      
      websocketService.sendGameAction('cashout');
      addNotification('Cashout requested!', 'success');
      
      // IMMEDIATE updates like Hi-Lo - no delays
      setCurrentBetAmount(0);
      setBetProcessed(true);
    } catch (error) {
      console.error('Error requesting cashout:', error);
      addNotification('Failed to request cashout', 'error');
    }
  };

  const handleAutoCashout = async () => {
    if (!isConnected) {
      addNotification('Not connected to game server', 'error');
      return;
    }

    if (currentBetAmount === 0) {
      addNotification('No active bet for auto-cashout', 'error');
      return;
    }

    if (crashState.phase !== 'crashing') {
      addNotification('Auto-cashout can only be set during crashing phase', 'error');
      return;
    }

    if (autoCashout <= 1.0) {
      addNotification('Auto-cashout must be greater than 1.0x', 'error');
      return;
    }

    try {
      websocketService.sendGameAction('auto_cashout', { targetMultiplier: autoCashout });
      addNotification(`Auto-cashout set to ${autoCashout}x`, 'success');
      
      // Note: Auto-cashout just sets target - actual cashout happens when multiplier reaches target
      // Balance will be updated by backend when auto-cashout actually triggers
      setCurrentBetAmount(0);
      setBetProcessed(true);
    } catch (error) {
      console.error('Error setting auto-cashout:', error);
      addNotification('Failed to set auto-cashout', 'error');
    }
  };

  const handleGameAction = async (action: string) => {
    if (!isConnected) {
      addNotification('Not connected to server', 'error');
      return;
    }

    if (action === 'auto_cashout') {
      if (crashState.phase !== 'betting') {
        addNotification('Auto cashout can only be changed during betting phase', 'error');
        return;
      }
      
      const newAutoCashoutActive = !autoCashoutActive;
      setAutoCashoutActive(newAutoCashoutActive);
      
      if (newAutoCashoutActive) {
        websocketService.sendGameAction('auto_cashout', { targetMultiplier: autoCashout });
        addNotification(`Auto cashout enabled at ${autoCashout}x`, 'success');
      } else {
        websocketService.sendGameAction('auto_cashout', { targetMultiplier: 0 });
        addNotification('Auto cashout disabled', 'success');
        if (typeof window !== 'undefined') {
          localStorage.setItem('crash_auto_cashout_active', 'false');
        }
      }
    } else if (action === 'cashout') {
      if (crashState.phase !== 'playing') {
        addNotification('Cashout is only available during the playing phase', 'error');
        return;
      }
      // Calculate and update local balance immediately for manual cashout
      const estimatedPayout = currentBetAmount * crashState.currentMultiplier;
      updateLocalBalance(estimatedPayout);
      
      websocketService.sendGameAction('cashout');
    }
  };

  const handleButtonClick = () => {
    if (soundEnabled) {
      soundSystem.play('button_click');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading crash...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-3xl font-bold mb-4">Sign in to play crash</h2>
          <p className="text-lg mb-8">Join our Discord community to start playing</p>
          <Link to="/">
            <LightButton>Go home</LightButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GamemodeAccessCheck gamemode="crash">
      {/* Particles Background - Full Viewport */}
      <div className="fixed inset-0 z-0">
          <Particles
            particleColors={['#C89E00', '#C89E00']}
            particleCount={200}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={100}
            moveParticlesOnHover={true}
            alphaParticles={false}
            disableRotation={false}
          />
        </div>
      
      <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] bg-transparent relative">
        
        {/* Content Layer */}
        <div className="relative z-10">
          <NotificationManager notifications={notifications} onRemove={removeNotification} />
          
          <div className="container mx-auto px-4 py-8 pt-16 sm:pt-20 md:pt-24">
            <div className="mb-8 mt-8 sm:mt-3 md:mt-4">
              <GameLiveView 
                gameState={gameState} 
                crashState={crashState} 
                isConnected={isConnected} 
                lastRounds={lastRounds}
                interpolatedMultiplier={interpolatedMultiplier}
              />
            </div>

            <div className="bg-gray-900 rounded-lg p-4 sm:p-6 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 xl:items-stretch">
                {/* Betting Controls */}
                <BettingControls
                  bet={bet}
                  betInput={betInput}
                  autoCashout={autoCashout}
                  crashPhase={crashState.phase}
                  onBetInputChange={handleBetInputChange}
                  onUpdateBet={updateBet}
                  onAutoCashoutChange={setAutoCashout}
                  onButtonClick={handleButtonClick}
                />

                {/* Game Actions */}
                <GameActions
                  isConnected={isConnected}
                  crashPhase={crashState.phase}
                  autoCashout={autoCashout}
                  autoCashoutActive={autoCashoutActive}
                  onPlaceBet={placeBet}
                  onCashout={() => handleGameAction('cashout')}
                  onToggleAutoCashout={() => handleGameAction('auto_cashout')}
                  onButtonClick={handleButtonClick}
                />

                {/* Game Status */}
                <GameStatus
                  balance={localBalance}
                  currentBetAmount={currentBetAmount}
                  crashPhase={crashState.phase}
                  currentMultiplier={crashState.currentMultiplier}
                />
              </div>
            </div>

            <ChatSidebar gamemode="crash" />
          </div>
        </div>
      </div>
          </GamemodeAccessCheck>
    );
  }