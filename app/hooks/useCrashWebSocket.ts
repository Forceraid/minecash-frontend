import { useEffect } from 'react';
import { websocketService } from '../lib/websocket';
import { useCrashConnection } from './websocket/useCrashConnection';
import { useCrashBetting } from './websocket/useCrashBetting';
import { useCrashCashout } from './websocket/useCrashCashout';
import { useCrashGameState } from './websocket/useCrashGameState';
import { useCrashRounds } from './websocket/useCrashRounds';

interface CrashWebSocketParams {
  user: any;
  session: any;
  loading: boolean;
  userProfile: any;
  bet: number;
  refreshBalance: () => void;
  handleBalanceUpdate: (newBalance: number) => Promise<void>;
  updateLocalBalance: (amount: number) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  setGameState: (state: string) => void;
  crashState: any;
  setCrashState: (state: any) => void;
  setLastWebSocketUpdate: (timestamp: number) => void;
  betProcessed: boolean;
  setBetProcessed: (processed: boolean) => void;
  lastRoundNumber: number;
  setLastRoundNumber: (roundNumber: number) => void;
  setCurrentBetAmount: (amount: number | ((prev: number) => number)) => void;
  setLastRounds: (rounds: any) => void;
  setAutoCashoutActive: (active: boolean) => void;
  setAutoCashout: (value: number) => void;
  addNotification: (message: string, type: 'error' | 'success' | 'warning') => void;
  soundEnabledRef: { current: boolean };
  lastAutoNotifyAtRef: { current: number };
  animationFrameId: number | null;
  setGameConfig: (config: any) => void;
}

export function useCrashWebSocket(params: CrashWebSocketParams) {
  // Initialize all category message handlers
  const { handleBettingMessages } = useCrashBetting({
    setCurrentBetAmount: params.setCurrentBetAmount,
    setBetProcessed: params.setBetProcessed,
    addNotification: params.addNotification,
    soundEnabledRef: params.soundEnabledRef,
    handleBalanceUpdate: params.handleBalanceUpdate,
    updateLocalBalance: params.updateLocalBalance,
    bet: params.bet,
    userProfile: params.userProfile
  });

  const { handleCashoutMessages } = useCrashCashout({
    userProfile: params.userProfile,
    setCurrentBetAmount: params.setCurrentBetAmount,
    setBetProcessed: params.setBetProcessed,
    setAutoCashoutActive: params.setAutoCashoutActive,
    setAutoCashout: params.setAutoCashout,
    addNotification: params.addNotification,
    soundEnabledRef: params.soundEnabledRef,
    refreshBalance: params.refreshBalance,
    handleBalanceUpdate: params.handleBalanceUpdate,
    crashState: params.crashState
  });

  const { handleGameStateMessages } = useCrashGameState({
    userProfile: params.userProfile,
    betProcessed: params.betProcessed,
    setBetProcessed: params.setBetProcessed,
    lastRoundNumber: params.lastRoundNumber,
    setLastRoundNumber: params.setLastRoundNumber,
    setCurrentBetAmount: params.setCurrentBetAmount,
    setCrashState: params.setCrashState,
    setGameState: params.setGameState,
    setLastWebSocketUpdate: params.setLastWebSocketUpdate,
    setAutoCashoutActive: params.setAutoCashoutActive,
    setAutoCashout: params.setAutoCashout,
    setLastRounds: params.setLastRounds,
    addNotification: params.addNotification,
    soundEnabledRef: params.soundEnabledRef,
    lastAutoNotifyAtRef: params.lastAutoNotifyAtRef,
    refreshBalance: params.refreshBalance,
    handleBalanceUpdate: params.handleBalanceUpdate,
    setGameConfig: params.setGameConfig
  });

  const { handleRoundMessages } = useCrashRounds({
    setCurrentBetAmount: params.setCurrentBetAmount,
    setBetProcessed: params.setBetProcessed,
    setCrashState: params.setCrashState,
    setLastRounds: params.setLastRounds,
    betProcessed: params.betProcessed
  });

  // Connection management with integrated message handling
  useCrashConnection({
    user: params.user,
    session: params.session,
    loading: params.loading,
    isConnected: params.isConnected,
    setIsConnected: params.setIsConnected,
    setGameState: params.setGameState,
    setCrashState: params.setCrashState,
    addNotification: params.addNotification,
    animationFrameId: params.animationFrameId
  });

  // Handle WebSocket messages by routing to appropriate category handlers
  useEffect(() => {
    if (!params.isConnected) return;

    const handleMessage = async (message: any) => {
      // Filter out ping/pong messages
      if (message.type === 'ping' || message.type === 'pong' || 
          (message.type && message.type.toLowerCase().includes('pong'))) {
        return;
      }

      // Check if this is a user-specific message (has gamemode field from sendToUser)
      const isUserSpecific = message.gamemode === 'crash';
      
      // Route messages to appropriate handlers
      // User-specific messages (bet confirmations, balance updates, personal notifications)
      if (isUserSpecific) {
        await handleBettingMessages(message);
        await handleCashoutMessages(message);
        handleGameStateMessages(message);
      } else {
        // Global messages (phase updates, multiplier changes, round completion)
        // Only update global game state, not user-specific state
        if (message.type === 'crash_state_update' || message.type === 'game_state_update') {
          handleGameStateMessages(message);
        }
        if (message.type === 'crash_final_value' || message.type === 'round_complete') {
          handleRoundMessages(message);
        }
      }
      
      // Handle connection messages directly (always process these)
      switch (message.type) {
        case 'joined_game':
          break;
        case 'join_game_error':
          params.addNotification('Failed to join game room. Please refresh the page.', 'error');
          break;
        case 'error':
          const errorMsg = message.message || '';
          if (!errorMsg.toLowerCase().includes('pong') && !errorMsg.toLowerCase().includes('ping')) {
            params.addNotification(message.message || 'An error occurred', 'error');
          }
          break;
      }
    };

    websocketService.addMessageHandler(handleMessage);

    return () => {
      websocketService.removeMessageHandler(handleMessage);
    };
  }, [params.isConnected, params.userProfile, params.bet, params.refreshBalance]);
}
