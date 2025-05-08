import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
};

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loginMutation } = useAuth();

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
        </div>
      ) : isAuthenticated ? (
        <Component />
      ) : (
        // Redirect to Replit Auth login flow
        loginMutation.mutate()
      )}
    </Route>
  );
}