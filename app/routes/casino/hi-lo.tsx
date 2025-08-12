import type { Route } from "./+types/hi-lo";
import { useAuth } from "../../contexts/AuthContext";
import { useGCBalance } from "../../contexts/GCBalanceContext";
import { LightButton, GoldButton } from "../../components/Button";
import { ChatSidebar } from "../../components/ChatSidebar";
import { GamemodeAccessCheck } from "../../components/GamemodeAccessCheck";
import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import { NotificationManager } from "../../components/Notification";
import soundSystem from "../../lib/sound-system";

const getCardSymbol = (suit) => {
  switch(suit) {
    case 'HEARTS': return '♥️';
    case 'DIAMONDS': return '♦️';
    case 'CLUBS': return '♣️';
    case 'SPADES': return '♠️';
    default: return '';
  }
};
import { websocketService } from "../../lib/websocket";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hi-Lo - MINECASH" },
    { name: "description", content: "Guess if the next card is higher or lower. Build your streak for bigger wins!" },
  ];
}

function GameLiveView({ gameState, timeLeft }) {
  const { playerData } = gameState;
  const getCardColor = (suit) => {
    return ['HEARTS', 'DIAMONDS'].includes(suit) ? 'text-red-600' : 'text-black';
  };

  const getCardSymbol = (suit) => {
    switch(suit) {
      case 'HEARTS': return '♥️';
      case 'DIAMONDS': return '♦️';
      case 'CLUBS': return '♣️';
      case 'SPADES': return '♠️';
      default: return '';
    }
  };

  const renderCard = (card) => {
    if (!card) return (
      <div className="bg-gray-700 rounded-lg w-24 h-36 flex items-center justify-center border-2 border-gray-500">
        <div className="text-4xl">?</div>
      </div>
    );

    return (
      <div className="bg-white rounded-lg w-24 h-36 flex flex-col items-center justify-center border-2 border-yellow-400 shadow-lg">
        <div className={`text-4xl font-bold ${getCardColor(card.suit)}`}>
          {card.value}
        </div>
        <div className={`text-2xl ${getCardColor(card.suit)}`}>
          {getCardSymbol(card.suit)}
        </div>
      </div>
    );
  };

  const getPhaseMessage = () => {
    switch(gameState.phase) {
      case 'betting':
        return 'Will the next card be higher or lower?';
      case 'reveal':
        return playerData?.status === 'won' 
          ? `You won! Your streak is now ${playerData.streak}!` 
          : playerData?.status === 'lost'
          ? 'You lost! Your streak ended.'
          : 'Cards revealed!';
      case 'next_round':
        return 'Get ready for next round...';
      default:
        return 'Waiting for game to start...';
    }
  };

  return (
    <div className="w-full h-[500px] bg-[#F5F5F5] rounded-lg border-2 border-yellow-400 flex items-center justify-center">
      <div className="text-center text-black">
        <div className="text-6xl mb-4">🎲</div>
        <h3 className="text-2xl font-bold mb-4">Hi-Lo cards</h3>
        
        {/* Timer */}
        <div className="mb-4">
          <span className="text-lg font-bold">{Math.ceil(timeLeft / 1000)}s</span>
        </div>
        
        {/* Card Display */}
        <div className="flex justify-center space-x-4 mb-4">
          {/* Left slot - Current betting card */}
          <div className="w-24 h-36">
            {renderCard(gameState.currentCard)}
          </div>
          
          <div className="flex items-center">
            <div className="text-3xl">🆚</div>
          </div>

          {/* Right slot - Result card with fixed dimensions */}
          <div className="w-24 h-36">
            {/* Always render a card container, but only show result card during reveal/next_round */}
            {(gameState.phase === 'reveal' || gameState.phase === 'next_round') && gameState.resultCard
              ? renderCard(gameState.resultCard)
              : <div className="bg-gray-700 rounded-lg w-24 h-36 flex items-center justify-center border-2 border-gray-500 transition-opacity duration-300">
                  <div className="text-4xl">?</div>
                </div>
            }
          </div>
        </div>
        
        <p className="text-lg opacity-80">{getPhaseMessage()}</p>
      </div>
    </div>
  );
}

