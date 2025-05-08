import { createContext, ReactNode, useContext } from "react";
import { useAuth as useDirectAuthHook } from "@/hooks/useAuth";
import { User } from "@shared/schema";
import { UseMutationResult } from "@tanstack/react-query";

// Create auth context with the simplified structure that matches our hook
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  authError: string | null;
  loginMutation: UseMutationResult<any, Error, void>;
  logoutMutation: UseMutationResult<any, Error, void>;
  refreshAuth: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps the application
export function AuthProvider({ children }: { children: ReactNode }) {
  // Use the direct auth hook implementation
  const auth = useDirectAuthHook();
  
  return (
    <AuthContext.Provider value={auth as unknown as AuthContextType}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for components to get the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}