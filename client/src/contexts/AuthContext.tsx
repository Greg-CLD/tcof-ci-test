import { createContext, ReactNode, useContext } from "react";
import { useAuth as useAuthHook } from "@/hooks/useAuth";
import { User, InsertUser } from "@shared/schema";
import { UseMutationResult } from "@tanstack/react-query";

// Login type
type LoginData = Pick<InsertUser, "username" | "password">;

// Create auth context with default values
type AuthContextType = {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  loginMutation?: UseMutationResult<User, Error, LoginData>;
  logoutMutation?: UseMutationResult<void, Error, void>;
  registerMutation?: UseMutationResult<User, Error, InsertUser>;
  checkAccountExists: (email: string) => Promise<{
    exists: boolean;
    message: string;
    username?: string | null;
  }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthHook();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}