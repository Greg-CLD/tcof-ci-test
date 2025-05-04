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
import { PlusCircle, Briefcase } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { useAuth } from '@/hooks/use-auth';

export default function ProjectBanner() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  const { projects, isLoading } = useProjects();
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
  
  // Load selected project from localStorage
  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      setSelectedProjectId(storedProjectId);
    }
  }, []);
  
  // Handle project change
  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('selectedProjectId', projectId);
    
    // Track relationship between user and project (will be handled by the backend)
    try {
      await apiRequest('POST', '/api/projects/select', { projectId });
    } catch (error) {
      console.error('Error tracking project selection:', error);
      // Continue even if tracking fails
    }
    
    // Refresh the current page to reflect the project change
    window.location.reload();
  };
  
  // Find the current selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
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
            ) : projects.length > 0 ? (
              <Select
                value={selectedProjectId || ''}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="ml-2 w-56 border-none shadow-none focus:ring-0">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="ml-2 text-gray-500 italic">No projects</span>
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
                className="ml-2 text-tcof-teal"
                onClick={() => navigate(`/get-your-bearings/project-profile?edit=${selectedProjectId}`)}
              >
                <Briefcase className="w-4 h-4 mr-1" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}