import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export function useAuth() {
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Check URL for auth error parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('auth_error');
    
    if (error) {
      console.log("Auth error from URL:", error);
      setAuthError(error);
      
      // Remove error param from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth_error');
      window.history.replaceState({}, document.title, newUrl.toString());
      
      // Show error toast
      toast({
        title: "Authentication Error",
        description: error,
        variant: "destructive",
      });
    }
  }, []);

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

  // Login mutation - redirects to Replit login
  const loginMutation = useMutation({
    mutationFn: async () => {
      try {
        // Add cache-busting parameter
        const loginUrl = `/api/login?t=${Date.now()}`;
        
        // Redirect to login endpoint
        window.location.href = loginUrl;
        return {} as User; // Type coercion for TS (function never returns)
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
  });

  // Logout mutation - redirects to logout endpoint
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Clear user data from cache
        queryClient.setQueryData(["/api/auth/user"], null);
        
        // Redirect to logout endpoint
        window.location.href = "/api/logout";
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
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