import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}