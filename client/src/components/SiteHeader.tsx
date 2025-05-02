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
  Save,
  Menu,
  X,
  Home,
  BookOpen,
  Monitor,
  DollarSign
} from "lucide-react";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "../assets/logo.png";

export default function SiteHeader() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, clearAuth } = useAuthProtection();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
    setMobileMenuOpen(false);
  };
  
  // Handle navigation and close mobile menu
  const handleNavigation = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
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
          
          {/* Desktop Navigation */}
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

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-tcof-dark" />
              ) : (
                <Menu className="h-6 w-6 text-tcof-dark" />
              )}
            </Button>
          </div>
          
          {/* Desktop User Profile / Auth Buttons */}
          <div className="hidden md:block">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {/* Desktop User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-tcof-teal text-tcof-teal hover:bg-tcof-light flex gap-2 items-center">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user ? user.username : "Account"}</span>
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
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-gray-200 mt-4">
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/"
                onClick={() => handleNavigation("/")}
                className={`flex items-center py-2 px-3 rounded-md ${location === '/' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
              >
                <Home className="h-5 w-5 mr-2" /> Home
              </Link>
              
              <div className="space-y-1">
                <div className="font-medium text-tcof-dark mb-1 flex items-center px-3 py-1">
                  <BookOpen className="h-5 w-5 mr-2" /> Starter Kit
                </div>
                <Link 
                  href="/tools/starter-access"
                  onClick={() => handleNavigation("/tools/starter-access")}
                  className={`block py-1 px-8 text-sm rounded-md ${location === '/tools/starter-access' ? 'bg-tcof-light/70 text-tcof-teal' : 'hover:bg-tcof-light/30'}`}
                >
                  Starter Kit Access
                </Link>
                <Link 
                  href="/tools/goal-mapping"
                  onClick={() => handleNavigation("/tools/goal-mapping")}
                  className={`block py-1 px-8 text-sm rounded-md ${location === '/tools/goal-mapping' ? 'bg-tcof-light/70 text-tcof-teal' : 'hover:bg-tcof-light/30'}`}
                >
                  Goal-Mapping Tool
                </Link>
                <Link 
                  href="/tools/cynefin-orientation"
                  onClick={() => handleNavigation("/tools/cynefin-orientation")}
                  className={`block py-1 px-8 text-sm rounded-md ${location === '/tools/cynefin-orientation' ? 'bg-tcof-light/70 text-tcof-teal' : 'hover:bg-tcof-light/30'}`}
                >
                  Cynefin Orientation Tool
                </Link>
                <Link 
                  href="/tools/tcof-journey"
                  onClick={() => handleNavigation("/tools/tcof-journey")}
                  className={`block py-1 px-8 text-sm rounded-md ${location === '/tools/tcof-journey' ? 'bg-tcof-light/70 text-tcof-teal' : 'hover:bg-tcof-light/30'}`}
                >
                  TCOF Journey Decision Tree
                </Link>
              </div>
              
              <Link 
                href="/pro-tools"
                onClick={() => handleNavigation("/pro-tools")}
                className={`flex items-center py-2 px-3 rounded-md ${location === '/pro-tools' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
              >
                <Monitor className="h-5 w-5 mr-2" /> Pro Tools
              </Link>
              
              <Link 
                href="/pricing"
                onClick={() => handleNavigation("/pricing")}
                className={`flex items-center py-2 px-3 rounded-md ${location === '/pricing' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
              >
                <DollarSign className="h-5 w-5 mr-2" /> Pricing
              </Link>

              {isLoggedIn && (
                <>
                  <div className="border-t border-gray-100 pt-2 space-y-2">
                    <Link 
                      href="/profile"
                      onClick={() => handleNavigation("/profile")}
                      className={`flex items-center py-2 px-3 rounded-md ${location === '/profile' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                    >
                      <User className="h-5 w-5 mr-2" /> My Profile
                    </Link>
                    
                    <Link 
                      href="/history"
                      onClick={() => handleNavigation("/history")}
                      className={`flex items-center py-2 px-3 rounded-md ${location === '/history' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                    >
                      <History className="h-5 w-5 mr-2" /> View History
                    </Link>
                    
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center py-2 px-3 rounded-md text-red-500 w-full text-left"
                    >
                      <LogOut className="h-5 w-5 mr-2" /> Sign Out
                    </button>
                  </div>
                </>
              )}
              
              {!isLoggedIn && (
                <div className="border-t border-gray-100 pt-2 flex flex-col gap-2">
                  <Link 
                    href="/auth"
                    onClick={() => handleNavigation("/auth")}
                    className="w-full"
                  >
                    <Button 
                      variant="outline" 
                      className="border-tcof-teal text-tcof-teal hover:bg-tcof-light w-full"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link 
                    href="/auth"
                    onClick={() => handleNavigation("/auth")}
                    className="w-full"
                  >
                    <Button 
                      className="bg-tcof-teal hover:bg-tcof-teal/90 text-white w-full"
                    >
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}