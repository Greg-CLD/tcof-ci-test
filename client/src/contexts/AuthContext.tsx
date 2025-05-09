import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
};

// Create the auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Helper hook to use auth context directly
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// Provider component to wrap the application
export function AuthProvider({ children }: { children: ReactNode }) {
  // Fetch the current user
  const {
    data: user,
    error,
    isLoading
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include" // Important for cookies
        });
        
        if (response.ok) {
          return response.json();
        }
        
        if (response.status === 401) {
          return null; // Not authenticated, but not an error
        }
        
        throw new Error("Failed to fetch user data");
      } catch (err) {
        console.error("Error fetching user:", err);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true
  });
  
  // Provide the auth context to the children
  return (
    <AuthContext.Provider
      value={{ 
        user: user || null, 
        isLoading, 
        error, 
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}