import soundSystem from '../../lib/sound-system';

interface CrashBettingParams {
  setCurrentBetAmount: (amount: number | ((prev: number) => number)) => void;
  setBetProcessed: (processed: boolean) => void;
  addNotification: (message: string, type: 'error' | 'success' | 'warning') => void;
  soundEnabledRef: { current: boolean };
  handleBalanceUpdate: (newBalance: number) => Promise<void>;
  updateLocalBalance: (amount: number) => void;
  bet: number;
  userProfile: any;
}

export function useCrashBetting({
  setCurrentBetAmount,
  setBetProcessed,
  addNotification,
  soundEnabledRef,
  handleBalanceUpdate,
  updateLocalBalance,
  bet,
  userProfile
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
        // Revert the optimistic UI updates when bet fails
        updateLocalBalance(bet); // Add back the bet amount to local balance
        setCurrentBetAmount(0);  // Reset current bet amount
        setBetProcessed(false);  // Reset bet processed state
        
        // Update with server balance if provided
        if (message.newBalance !== undefined) {
          await handleBalanceUpdate(message.newBalance);
        }
        break;

      case 'auto_cashout_success':
        addNotification(`Auto-cashout set to ${message.targetMultiplier}x`, 'success');
        if (soundEnabledRef.current) {
          soundSystem.play('bet_placed');
        }
        break;

      case 'auto_cashout_disabled':
        addNotification('Auto-cashout disabled', 'info');
        break;

      case 'auto_cashout_failed':
        addNotification(message.message || 'Failed to set auto-cashout', 'error');
        if (soundEnabledRef.current) {
          soundSystem.play('bet_failed');
        }
        break;
    }
  };

  return {
    handleBettingMessages
  };
}
