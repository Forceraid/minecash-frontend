import { useState } from 'react';
import soundSystem from '../lib/sound-system';

export function useCrashNotifications(soundEnabled: boolean) {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'error' | 'success' | 'warning';
  }>>([]);

  // Notification helpers
  const addNotification = (message: string, type: 'error' | 'success' | 'warning') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    
    if (soundEnabled) {
      soundSystem.play('notification');
    }
    
    setTimeout(() => {
      removeNotification(id);
    }, 2000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    addNotification,
    removeNotification
  };
}
