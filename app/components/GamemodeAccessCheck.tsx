import { useAuth } from "../contexts/AuthContext";
import { gamemodeAccessHelpers } from "../lib/supabase";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { LightButton } from "./Button";

interface GamemodeAccessCheckProps {
  gamemode: string;
  children: React.ReactNode;
}

export function GamemodeAccessCheck({ gamemode, children }: GamemodeAccessCheckProps) {
  const { user, isAdmin } = useAuth();
  const [isDisabled, setIsDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    
    const checkAccess = async () => {
      try {
        setLoading(true);
        const disabled = await gamemodeAccessHelpers.isGamemodeDisabled(gamemode);
        setIsDisabled(disabled);
        checkedRef.current = true;
      } catch (error) {
        console.error('Error checking gamemode access:', error);
        setIsDisabled(false); // Default to enabled on error
        checkedRef.current = true;
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [gamemode]);

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading gamemode access...</p>
        </div>
      </div>
    );
  }

  // If gamemode is disabled and user is not admin, show access denied
  if (isDisabled && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">🚫</div>
          <h2 className="text-3xl font-bold mb-4">Access denied</h2>
          <p className="text-lg mb-8 text-gray-300">
            The {gamemode} gamemode is currently disabled for maintenance.
          </p>
          <Link to="/">
            <LightButton>← Back to Home</LightButton>
          </Link>
        </div>
      </div>
    );
  }

  // If gamemode is disabled but user is admin, show admin notice
  if (isDisabled && isAdmin) {
    return <>{children}</>;
  }

  // If gamemode is enabled, show normal content
  return <>{children}</>;
} 