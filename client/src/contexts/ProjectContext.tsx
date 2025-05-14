import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ProjectContextType = {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  clearCurrentProject: () => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available
  const [currentProjectId, setProjectId] = useState<string | null>(() => {
    const saved = localStorage.getItem('currentProjectId');
    return saved || null;
  });

  // Update localStorage whenever currentProjectId changes
  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('currentProjectId', currentProjectId);
      console.log('ProjectContext: Saved project ID to localStorage:', currentProjectId);
    } else {
      localStorage.removeItem('currentProjectId');
      console.log('ProjectContext: Cleared project ID from localStorage');
    }
  }, [currentProjectId]);

  // Expose methods to manage project state
  const setCurrentProjectId = (id: string | null) => {
    console.log('ProjectContext: Setting current project ID:', id);
    setProjectId(id);
  };

  const clearCurrentProject = () => {
    console.log('ProjectContext: Clearing current project ID');
    setProjectId(null);
    localStorage.removeItem('currentProjectId');
  };

  return (
    <ProjectContext.Provider value={{ currentProjectId, setCurrentProjectId, clearCurrentProject }}>
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