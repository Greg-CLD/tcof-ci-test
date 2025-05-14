import React, { ReactNode } from 'react';
import { Redirect, useLocation, useParams } from 'wouter';
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
  const { isLoading, isSelectedProjectProfileComplete, getSelectedProject, setSelectedProjectId } = useProjects();
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();

  // Bypass check for organization routes and profile edit routes
  if (location.startsWith('/organisations') || location.includes('/profile/edit') || location.includes('/setup')) {
    console.log('ProtectedRouteGuard: Bypassing check for route:', location);
    return <>{children}</>;
  }

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  const selectedProject = getSelectedProject();

  // If no project is selected, try to restore from storage or URL params
  if (!selectedProject) {
    const storedProjectId = localStorage.getItem('currentProjectId');
    const finalProjectId = projectId || storedProjectId;
    
    if (finalProjectId) {
      console.log(`ProtectedRouteGuard: using projectId: ${finalProjectId}`);
      
      // Ensure consistent storage
      localStorage.setItem('currentProjectId', finalProjectId);
      localStorage.setItem('selectedProjectId', finalProjectId);
      
      // Update context
      setSelectedProjectId(finalProjectId);
      
      // Allow access since we have a valid project ID
      return <>{children}</>;
    }
    
    // Check if there's a project ID in localStorage before redirecting
    const storedProjectId = localStorage.getItem('currentProjectId') || localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      console.log(`ProtectedRouteGuard: found projectId in localStorage: ${storedProjectId}, setting it.`);
      
      // Make sure both localStorage keys are consistent
      localStorage.setItem('currentProjectId', storedProjectId);
      localStorage.setItem('selectedProjectId', storedProjectId);
      
      // Update the project selection
      setSelectedProjectId(storedProjectId);
      return <>{children}</>; 
    }
    
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
            onClick={() => {
              console.log('Navigating to edit profile for', selectedProject.id);
              navigate(`/projects/${selectedProject.id}/profile/edit`);
            }}
          >
            Complete Profile
          </Button>
        </div>
      </div>
    );
  }

  // Profile is complete, allow access to the protected content
  return <>{children}</>;
}