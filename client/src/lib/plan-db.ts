import { v4 as uuidv4 } from 'uuid';

// Types for the plan record structure
export type HeuristicItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type FactorItem = {
  id: string;
  text: string;
  impact: 'low' | 'medium' | 'high';
};

export type PracticeTaskItem = {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  assignee?: string;
};

export type Stage = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

export type SuccessFactorRating = {
  rating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  favourite?: boolean;
};

export type PersonalHeuristic = {
  id: string;
  text: string;
  notes: string;
  favourite?: boolean;
};

export type StageData = {
  heuristics: HeuristicItem[];
  factors: FactorItem[];
  practiceTasks: PracticeTaskItem[];
  successFactorRatings?: Record<string, SuccessFactorRating>;
  personalHeuristics?: PersonalHeuristic[];
};

export type PlanRecord = {
  id: string;
  created: string;
  lastUpdated?: string;
  stages: Record<Stage, StageData>;
};

// Initialize empty stage data
const createEmptyStageData = (): StageData => ({
  heuristics: [],
  factors: [],
  practiceTasks: [],
  successFactorRatings: {},
  personalHeuristics: []
});

// Create empty plan record
const createEmptyPlanRecord = (): PlanRecord => ({
  id: uuidv4(),
  created: new Date().toISOString(),
  stages: {
    Identification: createEmptyStageData(),
    Definition: createEmptyStageData(),
    Delivery: createEmptyStageData(),
    Closure: createEmptyStageData()
  }
});

// Store for plans (in-memory for now, can be swapped for Replit DB later)
const plans: Record<string, PlanRecord> = {};

/**
 * Creates an empty plan and returns its ID
 */
export const createEmptyPlan = (): string => {
  const newPlan = createEmptyPlanRecord();
  plans[newPlan.id] = newPlan;
  return newPlan.id;
};

/**
 * Loads a plan by its ID
 */
export const loadPlan = (id: string): PlanRecord | null => {
  return plans[id] || null;
};

/**
 * Saves plan data with the given ID
 */
export const savePlan = (id: string, data: Partial<PlanRecord>): boolean => {
  if (!plans[id]) return false;
  
  // Update the plan with new data
  plans[id] = {
    ...plans[id],
    ...data,
    lastUpdated: new Date().toISOString()
  };
  
  return true;
};

// Export the plans object for debugging
export const getPlans = (): Record<string, PlanRecord> => ({ ...plans });