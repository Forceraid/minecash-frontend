import type { Route } from "./+types/home";
import { useAuth } from "../contexts/AuthContext";
import { useGCBalance } from "../contexts/GCBalanceContext";
import { LightButton, GoldButton } from "../components/Button";
import { reviewHelpers, type Review } from "../lib/supabase";
import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { DISCORD_INVITE_LINK } from "../lib/discord-bot";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "MINECASH - Your ultimate GC experience" },
    { name: "description", content: "Experience the best GC casino with Blackjack, Roulette, Crash, Slots, and Hi-Lo. Fair gaming, fast payouts!" },
  ];
}

const gamemodes = [
  {
    name: "Blackjack",
    description: "Beat the dealer in blackjack",
    icon: "♠️"
  },
  {
    name: "Roulette", 
    description: "Bet on your luck in roulette",
    icon: "🎯"
  },
  {
    name: "Crash",
    description: "Cash out before the crash",
    icon: "📈"
  },
  {
    name: "Slots",
    description: "Spin the reels in Slots",
    icon: "🎰"
  },
  {
    name: "Hi-Lo",
    description: "Guess the next card in Hi-Lo",
    icon: "🎲"
  }
];

const proofCards = [
  {
    id: 1,
    status: "INSTANCE_LOCKED",
    verification: "TRUE",
    hash: "f4c3b87a2d9e1a6c8b3f7e2a5d9c1b4e8f6a3c7d2e9b5a8c1f4d7b2e6a9c3f5",
    verified: "VERIFIED",
    protocol: "SHA-256",
    algorithm: "HMAC",
    security: "Level 3"
  },
  {
    id: 2,
    status: "PROTOCOL_SECURED",
    verification: "TRUE", 
    hash: "a8d2f5c9b1e4a7d3c6b9e2f5a8d1c4b7e9f2a5d8c1b4e7a3d6c9b2e5f8a1d4",
    verified: "VERIFIED",
    protocol: "AES-256",
    algorithm: "GCM",
    security: "Level 4"
  },
  {
    id: 3,
    status: "ENCRYPTION_ACTIVE",
    verification: "TRUE",
    hash: "c1b4e7a3d6c9b2e5f8a1d4c7b9e2f5a8d1c4b7e9f2a5d8c1b4e7a3d6c9b2e5",
    verified: "VERIFIED",
    protocol: "RSA-4096",
    algorithm: "PKCS#1",
    security: "Level 5"
  },
  {
    id: 4,
    status: "AUDIT_COMPLETE",
    verification: "TRUE",
    hash: "e9f2a5d8c1b4e7a3d6c9b2e5f8a1d4c7b9e2f5a8d1c4b7e9f2a5d8c1b4e7a3",
    verified: "VERIFIED",
    protocol: "ECDSA",
    algorithm: "P-256",
    security: "Level 4"
  },
  {
    id: 5,
    status: "SYSTEM_VALIDATED",
    verification: "TRUE",
    hash: "b7e9f2a5d8c1b4e7a3d6c9b2e5f8a1d4c7b9e2f5a8d1c4b7e9f2a5d8c1b4e7",
    verified: "VERIFIED",
    protocol: "ChaCha20",
    algorithm: "Poly1305",
    security: "Level 3"
  }
];

