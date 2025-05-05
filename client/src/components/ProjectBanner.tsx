import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlusCircle, Briefcase, AlertCircle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useProjectContext } from '@/contexts/ProjectContext';

export default function ProjectBanner() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  const { projects, isLoading } = useProjects();
  const { currentProject, setCurrentProject, refreshProject } = useProjectContext();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  
  // Only show banner to authenticated users
  const isAuthorized = isAuthenticated('starter-access') || !!user;
  
  // Determine if current page should show the project banner
  useEffect(() => {
    // List of paths that should display the project banner
    const projectContextPaths = [
      '/get-your-bearings',
      '/make-a-plan',
      '/tools',
      '/dashboard',
      '/checklist',
    ];
    
    // Check if current path starts with any of the project context paths
    const shouldShowBanner = projectContextPaths.some(path => 
      location.startsWith(path)
    );
    
    setShowBanner(shouldShowBanner && isAuthorized);
  }, [location, isAuthorized]);
  
  // Synchronize state between local component and ProjectContext
  useEffect(() => {
    // If currentProject from context is set, update local state
    if (currentProject?.id) {
      setSelectedProjectId(currentProject.id);
    } else {
      // Otherwise, load from localStorage as fallback
      const storedProjectId = localStorage.getItem('selectedProjectId');
      if (storedProjectId) {
        setSelectedProjectId(storedProjectId);
        
        // Try to find the project in the loaded projects
        const project = projects.find(p => p.id === storedProjectId);
        if (project) {
          // Update the context if we found a valid project
          setCurrentProject(project);
        }
      }
    }
  }, [currentProject, projects, setCurrentProject]);
  
  // Handle project change
  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('selectedProjectId', projectId);
    
    // Find the project in our loaded projects
    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject) {
      // Update the global project context
      setCurrentProject(selectedProject);
    }
    
    // Track relationship between user and project (will be handled by the backend)
    try {
      await apiRequest('POST', '/api/projects/select', { projectId });
    } catch (error) {
      console.error('Error tracking project selection:', error);
      // Continue even if tracking fails
    }
    
    // Refresh the data instead of reloading the page
    await refreshProject();
  };
  
  // Use currentProject from context first, or fall back to local state
  const selectedProject = currentProject || projects.find(p => p.id === selectedProjectId);
  
  // Check if selected project has a complete profile
  const isProfileComplete = selectedProject ? (
    !!selectedProject.name && 
    !!selectedProject.sector && 
    (selectedProject.sector !== 'other' || !!selectedProject.customSector) && 
    !!selectedProject.orgType &&
    !!selectedProject.currentStage
  ) : false;
  
  if (!showBanner || !isAuthorized) {
    return null;
  }
  
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-medium">Working on:</span>
            {isLoading ? (
              <div className="ml-2 w-4 h-4 border-2 border-tcof-teal border-t-transparent rounded-full animate-spin"></div>
            ) : selectedProject ? (
              <span className="ml-2 font-semibold text-tcof-teal">
                {selectedProject.name}
              </span>
            ) : (
              <span className="ml-2 text-gray-500 italic">No project selected</span>
            )}
          </div>
          
          <div className="flex items-center">
            {selectedProject && (
              <div className="text-xs text-gray-500">
                {selectedProject.sector && `${selectedProject.sector}`}
                {selectedProject.currentStage && ` • ${selectedProject.currentStage} stage`}
              </div>
            )}
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="ml-4 text-tcof-teal"
              onClick={() => navigate('/get-your-bearings/project-profile')}
            >
              <PlusCircle className="w-4 h-4 mr-1" />
              New Project
            </Button>
            
            {selectedProject && (
              <Button 
                size="sm" 
                variant="ghost" 
                className={`ml-2 ${!isProfileComplete ? "bg-yellow-50 text-amber-600" : "text-tcof-teal"}`}
                onClick={() => navigate(`/get-your-bearings/project-profile?edit=${selectedProject.id}`)}
              >
                <Briefcase className="w-4 h-4 mr-1" />
                {isProfileComplete ? "Edit Profile" : "Complete Profile"}
              </Button>
            )}
          </div>
        </div>
        
        {/* Profile completion alert */}
        {selectedProject && !isProfileComplete && (
          <Alert className="mt-2 bg-yellow-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Your project profile is incomplete. Adding details like sector and stage will help personalize your experience.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}