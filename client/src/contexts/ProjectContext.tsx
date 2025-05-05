import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

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
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [, navigator] = useLocation();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // Get the current URL path
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  
  // Extract project ID from URL if present
  const projectIdFromUrl = (() => {
    const projectsMatch = /^\/projects\/([^/]+)/.exec(currentPath);
    const planMatch = /^\/make-a-plan\/.*/.exec(currentPath) && new URLSearchParams(currentSearch).get('projectId');
    return projectsMatch ? projectsMatch[1] : planMatch;
  })();
  
  // Fetch project data if we have a project ID
  const { data: project, isLoading } = useQuery({
    queryKey: ['/api/projects', projectIdFromUrl],
    enabled: !!projectIdFromUrl,
  });
  
  // Update current project when project data changes
  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project]);
  
  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        isLoadingProject: isLoading
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