// Backend API Client Configuration
// Purpose: Handle API calls to the backend server

import { supabase } from './supabase'

// Helper function to safely construct API URLs
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  // Remove trailing slash if present to prevent double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

class BackendApiClient {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No session token available')
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  async emergencyStop() {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(getApiUrl('/emergency-stop'), {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Emergency stop failed')
      }

      return await response.json()
    } catch (error) {
      // Handle "User profile not found" error as success (timing issue)
      if (error instanceof Error && error.message.includes('User profile not found')) {
        return { success: true, message: 'Emergency stop initiated successfully' }
      }
      
      console.error('Emergency stop error:', error)
      throw error
    }
  }

  async getBalance() {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(getApiUrl('/balance'), {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch balance')
      }

      return await response.json()
    } catch (error) {
      console.error('Get balance error:', error)
      throw error
    }
  }

  async placeBet(gameType: string, betAmount: number, gameId?: string) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(getApiUrl('/bet'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gameType,
          betAmount,
          gameId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Bet placement failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Place bet error:', error)
      throw error
    }
  }

  async getGameState(gamemode: string) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(getApiUrl(`/game-state/${gamemode}`), {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch game state')
      }

      return await response.json()
    } catch (error) {
      console.error('Get game state error:', error)
      throw error
    }
  }

  async getGameHistory(limit = 50, offset = 0) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(getApiUrl(`/game-history?limit=${limit}&offset=${offset}`), {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch game history')
      }

      return await response.json()
    } catch (error) {
      console.error('Get game history error:', error)
      throw error
    }
  }

  async sendChatMessage(message: string, gamemode: string) {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(getApiUrl('/chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          gamemode
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send chat message')
      }

      return await response.json()
    } catch (error) {
      console.error('Send chat message error:', error)
      throw error
    }
  }
}

export const backendApi = new BackendApiClient() 