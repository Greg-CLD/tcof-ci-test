import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, Settings } from 'lucide-react';
import { isAdmin } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const GlobalNav = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const admin = isAdmin();
  const { user } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Navigation items with their paths and condition to show
  const navItems = [
    { path: '/organisations', label: 'Organisations', show: !!user },
    { path: '/all-projects', label: 'All Projects', show: !!user },
    { path: '/settings', label: 'Account', show: !!user },
    { path: '/make-a-plan/admin', label: 'Admin', show: admin }
  ];

  // Filter only the items that should be shown
  const visibleNavItems = navItems.filter(item => item.show);

  return (
    <nav className="bg-tcof-dark text-white py-3 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo and company name */}
          <Link href="/" className="text-xl font-bold flex items-center">
            <span>Confluity TCOF</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {visibleNavItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "text-white hover:text-tcof-teal transition-colors",
                  item.label === "Account" && "flex items-center gap-1",
                  location === item.path && "text-tcof-teal font-semibold"
                )}
                onClick={closeMenu}
              >
                {item.label === "Account" && <Settings size={16} />}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              onClick={toggleMenu}
              variant="ghost"
              className="text-white hover:text-tcof-teal p-1"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3">
            {visibleNavItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "block py-2 px-4 text-white hover:text-tcof-teal transition-colors",
                  item.label === "Account" && "flex items-center gap-2",
                  location === item.path && "text-tcof-teal font-semibold"
                )}
                onClick={closeMenu}
              >
                {item.label === "Account" && <Settings size={16} />}
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default GlobalNav;