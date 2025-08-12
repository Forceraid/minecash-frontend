// WebSocket Client Service
// Purpose: Handle WebSocket connection to backend for real-time gaming

// Helper function to get API URL without trailing slash issues
const getApiUrl = (endpoint: string): string => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  // Remove trailing slash from base URL and add leading slash to endpoint if needed
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBaseUrl}${cleanEndpoint}`;
};

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketCallbacks {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: WebSocketCallbacks = {};
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private connectionCount = 0; // Track how many components are using the connection
  private lastJoinedGamemode: string | null = null; // Track last joined gamemode to prevent duplicates
  private keepAliveInterval: NodeJS.Timeout | null = null; // Keep-alive interval

  constructor() {
    const WS_DEBUG = false as const;
    // WebSocket server should use the same domain as the backend API
    // For Railway, use wss:// without port specification (defaults to 443)
    // For local development, use the same port as the API server
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 
      (import.meta.env.VITE_BACKEND_URL ? 
        getApiUrl('').replace('https://', 'wss://').replace('http://', 'ws://') : 
        'ws://127.0.0.1:3000'); // Changed from 8080 to 3000
    this.url = wsUrl;
  }

  connect(callbacks: WebSocketCallbacks = {}) {
    this.connectionCount++;

    // If already connected, just update callbacks (don't call onConnect again)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.callbacks = { ...this.callbacks, ...callbacks };
      return;
    }

    // If already connecting, just update callbacks
    if (this.isConnecting) {
      this.callbacks = { ...this.callbacks, ...callbacks };
      return;
    }

    this.isConnecting = true;
    this.callbacks = { ...this.callbacks, ...callbacks };

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('failed to create webSocket connection:', error);
      this.isConnecting = false;
      this.connectionCount = Math.max(0, this.connectionCount - 1);
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      // Debug only
      // console.log('webSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.startKeepAlive();
      
      // If we were previously in a gamemode, automatically rejoin
      if (this.lastJoinedGamemode) {
        // Small delay to ensure connection is stable
        setTimeout(() => {
          this.send({
            type: 'join_game',
            gamemode: this.lastJoinedGamemode
          });
        }, 100);
      }
      
      this.callbacks.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle ping/pong for keep-alive - don't log or process these messages
        if (message.type === 'ping') {
          this.send({ type: 'pong', timestamp: Date.now() });
          return;
        }
        
        // Explicitly filter out pong messages to prevent them from reaching handlers
        if (message.type === 'pong') {
          return;
        }
        
        // Additional safety check - don't process any message that looks like a pong
        if (message.type && message.type.toLowerCase().includes('pong')) {
          return;
        }
        
        // Raw WebSocket messages are logged only in debug mode
        
        // Call the main message callback
        this.callbacks.onMessage?.(message);
        
        // Call all registered message handlers
        this.messageHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('error in message handler:', error);
          }
        });
      } catch (error) {
        console.error('error parsing webSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.callbacks.onDisconnect?.();
      
      // Only attempt reconnect if components are still using the connection
      if (this.connectionCount > 0) {
        this.attemptReconnect();
      }
      // Note: Don't reset lastJoinedGamemode here - let it persist across reconnections
      // This allows us to automatically rejoin the same room when reconnecting
    };

    this.ws.onerror = (error) => {
      // Filter out pong-related errors to prevent error notifications
      const errorMessage = error?.toString() || '';
      if (errorMessage.toLowerCase().includes('pong') || errorMessage.toLowerCase().includes('ping')) {
        console.log('Blocked pong-related WebSocket error:', errorMessage);
        return;
      }
      
      console.error('webSocket error:', error);
      this.isConnecting = false;
      this.callbacks.onError?.(error);
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connect(this.callbacks);
    }, delay);
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Suppress warn to avoid console spam
    }
  }

  joinGame(gamemode: string, token?: string) {
    // Avoid spamming join messages
    if (this.lastJoinedGamemode === gamemode && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    this.lastJoinedGamemode = gamemode;
    this.send({ type: 'join_game', gamemode, token });
  }

  leaveGame() {
    // Send leave message to server to properly handle room leaving
    if (this.lastJoinedGamemode) {
      this.send({
        type: 'leave_game',
        gamemode: this.lastJoinedGamemode
      });
      this.lastJoinedGamemode = null;
    }
  }

  placeBet(amount: number, additionalData?: any) {
    this.send({
      type: 'place_bet',
      amount,
      ...additionalData
    });
  }

  sendGameAction(action: string, additionalData?: any) {
    this.send({
      type: 'game_action',
      action,
      ...additionalData
    });
  }

  sendChatMessage(message: string, gamemode: string) {
    this.send({
      type: 'chat_message',
      message,
      gamemode
    });
  }

  // Message handler management
  addMessageHandler(handler: MessageHandler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler: MessageHandler) {
    this.messageHandlers.delete(handler);
  }

  disconnect() {
    this.connectionCount = Math.max(0, this.connectionCount - 1);

    // Only actually disconnect when no components are using the connection
    if (this.connectionCount === 0) {
      this.stopKeepAlive();
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.callbacks = {};
      this.lastJoinedGamemode = null; // Reset gamemode tracking on full disconnect
    }
  }

  // Force disconnect (for debugging or admin purposes)
  forceDisconnect() {
    this.connectionCount = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks = {};
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  // Reset gamemode tracking (useful when switching between games)
  resetGamemodeTracking() {
    this.lastJoinedGamemode = null;
  }

  // Get current gamemode (for checking if already in a room)
  getCurrentGamemode(): string | null {
    return this.lastJoinedGamemode;
  }

  // Start client-side keep-alive
  private startKeepAlive() {
    // Clear any existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Send ping every 25 seconds to keep connection alive
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 25000); // 25 seconds (slightly less than server's 30 seconds)
  }

  // Stop keep-alive
  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Export the class for testing
export default WebSocketService; 