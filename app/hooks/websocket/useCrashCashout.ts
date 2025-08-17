import soundSystem from '../../lib/sound-system';

interface CrashCashoutParams {
  userProfile: any;
  setCurrentBetAmount: (amount: number | ((prev: number) => number)) => void;
  setBetProcessed: (processed: boolean) => void;
  setAutoCashoutActive: (active: boolean) => void;
  setAutoCashout: (value: number) => void;
  addNotification: (message: string, type: 'error' | 'success' | 'warning') => void;
  soundEnabledRef: { current: boolean };
  refreshBalance: () => void;
  handleBalanceUpdate: (newBalance: number) => Promise<void>;
  crashState: any;
}

export function useCrashCashout({
  userProfile,
  setCurrentBetAmount,
  setBetProcessed,
  setAutoCashoutActive,
  setAutoCashout,
  addNotification,
  soundEnabledRef,
  refreshBalance,
  handleBalanceUpdate,
  crashState
}: CrashCashoutParams) {

  const handleCashoutMessages = async (message: any) => {
    switch (message.type) {
      case 'cashout_success':
        addNotification(`Success: cashed out at ${message.cashoutMultiplier || message.cashoutValue}x`, 'success');
        if (soundEnabledRef.current) {
          soundSystem.play('cashout_success');
        }
        // Server confirms the cashout - sync balance if provided
        if (message.newBalance !== undefined) {
          await handleBalanceUpdate(message.newBalance);
        }
        setCurrentBetAmount(0);
        setBetProcessed(true);
        break;
      case 'cashout_failed':
        addNotification(message.message || 'Cashout failed', 'error');
        if (soundEnabledRef.current) {
          soundSystem.play('cashout_failed');
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
            // Server confirms auto-cashout - balance was already updated immediately
            setCurrentBetAmount(0);
            setBetProcessed(true);
            setAutoCashoutActive(false);
          }
        }
        break;
      case 'auto_cashout_triggered':
        // Auto-cashout notification sent directly to the user
        // Show success notification with cashout details
        addNotification(`Auto cashed out at ${message.cashoutMultiplier}x! Won $${message.cashoutAmount}`, 'success');
        if (soundEnabledRef.current) {
          soundSystem.play('cashout_success');
        }
        
        // Update balance with authoritative server value
        if (message.newBalance !== undefined) {
          await handleBalanceUpdate(message.newBalance);
        }
        
        // Reset bet state
        setCurrentBetAmount(0);
        setBetProcessed(true);
        setAutoCashoutActive(false);
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
    }
  };

  return {
    handleCashoutMessages
  };
}
