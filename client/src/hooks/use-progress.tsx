import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { 
  ToolType, 
  UserProgress, 
  ToolProgress, 
  createEmptyProgress, 
  calculateOverallProgress,
  getToolRoute,
  getNextRecommendedTool
} from '@/lib/progress-tracking';

// Local storage key for persisting progress data
const PROGRESS_STORAGE_KEY = 'tcof-user-progress';

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
    // Try to load from localStorage on initial mount
    try {
      const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
      return savedProgress ? JSON.parse(savedProgress) : createEmptyProgress();
    } catch (error) {
      console.error('Error loading progress from localStorage:', error);
      return createEmptyProgress();
    }
  });

  // Save to localStorage whenever progress changes
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress to localStorage:', error);
    }
  }, [progress]);

  /**
   * Update a specific tool's progress
   */
  const updateTool = (toolType: ToolType, status: Partial<ToolProgress>) => {
    const now = new Date().toISOString();
    
    setProgress(prev => {
      // Create updated tool progress
      const updatedToolProgress = {
        ...prev.tools[toolType],
        ...status,
        lastUpdated: now
      };
      
      // Create updated tools object
      const updatedTools = {
        ...prev.tools,
        [toolType]: updatedToolProgress
      };
      
      // Calculate new overall progress
      const overallProgress = calculateOverallProgress(updatedTools);
      
      return {
        overallProgress,
        tools: updatedTools,
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
        progress: Math.max(progress.tools[toolType].progress, 10) // Set to at least 10% when started
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
      progress: 100 
    });
  };
  
  /**
   * Reset progress for a specific tool
   */
  const resetTool = (toolType: ToolType) => {
    const now = new Date().toISOString();
    updateTool(toolType, {
      started: false,
      completed: false,
      progress: 0,
      lastUpdated: now
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
    if (!nextToolType) return null;
    
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
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  
  return context;
}