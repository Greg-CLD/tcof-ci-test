import React, { ReactNode } from 'react';
import { Redirect, useLocation, useParams } from 'wouter';
import { useProjects } from '@/hooks/useProjects';
import { useProject } from '@/contexts/ProjectContext';
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
  const { currentProjectId, setCurrentProjectId } = useProject(); // Get context directly
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();

  // Bypass check for organization routes and profile edit routes
  if (location.startsWith('/organisations') || location.includes('/profile/edit') || location.includes('/setup')) {
    console.log('ProtectedRouteGuard: Bypassing check for route:', location);
    return <>{children}</>;
  }

  // Show loading state while projects are loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-tcof-teal border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  // Prioritize projectId from URL params over context
  const routeProjectId = projectId;
  const contextProjectId = currentProjectId;
  const selectedProject = getSelectedProject();

  console.log(`ProtectedRouteGuard: routeProjectId=${routeProjectId}, contextProjectId=${contextProjectId}, hasSelectedProject=${!!selectedProject}`);

  // If no project is selected but we have a projectId in URL params, use that
  if (!selectedProject && routeProjectId) {
    console.log(`ProtectedRouteGuard: found projectId in URL: ${routeProjectId}, setting it.`);
    
    // Update project context - this will also handle localStorage
    setCurrentProjectId(routeProjectId);
    
    // Also update the projects hook for compatibility
    setSelectedProjectId(routeProjectId);
    
    // Allow access since projectId was found
    return <>{children}</>;
  }
  
  // If we still don't have a project, check if there's one in the context
  if (!selectedProject && contextProjectId) {
    console.log(`ProtectedRouteGuard: found projectId in context: ${contextProjectId}, using it.`);
    
    // Update the projects hook with the context value
    setSelectedProjectId(contextProjectId);
    return <>{children}</>;
  }
  
  // If we still don't have a project, we need to redirect to organizations
  if (!selectedProject) {
    console.log('ProtectedRouteGuard: No project selected or found, redirecting to organisations.');
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