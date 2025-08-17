interface CrashRoundsParams {
  setCurrentBetAmount: (amount: number | ((prev: number) => number)) => void;
  setBetProcessed: (processed: boolean) => void;
  setCrashState: (state: any) => void;
  setLastRounds: (rounds: any) => void;
  betProcessed: boolean;
}

export function useCrashRounds({
  setCurrentBetAmount,
  setBetProcessed,
  setCrashState,
  setLastRounds,
  betProcessed
}: CrashRoundsParams) {

  const handleRoundMessages = (message: any) => {
    switch (message.type) {
      case 'round_complete':
        if (message.roundNumber && message.crashPoint) {
          setLastRounds((prev: any) => [
            { multiplier: message.crashPoint, roundNumber: message.roundNumber },
            ...prev.slice(0, 19) // Keep only last 20 rounds
          ]);
        }
        
        // Balance already updated immediately in handleCashout/handleAutoCashout
        break;
      case 'crash_final_value':
        const crashPoint = parseFloat(message.crashPoint);
        setCrashState((prevState: any) => ({
          ...prevState,
          currentMultiplier: crashPoint,
          phase: 'crashed'
        }));
        
        if (message.crashPoint && message.roundNumber) {
          const multiplier = parseFloat(message.crashPoint);
          const roundNumber = message.roundNumber;
          
          setLastRounds((prev: any) => {
            const existingRound = prev.find((round: any) => round.roundNumber === roundNumber);
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
        
        if (setCurrentBetAmount && !betProcessed) {
          setCurrentBetAmount(0);
          setBetProcessed(true);
        }
        setBetProcessed(true);
        break;
      case 'game_crashed':
        if (message.crashPoint !== undefined) {
          setCrashState((prev: any) => ({
            ...prev,
            currentCrashPoint: message.crashPoint
          }));
        }
        
        // Add to last rounds
        if (message.roundNumber && message.crashPoint) {
          setLastRounds((prev: any) => [
            { multiplier: message.crashPoint, roundNumber: message.roundNumber },
            ...prev.slice(0, 19) // Keep only last 20 rounds
          ]);
        }
        
        // Reset game state
        setCurrentBetAmount(0);
        setBetProcessed(false);
        
        // Balance already updated immediately in handleCashout/handleAutoCashout
        break;
    }
  };

  return {
    handleRoundMessages
  };
}
