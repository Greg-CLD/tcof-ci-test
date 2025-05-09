import { createContext, ReactNode, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define credential types
type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterCredentials = {
  username: string;
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
  authError: string | null;
};

// Create the auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Export the useAuth hook for components to use
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Provider component to wrap the application
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Fetch the current user
  const {
    data: user,
    error,
    isLoading,
    refetch
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
  
  // Login mutation with username and password
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      setAuthError(null);
      console.log('Attempting login with:', { username: credentials.username });
      
      try {
        const response = await apiRequest("POST", "/api/login", credentials);
        
        console.log('Login response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Login API error:', errorData);
          throw new Error(errorData.message || "Login failed");
        }
        
        const userData = await response.json();
        console.log('Login successful, user data received');
        return userData;
      } catch (err) {
        console.error('Login exception:', err);
        throw err;
      }
    },
    onSuccess: (userData: User) => {
      console.log('Login success, updating cache with user:', userData.username);
      
      // Update user data in cache
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      // Invalidate any queries that might depend on authentication
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
      
      toast({
        title: "Login successful",
        description: `Welcome, ${userData.username}!`,
      });
      
      // Force refresh user data
      refetch();
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', error.message);
      setAuthError(error.message);
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Attempting logout');
      
      try {
        const response = await apiRequest("POST", "/api/logout");
        console.log('Logout response status:', response.status);
        
        if (!response.ok) {
          console.error('Logout failed with status:', response.status);
          throw new Error("Logout failed");
        }
        
        console.log('Logout successful');
        return response;
      } catch (err) {
        console.error('Logout exception:', err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log('Clearing user data from cache after logout');
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Clear other user-related caches
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error('Logout error:', error.message);
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      setAuthError(null);
      console.log('Attempting registration with:', { 
        username: credentials.username, 
        hasEmail: !!credentials.email
      });
      
      try {
        const response = await apiRequest("POST", "/api/register", credentials);
        console.log('Registration response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Registration API error:', errorData);
          throw new Error(errorData.message || "Registration failed");
        }
        
        const userData = await response.json();
        console.log('Registration successful, user data received');
        return userData;
      } catch (err) {
        console.error('Registration exception:', err);
        throw err;
      }
    },
    onSuccess: (userData: User) => {
      console.log('Registration success, updating cache with user:', userData.username);
      
      // Update user data in cache
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
      
      // Force refresh user data
      refetch();
    },
    onError: (error: Error) => {
      console.error('Registration mutation error:', error.message);
      setAuthError(error.message);
      
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Provide the auth context to the children
  return (
    <AuthContext.Provider
      value={{ 
        user: user || null, 
        isLoading, 
        error, 
        isAuthenticated: Boolean(user),
        loginMutation,
        logoutMutation,
        registerMutation,
        authError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}