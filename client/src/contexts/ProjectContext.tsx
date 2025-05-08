import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
  sector?: string;
  status?: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  isLoading: boolean;
  error: Error | null;
  setCurrentProject: (project: Project) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Detect project ID from localStorage or URL
  useEffect(() => {
    const storedProjectId = localStorage.getItem('currentProjectId') || localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      setProjectId(storedProjectId);
    }
  }, []);
  
  // Fetch project data if ID is available
  const { isLoading, error } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: async () => {
      if (!projectId) return null;
      
      const res = await apiRequest('GET', `/api/projects/${projectId}`);
      const data = await res.json();
      setCurrentProject(data);
      return data;
    },
    enabled: !!projectId,
  });
  
  return (
    <ProjectContext.Provider value={{ 
      currentProject, 
      isLoading, 
      error: error as Error, 
      setCurrentProject 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};