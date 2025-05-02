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

// Local storage key for progress data
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
  const [progress, setProgress] = useState<UserProgress>(() => {
    // Initialize from localStorage or create empty progress
    const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return savedProgress ? JSON.parse(savedProgress) : createEmptyProgress();
  });
  
  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);
  
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