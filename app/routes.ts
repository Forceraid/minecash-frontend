import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth-callback", "routes/auth-callback.tsx"),
  route("admin", "routes/admin.tsx"),
  route("profile", "routes/profile.tsx"),
  route("support", "routes/support.tsx"),
  // Gamemode routes
  route("casino/blackjack", "routes/casino/blackjack.tsx"),
  route("casino/roulette", "routes/casino/roulette.tsx"),
  route("casino/crash", "routes/casino/crash.tsx"),
  route("casino/slots", "routes/casino/slots.tsx"),
  route("casino/hi-lo", "routes/casino/hi-lo.tsx"),
] satisfies RouteConfig;
