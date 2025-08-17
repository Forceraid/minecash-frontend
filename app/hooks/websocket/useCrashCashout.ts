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
}

export function useCrashCashout({
  userProfile,
  setCurrentBetAmount,
  setBetProcessed,
  setAutoCashoutActive,
  setAutoCashout,
  addNotification,
  soundEnabledRef,
  refreshBalance
}: CrashCashoutParams) {

  const handleCashoutMessages = (message: any) => {
    switch (message.type) {
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
            // Only handle state updates, no notifications
            // Balance already updated immediately in handleAutoCashout
            // Balance already refreshed immediately in handleAutoCashout
            setCurrentBetAmount(0);
            setBetProcessed(true);
            setAutoCashoutActive(false);
          }
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
