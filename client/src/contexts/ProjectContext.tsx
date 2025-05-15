import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isValidUUID, isNumericId } from '@/lib/uuid-utils';
import { toast } from '@/hooks/use-toast';

export type ProjectContextType = {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  clearCurrentProject: () => void;
  isValidProjectId: (id: string | null) => boolean;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available - checking both keys for backward compatibility
  const [currentProjectId, setProjectId] = useState<string | null>(() => {
    // Try the primary key first, then fall back to the legacy key
    const saved = localStorage.getItem('currentProjectId') || localStorage.getItem('selectedProjectId');
    
    // Validate the saved ID - if it's numeric, discard it
    if (saved && isNumericId(saved)) {
      console.warn('ProjectContext: Found legacy numeric ID in localStorage, discarding:', saved);
      localStorage.removeItem('currentProjectId');
      localStorage.removeItem('selectedProjectId');
      return null;
    }
    
    // If it's not a valid UUID, also discard it
    if (saved && !isValidUUID(saved)) {
      console.warn('ProjectContext: Found invalid UUID in localStorage, discarding:', saved);
      localStorage.removeItem('currentProjectId');
      localStorage.removeItem('selectedProjectId');
      return null;
    }
    
    console.log('ProjectContext: Initial load from localStorage:', saved);
    return saved || null;
  });

  // Update localStorage whenever currentProjectId changes
  useEffect(() => {
    if (currentProjectId) {
      // Validate before saving to localStorage
      if (!isValidUUID(currentProjectId)) {
        console.error('ProjectContext: Attempted to save invalid UUID format:', currentProjectId);
        return;
      }
      
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

  /**
   * Validates if an ID is a proper UUID
   */
  const isValidProjectId = (id: string | null): boolean => {
    return isValidUUID(id);
  };

  // Expose methods to manage project state
  const setCurrentProjectId = (id: string | null) => {
    // Add validation to prevent setting numeric or invalid IDs
    if (id && !isValidUUID(id)) {
      console.error('ProjectContext: Attempted to set invalid UUID format:', id);
      toast({
        title: "Invalid Project ID Format",
        description: "This project uses a legacy ID format that is no longer supported.",
        variant: "destructive",
      });
      return;
    }
    
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
    <ProjectContext.Provider value={{ 
      currentProjectId, 
      setCurrentProjectId, 
      clearCurrentProject,
      isValidProjectId
    }}>
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