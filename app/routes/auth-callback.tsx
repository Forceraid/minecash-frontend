import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

export function meta() {
  return [
    { title: "Authentication - Minecash" },
    { name: "description", content: "Completing authentication..." },
  ]
}

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash that contains auth tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken) {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })
          
          if (error) {
            console.error('Error setting session:', error)
            navigate('/?error=auth_failed')
            return
          }
          
          if (data.session) {
            console.log('Authentication successful!')
            
            // Ensure user exists in users table and has GC balance
            await ensureUserExists(data.session.user)
            
            // Sync Discord ID to users table if it's a Discord login
            if (data.session.user.app_metadata.provider === 'discord') {
              const discordId = data.session.user.user_metadata.sub || data.session.user.user_metadata.provider_id
              const discordUsername = data.session.user.user_metadata.full_name || data.session.user.user_metadata.name
              
              if (discordId) {
                try {
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ 
                      discord_id: discordId,
                      username: discordUsername || data.session.user.email?.split('@')[0] || 'Unknown'
                    })
                    .eq('auth_user_id', data.session.user.id)
                  
                  if (updateError) {
                    console.error('Error updating Discord data:', updateError)
                  } else {
                    console.log('Discord data synced to users table')
                  }
                } catch (error) {
                  console.error('Error syncing Discord data:', error)
                }
              }
            }
            
            navigate('/')
            return
          }
        }
        
        // Fallback: try to get existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          navigate('/?error=auth_failed')
          return
        }

        if (sessionData.session) {
          // Ensure user exists in users table and has GC balance
          await ensureUserExists(sessionData.session.user)
          navigate('/')
        } else {
          navigate('/?error=no_session')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/?error=auth_failed')
      }
    }

    // Function to ensure user exists in users table and has GC balance
    const ensureUserExists = async (user: any) => {
      try {
        // First, check if user exists in users table
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (userError || !existingUser) {
          // User doesn't exist, create them
          // The database trigger should automatically create the GC balance
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              auth_user_id: user.id,
              email: user.email,
              username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
              avatar_url: user.user_metadata?.avatar_url,
              role_id: 1 // Default user role
            })
            .select('id')
            .single()

          if (createError) {
            console.error('Error creating user:', createError)
            return
          }

          console.log('New user created with ID:', newUser.id)
          
          // Verify that GC balance was created by the trigger
          // If not, create it manually as a fallback
          setTimeout(async () => {
            try {
              const { data: balanceCheck, error: balanceError } = await supabase
                .from('gc_balances')
                .select('id')
                .eq('user_id', newUser.id)
                .single()

              if (balanceError || !balanceCheck) {
                console.log('Trigger may have failed, creating GC balance manually...')
                const { error: manualBalanceError } = await supabase
                  .from('gc_balances')
                  .insert({
                    user_id: newUser.id,
                    balance: 0
                  })

                if (manualBalanceError) {
                  console.error('Manual GC balance creation also failed:', manualBalanceError)
                } else {
                  console.log('GC balance created manually for user:', newUser.id)
                }
              } else {
                console.log('GC balance confirmed to exist for user:', newUser.id)
              }
            } catch (error) {
              console.error('Error checking/creating GC balance:', error)
            }
          }, 1000) // Check after 1 second to allow trigger to complete
        } else {
          console.log('Existing user found with ID:', existingUser.id)
        }
      } catch (error) {
        console.error('Error ensuring user exists:', error)
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-xl">Completing authentication...</p>
        <p className="text-gray-400 mt-2">Please wait while we sign you in</p>
      </div>
    </div>
  )
} 