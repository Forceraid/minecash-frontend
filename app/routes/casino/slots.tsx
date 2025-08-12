import type { Route } from "./+types/slots";
import { useAuth } from "../../contexts/AuthContext";
import { useGCBalance } from "../../contexts/GCBalanceContext";
import { LightButton, GoldButton } from "../../components/Button";
import { ChatSidebar } from "../../components/ChatSidebar";
import { GamemodeAccessCheck } from "../../components/GamemodeAccessCheck";
import { Link } from "react-router";
import { useState, useEffect } from "react";
import { websocketService } from "../../lib/websocket";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Slots - MINECASH" },
    { name: "description", content: "Spin the reels and hit the jackpot in our exciting slot machine!" },
  ];
}

function GameLiveView() {
  const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣", "🔔"];
  
  return (
    <div className="w-full h-[500px] bg-[#F5F5F5] rounded-lg border-2 border-yellow-400 flex items-center justify-center">
             <div className="text-center text-black">
         <div className="text-6xl mb-4">🎰</div>
         <h3 className="text-2xl font-bold mb-4">Slot machine</h3>
         
         {/* Slot Reels */}
         <div className="bg-black/50 rounded-lg p-4 mb-4">
           <div className="flex justify-center space-x-2 mb-2">
             {[0, 1, 2, 3, 4].map((reel) => (
               <div key={reel} className="bg-white rounded-lg w-16 h-20 flex items-center justify-center border-2 border-yellow-400">
                 <span className="text-3xl">{symbols[reel]}</span>
               </div>
             ))}
           </div>
           <div className="flex justify-center space-x-1">
             {[...Array(5)].map((_, i) => (
               <div key={i} className="w-2 h-2 bg-yellow-400 rounded-full"></div>
             ))}
           </div>
         </div>
         
         <p className="text-lg opacity-80">Spin the reels for big wins!</p>
       </div>
    </div>
  );
}

