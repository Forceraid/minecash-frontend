import { useAuth } from '../contexts/AuthContext'
import { useGCBalance } from '../contexts/GCBalanceContext'
import { Link } from 'react-router'
import { LightButton, MediumButton, DarkButton, GoldButton } from './Button'
import { useState, useRef, useEffect } from 'react'

export function Header() {
  const { user, loading, signInWithDiscord, signOut, isAdmin } = useAuth()
  const { balance, isLoading: balanceLoading } = useGCBalance()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [balanceOpen, setBalanceOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const balanceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (balanceRef.current && !balanceRef.current.contains(event.target as Node)) {
        setBalanceOpen(false)
      }
    }

    if (dropdownOpen || balanceOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen, balanceOpen])

  const closeDropdown = () => setDropdownOpen(false)

  if (loading) {
    return (
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 fixed top-0 left-0 right-0 z-[200]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-white text-xl font-bold">
              Minecash
            </Link>
            <div className="animate-pulse bg-white/20 h-8 w-24 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-black/30 backdrop-blur-sm border-b border-yellow-500/20 fixed top-0 left-0 right-0 z-[200]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-yellow-400 text-2xl font-bold hover:text-yellow-300 transition-colors">
            MINECASH
          </Link>
          
          <div className="flex items-center space-x-4">
            {/* GC Balance Component */}
            {user && (
              <div className="relative flex items-center" ref={balanceRef}>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${balanceOpen ? 'max-w-[200px] opacity-100 mr-3' : 'max-w-0 opacity-0 mr-0'}`}>
                  <div className="bg-gray-900/95 backdrop-blur-sm border border-yellow-500/20 rounded-lg px-4 py-2 whitespace-nowrap">
                    {balanceLoading ? (
                      <span className="text-yellow-400 font-semibold animate-pulse">Loading...</span>
                    ) : (
                      <span className="text-yellow-400 font-semibold">GC: {balance.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => setBalanceOpen(!balanceOpen)}
                  className="flex items-center text-yellow-400 hover:text-yellow-300 transition-colors focus:outline-none cursor-pointer"
                >
                  <svg className={`w-5 h-5 transition-transform duration-300 ${balanceOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
            
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 text-white hover:text-yellow-400 transition-colors focus:outline-none cursor-pointer"
                >
                  {user.user_metadata?.avatar_url && (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      className="w-8 h-8 rounded-full border-2 border-yellow-400"
                    />
                  )}
                  <span className="text-sm hidden sm:block">{user.user_metadata?.full_name || user.email}</span>
                  <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-5.5 w-64 bg-gray-900 border border-yellow-500/20 rounded-lg shadow-xl overflow-hidden z-[300]">
                    {/* Casino Section */}
                    <div className="px-4 py-3 border-b border-gray-700">
                      <h3 className="text-yellow-400 font-semibold text-sm mb-2">Casino</h3>
                                             <div className="space-y-1">
                         <Link 
                           to="/casino/blackjack" 
                           onClick={(e) => {
                             e.stopPropagation();
                             closeDropdown();
                           }} 
                           className="block px-2 py-1 text-sm text-white hover:bg-gray-800 hover:text-yellow-400 rounded transition-colors"
                         >
                           ♠️ Blackjack
                         </Link>
                         <Link 
                           to="/casino/roulette" 
                           onClick={(e) => {
                             e.stopPropagation();
                             closeDropdown();
                           }} 
                           className="block px-2 py-1 text-sm text-white hover:bg-gray-800 hover:text-yellow-400 rounded transition-colors"
                         >
                           🎯 Roulette
                         </Link>
                         <Link 
                           to="/casino/crash" 
                           onClick={(e) => {
                             e.stopPropagation();
                             closeDropdown();
                           }} 
                           className="block px-2 py-1 text-sm text-white hover:bg-gray-800 hover:text-yellow-400 rounded transition-colors"
                         >
                           📈 Crash
                         </Link>
                         <Link 
                           to="/casino/slots" 
                           onClick={(e) => {
                             e.stopPropagation();
                             closeDropdown();
                           }} 
                           className="block px-2 py-1 text-sm text-white hover:bg-gray-800 hover:text-yellow-400 rounded transition-colors"
                         >
                           🎰 Slots
                         </Link>
                         <Link 
                           to="/casino/hi-lo" 
                           onClick={(e) => {
                             e.stopPropagation();
                             closeDropdown();
                           }} 
                           className="block px-2 py-1 text-sm text-white hover:bg-gray-800 hover:text-yellow-400 rounded transition-colors"
                         >
                           🎲 Hi-Lo
                         </Link>
                       </div>
                    </div>

                                         {/* Profile Section */}
                     <div className="px-4 py-3 border-b border-gray-700">
                       <Link 
                         to="/profile" 
                         onClick={(e) => {
                           e.stopPropagation();
                           closeDropdown();
                         }} 
                         className="block text-yellow-400 font-semibold text-sm hover:text-yellow-300 transition-colors"
                       >
                         Profile
                       </Link>
                     </div>

                     {/* Support Section */}
                     <div className="px-4 py-3 border-b border-gray-700">
                       <Link 
                         to="/support" 
                         onClick={(e) => {
                           e.stopPropagation();
                           closeDropdown();
                         }} 
                         className="block text-yellow-400 font-semibold text-sm hover:text-yellow-300 transition-colors"
                       >
                         Support
                       </Link>
                     </div>

                     {/* Admin Dashboard (if admin) */}
                     {isAdmin && (
                       <div className="px-4 py-3 border-b border-gray-700">
                         <Link 
                           to="/admin" 
                           onClick={(e) => {
                             e.stopPropagation();
                             closeDropdown();
                           }} 
                           className="block text-red-400 font-semibold text-sm hover:text-red-300 transition-colors"
                         >
                           Admin only
                         </Link>
                       </div>
                     )}

                                         {/* Sign Out */}
                     <div className="px-4 py-3">
                       <button 
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           closeDropdown();
                           signOut();
                         }}
                         className="w-full text-left text-white hover:text-red-400 text-sm transition-colors cursor-pointer"
                       >
                         Sign out
                       </button>
                     </div>
                  </div>
                )}
              </div>
            ) : (
              <LightButton onClick={signInWithDiscord}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Discord</span>
              </LightButton>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 