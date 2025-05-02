import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { 
  getProgress, 
  saveProgress, 
  updateToolProgress,
  markToolStarted,
  markToolCompleted,
  resetToolProgress,
  resetAllProgress,
  getNextRecommendedTool,
  UserProgress,
  ToolType,
  ToolProgress
} from '@/lib/progress-tracking';

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

const ProgressContext = createContext<ProgressContextType | null>(null);

/**
 * Provider component for user progress tracking
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(() => getProgress());
  
  // Update progress on mount
  useEffect(() => {
    setProgress(getProgress());
  }, []);
  
  // Update tool progress
  const updateTool = (toolType: ToolType, status: Partial<ToolProgress>) => {
    const updatedProgress = updateToolProgress(toolType, status);
    setProgress(updatedProgress);
  };
  
  // Mark a tool as started
  const startTool = (toolType: ToolType) => {
    const updatedProgress = markToolStarted(toolType);
    setProgress(updatedProgress);
  };
  
  // Mark a tool as completed
  const completeTool = (toolType: ToolType) => {
    const updatedProgress = markToolCompleted(toolType);
    setProgress(updatedProgress);
  };
  
  // Reset a tool's progress
  const resetTool = (toolType: ToolType) => {
    const updatedProgress = resetToolProgress(toolType);
    setProgress(updatedProgress);
  };
  
  // Reset all progress
  const resetAll = () => {
    const updatedProgress = resetAllProgress();
    setProgress(updatedProgress);
  };
  
  // Get the next recommended tool
  const getNextTool = () => {
    return getNextRecommendedTool();
  };
  
  // Check if a tool is started
  const isToolStarted = (toolType: ToolType): boolean => {
    return progress.tools[toolType]?.started || false;
  };
  
  // Check if a tool is completed
  const isToolCompleted = (toolType: ToolType): boolean => {
    return progress.tools[toolType]?.completed || false;
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