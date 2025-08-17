import soundSystem from '../../lib/sound-system';

interface CrashBettingParams {
  setCurrentBetAmount: (amount: number | ((prev: number) => number)) => void;
  setBetProcessed: (processed: boolean) => void;
  addNotification: (message: string, type: 'error' | 'success' | 'warning') => void;
  soundEnabledRef: { current: boolean };
}

export function useCrashBetting({
  setCurrentBetAmount,
  setBetProcessed,
  addNotification,
  soundEnabledRef
}: CrashBettingParams) {

  const handleBettingMessages = (message: any) => {
    switch (message.type) {
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
    }
  };

  return {
    handleBettingMessages
  };
}
