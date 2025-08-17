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
  const { balance, refreshBalance } = useGCBalance();
  
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

  // Balance management
  const updateLocalBalance = (amount: number) => {
    // This function is no longer needed as localBalance is removed
    // The global balance context handles the actual balance state
  };

  const syncBalanceWithServer = () => {
    // This function is no longer needed as localBalance is removed
    // The global balance context handles the actual balance state
  };

  useEffect(() => {
    // This effect is no longer needed as localBalance is removed
    // The global balance context handles the actual balance state
  }, [balance]);

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

  // WebSocket connection and message handling
  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      // Clean up WebSocket
      websocketService.leaveGame();
      websocketService.disconnect();
      websocketService.resetGamemodeTracking();
      
      // Clean up animations
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Stop all sounds
      soundSystem.stopAll();
      
      // Reset state
      setIsConnected(false);
      setGameState('waiting');
      setCrashState(prev => ({
        ...prev,
        phase: 'betting',
        currentMultiplier: 1.0
      }));
    };
  }, []);

  useEffect(() => {
    if (user && session?.access_token && !loading) {
      const wasAlreadyConnected = websocketService.isConnected();
      
      websocketService.connect({
        onConnect: () => {
          setIsConnected(true);
          websocketService.joinGame('crash', session.access_token);
        },
        onDisconnect: () => {
          setIsConnected(false);
        },
        onMessage: (message) => {
          // Explicitly filter out ping/pong messages to prevent notifications
          if (message.type === 'ping' || message.type === 'pong' || 
              (message.type && message.type.toLowerCase().includes('pong'))) {
            return;
          }

          switch (message.type) {
            case 'joined_game':
              break;
            case 'join_game_error':
              addNotification('Failed to join game room. Please refresh the page.', 'error');
              break;
            case 'bet_success':
            case 'bet_confirmed':
            case 'crash_bet_confirmed':
              if (message.amount) {
                setCurrentBetAmount(Number(message.amount));
                setBetProcessed(false);
              }
              if (soundEnabledRef.current) {
                soundSystem.play('bet_placed');
              }
              break;
            case 'bet_failed':
              addNotification(message.message || 'Bet failed', 'error');
              if (soundEnabledRef.current) {
                soundSystem.play('bet_failed');
              }
              if (message.betAmount) {
                // updateLocalBalance(message.betAmount); // This line is no longer needed
              }
              break;
            case 'cashout_success':
              addNotification(`Success: cashed out at ${message.cashoutMultiplier || message.cashoutValue}x`, 'success');
              if (soundEnabledRef.current) {
                soundSystem.play('cashout_success');
              }
              if (message.cashoutAmount) {
                // Balance already updated immediately in handleCashout
              }
              // Balance already refreshed immediately in handleCashout
              setCurrentBetAmount(0);
              setBetProcessed(true);
              break;
            case 'cashout_failed':
              addNotification(message.message || 'Cashout failed', 'error');
              if (soundEnabledRef.current) {
                soundSystem.play('cashout_failed');
              }
              break;
            case 'auto_cashout_success':
              setAutoCashoutActive(true);
              if (message.targetMultiplier || message.targetValue) {
                setAutoCashout(parseFloat(message.targetMultiplier || message.targetValue));
              }
              break;
            case 'auto_cashout_disabled':
              addNotification(message.message || 'Auto cashout disabled', 'success');
              setAutoCashoutActive(false);
              break;
            case 'auto_cashout_failed':
              addNotification(message.message || 'Auto cashout failed', 'error');
              setAutoCashoutActive(false);
              break;
            case 'auto_cashout_broadcast':
              if (message.userData) {
                if (userProfile && String(message.userData.id) === String(userProfile.id)) {
                  // Only handle state updates, no notifications
                  // Balance already updated immediately in handleAutoCashout
                  // Balance already refreshed immediately in handleAutoCashout
                  setCurrentBetAmount(0);
                  setBetProcessed(true);
                  setAutoCashoutActive(false);
                }
              }
              break;
            case 'user_specific_message':
              if (userProfile && String(message.targetUserId) === String(userProfile.id)) {
                const specificMessage = message.message;
                
                if (specificMessage.type === 'auto_cashout_triggered') {
                  // Only handle state updates, no notifications
                  // Balance already updated immediately in handleAutoCashout
                  // Balance already refreshed immediately in handleAutoCashout
                  setCurrentBetAmount(0);
                  setBetProcessed(true);
                  setAutoCashoutActive(false);
                }
                
                else if (specificMessage.type === 'crash_state_update') {
                  const state = specificMessage.state || specificMessage;
                  const normalized = {
                    phase: state.phase || 'betting',
                    currentMultiplier: Number(state.currentMultiplier ?? 1.0),
                    currentRoundNumber: Number(state.currentRoundNumber ?? 1),
                    activePlayersCount: Number(state.activePlayersCount ?? 0),
                    totalBetAmount: Number(state.totalBetAmount ?? 0),
                    currentCrashPoint: Number(state.currentCrashPoint ?? 1.0),
                    gameHash: state.gameHash || null,
                    serverSeedHash: state.serverSeedHash || null,
                    clientSeed: state.clientSeed || null,
                    nonce: Number(state.nonce ?? 0),
                    phaseStartTime: state.phaseStartTime ? new Date(state.phaseStartTime).getTime() : Date.now(),
                    userBet: state.userBet || null
                  };
                  
                  setCrashState(normalized);
                  setGameState(normalized.phase);
                  setLastWebSocketUpdate(Date.now());
                  
                  if (normalized.userBet && normalized.userBet.status === 'cashed_out' && !betProcessed) {
                    setCurrentBetAmount(0);
                    setBetProcessed(true);
                    refreshBalance();
                  }
                }
              }
              break;
            case 'crash_state_update':
            case 'game_state_update':
              const state = message.state || message;
              const normalized = {
                phase: state.phase || 'betting',
                currentMultiplier: Number(state.currentMultiplier ?? 1.0),
                currentRoundNumber: Number(state.currentRoundNumber ?? 1),
                activePlayersCount: Number(state.activePlayersCount ?? 0),
                totalBetAmount: Number(state.totalBetAmount ?? 0),
                currentCrashPoint: Number(state.currentCrashPoint ?? 1.0),
                gameHash: state.gameHash || null,
                serverSeedHash: state.serverSeedHash || null,
                clientSeed: state.clientSeed || null,
                nonce: Number(state.nonce ?? 0),
                phaseStartTime: state.phaseStartTime ? new Date(state.phaseStartTime).getTime() : Date.now(),
                userBet: state.userBet || null
              };

              if (normalized.currentRoundNumber !== lastRoundNumber) {
                setBetProcessed(false);
                setLastRoundNumber(normalized.currentRoundNumber);
              }
              
              setCrashState(normalized);
              setGameState(normalized.phase);
              setLastWebSocketUpdate(Date.now());
              
              // Handle auto-cashout state update with notification
              if (normalized.userBet && normalized.userBet.status === 'cashed_out') {
                const currentRound = normalized.currentRoundNumber;
                
                // Only process payout and show notification once per round
                if (currentRound !== lastAutoNotifyAtRef.current) {
                  // Calculate payout amount
                  const betAmount = normalized.userBet.amount || 0;
                  const cashoutMultiplier = normalized.userBet.cashoutValue || 1;
                  const payoutAmount = betAmount * cashoutMultiplier;

                  // Balance already updated immediately in handleAutoCashout
                  
                  // Show notification
                  addNotification(`Auto cashed out at ${normalized.userBet.cashoutValue}x`, 'success');
                  if (soundEnabledRef.current) {
                    soundSystem.play('cashout_success');
                  }
                  
                  lastAutoNotifyAtRef.current = currentRound;
                }

                // Always reset bet state but keep auto cashout enabled
                setCurrentBetAmount(0);
                setBetProcessed(true);
              }
              
              const betAmountCandidate = state.userBet?.amount ?? 0;
              const currentPhase = normalized.phase;
              
              if (state.userBet && state.userBet.autoCashout) {
                setAutoCashoutActive(true);
                setAutoCashout(parseFloat(state.userBet.autoCashout.targetValue || '1.5'));
              } else if (state.userBet && state.userBet.autoCashout === false) {
                setAutoCashoutActive(false);
              }
              
              if (currentPhase === 'crashed' && normalized.currentMultiplier > 1.0) {
                const multiplier = normalized.currentMultiplier;
                const roundNumber = normalized.currentRoundNumber;
                
                setLastRounds(prev => {
                  const existingRound = prev.find(round => round.roundNumber === roundNumber);
                  if (existingRound) {
                    return prev;
                  }
                  return [
                    { multiplier, roundNumber },
                    ...prev.slice(0, 19)
                  ];
                });
              }
              
              // Only update bet amount if we haven't processed a cashout
              if (!betProcessed && normalized.userBet?.status !== 'cashed_out') {
                if (betAmountCandidate && Number(betAmountCandidate) > 0 && currentPhase !== 'crashed' && currentPhase !== 'waiting') {
                  setCurrentBetAmount(prev => {
                    const newAmount = Number(betAmountCandidate);
                    return prev !== newAmount ? newAmount : prev;
                  });
                } else if (currentPhase === 'crashed' || currentPhase === 'waiting') {
                  setCurrentBetAmount(0);
                  setBetProcessed(true);
                }
              }
              break;
            case 'round_complete':
              if (message.roundNumber && message.crashPoint) {
                setLastRounds(prev => [
                  { multiplier: message.crashPoint, roundNumber: message.roundNumber },
                  ...prev.slice(0, 19) // Keep only last 20 rounds
                ]);
              }
              
              // Balance already updated immediately in handleCashout/handleAutoCashout
              break;
            case 'crash_final_value':
              const crashPoint = parseFloat(message.crashPoint);
              setCrashState(prevState => ({
                ...prevState,
                currentMultiplier: crashPoint,
                phase: 'crashed'
              }));
              
              if (message.crashPoint && message.roundNumber) {
                const multiplier = parseFloat(message.crashPoint);
                const roundNumber = message.roundNumber;
                
                setLastRounds(prev => {
                  const existingRound = prev.find(round => round.roundNumber === roundNumber);
                  if (existingRound) {
                    return prev;
                  }
                  // Add new round to beginning and keep most recent 20
                  const newRounds = [
                    { multiplier, roundNumber },
                    ...prev
                  ];
                  return newRounds.slice(0, 20);
                });
              }
              
              if (currentBetAmount > 0 && !betProcessed) {
                setCurrentBetAmount(0);
                setBetProcessed(true);
              }
              setBetProcessed(true);
              break;
            case 'game_config_update':
              if (message.config) {
                setGameConfig(prev => ({
                  ...prev,
                  ...message.config
                }));
              }
              break;
            case 'error':
              const errorMsg = message.message || '';
              if (!errorMsg.toLowerCase().includes('pong') && !errorMsg.toLowerCase().includes('ping')) {
                addNotification(message.message || 'An error occurred', 'error');
              }
              break;
          }
        },
        onError: (error) => {
          const errorMessage = error?.toString() || '';
          if (!errorMessage.toLowerCase().includes('pong') && !errorMessage.toLowerCase().includes('ping')) {
            setIsConnected(false);
            addNotification('Connection lost. Attempting to reconnect...', 'warning');
          }
        }
      });

      if (wasAlreadyConnected) {
        setIsConnected(true);
        websocketService.joinGame('crash', session.access_token);
      }

      return () => {
        websocketService.leaveGame();
        soundSystem.stopAll();
      };
    }
  }, [user, session?.access_token, loading]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!isConnected) return;

    const handleMessage = (message: any) => {
      // Explicitly filter out ping/pong messages to prevent notifications
      if (message.type === 'ping' || message.type === 'pong' || 
          (message.type && message.type.toLowerCase().includes('pong'))) {
        return;
      }

      switch (message.type) {
        case 'game_state_update':
          if (message.phase) {
            setCrashState(prev => ({
              ...prev,
              phase: message.phase,
              phaseStartTime: Date.now()
            }));
            
            // Reset bet processed flag when entering betting phase
            if (message.phase === 'betting') {
              setBetProcessed(false);
              setCurrentBetAmount(0);
            }
          }
          
          if (message.currentMultiplier !== undefined) {
            setCrashState(prev => ({
              ...prev,
              currentMultiplier: message.currentMultiplier
            }));
          }
          
          if (message.currentRoundNumber !== undefined) {
            setCrashState(prev => ({
              ...prev,
              currentRoundNumber: message.currentRoundNumber
            }));
            setLastRoundNumber(message.currentRoundNumber);
          }
          
          if (message.activePlayersCount !== undefined) {
            setCrashState(prev => ({
              ...prev,
              activePlayersCount: message.activePlayersCount
            }));
          }
          
          if (message.totalBetAmount !== undefined) {
            setCrashState(prev => ({
              ...prev,
              totalBetAmount: message.totalBetAmount
            }));
          }
          
          if (message.currentCrashPoint !== undefined) {
            setCrashState(prev => ({
              ...prev,
              currentCrashPoint: message.currentCrashPoint
            }));
          }
          
          if (message.gameHash) {
            setCrashState(prev => ({
              ...prev,
              gameHash: message.gameHash
            }));
          }
          
          if (message.serverSeedHash) {
            setCrashState(prev => ({
              ...prev,
              serverSeedHash: message.serverSeedHash
            }));
          }
          
          if (message.clientSeed) {
            setCrashState(prev => ({
              ...prev,
              clientSeed: message.clientSeed
            }));
          }
          
          if (message.nonce) {
            setCrashState(prev => ({
              ...prev,
              nonce: message.nonce
            }));
          }
          
          // Only refresh balance if there's a bet amount change
          if (message.betAmount !== undefined) {
            // Balance already updated immediately in placeBet
          }
          break;
          
        case 'cashout_confirmed':
          if (message.success) {
            addNotification(`Cashout successful! Multiplier: ${message.multiplier}x`, 'success');
            setCurrentBetAmount(0);
            // Balance already updated immediately in handleCashout
          } else {
            addNotification(message.error || 'Failed to cashout', 'error');
          }
          break;
          
        case 'game_crashed':
          if (message.crashPoint !== undefined) {
            setCrashState(prev => ({
              ...prev,
              currentCrashPoint: message.crashPoint
            }));
          }
          
          // Add to last rounds
          if (message.roundNumber && message.crashPoint) {
            setLastRounds(prev => [
              { multiplier: message.crashPoint, roundNumber: message.roundNumber },
              ...prev.slice(0, 19) // Keep only last 20 rounds
            ]);
          }
          
          // Reset game state
          setCurrentBetAmount(0);
          setBetProcessed(false);
          
          // Balance already updated immediately in handleCashout/handleAutoCashout
          break;
          
        case 'user_specific_update':
          if (userProfile && String(message.userData.id) === String(userProfile.id)) {
            // Handle user-specific updates
            if (message.cashoutAmount) {
              // Balance already updated immediately in handleCashout
            }
            setCurrentBetAmount(0);
          }
          break;
          
        case 'auto_cashout_triggered':
          if (userProfile && String(message.userData.id) === String(userProfile.id)) {
            // Handle auto-cashout updates
            if (message.cashoutAmount) {
              // Balance already updated immediately in handleAutoCashout
            }
            setCurrentBetAmount(0);
          }
          break;
          
        case 'round_complete':
          if (message.roundNumber && message.crashPoint) {
            setLastRounds(prev => [
              { multiplier: message.crashPoint, roundNumber: message.roundNumber },
              ...prev.slice(0, 19) // Keep only last 20 rounds
            ]);
          }
          
          // Balance already updated immediately in handleCashout/handleAutoCashout
          break;
          
        case 'error':
          addNotification(message.message || 'An error occurred', 'error');
          break;
          
        default:
          // Handle other message types if needed
          break;
      }
    };

    // Add message handler to WebSocket service
    websocketService.addMessageHandler(handleMessage);

    return () => {
      websocketService.removeMessageHandler(handleMessage);
    };
  }, [isConnected, userProfile, bet, refreshBalance]);

  // Event handlers

  const placeBet = () => {
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

    if (bet > balance) {
      addNotification('Insufficient balance for this bet', 'error');
      return;
    }

    if (bet < gameConfig.betLimits.min || bet > gameConfig.betLimits.max) {
      addNotification(`Bet must be between ${gameConfig.betLimits.min} and ${gameConfig.betLimits.max} GC`, 'error');
      return;
    }

    try {
      websocketService.placeBet(bet);
      setBetProcessed(true);
      addNotification('Bet placed successfully!', 'success');
      
      // IMMEDIATE updates like Hi-Lo - no delays
      setCurrentBetAmount(bet);
      setBetProcessed(false);
      
      // Refresh balance immediately after placing bet
      refreshBalance();
    } catch (error) {
      console.error('Error placing bet:', error);
      addNotification('Failed to place bet', 'error');
    }
  };

  const handleCashout = () => {
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
      websocketService.sendGameAction('cashout');
      addNotification('Cashout requested!', 'success');
      
      // IMMEDIATE updates like Hi-Lo - no delays
      setCurrentBetAmount(0);
      setBetProcessed(true);
      
      // Refresh balance immediately after cashout
      refreshBalance();
    } catch (error) {
      console.error('Error requesting cashout:', error);
      addNotification('Failed to request cashout', 'error');
    }
  };

  const handleAutoCashout = () => {
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
      
      // IMMEDIATE updates like Hi-Lo - no delays
      setCurrentBetAmount(0);
      setBetProcessed(true);
      
      // Refresh balance immediately after auto-cashout
      refreshBalance();
    } catch (error) {
      console.error('Error setting auto-cashout:', error);
      addNotification('Failed to set auto-cashout', 'error');
    }
  };

  const handleGameAction = (action: string) => {
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
        // Refresh balance after setting auto-cashout
        refreshBalance();
      } else {
        websocketService.sendGameAction('auto_cashout', { targetMultiplier: 0 });
        if (typeof window !== 'undefined') {
          localStorage.setItem('crash_auto_cashout_active', 'false');
        }
        // Refresh balance after disabling auto-cashout
        refreshBalance();
      }
    } else if (action === 'cashout') {
      if (crashState.phase !== 'playing') {
        addNotification('Cashout is only available during the playing phase', 'error');
        return;
      }
      websocketService.sendGameAction('cashout');
      // Refresh balance after cashout action
      refreshBalance();
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
                  balance={balance}
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