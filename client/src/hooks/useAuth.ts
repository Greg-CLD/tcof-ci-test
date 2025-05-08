import { useQuery, useMutation } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

type LoginData = Pick<InsertUser, "username" | "password">;

export function useAuth() {
  const { toast } = useToast();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authAttempts, setAuthAttempts] = useState(0);
  
  // Track if we're in a broken auth state with persistent errors
  useEffect(() => {
    // Check URL for auth error parameters
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('auth_error');
    if (error) {
      console.log("Auth error detected in URL:", error);
      setAuthError(error);
      
      // Remove the error param from URL to prevent it persisting on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth_error');
      window.history.replaceState({}, document.title, newUrl.toString());
    }
  }, []);

  const { 
    data: user, 
    isLoading, 
    error,
    refetch
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Only consider the user truly loaded if we got data or a 401
    onError: (error) => {
      console.log("Auth query error:", error);
      // If there's an auth error parameter in the URL, show it in a toast
      if (authError) {
        toast({
          title: "Authentication Error",
          description: `Error details: ${authError}`,
          variant: "destructive",
        });
        setAuthError(null);
      }
    }
  });

  // With Replit Auth, the login mutation now redirects to Replit's login page
  const loginMutation = useMutation({
    mutationFn: async () => {
      console.log("Login mutation called, attempt:", authAttempts + 1);
      setAuthAttempts(prev => prev + 1);
      
      try {
        // For multiple failed auth attempts, add a clear parameter to break cache
        const loginUrl = authAttempts > 1 
          ? `/api/login?clear_cache=${Date.now()}` 
          : "/api/login";
          
        // Redirect to the login endpoint which will redirect to Replit Auth
        window.location.href = loginUrl;
        
        // This function doesn't actually return anything as it redirects away
        return {} as User; // Type coercion for TS
      } catch (error) {
        console.error("Error in login mutation:", error);
        throw error;
      }
    },
  });

  // With Replit Auth, we don't need a register mutation as Replit handles it
  // But we keep a placeholder for compatibility with existing code
  const registerMutation = useMutation({
    mutationFn: async () => {
      try {
        // Redirect to the login endpoint which will handle registration too
        window.location.href = "/api/login";
        // This function doesn't actually return anything as it redirects away
        return {} as User; // Type coercion for TS
      } catch (error) {
        console.error("Error in register mutation:", error);
        throw error;
      }
    },
  });

  // Logout mutation redirects to the logout endpoint
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Reset auth attempts on logout
        setAuthAttempts(0);
        
        // Clear auth-related localStorage items 
        localStorage.removeItem('auth_state');
        
        // Invalidate the auth query data before redirecting
        queryClient.setQueryData(["/api/auth/user"], null);
        
        // Redirect to logout
        window.location.href = "/api/logout";
      } catch (error) {
        console.error("Error in logout mutation:", error);
        throw error;
      }
    },
  });

  // Function to check if an account exists by email
  const checkAccountExists = async (email: string) => {
    try {
      const response = await fetch(`/api/auth/checkAccount?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        throw new Error('Failed to check account');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking account:', error);
      toast({
        title: 'Error',
        description: 'Failed to check if account exists',
        variant: 'destructive',
      });
      return { exists: false, message: 'Error checking account' };
    }
  };

  // Force refetch the auth status
  const refreshAuth = () => {
    console.log("Manually refreshing auth status");
    return refetch();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    authError,
    authAttempts,
    loginMutation,
    logoutMutation,
    registerMutation,
    checkAccountExists,
    refreshAuth
  };
}