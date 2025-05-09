import { useContext, useState } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterCredentials = {
  username: string;
  email: string;
  password: string;
};

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
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

  // Registration mutation
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
        description: `Welcome, ${userData.username}! Your account has been created.`,
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

      // Redirect to auth page after logout
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return {
    ...context,
    loginMutation,
    logoutMutation,
    registerMutation,
    authError
  };
}