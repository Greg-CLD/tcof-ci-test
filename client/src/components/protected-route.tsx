import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * Protected route component that redirects to /auth if not authenticated
 * @param path - Route path to match
 * @param component - Component to render if authenticated
 */
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  return (
    <Route path={path}>
      {isAuthenticated ? <Component /> : <Redirect to="/auth" />}
    </Route>
  );
}