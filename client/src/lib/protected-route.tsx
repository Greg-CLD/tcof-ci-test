import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
};

// AuthGuard helps prevent infinite auth loops
export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loginMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Track auth attempts to prevent infinite redirects
  useEffect(() => {
    // Only handle auth when on a protected route and not already logged in
    if (location.startsWith(path) && !isAuthenticated && !isLoading) {
      // Check if we've already attempted to redirect to login
      if (!redirectAttempted) {
        console.log("Not authenticated, redirecting to login");
        setRedirectAttempted(true);
        // Attempt login immediately
        loginMutation.mutate();
      } else if (!showLoginPrompt) {
        // If we've already tried to redirect and still not authenticated,
        // show a manual login prompt instead of triggering another redirect
        setShowLoginPrompt(true);
        toast({
          title: "Authentication Required",
          description: "Please log in to access this page",
          variant: "destructive"
        });
      }
    }
  }, [location, isAuthenticated, isLoading, redirectAttempted, showLoginPrompt]);

  return (
    <Route path={path}>
      {(params) => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
            </div>
          );
        }
        
        if (isAuthenticated) {
          return <Component />;
        }
        
        if (showLoginPrompt) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
              <h2 className="text-2xl font-bold">Authentication Required</h2>
              <p className="text-gray-600 mb-4">You need to be logged in to view this page</p>
              <button 
                className="px-4 py-2 bg-tcof-teal text-white rounded-md"
                onClick={() => {
                  setRedirectAttempted(false);
                  setShowLoginPrompt(false);
                  loginMutation.mutate();
                }}
              >
                Log In
              </button>
            </div>
          );
        }
        
        // This return is needed for the Route component to work correctly
        // but it should never be rendered because of the useEffect above
        return null;
      }}
    </Route>
  );
}