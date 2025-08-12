import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { websocketService } from '../lib/websocket';

// Helper function to safely construct API URLs
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  // Remove trailing slash if present to prevent double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

interface ChatMessage {
  id: string;
  username: string;
  avatar: string;
  message: string;
  gamemode: string;
  timestamp: number;
}

interface ChatSidebarProps {
  gamemode: string;
  messages?: ChatMessage[];
}

export function ChatSidebar({ gamemode, messages = [] }: ChatSidebarProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
  const [maxMessageLength, setMaxMessageLength] = useState(200); // Default fallback
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat settings
  useEffect(() => {
    const fetchChatSettings = async () => {
      try {
        const response = await fetch(getApiUrl('/chat-settings'));
        if (response.ok) {
          const data = await response.json();
          setMaxMessageLength(data.chatSettings?.maxMessageLength || 200);
        }
      } catch (error) {
        console.error('Failed to fetch chat settings:', error);
      }
    };
    
    fetchChatSettings();
  }, []);

  // Listen for incoming chat messages and history
  useEffect(() => {
    // Don't clear messages - we want persistent cross-gamemode chat
    
    const handleChatMessage = (data: any) => {
      if (data.type === 'chat_message') {
        // Accept messages from ALL casino gamemodes (cross-gamemode chat)
        const casinoGamemodes = ['blackjack', 'roulette', 'crash', 'slots', 'hi-lo'];
        if (casinoGamemodes.includes(data.gamemode)) {
          const newMessage: ChatMessage = {
            id: data.id || Date.now().toString(),
            username: data.username,
            avatar: data.avatar,
            message: data.message,
            gamemode: data.gamemode,
            timestamp: data.timestamp || Date.now()
          };
          
          setChatMessages(prev => {
            // Check if message already exists (prevent duplicates)
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            
            // Add new message and sort by timestamp
            const updated = [...prev, newMessage];
            return updated.sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      } else if (data.type === 'chat_history') {
        // Load chat history from all casino gamemodes
        if (data.messages) {
          const historyMessages: ChatMessage[] = data.messages.map((msg: any) => ({
            id: msg.id,
            username: msg.username,
            avatar: msg.avatar,
            message: msg.message,
            gamemode: msg.gamemode,
            timestamp: msg.timestamp
          }));
          
          // Only set history if we don't already have messages (avoid duplicates)
          setChatMessages(prev => {
            if (prev.length === 0) {
              return historyMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return prev;
          });
        }
      }
    };

    // Add message handler to WebSocket service
    websocketService.addMessageHandler(handleChatMessage);

    return () => {
      websocketService.removeMessageHandler(handleChatMessage);
    };
  }, [gamemode]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      // Send message via WebSocket
      websocketService.sendChatMessage(message, gamemode);
      setMessage("");
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed left-0 top-24 sm:top-20 md:top-28 z-40 h-[500px]">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/60 backdrop-blur-sm border border-yellow-500/20 rounded-r-lg p-3 text-yellow-400 hover:text-yellow-300 transition-all duration-300 hover:bg-black/80 cursor-pointer"
      >
        <div className="text-2xl">💬</div>
        {!isExpanded && (
          <div className="text-xs mt-1 text-white">Chat</div>
        )}
      </button>

      {/* Chat Sidebar */}
      <div className={`absolute left-0 top-0 bg-black/60 backdrop-blur-sm border border-yellow-500/20 rounded-r-lg transition-all duration-300 overflow-hidden ${
        isExpanded ? 'w-80 opacity-100' : 'w-0 opacity-0'
      }`}>
        <div className="w-80 h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <h3 className="text-white font-semibold text-lg">Live chat</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages - flex-grow to fill available space */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={msg.avatar} 
                        alt={msg.username}
                        className="w-8 h-8 rounded-full border border-gray-600 flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                        }}
                      />
                      <span className="text-yellow-400 font-semibold text-sm">{msg.username}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-xs">{formatTimestamp(msg.timestamp)}</span>
                      <span className="text-gray-500 text-xs bg-gray-700 px-2 py-1 rounded">
                        {msg.gamemode}
                      </span>
                    </div>
                  </div>
                  <p className="text-white text-sm break-words">{msg.message}</p>
                </div>
              ))
            )}
            {/* Auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input - fixed at bottom */}
          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <form onSubmit={handleSubmit} className="space-y-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxMessageLength))}
                placeholder={`Type your message... (max ${maxMessageLength} chars)`}
                maxLength={maxMessageLength}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
                disabled={!isExpanded || !user}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {message.length}/{maxMessageLength}
                </span>
                <button
                  type="submit"
                  disabled={!message.trim() || !isExpanded || !user}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 