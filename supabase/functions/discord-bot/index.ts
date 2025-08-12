import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Types for Discord bot requests and responses
interface DiscordBotRequest {
  action: 'create_ticket' | 'check_user' | 'get_gc_limits';
  userId: string;
  type?: 'deposit' | 'withdraw' | 'support';
  amount?: number;
  description?: string;
}

interface DiscordBotResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Environment variables
const DISCORD_BOT_URL = Deno.env.get('DISCORD_BOT_URL') || 'https://minecash-discord-bot.onrender.com';
const DISCORD_BOT_SECRET = Deno.env.get('DISCORD_BOT_SECRET');

console.info('Discord bot function started');

// Main Edge Function handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    // Parse and validate request body
    const body: DiscordBotRequest = await req.json();
    const { action, userId, type, amount, description } = body;

    // Validate required fields
    if (!action || !userId) {
      return createErrorResponse('Missing required fields: action and userId', 400);
    }

    // Route to appropriate handler
    switch (action) {
      case 'check_user':
        return await handleCheckUser(userId);
      
      case 'create_ticket':
        if (!type) {
          return createErrorResponse('Ticket type required for create_ticket action', 400);
        }
        return await handleCreateTicket(userId, type, amount, description);
      
      case 'get_gc_limits':
        return await handleGetGCLimits();
      
      default:
        return createErrorResponse('Invalid action', 400);
    }

  } catch (error) {
    console.error('Discord bot function error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

// Helper function to create error responses
function createErrorResponse(message: string, status: number): Response {
  const data = {
    success: false,
    error: message
  };

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    }
  );
}

// Helper function to create success responses
function createSuccessResponse(data: any, message: string = 'Success'): Response {
  const response = {
    success: true,
    message,
    data
  };

  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    }
  );
}

// Handle user checking requests
async function handleCheckUser(userId: string): Promise<Response> {
  try {
    const response = await fetch(`${DISCORD_BOT_URL}/check-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DISCORD_BOT_SECRET}`,
      },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();
    
    // Always return 200 status, but include error info in response body
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      }
    );
    
  } catch (error) {
    console.error('Error checking user:', error);
    return createErrorResponse('Failed to check user status', 500);
  }
}

// Handle ticket creation requests
async function handleCreateTicket(
  userId: string, 
  type: 'deposit' | 'withdraw' | 'support', 
  amount?: number, 
  description?: string
): Promise<Response> {
  try {
    // Ensure amount is always included in the request body, even if null/undefined
    const requestBody = {
      userId,
      type,
      amount: amount !== undefined ? amount : null,
      description: description || ''
    };

    const response = await fetch(`${DISCORD_BOT_URL}/create-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DISCORD_BOT_SECRET}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    // Always return 200 status, but include error info in response body
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      }
    );
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    return createErrorResponse('Failed to create ticket', 500);
  }
}

// Handle GC limits requests
async function handleGetGCLimits(): Promise<Response> {
  try {
    const response = await fetch(`${DISCORD_BOT_URL}/gc-limits`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DISCORD_BOT_SECRET}`,
      },
    });

    const result = await response.json();
    
    // Always return 200 status, but include error info in response body
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      }
    );
    
  } catch (error) {
    console.error('Error getting GC limits:', error);
    return createErrorResponse('Failed to get GC limits', 500);
  }
} 