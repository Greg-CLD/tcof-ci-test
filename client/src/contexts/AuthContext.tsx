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
      const response = await apiRequest("POST", "/api/login", credentials);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: (userData: User) => {
      // Update user data in cache
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      toast({
        title: "Login successful",
        description: `Welcome, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
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
      const response = await apiRequest("POST", "/api/logout");
      
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/user"], null);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
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
      const response = await apiRequest("POST", "/api/register", credentials);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      return response.json();
    },
    onSuccess: (userData: User) => {
      // Update user data in cache
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
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