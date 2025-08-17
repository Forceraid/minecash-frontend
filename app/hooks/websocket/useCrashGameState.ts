import soundSystem from '../../lib/sound-system';

interface CrashGameStateParams {
  userProfile: any;
  betProcessed: boolean;
  setBetProcessed: (processed: boolean) => void;
  lastRoundNumber: number;
  setLastRoundNumber: (roundNumber: number) => void;
  setCurrentBetAmount: (amount: number | ((prev: number) => number)) => void;
  setCrashState: (state: any) => void;
  setGameState: (state: string) => void;
  setLastWebSocketUpdate: (timestamp: number) => void;
  setAutoCashoutActive: (active: boolean) => void;
  setAutoCashout: (value: number) => void;
  setLastRounds: (rounds: any) => void;
  addNotification: (message: string, type: 'error' | 'success' | 'warning') => void;
  soundEnabledRef: { current: boolean };
  lastAutoNotifyAtRef: { current: number };
  refreshBalance: () => void;
  handleBalanceUpdate: (newBalance: number) => Promise<void>;
  setGameConfig: (config: any) => void;
}

export function useCrashGameState({
  userProfile,
  betProcessed,
  setBetProcessed,
  lastRoundNumber,
  setLastRoundNumber,
  setCurrentBetAmount,
  setCrashState,
  setGameState,
  setLastWebSocketUpdate,
  setAutoCashoutActive,
  setAutoCashout,
  setLastRounds,
  addNotification,
  soundEnabledRef,
  lastAutoNotifyAtRef,
  refreshBalance,
  handleBalanceUpdate,
  setGameConfig
}: CrashGameStateParams) {

  const handleGameStateMessages = (message: any) => {
    switch (message.type) {
      case 'user_specific_message':
        if (userProfile && String(message.targetUserId) === String(userProfile.id)) {
          const specificMessage = message.message;
          
          if (specificMessage.type === 'auto_cashout_triggered') {
            // Auto-cashout handled by dedicated handler in useCrashCashout
            // Only handle state updates here
            setCurrentBetAmount(0);
            setBetProcessed(true);
            // Don't disable auto-cashout - let it persist for next round
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
          userBet: null // Don't include userBet from global messages
        };

        // Always update global game state (phase, multiplier, etc.)
        if (normalized.currentRoundNumber !== lastRoundNumber) {
          setBetProcessed(false);
          setLastRoundNumber(normalized.currentRoundNumber);
        }
        
        setCrashState(normalized);
        setGameState(normalized.phase);
        setLastWebSocketUpdate(Date.now());
        
        // Only process user-specific data if this message has gamemode field (user-specific)
        if (message.gamemode === 'crash' && state.userBet) {
          // This is a user-specific message with userBet data
          const userBet = state.userBet;
          
          // Update crash state with user bet data
          setCrashState((prev: any) => ({
            ...prev,
            userBet: userBet
          }));
          
          // Handle auto-cashout state update (no notification - handled by dedicated auto_cashout_triggered handler)
          if (userBet && userBet.status === 'cashed_out') {
            // Reset bet state but keep auto cashout enabled
            setCurrentBetAmount(0);
            setBetProcessed(true);
          }
          
          const betAmountCandidate = userBet?.amount ?? 0;
          const currentPhase = normalized.phase;
          
          if (userBet && userBet.autoCashout) {
            setAutoCashoutActive(true);
            setAutoCashout(parseFloat(userBet.autoCashout.targetValue || '1.5'));
          } else if (userBet && userBet.autoCashout === false) {
            setAutoCashoutActive(false);
          }
          
          // Only update bet amount if we haven't processed a cashout
          if (!betProcessed && userBet?.status !== 'cashed_out') {
            if (betAmountCandidate && Number(betAmountCandidate) > 0 && currentPhase !== 'crashed' && currentPhase !== 'waiting') {
              setCurrentBetAmount((prev: number) => {
                const newAmount = Number(betAmountCandidate);
                return prev !== newAmount ? newAmount : prev;
              });
            } else if (currentPhase === 'crashed' || currentPhase === 'waiting') {
              setCurrentBetAmount(0);
              setBetProcessed(true);
            }
          }
        }
        
        // Handle global round completion for last rounds display
        const currentPhase = normalized.phase;
        if (currentPhase === 'crashed' && normalized.currentMultiplier > 1.0) {
          const multiplier = normalized.currentMultiplier;
          const roundNumber = normalized.currentRoundNumber;
          
          setLastRounds((prev: any) => {
            const existingRound = prev.find((round: any) => round.roundNumber === roundNumber);
            if (existingRound) {
              return prev;
            }
            return [
              { multiplier, roundNumber },
              ...prev.slice(0, 19)
            ];
          });
        }
        break;

      case 'game_config_update':
        if (message.config) {
          setGameConfig((prev: any) => ({
            ...prev,
            ...message.config
          }));
        }
        break;
    }
  };

  return {
    handleGameStateMessages: handleGameStateMessages
  };
}