export default function Slots() {
  const { user, loading, session } = useAuth();
  const { balance, updateBalance } = useGCBalance();
  const [bet, setBet] = useState(10);
  const [betInput, setBetInput] = useState("10");
  const [paylines, setPaylines] = useState(20);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState('waiting');

  // Connect to WebSocket when component mounts
  useEffect(() => {
    // Only proceed if user is fully loaded (not null and not loading)
    if (user && session?.access_token && !loading) {
      console.log('slots component setting up webSocket connection');
      
      // Check if already connected before setting up callbacks
      const wasAlreadyConnected = websocketService.isConnected();
      
      websocketService.connect({
        onConnect: () => {
          console.log('webSocket connected to slots game');
          setIsConnected(true);
          // Join the slots room with authentication token
          websocketService.joinGame('slots', session.access_token);
        },
        onDisconnect: () => {
          console.log('webSocket disconnected from slots game');
          setIsConnected(false);
        },
        onMessage: (message) => {
          // Handle non-chat game messages only
          switch (message.type) {
            case 'joined_game':
              console.log('joined slots game');
              break;
            case 'bet_confirmed':
              console.log('bet confirmed:', message);
              break;
            case 'bet_placed':
              console.log('bet placed by player:', message.userData?.username);
              break;
            case 'game_result':
              console.log('game result:', message);
              break;
          }
        },
        onError: (error) => {
          console.error('webSocket error in slots game:', error);
          setIsConnected(false);
        }
      });

      // If WebSocket was already connected, join the room immediately
      if (wasAlreadyConnected) {
        console.log('webSocket was already connected - joining slots room directly');
        setIsConnected(true);
        websocketService.joinGame('slots', session.access_token);
      }

      // Cleanup on unmount
      return () => {
        console.log('slots component unmounting - leaving room');
        websocketService.leaveGame();
      };
    } else {
      console.log('slots component waiting for auth - user:', !!user, 'session:', !!session?.access_token, 'loading:', loading);
    }
  }, [user, session?.access_token, loading]);

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

  const handlePlaceBet = async () => {
    if (!isConnected) {
      console.log('Not connected to WebSocket');
      return;
    }

    const totalBet = bet * paylines;
    if (totalBet > balance) {
      alert('Insufficient balance');
      return;
    }

    try {
      websocketService.placeBet(totalBet);
      console.log('Placed bet:', totalBet);
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };

  const handleGameAction = (action: string) => {
    if (!isConnected) {
      console.log('Not connected to WebSocket');
      return;
    }

    try {
      websocketService.sendGameAction(action);
      console.log('Sent game action:', action);
    } catch (error) {
      console.error('Error sending game action:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading slots...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎰</div>
          <h2 className="text-3xl font-bold mb-4">Sign in to play slots</h2>
          <p className="text-lg mb-8">Join our Discord community to start playing</p>
          <Link to="/">
            <LightButton>Go home</LightButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GamemodeAccessCheck gamemode="slots">
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8 pt-16 sm:pt-20 md:pt-24">
        <div className="mb-8 mt-8 sm:mt-3 md:mt-4">
          <GameLiveView />
        </div>

        <div className="bg-gray-900 rounded-lg p-4 sm:p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 xl:items-stretch">
            {/* Betting Controls */}
            <div className="h-full flex flex-col">
              <h3 className="text-white font-bold text-lg mb-4">Bet settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-white text-sm block mb-1">Bet amount:</label>
                  <div className="flex items-center space-x-1 sm:space-x-2 w-full">
                    <button 
                      onClick={() => updateBet(Math.max(1, bet - 1))}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors cursor-pointer flex-shrink-0 text-sm"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      value={betInput}
                      onChange={(e) => handleBetInputChange(e.target.value)}
                      className="bg-gray-800 border border-gray-600 px-2 sm:px-4 py-2 rounded text-center flex-1 text-yellow-400 font-bold focus:outline-none focus:border-yellow-400 text-sm sm:text-base"
                      min="1"
                      placeholder="0"
                    />
                    <span className="text-gray-400 flex-shrink-0 text-sm sm:text-base">GC</span>
                    <button 
                      onClick={() => updateBet(bet + 1)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors cursor-pointer flex-shrink-0 text-sm"
                    >
                      +1
                    </button>
                  </div>
                  
                  {/* Quick Bet Buttons */}
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    <button onClick={() => updateBet(bet + 5)} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+5</button>
                    <button onClick={() => updateBet(bet + 10)} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+10</button>
                    <button onClick={() => updateBet(bet + 25)} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+25</button>
                    <button onClick={() => updateBet(bet + 50)} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+50</button>
                    <button onClick={() => updateBet(bet + 100)} className="bg-gray-700 hover:bg-gray-600 text-white px-1 sm:px-2 py-1 rounded text-xs cursor-pointer">+100</button>
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm block mb-1">Paylines:</label>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button 
                      onClick={() => setPaylines(Math.max(1, paylines - 1))}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors text-sm"
                    >
                      -1
                    </button>
                    <div className="bg-gray-800 border border-gray-600 px-2 sm:px-4 py-2 rounded text-center min-w-[60px] sm:min-w-[80px]">
                      <span className="text-white font-bold text-sm sm:text-base">{paylines}</span>
                    </div>
                    <button 
                      onClick={() => setPaylines(Math.min(25, paylines + 1))}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-3 py-2 rounded transition-colors text-sm"
                    >
                      +1
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-center">
                    <span className="text-gray-400">Total bet: </span>
                    <span className="text-yellow-400 font-bold text-lg">{bet * paylines} GC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Actions */}
            <div className="h-full flex flex-col">
              <h3 className="text-white font-bold text-lg mb-4">Actions</h3>
              <div className="space-y-2">
                <GoldButton 
                  className="w-full text-lg py-3"
                  onClick={handlePlaceBet}
                >
                  Spin
                </GoldButton>
                <button 
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition-colors cursor-pointer"
                  onClick={() => updateBet(1000)}
                >
                  Max bet
                </button>
                <button 
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition-colors cursor-pointer"
                  onClick={() => handleGameAction('auto_spin')}
                >
                  Auto spin
                </button>
              </div>
            </div>

            {/* Game Status & Paytable */}
            <div className="h-full flex flex-col">
              <h3 className="text-white font-bold text-lg mb-4">Game info</h3>
              <div className="space-y-4 mt-auto">
                <div className="bg-gray-800 rounded p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last win:</span>
                    <span className="text-green-400 font-bold">45 GC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-yellow-400 font-bold">Ready</span>
                  </div>
                </div>

                <div className="bg-gray-800 rounded p-4">
                  <h4 className="text-white font-semibold mb-2">Quick paytable</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>💎💎💎💎💎</span>
                      <span className="text-yellow-400">5000x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>7️⃣7️⃣7️⃣7️⃣7️⃣</span>
                      <span className="text-yellow-400">1000x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⭐⭐⭐⭐⭐</span>
                      <span className="text-yellow-400">500x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🍒🍒🍒</span>
                      <span className="text-yellow-400">25x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat */}
        <ChatSidebar gamemode="slots" />
      </div>
    </div>
    </GamemodeAccessCheck>
  );
} 