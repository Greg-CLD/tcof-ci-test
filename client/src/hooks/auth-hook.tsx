import { createContext, ReactNode, useContext, useEffect, useMemo } from "react";
import { UseMutationResult, useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

// Define credential types
export type LoginCredentials = {
  username: string;
  password: string;
};

export type RegisterCredentials = {
  username: string;
  email?: string;
  password: string;
};

export type MutationOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

// Define the shape of the context data to match existing code
export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials, options?: MutationOptions) => void;
  register: (credentials: RegisterCredentials, options?: MutationOptions) => void;
  logout: (options?: MutationOptions) => void;
  loginMutation: UseMutationResult<any, Error, LoginCredentials>;
  logoutMutation: UseMutationResult<any, Error, void>;
  registerMutation: UseMutationResult<any, Error, RegisterCredentials>;
  authError: string | null;
};

// Create the auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider component to wrap the application
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Fetch current user data
  const {
    data: user,
    isLoading,
    error,
    refetch
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Special handler for 401s
    retry: 3, // Retry up to 3 times on failure
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 1000 * 60 * 1, // Cache for 1 minute only - more frequent checks for session status
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when connection is restored
    refetchOnMount: true, // Refetch when component mounts
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      console.log('Attempting login with:', { username: credentials.username });
      
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        
        console.log('Login response status:', res.status);
        
        if (!res.ok) {
          // Handle specific error status codes
          if (res.status === 500) {
            try {
              const errorData = await res.json();
              throw new Error(errorData.message || "Server error during login. Please try again later.");
            } catch (parseError) {
              // If can't parse JSON, try text
              const errorText = await res.text().catch(() => "");
              
              // Check for compute node errors specifically
              if (errorText.includes("compute node") || errorText.includes("infrastructure")) {
                throw new Error("Temporary server issue. Please try refreshing the page and logging in again.");
              }
              
              throw new Error(`Server error: ${errorText || "Unknown login error occurred"}`);
            }
          } else if (res.status === 503) {
            throw new Error("Login service temporarily unavailable. Please try again in a moment.");
          } else {
            // Other error statuses (401, 400, etc.)
            try {
              const errorData = await res.json();
              throw new Error(errorData.message || "Login failed. Please check your credentials.");
            } catch (parseError) {
              throw new Error("Login failed. Please check your credentials.");
            }
          }
        }
        
        const userData = await res.json();
        console.log('Login successful, user data received');
        return userData;
      } catch (error) {
        // Handle network errors and other exceptions
        console.error('Login error:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Connection error during login. Please check your internet and try again.");
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
      
      const res = await apiRequest("POST", "/api/logout");
      console.log('Logout response status:', res.status);
      
      if (!res.ok) {
        console.error('Logout failed with status:', res.status);
        throw new Error("Logout failed");
      }
      
      console.log('Logout successful');
      return res;
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
      console.log('Attempting registration with:', { 
        username: credentials.username, 
        hasEmail: !!credentials.email
      });
      
      const res = await apiRequest("POST", "/api/register", credentials);
      console.log('Registration response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Registration failed" }));
        console.error('Registration API error:', errorData);
        throw new Error(errorData.message || "Registration failed");
      }
      
      const userData = await res.json();
      console.log('Registration successful, user data received');
      return userData;
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
      
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions with options to simplify calls
  const login = (credentials: LoginCredentials, options?: MutationOptions) => {
    return loginMutation.mutate(credentials, {
      onSuccess: () => options?.onSuccess?.(),
      onError: (error) => options?.onError?.(error)
    });
  };

  const register = (credentials: RegisterCredentials, options?: MutationOptions) => {
    return registerMutation.mutate(credentials, {
      onSuccess: () => options?.onSuccess?.(),
      onError: (error) => options?.onError?.(error)
    });
  };

  const logout = (options?: MutationOptions) => {
    return logoutMutation.mutate(undefined, {
      onSuccess: () => options?.onSuccess?.(),
      onError: (error) => options?.onError?.(error)
    });
  };
  
  // Attempt to restore session on mount or when network reconnects
  useEffect(() => {
    // Check if we already have a user
    if (user) return;
    
    // Don't show toast during silent session check
    const silentCheck = async () => {
      try {
        console.log('Attempting silent session restoration');
        await refetch();
      } catch (err) {
        console.error('Session restoration error:', err);
      }
    };
    
    // Try to restore session
    silentCheck();
    
    // Also set up a listener for online status to try again when reconnected
    const handleOnline = () => {
      console.log('Network reconnected, attempting session restoration');
      silentCheck();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetch, user]);

  // Compute derived state
  const isAuthenticated = !!user;
  const authError = error ? (error as Error).message : null;

  // Provide the auth context to the children
  const contextValue = useMemo(
    () => ({
      user: user ?? null, // Ensure it's never undefined
      isLoading,
      error,
      isAuthenticated,
      login,
      register,
      logout,
      loginMutation,
      logoutMutation,
      registerMutation,
      authError,
    }),
    [
      user,
      isLoading,
      error,
      isAuthenticated,
      login,
      register,
      logout,
      loginMutation,
      logoutMutation,
      registerMutation,
      authError,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook for authentication
 * Uses the AuthContext
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}