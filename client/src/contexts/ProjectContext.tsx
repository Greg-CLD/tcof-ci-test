import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Project interface
export interface Project {
  id: string;
  name: string;
  description?: string;
  sector?: string;
  customSector?: string;
  orgType?: string;
  teamSize?: string;
  currentStage?: string;
  selectedOutcomeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

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
  const { data: project, isLoading } = useQuery({
    queryKey: ['/api/projects', projectIdFromUrl],
    enabled: !!projectIdFromUrl,
  });
  
  // Function to refresh the current project data
  const refreshProject = async (): Promise<void> => {
    if (!currentProject?.id) {
      console.warn('Cannot refresh project: No current project');
      return;
    }
    
    try {
      await queryClient.invalidateQueries({
        queryKey: ['/api/projects', currentProject.id]
      });
      
      // Also invalidate the main projects list
      await queryClient.invalidateQueries({
        queryKey: ['/api/projects']
      });
    } catch (error) {
      console.error('Error refreshing project data:', error);
    }
  };
  
  // Update current project when project data changes
  useEffect(() => {
    if (project && typeof project === 'object') {
      setCurrentProject(project as Project);
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