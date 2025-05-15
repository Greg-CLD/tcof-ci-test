import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useRoute } from 'wouter';
import { isValidUUID } from '../lib/uuid-validators';

// Types
interface ProjectContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  isValidProject: boolean;
}

// Create context with default values
const ProjectContext = createContext<ProjectContextType>({
  projectId: null,
  setProjectId: () => {},
  isValidProject: false
});

// Provider component
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isValidProject, setIsValidProject] = useState<boolean>(false);
  const [, navigate] = useLocation();
  
  // Check if we're on a project-specific route
  const [matchProjectRoute] = useRoute('/projects/:projectId');
  const [matchProjectToolRoute] = useRoute('/projects/:projectId/:toolName');
  
  useEffect(() => {
    // Extract project ID from route if available
    const params = matchProjectRoute?.params || matchProjectToolRoute?.params;
    const routeProjectId = params?.projectId || null;
    
    if (routeProjectId) {
      setProjectId(routeProjectId);
    }
  }, [matchProjectRoute, matchProjectToolRoute]);
  
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
    <ProjectContext.Provider value={{ projectId, setProjectId, isValidProject }}>
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
