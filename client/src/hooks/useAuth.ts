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

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: Omit<InsertUser, 'id'>) => {
      // Add a UUID for the user ID if not provided
      const userWithId = {
        ...credentials,
        id: credentials.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
      };
      
      const res = await apiRequest("POST", "/api/register", userWithId);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
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