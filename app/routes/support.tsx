import type { Route } from "./+types/support";
import { useAuth } from "../contexts/AuthContext";
import { GoldButton, LightButton } from "../components/Button";
import { Link } from "react-router";
import { useState } from "react";
import { checkUserInDiscord, createSupportTicket, DISCORD_INVITE_LINK } from "../lib/discord-bot";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Support - MINECASH" },
    { name: "description", content: "Get help and answers to frequently asked questions about MINECASH." },
  ];
}

const faqData = [
  {
    question: "How do I deposit GC into my account?",
    answer: "To deposit GC, click the 'Deposit GC' button on your profile page. If you're already in our Discord server, this will create a support ticket in #support where our team can assist you. If you're not in the server yet, you'll be prompted to join first."
  },
  {
    question: "How do I withdraw my GC earnings?",
    answer: "To withdraw GC, use the 'Withdraw GC' button on your profile page. Similar to deposits, this will create a support ticket if you're in our Discord server. Our team will process your withdrawal request within 24 hours."
  },
  {
    question: "Are the games fair and provably fair?",
    answer: "Yes! All our games use provably fair algorithms. You can verify the fairness of each round using the hash verification system. Each game result is generated using a cryptographic hash that you can independently verify."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept various payment methods including cryptocurrencies and traditional payment options. For specific payment method availability in your region, please create a support ticket and our team will provide you with the most up-to-date information."
  },
  {
    question: "How do I know if I'm in the Discord server?",
    answer: "If you're in our Discord server, support actions will show 'Ticket created in #support'. If you're not in the server, you'll see a prompt to 'Please join the Discord server to continue'. Use the Discord join button to get an invite link."
  },
  {
    question: "What are the minimum and maximum betting limits?",
    answer: "Betting limits vary by game. Generally, minimum bets start at 1 GC and maximum bets can go up to 1,000 GC per round. VIP players may have higher limits available. Check each game's interface for specific limits."
  },
  {
    question: "How do I enable two-factor authentication?",
    answer: "Two-factor authentication is handled through Discord. Make sure your Discord account has 2FA enabled to add an extra layer of security to your MINECASH account."
  },
  {
    question: "Can I play on mobile devices?",
    answer: "Yes! MINECASH is fully responsive and works great on mobile devices. You can access all games and features from your smartphone or tablet through your web browser."
  },
  {
    question: "How long do withdrawals take to process?",
    answer: "Most withdrawals are processed within 24 hours. During peak times or for larger amounts, it may take up to 48 hours. You'll receive updates through your support ticket in Discord."
  },
  {
    question: "What should I do if I suspect problem gambling?",
    answer: "We take responsible gaming seriously. If you need help with gambling-related issues, please create a support ticket or reach out to organizations like GamCare (UK) or the National Council on Problem Gambling (US). We also offer self-exclusion options."
  }
];

async function handleCreateTicket() {
  // This will be handled by the component that uses it
}

