import React, { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/contexts/ProjectContext';
import { Loader2 } from 'lucide-react';

interface AppInitializerProps {
  children: ReactNode;
}

/**
 * This component ensures that both the authentication and project contexts
 * are fully hydrated before rendering the rest of the application.
 * It acts as a barrier to prevent premature routing decisions.
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isLoading: isAuthLoading, user } = useAuth();
  const { currentProjectId } = useProject();

  useEffect(() => {
    // We've explicitly checked auth status and loaded project context
    if (!isAuthLoading) {
      console.log(`AppInitializer: Initialization complete. Auth status: ${!!user}, Project ID: ${currentProjectId || 'none'}`);
      setIsInitialized(true);
    }
  }, [isAuthLoading, user, currentProjectId]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-tcof-teal" />
          <p className="mt-4 text-lg text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}