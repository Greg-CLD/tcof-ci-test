import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface AuthRequiredProps {
  message?: string;
  showPasswordOption?: boolean;
}

/**
 * A reusable component that displays an authentication required message
 * and provides sign-in buttons. Used as fallback UI for protected routes.
 */
const AuthRequired: React.FC<AuthRequiredProps> = ({ 
  message = "You need to sign in to access this page.",
  showPasswordOption = false
}) => {
  const [_, navigate] = useLocation();
  
  return (
    <main className="flex-grow container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Trigger Replit Auth login flow directly */}
          <Button 
            className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            onClick={() => window.location.href = "/api/login"}
          >
            Sign In
          </Button>
          
          {showPasswordOption && (
            <Link href="/tools/starter-access">
              <Button variant="outline" className="border-tcof-teal text-tcof-teal hover:bg-tcof-light">
                Enter Access Password
              </Button>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
};

export default AuthRequired;