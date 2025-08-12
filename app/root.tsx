import {
  isRouteErrorResponse,
  Links,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { ReactNode } from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { AuthProvider } from "./contexts/AuthContext";
import { GCBalanceProvider } from "./contexts/GCBalanceContext";
import { Header } from "./components/Header";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  // Favicon links
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
  { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Essential Meta Tags for Link Previews */}
        <title>MINECASH - Your ultimate GC Casino Experience</title>
        <meta name="description" content="Experience the best GC casino with Blackjack, Roulette, Crash, Slots, and Hi-Lo. Fair gaming, fast payouts, and 24/7 entertainment!" />
        <meta name="keywords" content="minecraft casino, gc casino, blackjack, roulette, crash, slots, hi-lo, gaming" />
        <meta name="author" content="MINECASH" />
        
        {/* Open Graph Meta Tags (Facebook, Discord, etc.) */}
        <meta property="og:title" content="MINECASH - Your ultimate GC Casino Experience" />
        <meta property="og:description" content="Experience the best GC casino with Blackjack, Roulette, Crash, Slots, and Hi-Lo. Fair gaming, fast payouts, and 24/7 entertainment!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://minecash.com" />
        <meta property="og:image" content="/images/mainlogo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="MINECASH" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MINECASH - Your ultimate GC Casino Experience" />
        <meta name="twitter:description" content="Experience the best GC casino with Blackjack, Roulette, Crash, Slots, and Hi-Lo. Fair gaming, fast payouts, and 24/7 entertainment!" />
        <meta name="twitter:image" content="/images/mainlogo.png" />
        
        {/* Additional Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#C89E00" />
        
        <Links />
      </head>
      <body>
        <AuthProvider>
          <GCBalanceProvider>
            <Header />
            {children}
          </GCBalanceProvider>
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
