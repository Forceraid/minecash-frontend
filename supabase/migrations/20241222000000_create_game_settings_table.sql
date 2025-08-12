-- Create game_settings table for storing GameConfig data
CREATE TABLE IF NOT EXISTS game_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  bet_limits JSONB NOT NULL DEFAULT '{}',
  house_edge JSONB NOT NULL DEFAULT '{}',
  game_timing JSONB NOT NULL DEFAULT '{}',
  chat_settings JSONB NOT NULL DEFAULT '{}',
  balance_limits JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game settings
INSERT INTO game_settings (id, bet_limits, house_edge, game_timing, chat_settings, balance_limits) 
VALUES (
  1,
  '{
    "blackjack": {"min": 10, "max": 10000},
    "roulette": {"min": 5, "max": 5000},
    "crash": {"min": 1, "max": 1000},
    "slots": {"min": 1, "max": 500},
    "hiLo": {"min": 5, "max": 2000}
  }',
  '{
    "blackjack": 0.02,
    "roulette": 0.027,
    "crash": 0.01,
    "slots": 0.04,
    "hiLo": 0.015
  }',
  '{
    "bettingPhase": 30000,
    "gamePhase": 60000,
    "resultPhase": 10000
  }',
  '{
    "messageRateLimit": 2000,
    "maxMessageLength": 200,
    "maxHistoryLength": 100
  }',
  '{
    "minBalance": 0,
    "maxBalance": 1000000
  }'
) ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_game_settings_updated_at
  BEFORE UPDATE ON game_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_game_settings_updated_at();

-- Add RLS policies
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to game settings" ON game_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow write access only to service role (for admin operations)
CREATE POLICY "Allow write access to game settings" ON game_settings
  FOR ALL USING (auth.role() = 'service_role'); 