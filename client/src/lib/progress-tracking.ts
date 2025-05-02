/**
 * Progress tracking types and utilities
 */

/**
 * Represents types of tools in the TCOF framework
 */
export type ToolType = 
  | 'goal-mapping'    // Goal mapping tool in Get Your Bearings
  | 'cynefin'         // Cynefin orientation tool in Get Your Bearings  
  | 'tcof-journey'    // TCOF journey decision tree in Get Your Bearings
  | 'plan-block1'     // Block 1 - Discover stage in Make a Plan
  | 'plan-block2'     // Block 2 - Design stage in Make a Plan
  | 'plan-block3'     // Block 3 - Deliver stage in Make a Plan
  | 'checklist';      // Final checklist and summary in Make a Plan

/**
 * Progress status for each tool
 */
export interface ToolProgress {
  started: boolean;    // Whether the user has started using the tool
  completed: boolean;  // Whether the user has completed the tool
  lastUpdated: string; // ISO date of last update
  progress: number;    // Percentage of completion (0-100)
}

/**
 * User progress across all tools
 */
export interface UserProgress {
  overallProgress: number; // Weighted overall progress percentage (0-100)
  tools: Record<ToolType, ToolProgress>;
  lastUpdated: string;     // ISO date of last update to any tool
}

/**
 * Default empty progress object
 */
export const createEmptyProgress = (): UserProgress => {
  const now = new Date().toISOString();
  return {
    overallProgress: 0,
    lastUpdated: now,
    tools: {
      'goal-mapping': {
        started: false,
        completed: false,
        lastUpdated: now,
        progress: 0
      },
      'cynefin': {
        started: false,
        completed: false,
        lastUpdated: now,
        progress: 0
      },
      'tcof-journey': {
        started: false,
        completed: false,
        lastUpdated: now,
        progress: 0
      },
      'plan-block1': {
        started: false,
        completed: false,
        lastUpdated: now,
        progress: 0
      },
      'plan-block2': {
        started: false,
        completed: false,
        lastUpdated: now,
        progress: 0
      },
      'plan-block3': {
        started: false,
        completed: false,
        lastUpdated: now,
        progress: 0
      },
      'checklist': {
        started: false,
        completed: false,
        lastUpdated: now,
        progress: 0
      }
    }
  };
};

/**
 * Calculate overall progress based on individual tool progress
 */
export const calculateOverallProgress = (tools: Record<ToolType, ToolProgress>): number => {
  // Define weights for each tool
  const weights: Record<ToolType, number> = {
    'goal-mapping': 10,
    'cynefin': 10,
    'tcof-journey': 10,
    'plan-block1': 20,
    'plan-block2': 20,
    'plan-block3': 20,
    'checklist': 10
  };
  
  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [tool, progress] of Object.entries(tools) as [ToolType, ToolProgress][]) {
    weightedSum += progress.progress * weights[tool];
    totalWeight += weights[tool];
  }
  
  return Math.round(weightedSum / totalWeight);
};

/**
 * Get tool name from type
 */
export const getToolName = (toolType: ToolType): string => {
  const toolNames: Record<ToolType, string> = {
    'goal-mapping': 'Goal Mapping',
    'cynefin': 'Cynefin Orientation',
    'tcof-journey': 'TCOF Journey',
    'plan-block1': 'Block 1: Discover',
    'plan-block2': 'Block 2: Design',
    'plan-block3': 'Block 3: Deliver',
    'checklist': 'Project Checklist'
  };
  
  return toolNames[toolType];
};

/**
 * Get route for a specific tool
 */
export const getToolRoute = (toolType: ToolType): string => {
  const toolRoutes: Record<ToolType, string> = {
    'goal-mapping': '/tools/goal-mapping',
    'cynefin': '/tools/cynefin-orientation',
    'tcof-journey': '/tools/tcof-journey',
    'plan-block1': '/make-a-plan/full/block-1',
    'plan-block2': '/make-a-plan/full/block-2',
    'plan-block3': '/make-a-plan/full/block-3',
    'checklist': '/checklist'
  };
  
  return toolRoutes[toolType];
};

/**
 * Get the next recommended tool based on current progress
 */
export const getNextRecommendedTool = (progress: UserProgress): ToolType | null => {
  // Order of tools as recommended path
  const toolOrder: ToolType[] = [
    'goal-mapping',
    'cynefin',
    'tcof-journey',
    'plan-block1',
    'plan-block2',
    'plan-block3',
    'checklist'
  ];
  
  // Find first incomplete tool
  for (const tool of toolOrder) {
    if (!progress.tools[tool].completed) {
      return tool;
    }
  }
  
  return null; // All tools completed
};