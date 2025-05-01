import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define the passwords for different sections
// In a real app, these would be securely stored on the server and validated there
const PAGE_PASSWORDS = {
  'starter-access': 'starterkit2024', // Password for Starter Kit Access
  'pro-tools': 'protools2024', // Password for Pro Tools Access
};

type AuthContextType = {
  isAuthenticated: (page: string) => boolean;
  authenticate: (page: string, password: string) => boolean;
  clearAuth: (page: string) => void;
};

const AuthProtectionContext = createContext<AuthContextType | null>(null);

export function AuthProtectionProvider({ children }: { children: ReactNode }) {
  const [authenticatedPages, setAuthenticatedPages] = useState<Record<string, boolean>>({});

  // Check if we have any stored authentication in localStorage
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('tcof_auth');
      if (storedAuth) {
        setAuthenticatedPages(JSON.parse(storedAuth));
      }
    } catch (error) {
      console.error('Error loading authentication state:', error);
      // If there's any error, clear the localStorage
      localStorage.removeItem('tcof_auth');
    }
  }, []);

  // Update localStorage whenever authenticatedPages changes
  useEffect(() => {
    if (Object.keys(authenticatedPages).length > 0) {
      localStorage.setItem('tcof_auth', JSON.stringify(authenticatedPages));
    }
  }, [authenticatedPages]);

  // Check if a page is authenticated
  const isAuthenticated = (page: string) => {
    return !!authenticatedPages[page];
  };

  // Attempt to authenticate with a password
  const authenticate = (page: string, password: string) => {
    // Simple password check
    if (PAGE_PASSWORDS[page as keyof typeof PAGE_PASSWORDS] === password) {
      setAuthenticatedPages(prev => ({
        ...prev,
        [page]: true
      }));
      return true;
    }
    return false;
  };

  // Clear authentication for a page
  const clearAuth = (page: string) => {
    setAuthenticatedPages(prev => {
      const newState = { ...prev };
      delete newState[page];
      localStorage.setItem('tcof_auth', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <AuthProtectionContext.Provider value={{ isAuthenticated, authenticate, clearAuth }}>
      {children}
    </AuthProtectionContext.Provider>
  );
}

export function useAuthProtection() {
  const context = useContext(AuthProtectionContext);
  if (!context) {
    throw new Error('useAuthProtection must be used within an AuthProtectionProvider');
  }
  return context;
}