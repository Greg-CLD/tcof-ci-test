import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import { Button } from "@/components/ui/button";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
};

/**
 * A simpler ProtectedRoute component that redirects to the auth page
 * instead of trying to handle login directly.
 */
export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {/* If loading, show spinner */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
        </div>
      )}
      
      {/* If authenticated, render the component */}
      {!isLoading && user && <Component />}
      
      {/* If not authenticated and not loading, redirect to auth page */}
      {!isLoading && !user && <Redirect to="/auth" />}
    </Route>
  );
}