import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Project, useProject } from '@/hooks/useProjects';
import { apiRequest } from '@/lib/queryClient';

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  isLoadingProject: boolean;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [, navigator] = useLocation();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const queryClient = useQueryClient();
  
  // Get the current URL path
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  
  // Extract project ID from URL if present, or from localStorage
  const projectIdFromUrl = (() => {
    const projectsMatch = /^\/projects\/([^/]+)/.exec(currentPath);
    const planMatch = /^\/make-a-plan\/.*/.exec(currentPath) && new URLSearchParams(currentSearch).get('projectId');
    const storedProjectId = localStorage.getItem('selectedProjectId');
    
    // Try URL parameters first, then fall back to localStorage
    return projectsMatch ? projectsMatch[1] : (planMatch || storedProjectId);
  })();
  
  // Fetch project data if we have a project ID
  const { project, isLoading } = useProject(projectIdFromUrl || undefined);
  
  // Function to refresh the current project data
  const refreshProject = async (): Promise<void> => {
    if (!currentProject?.id) {
      console.warn('Cannot refresh project: No current project');
      return;
    }
    
    try {
      console.log('Refreshing project data for ID:', currentProject.id);
      
      // Force invalidation of the project data query to trigger a refetch
      await queryClient.invalidateQueries({
        queryKey: ['/api/projects', currentProject.id]
      });
      
      // Also invalidate the main projects list
      await queryClient.invalidateQueries({
        queryKey: ['/api/projects']
      });
      
      // Refetch the project data immediately with a direct fetch 
      const response = await apiRequest('GET', `/api/projects?id=${currentProject.id}`);
      const updatedProject = await response.json();
      
      // Update the context state with the fresh data
      setCurrentProject(updatedProject);
      
      // Update cache directly
      queryClient.setQueryData(['/api/projects', currentProject.id], updatedProject);
      
      console.log('Project data refreshed successfully', updatedProject);
    } catch (error) {
      console.error('Error refreshing project data:', error);
    }
  };
  
  // Update current project when project data changes
  useEffect(() => {
    if (project) {
      console.log('Setting current project from API', project);
      setCurrentProject(project);
      
      // Also track this as the selected project in localStorage
      localStorage.setItem('selectedProjectId', project.id);
    }
  }, [project]);
  
  // Listen for changes to localStorage selectedProjectId
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedProjectId' && e.newValue !== null) {
        // If the selected project ID changes, update our current project ID
        window.location.reload(); // Simple approach to ensure everything is in sync
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        isLoadingProject: isLoading,
        refreshProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}