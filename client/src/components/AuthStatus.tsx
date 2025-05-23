import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A simplified AuthStatus component that shows the user's authentication state
 * in the site header. It provides quick login access and displays username when logged in.
 */
export function AuthStatus() {
  const { user, isLoading, error, loginMutation, refreshAuth } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span>Loading...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:text-red-700 flex items-center space-x-1 h-6 px-2"
              onClick={() => loginMutation.mutate()}
            >
              <AlertCircle className="h-3 w-3" />
              <span>Auth Error</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">Please try logging in again</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Authenticated state
  if (user) {
    return (
      <div className="flex items-center text-sm text-green-600 space-x-1">
        <CheckCircle className="h-3 w-3" />
        <span>Logged in</span>
      </div>
    );
  }

  // Not authenticated state
  return null;
}