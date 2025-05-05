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
  User, 
  History, 
  LogOut,
  Key,
  Menu,
  X,
  BarChart as BarChartIcon,
  CheckSquare,
  Compass,
  ClipboardList,
  ChevronDown,
  Home,
  BookOpen,
  Monitor,
  DollarSign,
  Filter,
  Briefcase
} from "lucide-react";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/use-auth";
import ProjectBanner from "@/components/ProjectBanner";
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
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors ${location === '/' ? 'nav-link active font-medium' : 'nav-link'}`}
            >
              <Home className="h-4 w-4 mr-1" /> Home
            </Link>
            <Link 
              href="/get-your-bearings/project-profile" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors flex items-center ${location.includes('project-profile') ? 'nav-link active font-medium' : 'nav-link'}`}
            >
              <Briefcase className="h-4 w-4 mr-1" /> Project Profile
            </Link>
            <Link 
              href="/checklist" 
              className={`text-tcof-dark hover:text-tcof-teal transition-colors flex items-center ${location === '/checklist' ? 'nav-link active font-medium' : 'nav-link'}`}
            >
              <CheckSquare className="h-4 w-4 mr-1" /> Checklist
            </Link>
            {!isLoggedIn && (
              <Link 
                href="/pricing" 
                className={`text-tcof-dark hover:text-tcof-teal transition-colors flex items-center ${location === '/pricing' ? 'nav-link active font-medium' : 'nav-link'}`}
              >
                <DollarSign className="h-4 w-4 mr-1" /> Pricing
              </Link>
            )}
            {user && user.username.toLowerCase() === 'greg@confluity.co.uk' && (
              <Link 
                href="/make-a-plan/admin" 
                className={`text-tcof-dark hover:text-tcof-teal transition-colors flex items-center ${location.includes('/make-a-plan/admin') ? 'nav-link active font-medium' : 'nav-link'}`}
              >
                <Filter className="h-4 w-4 mr-1" /> Admin
              </Link>
            )}
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
                    <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                      <BarChartIcon className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
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
                    {user && user.username.toLowerCase() === 'greg@confluity.co.uk' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLocation("/make-a-plan/admin/factors")}>
                          <Filter className="mr-2 h-4 w-4" />
                          <span>Admin - Factors</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation("/make-a-plan/admin")}>
                          <Filter className="mr-2 h-4 w-4" />
                          <span>Admin - Presets</span>
                        </DropdownMenuItem>
                      </>
                    )}
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
              
              <Link 
                href="/get-your-bearings/project-profile"
                onClick={() => handleNavigation("/get-your-bearings/project-profile")}
                className={`flex items-center py-2 px-3 rounded-md ${location.includes('project-profile') ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
              >
                <Briefcase className="h-5 w-5 mr-2" /> Project Profile
              </Link>
              
              <Link 
                href="/checklist"
                onClick={() => handleNavigation("/checklist")}
                className={`flex items-center py-2 px-3 rounded-md ${location === '/checklist' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
              >
                <CheckSquare className="h-5 w-5 mr-2" /> Checklist
              </Link>
              
              {/* Pricing link (mobile) - only shown when not logged in */}
              {!isLoggedIn && (
                <Link 
                  href="/pricing"
                  onClick={() => handleNavigation("/pricing")}
                  className={`flex items-center py-2 px-3 rounded-md ${location === '/pricing' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
                >
                  <DollarSign className="h-5 w-5 mr-2" /> Pricing
                </Link>
              )}
              
              {/* Admin link (mobile) */}
              {user && user.username.toLowerCase() === 'greg@confluity.co.uk' && (
                <Link 
                  href="/make-a-plan/admin"
                  onClick={() => handleNavigation("/make-a-plan/admin")}
                  className={`flex items-center py-2 px-3 rounded-md ${location.includes('/make-a-plan/admin') ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
                >
                  <Filter className="h-5 w-5 mr-2" /> Admin
                </Link>
              )}
              
              {/* Tools Submenu */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <div className="font-medium text-gray-500 text-sm mb-1 flex items-center px-3 py-1">
                  Tool Pages
                </div>
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

              {isLoggedIn && (
                <>
                  <div className="border-t border-gray-100 pt-2 space-y-2">
                    <Link 
                      href="/dashboard"
                      onClick={() => handleNavigation("/dashboard")}
                      className={`flex items-center py-2 px-3 rounded-md ${location === '/dashboard' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                    >
                      <BarChartIcon className="h-5 w-5 mr-2" /> Dashboard
                    </Link>
                    
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
                    
                    {user && user.username.toLowerCase() === 'greg@confluity.co.uk' && (
                      <>
                        <Link 
                          href="/make-a-plan/admin/factors"
                          onClick={() => handleNavigation("/make-a-plan/admin/factors")}
                          className={`flex items-center py-2 px-3 rounded-md ${location === '/make-a-plan/admin/factors' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                        >
                          <Filter className="h-5 w-5 mr-2" /> Admin - Factors
                        </Link>
                        <Link 
                          href="/make-a-plan/admin"
                          onClick={() => handleNavigation("/make-a-plan/admin")}
                          className={`flex items-center py-2 px-3 rounded-md ${location === '/make-a-plan/admin' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                        >
                          <Filter className="h-5 w-5 mr-2" /> Admin - Presets
                        </Link>
                      </>
                    )}
                    
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