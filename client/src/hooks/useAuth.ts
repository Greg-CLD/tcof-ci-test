import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Define login credentials type
type LoginCredentials = {
  username: string;
  password: string;
};

export function useAuth() {
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Main auth query - gets current user if logged in
  const { 
    data: user, 
    isLoading, 
    error,
    refetch
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    retry: false,
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
    onSuccess: (userData) => {
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

  // Manually refresh auth status
  const refreshAuth = () => {
    console.log("Refreshing auth status");
    return refetch();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    authError,
    loginMutation,
    logoutMutation,
    refreshAuth
  };
}