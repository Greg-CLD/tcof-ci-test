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
 * Progress status for an individual tool
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
  const defaultToolProgress = {
    started: false,
    completed: false,
    lastUpdated: now,
    progress: 0
  };
  
  return {
    overallProgress: 0,
    lastUpdated: now,
    tools: {
      'goal-mapping': { ...defaultToolProgress },
      'cynefin': { ...defaultToolProgress },
      'tcof-journey': { ...defaultToolProgress },
      'plan-block1': { ...defaultToolProgress },
      'plan-block2': { ...defaultToolProgress },
      'plan-block3': { ...defaultToolProgress },
      'checklist': { ...defaultToolProgress }
    }
  };
};

/**
 * Calculate overall progress based on individual tool progress
 */
export const calculateOverallProgress = (tools: Record<ToolType, ToolProgress>): number => {
  // Define weights for each tool to determine their contribution to the overall progress
  const weights: Record<ToolType, number> = {
    'goal-mapping': 15,  
    'cynefin': 10,       
    'tcof-journey': 10,  
    'plan-block1': 20,   
    'plan-block2': 20,   
    'plan-block3': 20,   
    'checklist': 5       
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.entries(tools).forEach(([tool, status]) => {
    const toolType = tool as ToolType;
    const weight = weights[toolType];
    weightedSum += status.progress * weight;
    totalWeight += weight;
  });
  
  return Math.round(weightedSum / totalWeight);
};

/**
 * Get tool name from type
 */
export const getToolName = (toolType: ToolType): string => {
  const nameMap: Record<ToolType, string> = {
    'goal-mapping': 'Goal Mapping Tool',
    'cynefin': 'Cynefin Orientation Tool',
    'tcof-journey': 'TCOF Journey Tool',
    'plan-block1': 'Block 1: Discover',
    'plan-block2': 'Block 2: Design',
    'plan-block3': 'Block 3: Deliver',
    'checklist': 'Final Checklist'
  };
  
  return nameMap[toolType];
};

/**
 * Get route for a specific tool
 */
export const getToolRoute = (toolType: ToolType): string => {
  const routeMap: Record<ToolType, string> = {
    'goal-mapping': '/get-your-bearings?tool=goal-mapping',
    'cynefin': '/get-your-bearings?tool=cynefin',
    'tcof-journey': '/get-your-bearings?tool=tcof-journey',
    'plan-block1': '/make-a-plan/block1',
    'plan-block2': '/make-a-plan/block2',
    'plan-block3': '/make-a-plan/block3',
    'checklist': '/make-a-plan/checklist'
  };
  
  return routeMap[toolType];
};

/**
 * Get the next recommended tool based on current progress
 */
export const getNextRecommendedTool = (progress: UserProgress): ToolType | null => {
  // Define the recommended sequence
  const recommendedSequence: ToolType[] = [
    'goal-mapping',
    'cynefin',
    'tcof-journey',
    'plan-block1',
    'plan-block2',
    'plan-block3',
    'checklist'
  ];
  
  // Find the first incomplete tool
  for (const toolType of recommendedSequence) {
    const toolProgress = progress.tools[toolType];
    
    if (!toolProgress.completed) {
      return toolType;
    }
  }
  
  // If all tools are completed, return null
  return null;
};