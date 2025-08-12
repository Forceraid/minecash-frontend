import type { Route } from "./+types/profile";
import { useAuth } from "../contexts/AuthContext";
import { useGCBalance } from "../contexts/GCBalanceContext";
import { LightButton, GoldButton } from "../components/Button";
import { ReviewModal } from "../components/ReviewModal";
import { Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { checkUserInDiscord, createDepositTicket, createWithdrawTicket, DISCORD_INVITE_LINK } from "../lib/discord-bot";
import { userStatsHelpers, gcLimitsHelpers } from "../lib/supabase";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - MINECASH" },
    { name: "description", content: "Manage your GC balance, view statistics, and access your MineCash profile" },
  ];
}

// Game statistics interface
interface GameStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  gcWon: number;
  gcLost: number;
}

interface UserStats {
  crash: GameStats | null;
  blackjack: GameStats | null;
  roulette: GameStats | null;
  slots: GameStats | null;
  'hi-lo': GameStats | null;
}

export default function Profile() {
  const { user, loading, signInWithDiscord, userProfile } = useAuth();
  const { balance, isLoading: balanceLoading } = useGCBalance();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightDeposit, setHighlightDeposit] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'info' | 'error';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Add amount modal state
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [gcLimits, setGcLimits] = useState({
    deposit: { min: 50, max: 500 },
    withdraw: { min: 50, max: 500 }
  });

  // Fetch user statistics when user profile is available
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userProfile?.id) {
        setStatsLoading(false);
        return;
      }

      try {
        setStatsLoading(true);
        const stats = await userStatsHelpers.getUserStats(userProfile.id);
        setUserStats(stats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchUserStats();
  }, [userProfile?.id]);

  // Fetch GC limits
  useEffect(() => {
    const fetchGCLimits = async () => {
      try {
        const limits = await gcLimitsHelpers.getGCLimits();
        setGcLimits(limits);
      } catch (error) {
        console.error('Error fetching GC limits:', error);
      }
    };

    fetchGCLimits();
  }, []);

  // Handle highlight parameter from URL
  useEffect(() => {
    if (searchParams.get('highlight') === 'deposit') {
      setHighlightDeposit(true);
      // Remove the parameter from URL after a short delay
      setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 100);
      // Remove highlight after animation (extended duration for better visibility)
      setTimeout(() => {
        setHighlightDeposit(false);
      }, 5000);
    }
  }, [searchParams, setSearchParams]);

  const handleDiscordAction = async (action: 'deposit' | 'withdraw') => {
    if (!user?.id) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Authentication error',
        message: 'Please sign in again to continue.'
      });
      return;
    }

    // Get Discord user ID from user metadata
    const discordUserId = user.user_metadata?.sub || user.user_metadata?.discord_id;
    
    if (!discordUserId) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Discord ID not found',
        message: 'Unable to find your Discord ID. Please sign in again with Discord.'
      });
      return;
    }

    try {
      // Check if user is in Discord server
      const checkResult = await checkUserInDiscord(discordUserId);
      
      if (!checkResult.success || !checkResult.inServer) {
        setNotification({
          show: true,
          type: 'info',
          title: 'Discord server required',
          message: 'Please join our Discord server first to create support tickets and manage your GC balance.'
        });
        return;
      }

      // Show amount input modal
      setPendingAction(action);
      setShowAmountModal(true);
      setAmount('');
      setAmountError('');

    } catch (error) {
      console.error('Discord action error:', error);
      setNotification({
        show: true,
        type: 'error',
        title: 'Connection error',
        message: 'Unable to connect to Discord service. Please try again.'
      });
    }
  };

  const handleAmountSubmit = async () => {
    // Validate amount using dynamic limits
    const numAmount = parseInt(amount);
    const limits = pendingAction === 'deposit' ? gcLimits.deposit : gcLimits.withdraw;
    
    if (!numAmount || numAmount < limits.min || numAmount > limits.max) {
      setAmountError(`Amount must be between ${limits.min} and ${limits.max} GC`);
      return;
    }

    if (!pendingAction || !user?.id) {
      setShowAmountModal(false);
      return;
    }

    // Get Discord user ID from user metadata
    const discordUserId = user.user_metadata?.sub || user.user_metadata?.discord_id;
    
    if (!discordUserId) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Discord ID not found',
        message: 'Unable to find your Discord ID. Please sign in again with Discord.'
      });
      return;
    }

    try {
      // Create ticket based on action
      let ticketResult;
      if (pendingAction === 'deposit') {
        ticketResult = await createDepositTicket(discordUserId, numAmount, `Deposit request for ${numAmount} GC`);
      } else {
        ticketResult = await createWithdrawTicket(discordUserId, numAmount, `Withdraw request for ${numAmount} GC`);
      }

      if (ticketResult.success) {
        setNotification({
          show: true,
          type: 'success',
          title: 'Ticket created successfully',
          message: `Your ${pendingAction} request for ${numAmount} GC has been submitted. Check your Discord for the private channel.`
        });
        

      } else {
        setNotification({
          show: true,
          type: 'error',
          title: 'Ticket creation failed',
          message: ticketResult.message || 'Unable to create ticket. Please try again.'
        });
      }
    } catch (error) {
      console.error('Ticket creation error:', error);
      setNotification({
        show: true,
        type: 'error',
        title: 'Connection error',
        message: 'Unable to create ticket. Please try again.'
      });
    }

    setShowAmountModal(false);
    setPendingAction(null);
    setAmount('');
    setAmountError('');
  };



  const handleAmountCancel = () => {
    setShowAmountModal(false);
    setPendingAction(null);
    setAmount('');
    setAmountError('');
  };

  const handleReviewSubmitted = () => {
    setNotification({
      show: true,
      type: 'success',
      title: 'Review submitted!',
      message: 'Thank you for your feedback. Your review will be displayed on our homepage.'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading Profile...</p>
        </div>
      </div>
    );
  }

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <main className="pt-16 p-4 container mx-auto">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">👤</div>
          <h2 className="text-3xl font-bold mb-4">Profile access</h2>
          <p className="text-lg mb-8 text-gray-300">Sign in with Discord to view your profile and track your casino statistics</p>
          <LightButton onClick={signInWithDiscord} className="mb-4">
            <span>Sign in with discord</span>
          </LightButton>
          <div className="text-sm text-gray-400">
            <Link to="/" className="hover:text-yellow-400 transition-colors">← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals for stats
  const totalGcWon = userStats ? Object.values(userStats).reduce((sum, stat) => sum + (stat?.gcWon || 0), 0) : 0;
  const totalGcLost = userStats ? Object.values(userStats).reduce((sum, stat) => sum + (stat?.gcLost || 0), 0) : 0;
  const totalGames = userStats ? Object.values(userStats).reduce((sum, stat) => sum + (stat?.totalGames || 0), 0) : 0;
  const netGain = totalGcWon - totalGcLost;

  return (
    <div className="min-h-screen bg-black pt-16 sm:pt-20 md:pt-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* User Info Card */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-yellow-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side - Profile Info */}
            <div className="flex flex-col space-y-3 justify-center">
              {/* Profile Content */}
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Discord Avatar" 
                      className="w-24 h-24 rounded-full border-4 border-yellow-400"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-700 rounded-full border-4 border-yellow-400 flex items-center justify-center text-3xl">
                      👤
                    </div>
                  )}
                </div>

                {/* User Details */}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {user.user_metadata?.full_name || user.email}
                  </h1>
                  <p className="text-gray-400">{user.email}</p>
                </div>
              </div>
              
              {/* Rate Us Button */}
              <LightButton 
                onClick={() => setShowReviewModal(true)}
                className="w-full text-base font-semibold"
              >
                Rate us
              </LightButton>
            </div>

            {/* Middle - Action Buttons */}
            <div className="flex flex-col space-y-3 justify-center">
              <GoldButton 
                onClick={() => handleDiscordAction('deposit')}
                className={`whitespace-nowrap w-full text-base font-semibold transition-all duration-500 ${
                  highlightDeposit 
                    ? 'animate-pulse ring-4 ring-yellow-400/80 shadow-2xl shadow-yellow-400/50 scale-110 transform' 
                    : ''
                }`}
              >
                Deposit
              </GoldButton>
              <button 
                onClick={() => handleDiscordAction('withdraw')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-base font-semibold transition-colors whitespace-nowrap w-full cursor-pointer"
              >
                Withdraw
              </button>
              <LightButton 
                onClick={() => window.open(DISCORD_INVITE_LINK, '_blank')}
                className="whitespace-nowrap w-full text-base font-semibold"
              >
                Join our discord
              </LightButton>
            </div>

            {/* Right Side - GC Balance */}
            <div className="bg-black/50 rounded-lg p-6 text-center flex flex-col justify-center">
              <div className="text-gray-400 text-sm mb-2">Current balance</div>
              {balanceLoading ? (
                <div className="text-3xl font-bold text-yellow-400 mb-2 animate-pulse">...</div>
              ) : (
                <div className="text-5xl font-bold text-yellow-400 mb-2">
                  {balance.toLocaleString()}
                </div>
              )}
              <div className="text-yellow-400 text-lg font-semibold">GC</div>
            </div>
          </div>
        </div>

        {/* Casino Stats Section */}
        <div className="bg-gray-900 rounded-xl p-6 border border-yellow-500/20">
          <h2 className="text-2xl font-bold text-white mb-6">Statistics</h2>
          
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {statsLoading ? '...' : totalGcWon}
              </div>
              <div className="text-gray-400 text-sm">Total GC won</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {statsLoading ? '...' : totalGcLost}
              </div>
              <div className="text-gray-400 text-sm">Total GC lost</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {statsLoading ? '...' : totalGames}
              </div>
              <div className="text-gray-400 text-sm">Games played</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${statsLoading ? 'text-gray-400' : netGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {statsLoading ? '...' : (netGain >= 0 ? '+' : '') + netGain}
              </div>
              <div className="text-gray-400 text-sm">Net gain</div>
            </div>
          </div>

          {/* Game-specific Stats */}
          <div className="space-y-4">
            {userStats ? (
              Object.entries(userStats).map(([gameName, stat]) => (
                <div key={gameName} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">{gameName.charAt(0).toUpperCase() + gameName.slice(1).replace(/-/g, ' ')}</h3>
                    <div className="text-sm text-gray-400">
                      {stat ? `Win rate: ${Math.round((stat.gamesWon / stat.totalGames) * 100)}%` : 'No data'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Games</div>
                      <div className="text-white font-semibold">{stat ? stat.totalGames : 'No data'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Won</div>
                      <div className="text-green-400 font-semibold">{stat ? stat.gamesWon : 'No data'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Lost</div>
                      <div className="text-red-400 font-semibold">{stat ? stat.gamesLost : 'No data'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Net GC</div>
                      <div className={`font-semibold ${stat ? (stat.gcWon - stat.gcLost >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                        {stat ? (stat.gcWon - stat.gcLost >= 0 ? '+' : '') + (stat.gcWon - stat.gcLost) : 'No data'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : statsLoading ? (
              <div className="text-center text-gray-400 py-8">Loading statistics...</div>
            ) : (
              <div className="text-center text-gray-400 py-8">No game statistics available yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onReviewSubmitted={handleReviewSubmitted}
      />

      {/* Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full border border-yellow-500/20">
            <div className="text-center">
              <div className="text-4xl mb-4">
                {notification.type === 'success' && '✅'}
                {notification.type === 'info' && 'ℹ️'}
                {notification.type === 'error' && '❌'}
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">{notification.title}</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                {notification.message}
              </p>
              
              <div className="space-y-4">
                {notification.type === 'info' && (
                  <LightButton className="w-full">
                    <span>Join discord server</span>
                  </LightButton>
                )}
                
                <button
                  onClick={() => setNotification({ ...notification, show: false })}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                    notification.type === 'success' 
                      ? 'bg-green-600 hover:bg-green-500 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {notification.type === 'success' ? 'Perfect!' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amount Input Modal */}
      {showAmountModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full border border-yellow-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Enter amount:</h2>
            <p className="text-gray-300 mb-6">
              Please enter the amount you want to {pendingAction === 'deposit' ? 'deposit' : 'withdraw'} 
              ({pendingAction === 'deposit' ? gcLimits.deposit.min : gcLimits.withdraw.min}-{pendingAction === 'deposit' ? gcLimits.deposit.max : gcLimits.withdraw.max} GC).
            </p>
            
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-semibold text-white mb-1">Amount (GC)</label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {amountError && <p className="text-red-400 text-sm mt-2">{amountError}</p>}
            </div>

            <div className="flex justify-end space-x-2">
              <LightButton onClick={handleAmountCancel} className="w-full">Cancel</LightButton>
              <LightButton onClick={handleAmountSubmit} className="w-full">Submit</LightButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 