export default function Home() {
  const { user, loading, signInWithDiscord } = useAuth();
  const { balance, isLoading: balanceLoading } = useGCBalance();
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [titleAnimationComplete, setTitleAnimationComplete] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showSuccessNotification, setShowSuccessNotification] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const fetchedReviews = await reviewHelpers.getReviews(10);
        setReviews(fetchedReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        // Fallback to empty array
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(() => {
      fetchReviews();
    }, 100);

    // Subscribe to real-time review updates
    let subscription: any;
    try {
      subscription = reviewHelpers.subscribeToReviews((updatedReviews) => {
        setReviews(updatedReviews);
      });
    } catch (error) {
      console.error('Error subscribing to reviews:', error);
    }

    return () => {
      clearTimeout(timeoutId);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from reviews:', error);
        }
      }
    };
  }, []);

  // Auto-rotate reviews every 4 seconds (only if there are reviews)
  useEffect(() => {
    if (reviews.length === 0) return;

    const interval = setInterval(() => {
      setCurrentReviewIndex((prevIndex) => 
        prevIndex === reviews.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [reviews.length]);

  // Title animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitleAnimationComplete(true);
    }, 500); // Start animation after 500ms

    return () => clearTimeout(timer);
  }, []);

  // Copy to clipboard function
  const copyToClipboard = async (card: any, cardId: number) => {
    try {
      const cardText = `Protocol: ${card.protocol || 'N/A'}
Algorithm: ${card.algorithm || 'N/A'}
Security: ${card.security || 'N/A'}
Hash: ${card.hash}`;
      
      await navigator.clipboard.writeText(cardText);
      setCopiedHash(`card-${cardId}`);
      setShowSuccessNotification(`card-${cardId}`);
      setTimeout(() => setCopiedHash(null), 2000);
      setTimeout(() => setShowSuccessNotification(null), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      // User is logged in, redirect to profile page with highlight parameter
      navigate('/profile?highlight=deposit');
    } else {
      // User is not logged in, show login modal
      setShowLoginModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16 sm:pt-20 md:pt-24">
      {/* Hero Section */}
      <section className="hero-section relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] px-4">
        {/* Logo */}
        <div className="hero-logo mb-6 md:mb-8">
          <div className="relative scale-75 sm:scale-90 md:scale-100">
            {/* Mining Pickaxe */}
            <div className="absolute -left-12 sm:-left-14 md:-left-16 -top-6 sm:-top-7 md:-top-8 text-4xl sm:text-5xl md:text-6xl transform -rotate-45">
              ⛏️
            </div>
            {/* Chat Bubble with Spade */}
            <div className="relative bg-yellow-400 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-2xl">
              <div className="text-red-600 text-3xl md:text-4xl">♠️</div>
              {/* Speech bubble tail */}
              <div className="absolute bottom-0 left-1/2 transform translate-y-full -translate-x-1/2">
                <div className="w-0 h-0 border-l-[15px] md:border-l-[20px] border-r-[15px] md:border-r-[20px] border-t-[15px] md:border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-400"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 md:mb-8 tracking-wider text-center overflow-hidden">
          <div className="flex justify-center">
            {'MINECASH'.split('').map((letter, index) => (
              <span
                key={index}
                className={`inline-block transform transition-all duration-700 ease-out ${
                  titleAnimationComplete 
                    ? 'translate-x-0 opacity-100' 
                    : 'translate-x-[-100%] opacity-0'
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`
                }}
              >
                {letter}
              </span>
            ))}
          </div>
        </h1>

        {/* GC Balance Display for logged-in users */}
        {user && (
          <div className="mb-8 text-center">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg px-6 py-4 inline-block">
              <div className="text-gray-400 text-sm mb-1">Your GC Balance</div>
              {balanceLoading ? (
                <div className="text-2xl font-bold text-yellow-400 animate-pulse">Loading...</div>
              ) : (
                <div className="text-3xl font-bold text-yellow-400">
                  {balance.toLocaleString()} GC
                </div>
              )}
            </div>
          </div>
        )}

        {/* Get Started Button */}
        <GoldButton 
          onClick={handleGetStarted}
          className="text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 mb-12 md:mb-16"
        >
          Get started
        </GoldButton>
      </section>

      {/* Gamemodes Section - Dual Row Animation */}
      <section className="py-16 px-4 overflow-hidden relative">
        <div className="w-full max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 md:mb-12 text-center md:text-left">Gamemodes</h2>

          <div className="relative">
            {/* Top Row - Seamless Loop (Left to Right Flow) */}
            <div className="relative h-[300px] overflow-hidden">
              <div 
                className="flex gap-6 absolute whitespace-nowrap animate-scroll-left"
                style={{ width: "fit-content" }}
              >
                {/* Double the cards for seamless loop */}
                {Array.from({ length: 2 }, () => 
                  Array.from({ length: 12 }, () => gamemodes).flat()
                ).flat().map((game, index) => (
                  <motion.div
                    key={`top-${index}`}
                    className="game-card rounded-xl p-4 md:p-6 text-center flex flex-col h-[240px] md:h-[280px] cursor-pointer min-w-[200px] md:min-w-[240px] flex-shrink-0 inline-block hover:z-50 relative"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <div className="text-3xl md:text-4xl mb-3 md:mb-4">{game.icon}</div>
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2">{game.name}</h3>
                      <p className="text-gray-300 text-xs md:text-sm mb-3 md:mb-4">{game.description}</p>
                    </div>
                    <div className="mt-auto pt-3 md:pt-4">
                      <Link to={`/casino/${game.name.toLowerCase()}`} className="block">
                        <GoldButton className="w-full text-sm md:text-base">
                          Play now
                        </GoldButton>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom Row - Seamless Loop (Right to Left Counter-Flow) */}
            <div className="relative h-[300px] overflow-hidden">
              <div 
                className="flex gap-6 absolute whitespace-nowrap animate-scroll-right pt-3"
                style={{ width: "fit-content" }}
              >
                {/* Double the cards for seamless loop */}
                {Array.from({ length: 2 }, () => 
                  Array.from({ length: 12 }, () => gamemodes).flat()
                ).flat().map((game, index) => (
                  <motion.div
                    key={`bottom-${index}`}
                    className="game-card rounded-xl p-4 md:p-6 text-center flex flex-col h-[240px] md:h-[280px] cursor-pointer min-w-[200px] md:min-w-[240px] flex-shrink-0 inline-block hover:z-50 relative"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <div className="text-3xl md:text-4xl mb-3 md:mb-4">{game.icon}</div>
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2">{game.name}</h3>
                      <p className="text-gray-300 text-xs md:text-sm mb-3 md:mb-4">{game.description}</p>
                    </div>
                    <div className="mt-auto pt-3 md:pt-4">
                      <Link to={`/casino/${game.name.toLowerCase()}`} className="block">
                        <GoldButton className="w-full text-sm md:text-base">
                          Play now
                        </GoldButton>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Fade Gradients for Edge Effects */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none z-10"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black via-black/80 to-transparent pointer-events-none z-10"></div>
          </div>
        </div>
      </section>

      {/* Proof Section - Ladder Layout with Animated Lines */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8 sm:mb-12 text-center md:text-left">Proof</h2>
          
          <div className="relative overflow-hidden">
            {proofCards.map((card, index) => {
              const isEven = index % 2 === 0;
              const isLast = index === proofCards.length - 1;
              const cardId = `card-${card.id}`;
              const isCopied = copiedHash === cardId;
              
              return (
                <div key={card.id} className="relative">
                  {/* Proof Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    className={`relative mb-12 sm:mb-16 md:mb-20 ${
                      isEven 
                        ? 'lg:translate-x-[-5%] xl:translate-x-[-10%] 2xl:translate-x-[-15%]' 
                        : 'lg:translate-x-[5%] xl:translate-x-[10%] 2xl:translate-x-[15%]'
                    }`}
                  >
                    {/* Success Notification */}
                    {showSuccessNotification === `card-${card.id}` && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold z-10">
                        SUCCESS ✓
                      </div>
                    )}
                    
                    <div 
                      className="bg-[#2C2C2C] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl font-mono text-[#00FFAA] shadow-[inset_0_0_20px_rgba(255,215,0,0.2)] hover:scale-105 hover:shadow-[0_20px_40px_rgba(255,215,0,0.3),0_0_30px_rgba(255,215,0,0.4),inset_0_1px_0_rgba(255,215,0,0.2)] transition-all duration-300 cursor-pointer group w-full max-w-sm sm:max-w-md mx-auto lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl border border-transparent hover:border-[rgba(255,215,0,0.8)]"
                      onClick={() => copyToClipboard(card, card.id)}
                    >
                      <div className="space-y-2 text-xs sm:text-sm md:text-base">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                          <span className="text-[#FFD700] sm:mr-4 min-w-[60px] sm:min-w-[70px]">Protocol:</span>
                          <span className="text-[#00FFAA] break-words">{card.protocol || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                          <span className="text-[#FFD700] sm:mr-4 min-w-[60px] sm:min-w-[70px]">Algorithm:</span>
                          <span className="text-[#00FFAA] break-words">{card.algorithm || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                          <span className="text-[#FFD700] sm:mr-4 min-w-[60px] sm:min-w-[70px]">Security:</span>
                          <span className="text-[#00FFAA] break-words">{card.security || 'N/A'}</span>
                        </div>
                        <div className="pt-2">
                          <div className="text-[#FFD700] mb-1">Hash:</div>
                          <div className="text-[#00FFAA] text-xs break-all font-mono group-hover:text-sm transition-all duration-300 max-w-full overflow-hidden">
                            <span className="group-hover:hidden">{card.hash.substring(0, 10)}...</span>
                            <span className="hidden group-hover:inline">{card.hash}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Copy icon on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>

                  {/* Simple Vertical Connection Line */}
                  {!isLast && (
                    <div className="flex justify-center mb-12 sm:mb-16 md:mb-20">
                      <motion.div
                        className="w-0.5 bg-[#FFD700]"
                        style={{ height: "80px" }}
                        initial={{ height: 0 }}
                        whileInView={{ height: "80px" }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ 
                          duration: 0.5, 
                          delay: (index * 0.2) + 0.4,
                          ease: "easeOut" 
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reviews Section - Auto-rotating Carousel */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Reviews</h2>
          
          {reviewsLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center">
              <div className="text-6xl mb-4">⭐</div>
              <p className="text-gray-400 text-lg">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <>
              {/* Carousel Container */}
              <div className="relative overflow-hidden rounded-xl">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentReviewIndex * 100}%)` }}
                >
                  {reviews.map((review, index) => (
                    <div key={review.id} className="w-full flex-shrink-0 px-4">
                      <div className="review-card rounded-xl p-8 text-center max-w-2xl mx-auto">
                        <div className="star-rating mb-6 text-2xl">
                          {'⭐'.repeat(review.rating)}
                        </div>
                        <p className="text-white text-xl font-semibold mb-6 leading-relaxed">
                          "{review.description}"
                        </p>
                        <p className="text-gray-400 text-lg">- {review.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel Indicators */}
              <div className="flex justify-center mt-8 space-x-2">
                {reviews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentReviewIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                      index === currentReviewIndex 
                        ? 'bg-yellow-400' 
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    aria-label={`Go to review ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <LightButton 
            onClick={() => window.open(DISCORD_INVITE_LINK, '_blank')}
            className="mb-8 flex-col"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Discord server</span>
          </LightButton>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full border border-yellow-500/20">
            <div className="text-center">
              {/* Animated Logo */}
              <div className="mb-6">
                <div className="relative scale-50 mx-auto w-fit">
                  <div className="absolute -left-12 -top-6 text-4xl transform -rotate-45 animate-bounce">
                    ⛏️
                  </div>
                  <div className="relative bg-yellow-400 rounded-xl p-3 shadow-2xl animate-pulse">
                    <div className="text-red-600 text-3xl">♠️</div>
                    <div className="absolute bottom-0 left-1/2 transform translate-y-full -translate-x-1/2">
                      <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[15px] border-l-transparent border-r-transparent border-t-yellow-400"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">Join MINECASH</h2>
              <p className="text-gray-300 mb-6">
                Sign up with Discord to start playing and managing your GC balance!
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={signInWithDiscord}
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </button>
                
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
