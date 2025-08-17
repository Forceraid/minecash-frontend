import soundSystem from '../../lib/sound-system';

interface CrashBettingParams {
  setCurrentBetAmount: (amount: number | ((prev: number) => number)) => void;
  setBetProcessed: (processed: boolean) => void;
  addNotification: (message: string, type: 'error' | 'success' | 'warning') => void;
  soundEnabledRef: { current: boolean };
  handleBalanceUpdate: (newBalance: number) => Promise<void>;
}

export function useCrashBetting({
  setCurrentBetAmount,
  setBetProcessed,
  addNotification,
  soundEnabledRef,
  handleBalanceUpdate
}: CrashBettingParams) {

  const handleBettingMessages = async (message: any) => {
    switch (message.type) {
      case 'bet_success':
      case 'bet_confirmed':
      case 'crash_bet_confirmed':
        if (message.amount) {
          setCurrentBetAmount(Number(message.amount));
          setBetProcessed(false);
        }
        // Update balance with authoritative server value
        if (message.result?.newBalance !== undefined) {
          await handleBalanceUpdate(message.result.newBalance);
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
