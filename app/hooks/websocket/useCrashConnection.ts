import { useEffect } from 'react';
import { websocketService } from '../../lib/websocket';
import soundSystem from '../../lib/sound-system';

interface CrashConnectionParams {
  user: any;
  session: any;
  loading: boolean;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  setGameState: (state: string) => void;
  setCrashState: (state: any) => void;
  addNotification: (message: string, type: 'error' | 'success' | 'warning') => void;
  animationFrameId: number | null;
}

export function useCrashConnection({
  user,
  session,
  loading,
  isConnected,
  setIsConnected,
  setGameState,
  setCrashState,
  addNotification,
  animationFrameId
}: CrashConnectionParams) {

  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      // Clean up WebSocket
      websocketService.leaveGame();
      websocketService.disconnect();
      websocketService.resetGamemodeTracking();
      
      // Clean up animations
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Stop all sounds
      soundSystem.stopAll();
      
      // Reset state
      setIsConnected(false);
      setGameState('waiting');
      setCrashState((prev: any) => ({
        ...prev,
        phase: 'betting',
        currentMultiplier: 1.0
      }));
    };
  }, []);

  // Main WebSocket connection
  useEffect(() => {
    if (user && session?.access_token && !loading) {
      const wasAlreadyConnected = websocketService.isConnected();
      
      websocketService.connect({
        onConnect: () => {
          setIsConnected(true);
          websocketService.joinGame('crash', session.access_token);
        },
        onDisconnect: () => {
          setIsConnected(false);
        },
        onMessage: () => {
          // Message handling is done in the main orchestrator hook
        },
        onError: (error: any) => {
          const errorMessage = error?.toString() || '';
          if (!errorMessage.toLowerCase().includes('pong') && !errorMessage.toLowerCase().includes('ping')) {
            setIsConnected(false);
            addNotification('Connection lost. Attempting to reconnect...', 'warning');
          }
        }
      });

      if (wasAlreadyConnected) {
        setIsConnected(true);
        websocketService.joinGame('crash', session.access_token);
      }

      return () => {
        websocketService.leaveGame();
        soundSystem.stopAll();
      };
    }
  }, [user, session?.access_token, loading]);


}
