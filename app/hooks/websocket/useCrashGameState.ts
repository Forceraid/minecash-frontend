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
        
        // Only update bet amount if we haven't processed a cashout
        if (!betProcessed && normalized.userBet?.status !== 'cashed_out') {
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
