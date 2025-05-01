import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuthProtection } from "@/hooks/use-auth-protection";

export default function SiteHeader() {
  const [location] = useLocation();
  const { isAuthenticated, clearAuth } = useAuthProtection();
  
  // Check if user is authenticated for either of the protected pages
  const isLoggedIn = isAuthenticated('starter-access') || isAuthenticated('pro-tools');
  
  // Handle sign out
  const handleSignOut = () => {
    clearAuth('starter-access');
    clearAuth('pro-tools');
  };
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Confluity Logo" 
              className="h-12 md:h-16" 
            />
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors ${location === '/' ? 'font-medium' : ''}`}
            >
              Home
            </Link>
            <Link 
              href="/tools/starter-access" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors ${location === '/tools/starter-access' ? 'font-medium' : ''}`}
            >
              Starter Kit
            </Link>
            <Link 
              href="/pro-tools" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors ${location === '/pro-tools' ? 'font-medium' : ''}`}
            >
              Pro Tools
            </Link>
            <Link 
              href="/pricing" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors ${location === '/pricing' ? 'font-medium' : ''}`}
            >
              Pricing
            </Link>
          </nav>
          
          {isLoggedIn ? (
            <Button 
              variant="outline" 
              className="border-tcof-teal text-tcof-teal hover:bg-tcof-teal/10"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          ) : (
            <Link href="/tools/starter-access">
              <Button 
                variant="outline" 
                className="border-tcof-teal text-tcof-teal hover:bg-tcof-teal/10"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}