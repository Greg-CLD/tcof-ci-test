import { useQuery, useMutation } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginData = Pick<InsertUser, "username" | "password">;

export function useAuth() {
  const { toast } = useToast();
  const { 
    data: user, 
    isLoading, 
    error 
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // With Replit Auth, the login mutation now redirects to Replit's login page
  const loginMutation = useMutation({
    mutationFn: async () => {
      // Redirect to the login endpoint which will redirect to Replit Auth
      window.location.href = "/api/login";
      // This function doesn't actually return anything as it redirects away
      return {} as User; // Type coercion for TS
    },
  });

  // With Replit Auth, we don't need a register mutation as Replit handles it
  // But we keep a placeholder for compatibility with existing code
  const registerMutation = useMutation({
    mutationFn: async () => {
      // Redirect to the login endpoint which will handle registration too
      window.location.href = "/api/login";
      // This function doesn't actually return anything as it redirects away
      return {} as User; // Type coercion for TS
    },
  });

  // Logout mutation redirects to the logout endpoint
  const logoutMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/api/logout";
    },
    onSuccess: () => {
      // This won't actually run due to the redirect
      queryClient.setQueryData(["/api/auth/user"], null);
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    loginMutation,
    logoutMutation,
    registerMutation,
    checkAccountExists
  };
}