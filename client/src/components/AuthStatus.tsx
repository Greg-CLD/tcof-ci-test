import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AuthStatus() {
  const { user, isLoading, error, loginMutation } = useAuth();
  
  // Helper function to refresh auth - use loginMutation for this purpose
  const refreshAuth = () => {
    if (loginMutation && typeof loginMutation.mutate === 'function') {
      loginMutation.mutate();
    }
  };

  // Different states based on auth status
  if (isLoading) {
    return (
      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span>Checking auth...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center text-sm text-red-500 space-x-1 cursor-help">
                <AlertCircle className="h-3 w-3" />
                <span>Auth error</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{error.message}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={() => loginMutation.mutate()}
              >
                Try Login Again
              </Button>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-2 p-0 h-6 w-6" 
          onClick={() => refreshAuth()}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center text-sm text-green-600 space-x-1">
        <CheckCircle className="h-3 w-3" />
        <span>{typeof user === 'object' && 'username' in user && user.username ? user.username : 'Authenticated'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-sm text-amber-500 space-x-1">
      <AlertCircle className="h-3 w-3" />
      <span>Not authenticated</span>
      <Button 
        variant="ghost" 
        size="sm" 
        className="ml-1 p-0 h-6 w-6" 
        onClick={() => loginMutation.mutate()}
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}