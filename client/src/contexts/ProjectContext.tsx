import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useRoute } from 'wouter';
import { isValidUUID } from '../lib/uuid-validators';
import { isNumericId } from '../lib/uuid-utils';

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
  const [, matchProjectParams] = useRoute<{projectId: string}>('/projects/:projectId');
  const [, matchProjectToolParams] = useRoute<{projectId: string, toolName: string}>('/projects/:projectId/:toolName');
  
  // Wrapper function to set project ID and also update localStorage
  const setProjectId = (id: string | null) => {
    // Reject numeric IDs completely
    if (id && isNumericId(id)) {
      console.error(`Rejected numeric project ID: ${id}`);
      navigate('/projects');
      return;
    }
    
    setProjectIdState(id);
    
    // Update localStorage only for valid UUIDs
    if (id && isValidUUID(id)) {
      localStorage.setItem('currentProjectId', id);
    } else if (!id) {
      localStorage.removeItem('currentProjectId');
    }
  };
  
  // Function to set current project and extract ID
  const setCurrentProject = (project: Project | null) => {
    // Make sure project has a valid UUID ID
    if (project && !isValidUUID(project.id)) {
      console.error(`Rejected project with invalid ID: ${project.id}`);
      return;
    }
    
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
    // Get params from the match objects if they exist
    let routeProjectId: string | null = null;
    
    if (matchProjectParams) {
      routeProjectId = matchProjectParams.projectId || null;
    } else if (matchProjectToolParams) {
      routeProjectId = matchProjectToolParams.projectId || null;
    }
    
    if (routeProjectId) {
      // Check for numeric IDs in URL
      if (isNumericId(routeProjectId)) {
        console.error(`Numeric project ID detected in URL: ${routeProjectId}`);
        navigate('/projects');
        return;
      }
      
      setProjectId(routeProjectId);
    }
  }, [matchProjectParams, matchProjectToolParams, navigate]);
  
  // Initialize from localStorage if needed
  useEffect(() => {
    if (!projectId) {
      const storedId = localStorage.getItem('currentProjectId');
      if (storedId) {
        // Make sure the stored ID is a valid UUID
        if (isValidUUID(storedId)) {
          setProjectIdState(storedId); // Use direct state setter to avoid recursion
        } else {
          // Remove invalid stored ID
          localStorage.removeItem('currentProjectId');
          console.error(`Removed invalid project ID from localStorage: ${storedId}`);
        }
      }
    }
  }, [projectId]);
  
  // Validate project ID whenever it changes
  useEffect(() => {
    if (!projectId) {
      setIsValidProject(false);
      return;
    }
    
    // Reject numeric IDs
    if (isNumericId(projectId)) {
      console.error(`Numeric project ID detected: ${projectId}`);
      setIsValidProject(false);
      navigate('/projects');
      return;
    }
    
    // Validate UUID format
    const valid = isValidUUID(projectId);
    setIsValidProject(valid);
    
    // If invalid, redirect to projects list
    if (!valid && (matchProjectParams || matchProjectToolParams)) {
      console.error(`Invalid project ID format detected: ${projectId}`);
      navigate('/projects');
    }
  }, [projectId, matchProjectParams, matchProjectToolParams, navigate]);
  
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
