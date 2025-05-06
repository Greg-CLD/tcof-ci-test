import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface Project {
  id: string;
  name: string;
  description: string | null;
  organisationId: string;
  createdAt: string;
  isProfileComplete?: boolean;
  // Other project fields can be added as needed
  [key: string]: any;
}

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    // On mount, try to load the project from localStorage
    const storedProjectId = localStorage.getItem('currentProjectId');
    const storedOrgId = localStorage.getItem('currentOrgId');
    
    if (storedProjectId) {
      // Fetch current project data
      const loadProject = async () => {
        try {
          const res = await apiRequest('GET', `/api/projects/${storedProjectId}`);
          if (res.ok) {
            const project = await res.json();
            setCurrentProject(project);
            
            // Also make sure we have the current org ID stored
            if (project.organisationId && !storedOrgId) {
              localStorage.setItem('currentOrgId', project.organisationId);
            }
          }
        } catch (error) {
          console.error('Failed to load project from ID:', error);
        }
      };
      
      loadProject();
    }
  }, []);

  // When project changes, update localStorage
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('currentProjectId', currentProject.id);
      
      // Also store the organisation ID for context
      if (currentProject.organisationId) {
        localStorage.setItem('currentOrgId', currentProject.organisationId);
      }
    }
  }, [currentProject]);

  // Function to refresh the current project data
  const refreshProject = async () => {
    if (!currentProject) return;
    
    try {
      const res = await apiRequest('GET', `/api/projects/${currentProject.id}`);
      if (res.ok) {
        const refreshedProject = await res.json();
        setCurrentProject(refreshedProject);
      }
    } catch (error) {
      console.error('Failed to refresh project:', error);
    }
  };

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject, refreshProject }}>
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