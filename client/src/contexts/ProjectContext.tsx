import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ProjectContextType = {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  clearCurrentProject: () => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available - checking both keys for backward compatibility
  const [currentProjectId, setProjectId] = useState<string | null>(() => {
    // Try the primary key first, then fall back to the legacy key
    const saved = localStorage.getItem('currentProjectId') || localStorage.getItem('selectedProjectId');
    console.log('ProjectContext: Initial load from localStorage:', saved);
    return saved || null;
  });

  // Update localStorage whenever currentProjectId changes
  useEffect(() => {
    if (currentProjectId) {
      // Always store in both keys for backward compatibility
      localStorage.setItem('currentProjectId', currentProjectId);
      localStorage.setItem('selectedProjectId', currentProjectId);
      console.log('ProjectContext: Saved project ID to localStorage:', currentProjectId);
    } else {
      // Clear both storage keys
      localStorage.removeItem('currentProjectId');
      localStorage.removeItem('selectedProjectId');
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
    
    // Clear both storage keys for consistency
    localStorage.removeItem('currentProjectId');
    localStorage.removeItem('selectedProjectId');
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

// For backward compatibility - alias for useProject
export function useProjectContext() {
  return useProject();
}