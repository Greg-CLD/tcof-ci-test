import React, { ReactNode } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useProjects } from '@/hooks/useProjects';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteGuardProps {
  children: ReactNode;
}

/**
 * A component that ensures the selected project has a complete profile
 * before allowing access to protected routes
 */
export function ProtectedRouteGuard({ children }: ProtectedRouteGuardProps) {
  const { isLoading, isSelectedProjectProfileComplete, getSelectedProject } = useProjects();
  const [location] = useLocation();
  
  // Bypass check for organization routes 
  if (location.startsWith('/organisations')) {
    console.log('ProtectedRouteGuard: Bypassing check for organisation route:', location);
    return <>{children}</>;
  }
  
  // Show nothing while loading
  if (isLoading) {
    return null;
  }
  
  const selectedProject = getSelectedProject();
  
  // If no project is selected, redirect to organisations
  if (!selectedProject) {
    return <Redirect to="/organisations" />;
  }
  
  if (!isSelectedProjectProfileComplete()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Project Profile Incomplete</AlertTitle>
            <AlertDescription>
              Your project profile needs to be completed before you can access this tool.
              Please complete all required fields to continue.
            </AlertDescription>
          </Alert>
          
          <Button 
            variant="default"
            className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            onClick={() => window.location.href = `/projects/${selectedProject.id}`}
          >
            Go to Project
          </Button>
        </div>
      </div>
    );
  }
  
  // Profile is complete, allow access to the protected content
  return <>{children}</>;
}