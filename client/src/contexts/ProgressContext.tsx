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
        // Initialize completion flags
        let goalMappingCompleted = false;
        let cynefinCompleted = false;
        let tcofJourneyCompleted = false;
        
        // Try to fetch goal mapping data
        try {
          const goalMappingRes = await apiRequest("GET", `/api/goal-maps?projectId=${projectId}`);
          if (goalMappingRes.ok) {
            const goalMapData = await goalMappingRes.json();
            // Check if there are actual nodes in the goal map
            goalMappingCompleted = goalMapData && 
                                   goalMapData.nodes && 
                                   Array.isArray(goalMapData.nodes) && 
                                   goalMapData.nodes.length > 0;
            console.log(`Goal mapping data:`, goalMapData);
          }
        } catch (err) {
          console.error("Error fetching goal mapping data:", err);
        }
        
        // Try to fetch cynefin orientation data
        try {
          const cynefinRes = await apiRequest("GET", `/api/cynefin-selections?projectId=${projectId}`);
          if (cynefinRes.ok) {
            const cynefinData = await cynefinRes.json();
            // Check if there are actual selections in the cynefin data
            cynefinCompleted = cynefinData && 
                              cynefinData.data && 
                              cynefinData.data.selections && 
                              Array.isArray(cynefinData.data.selections) && 
                              cynefinData.data.selections.length > 0;
            console.log(`Cynefin data:`, cynefinData);
          }
        } catch (err) {
          console.error("Error fetching cynefin data:", err);
        }
        
        // Try to fetch TCOF journey data
        try {
          const tcofJourneyRes = await apiRequest("GET", `/api/tcof-journeys?projectId=${projectId}`);
          if (tcofJourneyRes.ok) {
            const journeyData = await tcofJourneyRes.json();
            // Check if there are actual decisions in the journey data
            tcofJourneyCompleted = journeyData && 
                                  journeyData.data && 
                                  journeyData.data.decisions && 
                                  Object.keys(journeyData.data.decisions).length > 0;
            console.log(`TCOF Journey data:`, journeyData);
          }
        } catch (err) {
          console.error("Error fetching TCOF journey data:", err);
        }
        
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
            goalMapping: goalMappingCompleted ? { 
              completed: true,
              lastUpdated: new Date().toISOString() 
            } : undefined,
            cynefinOrientation: cynefinCompleted ? { 
              completed: true, 
              lastUpdated: new Date().toISOString() 
            } : undefined,
            tcofJourney: tcofJourneyCompleted ? { 
              completed: true, 
              lastUpdated: new Date().toISOString() 
            } : undefined
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