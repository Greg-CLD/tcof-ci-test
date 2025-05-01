import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  User, 
  History, 
  LogOut,
  Settings,
  Key,
  Save
} from "lucide-react";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "../assets/logo.png";

export default function SiteHeader() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, clearAuth } = useAuthProtection();
  const { user, logoutMutation } = useAuth();
  
  // Check if user is authenticated using either method
  const isLoggedInWithPassword = isAuthenticated('starter-access') || isAuthenticated('pro-tools');
  const isLoggedIn = !!user || isLoggedInWithPassword;
  
  // Handle sign out for password-based auth
  const handlePasswordSignOut = () => {
    clearAuth('starter-access');
    clearAuth('pro-tools');
  };
  
  // Handle sign out for database auth
  const handleDatabaseSignOut = () => {
    logoutMutation.mutate();
  };
  
  // Combined sign out
  const handleSignOut = () => {
    if (user) {
      handleDatabaseSignOut();
    }
    if (isLoggedInWithPassword) {
      handlePasswordSignOut();
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <a href="https://www.confluity.co.uk/TCOF" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <img 
              src={logoImage} 
              alt="Confluity Logo" 
              className="h-12 md:h-16" 
            />
          </a>
          
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors ${location === '/' ? 'font-medium' : ''}`}
            >
              Home
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className={`flex items-center gap-1 text-tcof-dark hover:text-tcof-teal transition-colors ${location.startsWith('/tools') ? 'font-medium' : ''}`}>
                Starter Kit <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem>
                  <Link href="/tools/starter-access" className="w-full">
                    Starter Kit Access
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/tools/goal-mapping" className="w-full">
                    Goal-Mapping Tool
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/tools/cynefin-orientation" className="w-full">
                    Cynefin Orientation Tool
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/tools/tcof-journey" className="w-full">
                    TCOF Journey Decision Tree
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <div className="flex items-center gap-2">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-tcof-teal text-tcof-teal hover:bg-tcof-light flex gap-2 items-center">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                      Account
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/history")}>
                      <History className="mr-2 h-4 w-4" />
                      <span>View History</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/pricing")}>
                      <Key className="mr-2 h-4 w-4" />
                      <span>Upgrade Plan</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!user && (
                <Button 
                  variant="outline" 
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-teal/10"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth">
                <Button 
                  variant="outline" 
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/auth" className="hidden sm:block">
                <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}