import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
};

// Create the auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider component to wrap the application
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
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
  
  // Logout mutation
  const logout = async () => {
    try {
      const response = await apiRequest("POST", "/api/logout");
      
      if (response.ok) {
        queryClient.setQueryData(["/api/auth/user"], null);
        // Force refresh to clear all state
        window.location.href = "/auth";
      } else {
        console.error("Logout failed:", response.statusText);
        toast({
          title: "Logout Failed",
          description: "There was a problem logging you out",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Provide the auth context to the children
  return (
    <AuthContext.Provider
      value={{ user: user || null, isLoading, error, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}