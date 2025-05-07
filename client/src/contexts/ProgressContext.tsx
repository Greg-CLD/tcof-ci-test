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
  refreshProgress: () => void;
}

// Create context with default values
const ProgressContext = createContext<ProgressContextType>({
  progress: null,
  isLoading: false,
  error: null,
  refetch: () => {},
  refreshProgress: () => {}
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
        
        // First, check for direct completion status from project-progress endpoints
        try {
          // For Goal Mapping
          const goalMappingProgressRes = await apiRequest("GET", `/api/project-progress/goal-mapping/status?projectId=${projectId}`);
          if (goalMappingProgressRes.ok) {
            const goalMappingProgressData = await goalMappingProgressRes.json();
            if (goalMappingProgressData && goalMappingProgressData.completed) {
              console.log("Goal mapping is marked as completed in project progress", goalMappingProgressData);
              goalMappingCompleted = true;
            }
          }

          // For Cynefin Orientation
          const cynefinProgressRes = await apiRequest("GET", `/api/project-progress/cynefin-orientation/status?projectId=${projectId}`);
          if (cynefinProgressRes.ok) {
            const cynefinProgressData = await cynefinProgressRes.json();
            if (cynefinProgressData && cynefinProgressData.completed) {
              console.log("Cynefin orientation is marked as completed in project progress", cynefinProgressData);
              cynefinCompleted = true;
            }
          }
          
          // For TCOF Journey
          const tcofJourneyProgressRes = await apiRequest("GET", `/api/project-progress/tcof-journey/status?projectId=${projectId}`);
          if (tcofJourneyProgressRes.ok) {
            const tcofJourneyProgressData = await tcofJourneyProgressRes.json();
            if (tcofJourneyProgressData && tcofJourneyProgressData.completed) {
              console.log("TCOF Journey is marked as completed in project progress", tcofJourneyProgressData);
              tcofJourneyCompleted = true;
            }
          }
        } catch (err) {
          console.error("Error fetching direct progress status:", err);
        }
        
        // Only check these fallbacks if the direct progress status checks didn't indicate completion
        
        // Try to fetch goal mapping data
        if (!goalMappingCompleted) {
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
        }
        
        // Try to fetch cynefin orientation data
        if (!cynefinCompleted) {
          try {
            const cynefinRes = await apiRequest("GET", `/api/cynefin-selections?projectId=${projectId}`);
            if (cynefinRes.ok) {
              const cynefinData = await cynefinRes.json();
              // Check if there are actual selections in the cynefin data
              const hasSelections = cynefinData && 
                                cynefinData.data && 
                                cynefinData.data.quadrant;
              
              if (hasSelections) {
                console.log(`Found valid Cynefin selection:`, cynefinData.data.quadrant);
                
                // We don't automatically mark it as complete just because it has data
                // It's only complete if the submit button was clicked (checked above)
              }
            }
          } catch (err) {
            console.error("Error fetching cynefin data:", err);
          }
        }
        
        // Try to fetch TCOF journey data
        if (!tcofJourneyCompleted) {
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
        }
        
        // Log the progress checks
        console.log("Project progress status:", {
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
  
  // Function to refresh progress data
  const refreshProgress = () => {
    console.log("Refreshing project progress data...");
    refetch();
  };

  return (
    <ProgressContext.Provider value={{ progress, isLoading, error, refetch, refreshProgress }}>
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