export default function HiLo() {
  const { user, loading, session } = useAuth();
  const gcBalance = useGCBalance();
  const { balance, refreshBalance } = gcBalance;
  
  // Local balance state for immediate UI updates
  const [localBalance, setLocalBalance] = useState(balance);
  
  // Sync local balance with server balance
  useEffect(() => {
    setLocalBalance(balance);
  }, [balance]);
  
  // Additional effect to ensure global balance stays in sync
  useEffect(() => {
    if (localBalance !== balance) {
      // If local balance differs from global, refresh global to sync
      refreshBalance();
    }
  }, [localBalance, balance, refreshBalance]);
  
  // Update local balance immediately for UI responsiveness
  const updateLocalBalance = (amount: number) => {
    setLocalBalance(prev => {
      const newBalance = Math.round((prev + amount) * 100) / 100;
      return newBalance;
    });
  };
  
  // Handle balance updates from server - now also updates global context
  const handleBalanceUpdate = async (newBalance: number) => {
    if (!user || !session?.access_token) {
      console.warn('Cannot update balance - user not authenticated');
      return;
    }
    // Update local balance immediately
    setLocalBalance(newBalance);
    // Also refresh from server to ensure consistency
    await refreshBalance();
  };
  const [bet, setBet] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hilo_bet_amount');
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });
  const [betInput, setBetInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hilo_bet_amount');
      return saved || "10";
    }
    return "10";
  });
  const [gameStatsExpanded, setGameStatsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hilo_game_stats_expanded');
      return saved === 'true';
    }
    return false;
  });
  const [multipliersExpanded, setMultipliersExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hilo_multipliers_expanded');
      return saved === 'true';
    }
    return false;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [gameConfig, setGameConfig] = useState({ betLimits: { min: 1, max: 1000 } });
  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hilo_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'error' | 'success' | 'warning'}>>([]);
  const soundEnabledRef = useRef(soundEnabled);
  
  // Track sound states to prevent multiple plays
  const soundPlayedRef = useRef<{
    win: boolean;
    lose: boolean;
    lastPhase: string;
    lastStatus: string;
  }>({
    win: false,
    lose: false,
    lastPhase: '',
    lastStatus: ''
  });

  // Game state
  const [gameState, setGameState] = useState({
    phase: 'waiting',
    phaseStartTime: Date.now(),
    phaseDuration: 0,
    cardsRemaining: 312, // 6 decks * 52 cards = 312 total
    bestStreak: 0,
    currentCard: null as any, // Card to bet on
    resultCard: null as any,  // Revealed card for all players
    playerData: null as {
      multiplier: number;
      streak: number;
      status: string;
      betAmount: number;
      choice: 'higher' | 'lower' | null;
    } | null
  });

  const [timeLeft, setTimeLeft] = useState(0);

  // Notification helpers
  const addNotification = (message: string, type: 'error' | 'success' | 'warning') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    
    // Add the notification
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Play sound if enabled
    if (soundEnabled && type !== 'success') {  // Don't play notification sound for success since we have win sound
      soundSystem.play('notification');
    }
    
    // Remove after 2 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 2000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Sound system setup
  useEffect(() => {
    soundSystem.setEnabled(soundEnabled);
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('hilo_sound_enabled', soundEnabled.toString());
  }, [soundEnabled]);

  // Persist bet amount to localStorage
  useEffect(() => {
    localStorage.setItem('hilo_bet_amount', bet.toString());
  }, [bet]);

  // Persist UI expansion states to localStorage
  useEffect(() => {
    localStorage.setItem('hilo_game_stats_expanded', gameStatsExpanded.toString());
  }, [gameStatsExpanded]);

  useEffect(() => {
    localStorage.setItem('hilo_multipliers_expanded', multipliersExpanded.toString());
  }, [multipliersExpanded]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - gameState.phaseStartTime;
      const remaining = Math.max(0, gameState.phaseDuration - elapsed);
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [gameState.phaseStartTime, gameState.phaseDuration]);

  // Connect to WebSocket when component mounts
  useEffect(() => {
    // Only proceed if user is fully loaded (not null and not loading)
    if (user && session?.access_token && !loading) {
      console.log('hiLo component setting up webSocket connection');
      
      // Check if already connected before setting up callbacks
      const wasAlreadyConnected = websocketService.isConnected();
      
      websocketService.connect({
        onConnect: () => {
          console.log('webSocket connected to hiLo game');
          setIsConnected(true);
          // Join the hi-lo room with authentication token
          websocketService.joinGame('hi-lo', session.access_token);
        },
        onDisconnect: () => {
          console.log('webSocket disconnected from hiLo game');
          setIsConnected(false);
        },
        onMessage: async (message) => {
          // Handle non-chat game messages only
          switch (message.type) {
            case 'joined_game':
              console.log('joined hiLo game');
              break;
            case 'game_state_update':
              const state = message.state;
              const prevPhase = gameState.phase;
              
              console.log('Game State Update:', {
                phase: state.phase,
                currentCard: state.currentCard,
                resultCard: state.resultCard,
                playerData: state.playerData,
                cardsRemaining: state.cardsRemaining
              });
              
              // Update game state atomically to prevent flickering
              setGameState(prevState => {
                // Keep existing cards during reveal and next_round phases
                const newState = {
                  ...prevState,
                  phase: state.phase,
                  phaseStartTime: state.phaseStartTime,
                  phaseDuration: state.phaseDuration,
                  bestStreak: state.bestStreak || prevState.bestStreak,
                  cardsRemaining: state.cardsRemaining ?? prevState.cardsRemaining,
                };

                // Keep existing player data if not provided in update
                if (state.playerData) {
                  newState.playerData = state.playerData;
                } else {
                  newState.playerData = prevState.playerData;
                }

                // Handle card updates based on phase
                if (state.phase === 'betting') {
                  // In betting phase, clear result card and update current card
                  newState.currentCard = state.currentCard;
                  newState.resultCard = null;
                  // Reset bet state when new betting phase starts
                  if (prevState.phase !== 'betting') {
                    newState.playerData = {
                      ...newState.playerData,
                      betAmount: null,
                      status: 'waiting',
                      choice: null
                    };
                  }
                } else if (state.phase === 'reveal' && state.resultCard) {
                  // In reveal phase, keep both cards if we have a result
                  newState.currentCard = state.currentCard || prevState.currentCard;
                  newState.resultCard = state.resultCard;
                } else if (state.phase === 'next_round') {
                  // In next_round phase, keep both cards visible
                  newState.currentCard = state.currentCard || prevState.currentCard;
                  newState.resultCard = state.resultCard || prevState.resultCard;
                  // Reset bet state for next round
                  newState.playerData = {
                    ...newState.playerData,
                    betAmount: null,
                    status: 'waiting',
                    choice: null
                  };
                }

                return newState;
              });
              
              // Handle notifications, sounds, and balance updates for player data updates
              if (state.playerData) {
                // Reset sound flags if player status changes (new game result)
                if (soundPlayedRef.current.lastStatus !== state.playerData.status) {
                  soundPlayedRef.current.win = false;
                  soundPlayedRef.current.lose = false;
                  soundPlayedRef.current.lastStatus = state.playerData.status;
                }
                
                // Update balance if provided - do this BEFORE state updates
                if (typeof state.playerData.newBalance === 'number') {
                  console.log('Updating balance from server:', state.playerData.newBalance);
                  // Update both local and global balance
                  await handleBalanceUpdate(state.playerData.newBalance);
                }

                // Play sounds and show notifications on phase changes
                if (prevPhase !== state.phase) {
                  // Reset sound flags when phase changes
                  if (state.phase === 'betting') {
                    soundPlayedRef.current.win = false;
                    soundPlayedRef.current.lose = false;
                  }
                  
                  if (state.phase === 'reveal') {
                    if (state.playerData.status === 'won' && !soundPlayedRef.current.win) {
                      soundSystem.play('win');
                      soundPlayedRef.current.win = true;
                      const winAmount = state.playerData.betAmount * state.playerData.multiplier;
                      const winMessage = `You won ${winAmount.toFixed(0)} GC! Streak: ${state.playerData.streak}`;
                      addNotification(winMessage, 'success');
                      
                      // Double check balance update on win
                      if (typeof state.playerData.newBalance === 'number') {
                        await handleBalanceUpdate(state.playerData.newBalance);
                      }
                    } else if (state.playerData.status === 'lost' && !soundPlayedRef.current.lose) {
                      soundSystem.play('lose');
                      soundPlayedRef.current.lose = true;
                      addNotification('You lost!', 'error');
                    }
                  }
                  
                  // Reset sound flags when moving to next round
                  if (state.phase === 'next_round') {
                    soundPlayedRef.current.win = false;
                    soundPlayedRef.current.lose = false;
                  }
                }
              }

              // Also check for balance updates in bet confirmation
              if (message.type === 'bet_confirmed' && !message.error) {
                if (state.playerData?.newBalance !== undefined) {
                  await handleBalanceUpdate(state.playerData.newBalance);
                }
              }
              break;
            case 'bet_confirmed':
              if (message.error) {
                // Handle specific error cases
                if (message.error === 'User already has an active bet') {
                  addNotification('You already have an active bet for this round', 'error');
                } else {
                  addNotification(message.error, 'error');
                }
                soundSystem.play('error');
              } else {
                addNotification('Bet placed successfully', 'success');
                
                // The backend will handle balance updates through state updates
                
                // Update local game state to reflect the bet
                setGameState(prev => ({
                  ...prev,
                  playerData: {
                    ...prev.playerData,
                    betAmount: bet,
                    status: 'betting'
                  }
                }));
              }
              break;
            case 'bet_placed':
              if (!message.userData) break;
              console.log('bet placed by player:', message.userData.username);
              break;
            case 'game_config_update':
              if (message.config) {
                setGameConfig(prev => ({
                  ...prev,
                  ...message.config
                }));
              }
              break;
              
            case 'game_result':
              // Handle win/loss
              if (message.result === 'win') {
                // Play win sound
                // Update streak and multiplier from state update
              } else {
                // Play lose sound
                // Reset streak
                setGameState(prev => ({
                  ...prev,
                  streak: 0,
                  multiplier: 1.0
                }));
              }
              break;
          }
        },
        onError: (error) => {
          console.error('webSocket error in hiLo game:', error);
          setIsConnected(false);
        }
      });

      // If WebSocket was already connected, join the room immediately
      if (wasAlreadyConnected) {
        console.log('webSocket was already connected - joining hiLo room directly');
        setIsConnected(true);
        websocketService.joinGame('hi-lo', session.access_token);
      }

      // Cleanup on unmount
      return () => {
        console.log('hiLo component unmounting - leaving room');
        websocketService.leaveGame();
      };
    } else {
      console.log('hiLo component waiting for auth - user:', !!user, 'session:', !!session?.access_token, 'loading:', loading);
    }
  }, [user, session?.access_token, loading]);

  const handleBetInputChange = (value: string) => {
    // Initialize sound system on first user interaction
    soundSystem.initializeAfterUserInteraction();
    setBetInput(value);
    const numValue = parseInt(value) || 0;
    if (numValue > 0) {
      setBet(numValue);
    }
  };

  const updateBet = (newBet: number) => {
    // Initialize sound system on first user interaction
    soundSystem.initializeAfterUserInteraction();
    setBet(newBet);
    setBetInput(newBet.toString());
  };

  const handlePlaceBet = async (choice: 'higher' | 'lower') => {
    // Initialize sound system on first user interaction
    soundSystem.initializeAfterUserInteraction();

    if (!isConnected) {
      addNotification('Not connected to game server', 'error');
      return;
    }

    if (bet > localBalance) {
      addNotification('Insufficient balance', 'error');
      soundSystem.play('error');
      return;
    }

    // Check bet limits from game config
    const betLimits = gameConfig.betLimits;
    if (bet < betLimits.min) {
      addNotification(`Minimum bet is ${betLimits.min} GC`, 'error');
      soundSystem.play('error');
      return;
    }
    if (bet > betLimits.max) {
      addNotification(`Maximum bet is ${betLimits.max} GC`, 'error');
      soundSystem.play('error');
      return;
    }

    // Check if we're in betting phase
    if (gameState.phase !== 'betting') {
      addNotification('Betting is not allowed in current phase', 'error');
      soundSystem.play('error');
      return;
    }

    // Check if we already have an active bet
    if (gameState.playerData?.betAmount) {
      addNotification('You already have an active bet for this round', 'error');
      soundSystem.play('error');
      return;
    }

    try {
      // Update local balance immediately for UI responsiveness
      updateLocalBalance(-bet);
      
      // Also update global balance context for header consistency
      await refreshBalance();
      
      websocketService.placeBet(bet, { choice });
      soundSystem.play('bet_placed');
    } catch (error) {
      // Revert local balance if bet placement fails
      updateLocalBalance(bet);
      // Also refresh global balance to ensure consistency
      await refreshBalance();
      addNotification('Error placing bet', 'error');
      soundSystem.play('error');
      console.error('Error placing bet:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading Hi-Lo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎲</div>
          <h2 className="text-3xl font-bold mb-4">Sign in to play hi-lo</h2>
          <p className="text-lg mb-8">Join our Discord community to start playing</p>
          <Link to="/">
            <LightButton>Go home</LightButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GamemodeAccessCheck gamemode="hi-lo">
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8 pt-16 sm:pt-20 md:pt-24">
        {/* Notifications */}
        <NotificationManager notifications={notifications} onRemove={removeNotification} />
        <div className="mb-8 mt-8 sm:mt-3 md:mt-4">
          <GameLiveView 
            gameState={gameState}
            timeLeft={timeLeft}
          />
        </div>

        <div className="bg-gray-900 rounded-lg p-4 sm:p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 xl:items-start">
            {/* Betting Controls */}
            <div className="h-full flex flex-col">
              <h3 className="text-white font-bold text-lg mb-4">Place your bet</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-white text-sm block mb-1">Bet amount:</label>
                  <div className="flex items-center space-x-1 sm:space-x-2 w-full">
                    <button 
                      onClick={() => gameState.phase === 'betting' && updateBet(Math.max(1, bet - 1))}
                      className={`${gameState.phase === 'betting' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 cursor-not-allowed'} text-white px-2 sm:px-3 py-2 rounded transition-colors flex-shrink-0 text-sm`}
                      disabled={gameState.phase !== 'betting'}
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      value={betInput}
                      onChange={(e) => gameState.phase === 'betting' && handleBetInputChange(e.target.value)}
                      className={`${gameState.phase === 'betting' ? 'bg-gray-800' : 'bg-gray-900'} border border-gray-600 px-2 sm:px-4 py-2 rounded text-center flex-1 text-yellow-400 font-bold focus:outline-none focus:border-yellow-400 text-sm sm:text-base`}
                      min="1"
                      placeholder="0"
                      disabled={gameState.phase !== 'betting'}
                    />
                    <span className="text-gray-400 flex-shrink-0 text-sm sm:text-base">GC</span>
                    <button 
                      onClick={() => gameState.phase === 'betting' && updateBet(bet + 1)}
                      className={`${gameState.phase === 'betting' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 cursor-not-allowed'} text-white px-2 sm:px-3 py-2 rounded transition-colors flex-shrink-0 text-sm`}
                      disabled={gameState.phase !== 'betting'}
                    >
                      +1
                    </button>
                  </div>
                  
                  {/* Quick Bet Buttons */}
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    <button 
                      onClick={() => gameState.phase === 'betting' && updateBet(bet + 5)} 
                      className={`${gameState.phase === 'betting' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 cursor-not-allowed'} text-white px-1 sm:px-2 py-1 rounded text-xs`}
                      disabled={gameState.phase !== 'betting'}
                    >+5</button>
                    <button 
                      onClick={() => gameState.phase === 'betting' && updateBet(bet + 10)} 
                      className={`${gameState.phase === 'betting' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 cursor-not-allowed'} text-white px-1 sm:px-2 py-1 rounded text-xs`}
                      disabled={gameState.phase !== 'betting'}
                    >+10</button>
                    <button 
                      onClick={() => gameState.phase === 'betting' && updateBet(bet + 25)} 
                      className={`${gameState.phase === 'betting' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 cursor-not-allowed'} text-white px-1 sm:px-2 py-1 rounded text-xs`}
                      disabled={gameState.phase !== 'betting'}
                    >+25</button>
                    <button 
                      onClick={() => gameState.phase === 'betting' && updateBet(bet + 50)} 
                      className={`${gameState.phase === 'betting' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 cursor-not-allowed'} text-white px-1 sm:px-2 py-1 rounded text-xs`}
                      disabled={gameState.phase !== 'betting'}
                    >+50</button>
                    <button 
                      onClick={() => gameState.phase === 'betting' && updateBet(bet + 100)} 
                      className={`${gameState.phase === 'betting' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 cursor-not-allowed'} text-white px-1 sm:px-2 py-1 rounded text-xs`}
                      disabled={gameState.phase !== 'betting'}
                    >+100</button>
                  </div>
                </div>

                <div className="bg-gray-800 rounded p-4">
                  <div className="text-center space-y-2">
                    <div>
                      <span className="text-gray-400">Current streak: </span>
                      <span className="text-green-400 font-bold text-xl">{gameState.playerData?.streak || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Multiplier: </span>
                      <span className="text-yellow-400 font-bold text-xl">{(gameState.playerData?.multiplier || 1.5).toFixed(2)}x</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Potential win: </span>
                      <span className="text-white font-bold">{(bet * (gameState.playerData?.multiplier || 1.5)).toFixed(0)} GC</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Your balance: </span>
                      <span className="text-white font-bold">{localBalance} GC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Actions */}
            <div className="h-full flex flex-col">
              <h3 className="text-white font-bold text-lg mb-4">Make your guess</h3>
              <div className="space-y-3">
                <button 
                  className={`w-full ${gameState.phase === 'betting' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'} text-white px-4 py-3 rounded font-semibold transition-colors text-lg`}
                  onClick={() => gameState.phase === 'betting' && handlePlaceBet('higher')}
                  disabled={gameState.phase !== 'betting'}
                >
                   Bet higher
                </button>
                <button 
                  className={`w-full ${gameState.phase === 'betting' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 cursor-not-allowed'} text-white px-4 py-3 rounded font-semibold transition-colors text-lg`}
                  onClick={() => gameState.phase === 'betting' && handlePlaceBet('lower')}
                  disabled={gameState.phase !== 'betting'}
                >
                   Bet lower
                </button>
                 
                 <div className="bg-gray-800 rounded p-3" style={{ marginTop: '13px' }}>
                   <div className="text-center text-sm text-gray-400">
                     {gameState.currentCard ? 
                       `Next card will be compared to ${gameState.currentCard.value} ${getCardSymbol(gameState.currentCard.suit)}` :
                       'Waiting for next round...'}
                   </div>
                 </div>
              </div>
            </div>

            {/* Game Status & Strategy */}
            <div className="h-full flex flex-col">
              <h3 className="text-white font-bold text-lg mb-4">Game stats</h3>
              <div className="space-y-4">
                {/* Collapsible Game Stats Card */}
                <div className="bg-gray-800 rounded overflow-hidden">
                  <button
                    onClick={() => setGameStatsExpanded(!gameStatsExpanded)}
                    className="w-full flex items-center justify-between p-4 text-white hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold">Current game info</span>
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${gameStatsExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-200 overflow-hidden ${gameStatsExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 space-y-2 border-t border-gray-700">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current card:</span>
                        <span className="text-white font-bold">
                          {gameState.currentCard ? `${gameState.currentCard.value} ${getCardSymbol(gameState.currentCard.suit)}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Revealed card:</span>
                        <span className="text-white font-bold">
                          {(gameState.phase === 'reveal' || gameState.phase === 'next_round') && gameState.resultCard 
                            ? `${gameState.resultCard.value} ${getCardSymbol(gameState.resultCard.suit)}` 
                            : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cards left:</span>
                        <span className="text-white font-bold">{gameState.cardsRemaining}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Best streak:</span>
                        <span className="text-green-400 font-bold">{gameState.bestStreak}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Multipliers Card */}
                <div className="bg-gray-800 rounded overflow-hidden">
                  <button
                    onClick={() => setMultipliersExpanded(!multipliersExpanded)}
                    className="w-full flex items-center justify-between p-4 text-white hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold">Game multipliers</span>
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${multipliersExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-200 overflow-hidden ${multipliersExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 border-t border-gray-700">
                      <h4 className="text-white font-semibold mb-2">Streak multipliers</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>1-2 wins:</span>
                          <span className="text-yellow-400">1.5x</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3-5 wins:</span>
                          <span className="text-yellow-400">2.0x</span>
                        </div>
                        <div className="flex justify-between">
                          <span>6-9 wins:</span>
                          <span className="text-yellow-400">3.0x</span>
                        </div>
                        <div className="flex justify-between">
                          <span>10+ wins:</span>
                          <span className="text-yellow-400">5.0x</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat */}
        <ChatSidebar gamemode="hi-lo" />
        </div>
      </div>
    </GamemodeAccessCheck>
  );
} 