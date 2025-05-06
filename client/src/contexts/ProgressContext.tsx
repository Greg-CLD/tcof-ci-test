import React, { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";

// Define the progress interface
export interface ToolProgress {
  completed: boolean;
  lastUpdated?: string;
}

export interface ProjectProgress {
  projectId: string;
  tools: {
    goalMapping?: ToolProgress;
    cynefinOrientation?: ToolProgress;
    tcofJourney?: ToolProgress;
  };
}

// Progress context type definition
interface ProgressContextType {
  progress: ProjectProgress | null | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Create context with default values
const ProgressContext = createContext<ProgressContextType>({
  progress: null,
  isLoading: false,
  error: null,
  refetch: () => {}
});

// Provider component to wrap the app with progress tracking
export const ProgressProvider: React.FC<{children: ReactNode}> = ({children}) => {
  // Get the projectId from URL params
  const { projectId } = useParams<{ projectId?: string }>();
  
  // Fetch the progress data for the project
  const { data: progress, isLoading, error, refetch } = useQuery<ProjectProgress | null>({
    queryKey: ["project-progress", projectId],
    queryFn: async (): Promise<ProjectProgress | null> => {
      if (!projectId) return null;
      
      try {
        // Try to fetch goal mapping data
        const goalMappingRes = await apiRequest("GET", `/api/goal-maps/${projectId}`);
        const goalMappingCompleted = goalMappingRes.ok;
        
        // Try to fetch cynefin orientation data
        const cynefinRes = await apiRequest("GET", `/api/cynefin-selections/${projectId}`);
        const cynefinCompleted = cynefinRes.ok;
        
        // Try to fetch TCOF journey data
        const tcofJourneyRes = await apiRequest("GET", `/api/tcof-journeys/${projectId}`);
        const tcofJourneyCompleted = tcofJourneyRes.ok;
        
        // Log the progress checks
        console.log("Project progress checks:", {
          projectId,
          goalMapping: goalMappingCompleted,
          cynefin: cynefinCompleted,
          tcofJourney: tcofJourneyCompleted
        });
        
        return {
          projectId,
          tools: {
            goalMapping: goalMappingCompleted ? { completed: true } : undefined,
            cynefinOrientation: cynefinCompleted ? { completed: true } : undefined,
            tcofJourney: tcofJourneyCompleted ? { completed: true } : undefined
          }
        };
      } catch (err) {
        console.error("Error checking tool progress:", err);
        return null;
      }
    },
    enabled: !!projectId,
    refetchInterval: 60000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
  
  return (
    <ProgressContext.Provider value={{ progress, isLoading, error, refetch }}>
      {children}
    </ProgressContext.Provider>
  );
};

// Public hook to use the progress context
export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}