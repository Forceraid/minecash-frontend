-- Create trigger to automatically create GC balance for new users
-- This ensures every user has a GC balance entry when they sign up

-- Function to create GC balance for new user
CREATE OR REPLACE FUNCTION create_user_gc_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default GC balance for new user
  INSERT INTO gc_balances (user_id, balance, created_at, updated_at)
  VALUES (NEW.id, 0, NOW(), NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after a new user is inserted
CREATE TRIGGER trigger_create_user_gc_balance
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_gc_balance();

-- Function to get or create user GC balance (for existing users)
CREATE OR REPLACE FUNCTION ensure_user_gc_balance(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  existing_balance INTEGER;
BEGIN
  -- Check if user has GC balance
  SELECT balance INTO existing_balance
  FROM gc_balances
  WHERE user_id = p_user_id;
  
  -- If no balance exists, create one
  IF existing_balance IS NULL THEN
    INSERT INTO gc_balances (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, 0, NOW(), NOW());
    
    RETURN 0;
  ELSE
    RETURN existing_balance;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the get_user_gc_balance function to ensure balance exists
CREATE OR REPLACE FUNCTION get_user_gc_balance(p_user_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Ensure user has GC balance, create if missing
  RETURN ensure_user_gc_balance(p_user_id);
END;
$$ LANGUAGE plpgsql; 