import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { UserMenu, LoginButton } from "@/components/auth-buttons";
import { AuthStatus } from "@/components/AuthStatus";
// ProjectBanner import removed - not used in this component
import logoImage from "../assets/logo.png";

// Keep track of header instances
const instanceCounter = {count: 0};

export default function SiteHeader() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, clearAuth } = useAuthProtection();
  const { user, isAuthenticated: isAuthenticatedWithReplit } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Log mount/unmount to debug duplicate headers
  useEffect(() => {
    instanceCounter.count++;
    console.log(`SiteHeader mounted. Total instances: ${instanceCounter.count}`);
    
    return () => {
      instanceCounter.count--;
      console.log(`SiteHeader unmounted. Remaining instances: ${instanceCounter.count}`);
    };
  }, []);
  
  // Check if user is authenticated using either method
  const isLoggedInWithPassword = isAuthenticated('starter-access') || isAuthenticated('pro-tools');
  const isLoggedIn = isAuthenticatedWithReplit || isLoggedInWithPassword;
  
  // Handle sign out for password-based auth
  const handlePasswordSignOut = () => {
    clearAuth('starter-access');
    clearAuth('pro-tools');
  };
  
  // Combined sign out (only password auth for now as Replit auth has its own button)
  const handleSignOut = () => {
    if (isLoggedInWithPassword) {
      handlePasswordSignOut();
    }
    setMobileMenuOpen(false);
  };
  
  // Handle navigation and close mobile menu - WITHOUT causing re-renders
  const handleNavigation = () => {
    // ONLY close the mobile menu, let the Link component handle the navigation
    // This prevents the infinite loop caused by calling navigate()
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
            {user && (
              <>
                <Link 
                  href="/organisations" 
                  className={`text-tcof-dark hover:text-tcof-teal transition-colors flex items-center ${location === '/organisations' ? 'nav-link active font-medium' : 'nav-link'}`}
                >
                  <Briefcase className="h-4 w-4 mr-1" /> Organisations
                </Link>
                
                <Link 
                  href="/all-projects" 
                  className={`text-tcof-dark hover:text-tcof-teal transition-colors flex items-center ${location === '/all-projects' ? 'nav-link active font-medium' : 'nav-link'}`}
                >
                  <ClipboardList className="h-4 w-4 mr-1" /> All Projects
                </Link>
              </>
            )}
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
          <div className="hidden md:flex items-center gap-4">
            <div className="text-xs">
              <AuthStatus />
            </div>
            {isLoggedIn ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-2">
                <LoginButton />
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
              {/* Only show these links when logged in */}
              {user && (
                <>
                  <Link 
                    href="/organisations"
                    onClick={handleNavigation}
                    className={`flex items-center py-2 px-3 rounded-md ${location === '/organisations' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
                  >
                    <Briefcase className="h-5 w-5 mr-2" /> Organisations
                  </Link>
                  
                  <Link 
                    href="/all-projects"
                    onClick={handleNavigation}
                    className={`flex items-center py-2 px-3 rounded-md ${location === '/all-projects' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
                  >
                    <ClipboardList className="h-5 w-5 mr-2" /> All Projects
                  </Link>
                </>
              )}
              
              {/* Pricing link (mobile) - only shown when not logged in */}
              {!isLoggedIn && (
                <Link 
                  href="/pricing"
                  onClick={handleNavigation}
                  className={`flex items-center py-2 px-3 rounded-md ${location === '/pricing' ? 'bg-tcof-light text-tcof-teal font-medium' : 'text-tcof-dark'}`}
                >
                  <DollarSign className="h-5 w-5 mr-2" /> Pricing
                </Link>
              )}
              
              {/* Admin link (mobile) */}
              {user && (user.username.toLowerCase() === 'greg@confluity.co.uk' || user.email?.toLowerCase() === 'greg@confluity.co.uk' || user.username.toLowerCase() === 'greg') && (
                <Link 
                  href="/make-a-plan/admin"
                  onClick={handleNavigation}
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
                  onClick={handleNavigation}
                  className={`block py-1 px-8 text-sm rounded-md ${location === '/tools/goal-mapping' ? 'bg-tcof-light/70 text-tcof-teal' : 'hover:bg-tcof-light/30'}`}
                >
                  Goal-Mapping Tool
                </Link>
                <Link 
                  href="/tools/cynefin-orientation"
                  onClick={handleNavigation}
                  className={`block py-1 px-8 text-sm rounded-md ${location === '/tools/cynefin-orientation' ? 'bg-tcof-light/70 text-tcof-teal' : 'hover:bg-tcof-light/30'}`}
                >
                  Cynefin Orientation Tool
                </Link>
                <Link 
                  href="/tools/tcof-journey"
                  onClick={handleNavigation}
                  className={`block py-1 px-8 text-sm rounded-md ${location === '/tools/tcof-journey' ? 'bg-tcof-light/70 text-tcof-teal' : 'hover:bg-tcof-light/30'}`}
                >
                  TCOF Journey Decision Tree
                </Link>
              </div>

              {isLoggedIn && (
                <>
                  <div className="border-t border-gray-100 pt-2 space-y-2">
                    <div className="px-3 py-2 text-xs">
                      <AuthStatus />
                    </div>
                    <Link 
                      href="/dashboard"
                      onClick={handleNavigation}
                      className={`flex items-center py-2 px-3 rounded-md ${location === '/dashboard' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                    >
                      <BarChartIcon className="h-5 w-5 mr-2" /> Dashboard
                    </Link>
                    
                    <Link 
                      href="/profile"
                      onClick={handleNavigation}
                      className={`flex items-center py-2 px-3 rounded-md ${location === '/profile' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                    >
                      <User className="h-5 w-5 mr-2" /> My Profile
                    </Link>
                    
                    <Link 
                      href="/history"
                      onClick={handleNavigation}
                      className={`flex items-center py-2 px-3 rounded-md ${location === '/history' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                    >
                      <History className="h-5 w-5 mr-2" /> View History
                    </Link>
                    
                    {user && (user.username.toLowerCase() === 'greg@confluity.co.uk' || user.email?.toLowerCase() === 'greg@confluity.co.uk' || user.username.toLowerCase() === 'greg') && (
                      <>
                        <Link 
                          href="/make-a-plan/admin/factors"
                          onClick={handleNavigation}
                          className={`flex items-center py-2 px-3 rounded-md ${location === '/make-a-plan/admin/factors' ? 'bg-tcof-light' : ''} text-tcof-teal`}
                        >
                          <Filter className="h-5 w-5 mr-2" /> Admin - Factors
                        </Link>
                        <Link 
                          href="/make-a-plan/admin"
                          onClick={handleNavigation}
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
                  <div className="px-3 py-2 text-xs">
                    <AuthStatus />
                  </div>
                  <div className="w-full">
                    <LoginButton />
                  </div>
                  <Link href="/auth">
                    <Button 
                      className="bg-tcof-teal hover:bg-tcof-teal/90 text-white w-full mt-2"
                      onClick={handleNavigation}
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