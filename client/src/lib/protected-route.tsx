import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
};

/**
 * A simpler ProtectedRoute component that handles authentication in a more direct way.
 * If the user is not authenticated, it shows a login button.
 * This eliminates the complex redirect logic that was causing login loops.
 */
export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading, loginMutation } = useAuth();
  
  // Handle direct login without redirects
  const handleLogin = () => {
    if (loginMutation) {
      // This will redirect to /api/login
      loginMutation.mutate();
    }
  };

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
      
      {/* If not authenticated and not loading, show login prompt */}
      {!isLoading && !user && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to view this page</p>
          <Button 
            onClick={handleLogin}
            className="bg-tcof-teal hover:bg-tcof-teal/90"
          >
            Log In with Replit
          </Button>
        </div>
      )}
    </Route>
  );
}