import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useRoute } from 'wouter';
import { isValidUUID } from '../lib/uuid-validators';

// Project type (simplified)
export interface Project {
  id: string;
  name: string;
  description?: string;
  sector?: string;
  customSector?: string;
  orgType?: string;
  teamSize?: string;
  currentStage?: string;
  organisationId?: string;
  isProfileComplete?: boolean;
  [key: string]: any; // Allow other properties
}

// Types
interface ProjectContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  isValidProject: boolean;
  
  // Legacy support properties
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  
  // Project object support
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  clearCurrentProject: () => void;
  
  // Additional utilities
  refreshProject: () => Promise<void>;
}

// Create context with default values
const ProjectContext = createContext<ProjectContextType>({
  projectId: null,
  setProjectId: () => {},
  isValidProject: false,
  
  // Legacy support properties
  currentProjectId: null,
  setCurrentProjectId: () => {},
  
  // Project object support
  currentProject: null,
  setCurrentProject: () => {},
  clearCurrentProject: () => {},
  
  // Additional utilities
  refreshProject: async () => {}
});

// Provider component
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectIdState] = useState<string | null>(null);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [isValidProject, setIsValidProject] = useState<boolean>(false);
  const [, navigate] = useLocation();
  
  // Check if we're on a project-specific route
  const [matchProjectRoute] = useRoute('/projects/:projectId');
  const [matchProjectToolRoute] = useRoute('/projects/:projectId/:toolName');
  
  // Wrapper function to set project ID and also update localStorage
  const setProjectId = (id: string | null) => {
    setProjectIdState(id);
    
    // Update localStorage
    if (id) {
      localStorage.setItem('currentProjectId', id);
    } else {
      localStorage.removeItem('currentProjectId');
    }
  };
  
  // Function to set current project and extract ID
  const setCurrentProject = (project: Project | null) => {
    setCurrentProjectState(project);
    
    // Update projectId state
    if (project) {
      setProjectId(project.id);
    }
  };
  
  // Function to clear current project
  const clearCurrentProject = () => {
    setCurrentProjectState(null);
    setProjectId(null);
  };
  
  // Refresh project data
  const refreshProject = async () => {
    // For now, just a placeholder that resolves immediately
    // In a real implementation, this would fetch the current project data
    return Promise.resolve();
  };
  
  // Extract project ID from route if available
  useEffect(() => {
    const params = matchProjectRoute?.params || matchProjectToolRoute?.params;
    const routeProjectId = params?.projectId || null;
    
    if (routeProjectId) {
      setProjectId(routeProjectId);
    }
  }, [matchProjectRoute, matchProjectToolRoute]);
  
  // Initialize from localStorage if needed
  useEffect(() => {
    if (!projectId) {
      const storedId = localStorage.getItem('currentProjectId');
      if (storedId) {
        setProjectIdState(storedId); // Use direct state setter to avoid recursion
      }
    }
  }, [projectId]);
  
  // Validate project ID whenever it changes
  useEffect(() => {
    if (!projectId) {
      setIsValidProject(false);
      return;
    }
    
    // Validate UUID format
    const valid = isValidUUID(projectId);
    setIsValidProject(valid);
    
    // If invalid, redirect to projects list
    if (!valid && (matchProjectRoute || matchProjectToolRoute)) {
      console.error(`Invalid project ID detected: ${projectId}`);
      navigate('/projects');
    }
  }, [projectId, matchProjectRoute, matchProjectToolRoute, navigate]);
  
  return (
    <ProjectContext.Provider 
      value={{ 
        projectId, 
        setProjectId, 
        isValidProject, 
        // Legacy support aliases
        currentProjectId: projectId, 
        setCurrentProjectId: setProjectId,
        // Project object support
        currentProject,
        setCurrentProject,
        clearCurrentProject,
        // Additional utilities
        refreshProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// Custom hook to use the project context
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// Alias for backward compatibility
export const useProjectContext = useProject;
