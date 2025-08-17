import { useState, useEffect } from 'react';

export function useCrashSettings() {
  // UI Settings with localStorage persistence
  const [bet, setBet] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_bet_amount');
      return saved ? parseFloat(saved) : 10;
    }
    return 10;
  });
  
  const [betInput, setBetInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_bet_amount');
      return saved ? saved : "10";
    }
    return "10";
  });
  
  const [autoCashout, setAutoCashout] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_auto_cashout_value');
      return saved ? parseFloat(saved) : 1.5;
    }
    return 1.5;
  });
  
  const [autoCashoutActive, setAutoCashoutActive] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_auto_cashout_active');
      return saved === 'true';
    }
    return false;
  });
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  
  const [soundVolume, setSoundVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crash_sound_volume');
      return saved ? parseFloat(saved) : 0.7;
    }
    return 0.7;
  });

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crash_bet_amount', bet.toString());
    }
  }, [bet]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crash_auto_cashout_value', autoCashout.toString());
    }
  }, [autoCashout]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crash_auto_cashout_active', autoCashoutActive.toString());
    }
  }, [autoCashoutActive]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crash_sound_enabled', soundEnabled.toString());
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crash_sound_volume', soundVolume.toString());
    }
  }, [soundVolume]);

  useEffect(() => {
    setBetInput(bet.toString());
  }, [bet]);

  // Event handlers
  const handleBetInputChange = (value: string) => {
    setBetInput(value);
    const numValue = parseInt(value) || 0;
    if (numValue > 0) {
      setBet(numValue);
    }
  };

  const updateBet = (newBet: number) => {
    setBet(newBet);
    setBetInput(newBet.toString());
  };

  return {
    // Bet state
    bet,
    betInput,
    setBet,
    setBetInput,
    handleBetInputChange,
    updateBet,
    
    // Auto cashout state
    autoCashout,
    autoCashoutActive,
    setAutoCashout,
    setAutoCashoutActive,
    
    // Sound state
    soundEnabled,
    soundVolume,
    setSoundEnabled,
    setSoundVolume
  };
}
