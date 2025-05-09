import { UseMutationResult, useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

// Types for auth data
type User = {
  id: number;
  username: string;
  email: string | null;
};

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterCredentials = {
  username: string;
  email?: string;
  password: string;
};

type MutationOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Custom hook for authentication
 * 
 * Provides:
 * - user: The currently logged in user or null
 * - isLoading: Whether the auth state is still being loaded
 * - isAuthenticated: Whether the user is authenticated
 * - login: Function to log in the user
 * - register: Function to register a new user
 * - logout: Function to log out the user
 * - authError: Any authentication error that occurred
 */
export function useAuth() {
  const { toast } = useToast();
  
  // Fetch current user data
  const {
    data: user,
    isLoading,
    error
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // If we get a 401, return null instead of throwing
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(errorData.message || "Login failed");
      }
      
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/user"], userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(errorData.message || "Registration failed");
      }
      
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/user"], userData);
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Logout failed" }));
        throw new Error(errorData.message || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
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

  return useMemo(
    () => ({
      user,
      isLoading,
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
}