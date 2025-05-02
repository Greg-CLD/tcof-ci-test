/**
 * Progress tracking utilities
 * Tracks user progress across tools and saves it to localStorage and the server
 */

export type ToolType = 'goal-mapping' | 'cynefin' | 'tcof-journey' | 'plan-block1' | 'plan-block2' | 'plan-block3' | 'checklist';

export interface ToolProgress {
  started: boolean;
  completed: boolean;
  lastUpdated: number;
}

export interface UserProgress {
  tools: Record<ToolType, ToolProgress>;
  overallProgress: number; // 0-100
  lastUpdated: number;
}

const DEFAULT_TOOL_PROGRESS: ToolProgress = {
  started: false,
  completed: false,
  lastUpdated: 0
};

const DEFAULT_USER_PROGRESS: UserProgress = {
  tools: {
    'goal-mapping': { ...DEFAULT_TOOL_PROGRESS },
    'cynefin': { ...DEFAULT_TOOL_PROGRESS },
    'tcof-journey': { ...DEFAULT_TOOL_PROGRESS },
    'plan-block1': { ...DEFAULT_TOOL_PROGRESS },
    'plan-block2': { ...DEFAULT_TOOL_PROGRESS },
    'plan-block3': { ...DEFAULT_TOOL_PROGRESS },
    'checklist': { ...DEFAULT_TOOL_PROGRESS }
  },
  overallProgress: 0,
  lastUpdated: 0
};

// Weight of each tool for calculating overall progress
const TOOL_WEIGHTS: Record<ToolType, number> = {
  'goal-mapping': 15,
  'cynefin': 10,
  'tcof-journey': 10,
  'plan-block1': 20,
  'plan-block2': 20,
  'plan-block3': 20,
  'checklist': 5
};

// Local storage key for progress data
const PROGRESS_STORAGE_KEY = 'tcof_user_progress';

/**
 * Get the user's progress data from localStorage
 */
export function getProgress(): UserProgress {
  try {
    const storedData = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!storedData) {
      return { ...DEFAULT_USER_PROGRESS };
    }
    
    const parsedData = JSON.parse(storedData) as UserProgress;
    
    // Ensure all tools are present (in case we add new tools later)
    const progress: UserProgress = {
      ...DEFAULT_USER_PROGRESS,
      ...parsedData,
      tools: {
        ...DEFAULT_USER_PROGRESS.tools,
        ...parsedData.tools
      }
    };
    
    // Recalculate overall progress
    progress.overallProgress = calculateOverallProgress(progress.tools);
    
    return progress;
  } catch (error) {
    console.error('Error loading progress data:', error);
    return { ...DEFAULT_USER_PROGRESS };
  }
}

/**
 * Save the user's progress data to localStorage
 */
export function saveProgress(progress: UserProgress): void {
  try {
    progress.lastUpdated = Date.now();
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving progress data:', error);
  }
}

/**
 * Update progress for a specific tool
 */
export function updateToolProgress(toolType: ToolType, status: Partial<ToolProgress>): UserProgress {
  const progress = getProgress();
  
  progress.tools[toolType] = {
    ...progress.tools[toolType],
    ...status,
    lastUpdated: Date.now()
  };
  
  // Recalculate overall progress
  progress.overallProgress = calculateOverallProgress(progress.tools);
  
  // Save the updated progress
  saveProgress(progress);
  
  return progress;
}

/**
 * Mark a tool as started
 */
export function markToolStarted(toolType: ToolType): UserProgress {
  return updateToolProgress(toolType, { started: true });
}

/**
 * Mark a tool as completed
 */
export function markToolCompleted(toolType: ToolType): UserProgress {
  return updateToolProgress(toolType, { started: true, completed: true });
}

/**
 * Reset progress for a specific tool
 */
export function resetToolProgress(toolType: ToolType): UserProgress {
  return updateToolProgress(toolType, { ...DEFAULT_TOOL_PROGRESS });
}

/**
 * Reset all progress data
 */
export function resetAllProgress(): UserProgress {
  const progress = { ...DEFAULT_USER_PROGRESS };
  progress.lastUpdated = Date.now();
  saveProgress(progress);
  return progress;
}

/**
 * Calculate overall progress based on tool progress
 */
function calculateOverallProgress(toolsProgress: Record<ToolType, ToolProgress>): number {
  let totalWeightedProgress = 0;
  let totalWeight = 0;
  
  // Calculate the weighted progress for each tool
  Object.entries(toolsProgress).forEach(([tool, progress]) => {
    const toolType = tool as ToolType;
    const weight = TOOL_WEIGHTS[toolType] || 0;
    totalWeight += weight;
    
    // Calculate tool progress (50% for started, 100% for completed)
    let toolProgress = 0;
    if (progress.completed) {
      toolProgress = 1;
    } else if (progress.started) {
      toolProgress = 0.5;
    }
    
    totalWeightedProgress += toolProgress * weight;
  });
  
  // Calculate the overall progress (0-100%)
  const overallPercentage = totalWeight > 0 
    ? Math.round((totalWeightedProgress / totalWeight) * 100)
    : 0;
  
  return overallPercentage;
}

/**
 * Get user-friendly name for a tool type
 */
export function getToolName(toolType: ToolType): string {
  const toolNames: Record<ToolType, string> = {
    'goal-mapping': 'Goal Mapping Tool',
    'cynefin': 'Cynefin Orientation Tool',
    'tcof-journey': 'TCOF Journey Tool',
    'plan-block1': 'Plan Block 1: Discover',
    'plan-block2': 'Plan Block 2: Design',
    'plan-block3': 'Plan Block 3: Deliver',
    'checklist': 'Checklist'
  };
  
  return toolNames[toolType] || toolType;
}

/**
 * Get route for a tool type
 */
export function getToolRoute(toolType: ToolType): string {
  const toolRoutes: Record<ToolType, string> = {
    'goal-mapping': '/goal-mapping',
    'cynefin': '/cynefin',
    'tcof-journey': '/tcof-journey',
    'plan-block1': '/make-a-plan/block1',
    'plan-block2': '/make-a-plan/block2',
    'plan-block3': '/make-a-plan/block3',
    'checklist': '/checklist'
  };
  
  return toolRoutes[toolType] || '/';
}

/**
 * Get the next tool to work on based on current progress
 */
export function getNextRecommendedTool(): { toolType: ToolType, route: string } | null {
  const progress = getProgress();
  
  // Order tools by priority for completion
  const toolPriority: ToolType[] = [
    'goal-mapping',
    'cynefin',
    'tcof-journey',
    'plan-block1',
    'plan-block2', 
    'plan-block3',
    'checklist'
  ];
  
  // Find the first incomplete tool
  const nextTool = toolPriority.find(tool => !progress.tools[tool].completed);
  
  if (!nextTool) {
    return null; // All tools completed
  }
  
  return {
    toolType: nextTool,
    route: getToolRoute(nextTool)
  };
}