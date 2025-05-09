// Re-export all auth functionality from our unified auth system
export { 
  AuthContext, 
  AuthProvider, 
  useAuth,
  type AuthContextType,
  type LoginCredentials,
  type RegisterCredentials,
  type MutationOptions
} from '@/hooks/auth-hook';