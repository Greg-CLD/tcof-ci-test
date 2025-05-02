import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { 
  ToolType, 
  UserProgress, 
  ToolProgress, 
  createEmptyProgress, 
  calculateOverallProgress, 
  getToolRoute,
  getNextRecommendedTool
} from "@/lib/progress-tracking";
import { storage as db } from '@/lib/browserStorage';

// Storage key for progress data
const PROGRESS_STORAGE_KEY = 'tcof_user_progress';

interface ProgressContextType {
  progress: UserProgress;
  updateTool: (toolType: ToolType, status: Partial<ToolProgress>) => void;
  startTool: (toolType: ToolType) => void;
  completeTool: (toolType: ToolType) => void;
  resetTool: (toolType: ToolType) => void;
  resetAll: () => void;
  getNextTool: () => { toolType: ToolType, route: string } | null;
  isToolStarted: (toolType: ToolType) => boolean;
  isToolCompleted: (toolType: ToolType) => boolean;
}

/**
 * Context for progress tracking
 */
const ProgressContext = createContext<ProgressContextType | null>(null);

/**
 * Provider component for user progress tracking
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(createEmptyProgress());
  const [isLoading, setIsLoading] = useState(true);
  
  // Load progress data on component mount
  useEffect(() => {
    async function loadProgressData() {
      setIsLoading(true);
      try {
        // Try to load from our storage adapter
        const storedProgress = await db.get(PROGRESS_STORAGE_KEY);
        
        if (storedProgress) {
          setProgress(typeof storedProgress === 'string' 
            ? JSON.parse(storedProgress) 
            : storedProgress);
        } else {
          // Check localStorage as fallback
          const localProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
          if (localProgress) {
            const parsedProgress = JSON.parse(localProgress);
            setProgress(parsedProgress);
            // Save to our storage adapter for future use
            await db.set(PROGRESS_STORAGE_KEY, localProgress);
          }
        }
      } catch (error) {
        console.error("Error loading progress data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProgressData();
  }, []);
  
  // Save progress to storage whenever it changes
  useEffect(() => {
    if (isLoading) return; // Skip saving during the initial load
    
    // Save to both our storage adapter and localStorage for redundancy
    const progressJSON = JSON.stringify(progress);
    
    // Save to our database adapter
    db.set(PROGRESS_STORAGE_KEY, progressJSON).catch(error => {
      console.error("Error saving progress to database:", error);
    });
    
    // Also save to localStorage as backup
    localStorage.setItem(PROGRESS_STORAGE_KEY, progressJSON);
  }, [progress, isLoading]);
  
  /**
   * Update a specific tool's progress
   */
  const updateTool = (toolType: ToolType, status: Partial<ToolProgress>) => {
    setProgress(prevProgress => {
      const now = new Date().toISOString();
      
      // Update the specific tool
      const updatedTools = {
        ...prevProgress.tools,
        [toolType]: {
          ...prevProgress.tools[toolType],
          ...status,
          lastUpdated: now
        }
      };
      
      // Recalculate overall progress
      const overallProgress = calculateOverallProgress(updatedTools);
      
      return {
        ...prevProgress,
        tools: updatedTools,
        overallProgress,
        lastUpdated: now
      };
    });
  };
  
  /**
   * Mark a tool as started
   */
  const startTool = (toolType: ToolType) => {
    if (!progress.tools[toolType].started) {
      updateTool(toolType, { 
        started: true,
        progress: 10 // Start with 10% progress
      });
    }
  };
  
  /**
   * Mark a tool as completed
   */
  const completeTool = (toolType: ToolType) => {
    updateTool(toolType, { 
      started: true,
      completed: true,
      progress: 100 // Set to 100% progress
    });
  };
  
  /**
   * Reset progress for a specific tool
   */
  const resetTool = (toolType: ToolType) => {
    updateTool(toolType, {
      started: false,
      completed: false,
      progress: 0
    });
  };
  
  /**
   * Reset all progress
   */
  const resetAll = () => {
    setProgress(createEmptyProgress());
  };
  
  /**
   * Get the next recommended tool
   */
  const getNextTool = () => {
    const nextToolType = getNextRecommendedTool(progress);
    
    if (!nextToolType) {
      return null;
    }
    
    return {
      toolType: nextToolType,
      route: getToolRoute(nextToolType)
    };
  };
  
  /**
   * Check if a tool has been started
   */
  const isToolStarted = (toolType: ToolType): boolean => {
    return progress.tools[toolType].started;
  };
  
  /**
   * Check if a tool has been completed
   */
  const isToolCompleted = (toolType: ToolType): boolean => {
    return progress.tools[toolType].completed;
  };
  
  return (
    <ProgressContext.Provider
      value={{
        progress,
        updateTool,
        startTool,
        completeTool,
        resetTool,
        resetAll,
        getNextTool,
        isToolStarted,
        isToolCompleted
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

/**
 * Hook for using progress tracking functionality
 */
export function useProgress() {
  const context = useContext(ProgressContext);
  
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  
  return context;
}