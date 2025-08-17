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

  // Admin Methods
  async getGamemodeStats() {
    try {
      const response = await fetch(getApiUrl('/game/crash-main/state'), {
        headers: await this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch gamemode stats:', error);
      return null;
    }
  }

  async getGameConfig() {
    try {
      const response = await fetch(getApiUrl('/game-config'), {
        headers: await this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both response formats for backward compatibility
        const config = data.config || data;
        return config;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch game config:', error);
      return null;
    }
  }

  async updateGameConfig(newConfig: any) {
    try {
      const response = await fetch(getApiUrl('/game-config'), {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(newConfig)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success;
      }
      return false;
    } catch (error) {
      console.error('Failed to update game config:', error);
      return false;
    }
  }

  async getMemoryStats() {
    try {
      const response = await fetch(getApiUrl('/stats/memory'), {
        headers: await this.getAuthHeaders()
      });
      
      if (response.ok) {
        const stats = await response.json();
        return stats;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch memory stats:', error);
      return null;
    }
  }

  async getCrashGameState() {
    try {
      const response = await fetch(getApiUrl('/game/crash-main/state'), {
        headers: await this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch crash game state:', error);
      return null;
    }
  }

  async getHiLoGameState() {
    try {
      const response = await fetch(getApiUrl('/game/hi-lo-main/state'), {
        headers: await this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch hi-lo game state:', error);
      return null;
    }
  }

  async emergencyStop() {
    try {
      const response = await fetch(getApiUrl('/admin/emergency-stop'), {
        method: 'POST',
        headers: await this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success;
      }
      return false;
    } catch (error) {
      console.error('Failed to initiate emergency stop:', error);
      return false;
    }
  }

  // Additional admin methods needed by admin.tsx
  async getAdminLogs() {
    try {
      // This would typically come from the database, not an API endpoint
      // For now, return null to indicate no logs available
      return null;
    } catch (error) {
      console.error('Failed to fetch admin logs:', error);
      return null;
    }
  }

  async getGamemodeRestrictions() {
    try {
      // This would typically come from the database, not an API endpoint
      // For now, return null to indicate no restrictions available
      return null;
    } catch (error) {
      console.error('Failed to fetch gamemode restrictions:', error);
      return null;
    }
  }

  async getUserStats(userId: number) {
    try {
      // This would typically come from the database, not an API endpoint
      // For now, return null to indicate no stats available
      return null;
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      return null;
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