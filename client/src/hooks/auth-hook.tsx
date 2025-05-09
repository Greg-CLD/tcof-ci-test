import { createContext, ReactNode, useContext, useMemo } from "react";
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
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      console.log('Attempting login with:', { username: credentials.username });
      
      const res = await apiRequest("POST", "/api/login", credentials);
      
      console.log('Login response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Login failed" }));
        console.error('Login API error:', errorData);
        throw new Error(errorData.message || "Login failed");
      }
      
      const userData = await res.json();
      console.log('Login successful, user data received');
      return userData;
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

  // Compute derived state
  const isAuthenticated = !!user;
  const authError = error ? (error as Error).message : null;

  // Provide the auth context to the children
  const contextValue = useMemo(
    () => ({
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