import { useState, useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'error' | 'success' | 'warning';
  duration?: number;
  onClose?: () => void;
}

export function Notification({ message, type, duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 border-red-500';
      case 'success':
        return 'bg-green-600 border-green-500';
      case 'warning':
        return 'bg-yellow-600 border-yellow-500';
      default:
        return 'bg-gray-600 border-gray-500';
    }
  };

  return (
    <div className={`fixed top-24 sm:top-20 md:top-28 right-4 z-[9999] p-4 rounded-lg border-2 text-white shadow-lg max-w-sm ${getTypeStyles()}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-semibold">
            {type === 'error' && 'Error'}
            {type === 'success' && 'Success'}
            {type === 'warning' && 'Warning'}
          </div>
          <div className="text-sm mt-1">{message}</div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="ml-4 text-white hover:text-gray-200 cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface NotificationManagerProps {
  notifications: Array<{
    id: string;
    message: string;
    type: 'error' | 'success' | 'warning';
  }>;
  onRemove: (id: string) => void;
}

export function NotificationManager({ notifications, onRemove }: NotificationManagerProps) {
  return (
    <div className="fixed top-24 sm:top-20 md:top-28 right-4 z-[9999] space-y-2">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.message.includes('phase') || notification.message.includes('betting') || notification.message.includes('Cannot bet') ? 1000 : 5000}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
} 