export default function Support() {
  const { user, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading support...</p>
        </div>
      </div>
    );
  }

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleCreateTicket = async () => {
    if (!user?.id) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Authentication Error',
        message: 'Please sign in to create a support ticket.'
      });
      return;
    }

    // Get Discord user ID from user metadata
    const discordUserId = user.user_metadata?.sub || user.user_metadata?.discord_id;
    
    if (!discordUserId) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Discord ID Not Found',
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
          message: 'Please join our Discord server first to create support tickets.'
        });
        return;
      }

      // Create support ticket directly (no amount needed for support)
      try {
        const ticketResult = await createSupportTicket(discordUserId, 'General support request');

        if (ticketResult.success) {
          setNotification({
            show: true,
            type: 'success',
            title: 'Ticket created successfully',
            message: 'Your support ticket has been created. Check your Discord for the private channel.'
          });
        } else {
          setNotification({
            show: true,
            type: 'error',
            title: 'Ticket creation failed',
            message: ticketResult.message || 'Unable to create support ticket. Please try again.'
          });
        }
      } catch (error) {
        console.error('Support ticket error:', error);
        setNotification({
          show: true,
          type: 'error',
          title: 'Connection Error',
          message: 'Unable to create support ticket. Please try again.'
        });
      }

    } catch (error) {
      console.error('Support ticket error:', error);
      setNotification({
        show: true,
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to connect to Discord service. Please try again.'
      });
    }
  };



  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8 pt-16 sm:pt-20 md:pt-24">
        {/* Header Section */}
        <div className="text-center mb-12 mt-8 sm:mt-12 md:mt-16">
          {/* Small animated logo */}
          <div className="mb-6">
            <div className="relative scale-50 mx-auto w-fit">
              <div className="absolute -left-12 -top-6 text-4xl transform -rotate-45 animate-bounce">
                ⛏️
              </div>
              <div className="relative bg-yellow-400 rounded-xl p-3 shadow-2xl">
                <div className="text-red-600 text-3xl">♠️</div>
                <div className="absolute bottom-0 left-1/2 transform translate-y-full -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[15px] border-l-transparent border-r-transparent border-t-yellow-400"></div>
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Support center ❓
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Frequently asked questions
          </p>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4 mb-12">
          {faqData.map((faq, index) => (
            <div key={index} className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-800 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white pr-4">
                  {faq.question}
                </h3>
                <div className={`transform transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {openFaq === index && (
                <div className="px-6 pb-4 border-t border-gray-700">
                  <div className="pt-4 text-gray-300 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Support Ticket Section */}
        <div className="bg-gray-900 rounded-xl p-8 border border-yellow-500/20 text-center">
          <div className="mb-6">
            <div className="text-4xl mb-4">🎧</div>
            <h2 className="text-2xl font-bold text-white mb-2">Need more help?</h2>
            <p className="text-gray-300">
              Can't find what you're looking for? Create a support ticket and our team will get back to you quickly.
            </p>
          </div>

          <div className="space-y-4">
            <GoldButton 
              onClick={handleCreateTicket}
              className="text-lg px-8 py-3"
            >
              🎫 Create support ticket
            </GoldButton>
            
            <div className="text-sm text-gray-400">
              {user ? (
                <>
                  Logged in as <span className="text-yellow-400">{user.user_metadata?.full_name || user.email}</span>
                </>
              ) : (
                <>
                  <Link to="/" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                    Sign in
                  </Link> to create support tickets
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-lg p-6 text-center border border-gray-700 flex flex-col h-full">
            <div className="text-2xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-white mb-2">Game rules</h3>
            <p className="text-gray-400 text-sm mb-4 flex-grow">Learn how to play each game</p>
            <Link to="/">
              <LightButton className="text-sm">View games</LightButton>
            </Link>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 text-center border border-gray-700 flex flex-col h-full">
            <div className="text-2xl mb-3">👤</div>
            <h3 className="text-lg font-bold text-white mb-2">Account settings</h3>
            <p className="text-gray-400 text-sm mb-4 flex-grow">Manage your profile and preferences</p>
            <Link to="/profile">
              <LightButton className="text-sm">Go to profile</LightButton>
            </Link>
          </div>

                     <div className="bg-gray-900 rounded-lg p-6 text-center border border-gray-700 flex flex-col h-full">
             <div className="text-2xl mb-3">💬</div>
             <h3 className="text-lg font-bold text-white mb-2">Discord community</h3>
             <p className="text-gray-400 text-sm mb-4 flex-grow">Join our active community</p>
             <div className="inline-block">
               <LightButton 
                 onClick={() => window.open(DISCORD_INVITE_LINK, '_blank')}
                 className="text-sm"
               >
                 <span>Join discord</span>
               </LightButton>
             </div>
           </div>
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-25 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white`}>
          <div className="flex items-start">
            <div className="flex-1">
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      
    </div>
  );
} 