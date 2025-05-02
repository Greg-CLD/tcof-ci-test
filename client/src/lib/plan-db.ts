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

export type Mapping = {
  heuristicId: string;
  factorId: string | null;
};

export type TaskItem = {
  id: string;
  text: string;
  stage: Stage;
  origin: 'heuristic' | 'factor' | 'policy';
  sourceId?: string;
  completed?: boolean;
};

export type PolicyTask = {
  id: string;
  text: string;
  stage: Stage;
};

export type StageData = {
  heuristics: HeuristicItem[];
  factors: FactorItem[];
  practiceTasks: PracticeTaskItem[];
  successFactorRatings?: Record<string, SuccessFactorRating>;
  personalHeuristics?: PersonalHeuristic[];
  mappings?: Mapping[];
  tasks?: TaskItem[];
  policyTasks?: PolicyTask[];
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
  personalHeuristics: [],
  mappings: [],
  tasks: [],
  policyTasks: []
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

/**
 * Adds a mapping between a heuristic and a factor
 */
export const addMapping = (
  planId: string, 
  heuristicId: string, 
  factorId: string | null, 
  stage: Stage
): boolean => {
  const plan = plans[planId];
  if (!plan) return false;
  
  // Get current mappings or initialize
  const mappings = [...(plan.stages[stage].mappings || [])];
  
  // Check if mapping already exists
  const existingIndex = mappings.findIndex(m => m.heuristicId === heuristicId);
  
  if (existingIndex >= 0) {
    // Update existing mapping
    mappings[existingIndex] = {
      heuristicId,
      factorId
    };
  } else {
    // Add new mapping
    mappings.push({
      heuristicId,
      factorId
    });
  }
  
  // Update plan
  plan.stages[stage].mappings = mappings;
  plan.lastUpdated = new Date().toISOString();
  
  return true;
};

/**
 * Adds a task to the plan
 */
export const addTask = (
  planId: string,
  task: Omit<TaskItem, 'id'>,
  stage: Stage
): boolean => {
  const plan = plans[planId];
  if (!plan) return false;
  
  // Get current tasks or initialize
  const tasks = [...(plan.stages[stage].tasks || [])];
  
  // Add new task with generated ID
  tasks.push({
    ...task,
    id: uuidv4()
  });
  
  // Update plan
  plan.stages[stage].tasks = tasks;
  plan.lastUpdated = new Date().toISOString();
  
  return true;
};

/**
 * Updates a task's completed status
 */
export const updateTaskStatus = (
  planId: string,
  taskId: string,
  completed: boolean,
  stage: Stage
): boolean => {
  const plan = plans[planId];
  if (!plan) return false;
  
  const tasks = [...(plan.stages[stage].tasks || [])];
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex < 0) return false;
  
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    completed
  };
  
  plan.stages[stage].tasks = tasks;
  plan.lastUpdated = new Date().toISOString();
  
  return true;
};

/**
 * Adds a policy task to the plan
 */
export const addPolicyTask = (
  planId: string,
  text: string,
  stage: Stage
): boolean => {
  const plan = plans[planId];
  if (!plan) return false;
  
  // Get current policy tasks or initialize
  const policyTasks = [...(plan.stages[stage].policyTasks || [])];
  
  // Add new policy task with generated ID
  policyTasks.push({
    id: uuidv4(),
    text,
    stage
  });
  
  // Update plan
  plan.stages[stage].policyTasks = policyTasks;
  plan.lastUpdated = new Date().toISOString();
  
  return true;
};

/**
 * Removes a policy task from the plan
 */
export const removePolicyTask = (
  planId: string,
  taskId: string,
  stage: Stage
): boolean => {
  const plan = plans[planId];
  if (!plan) return false;
  
  const policyTasks = [...(plan.stages[stage].policyTasks || [])];
  const updatedPolicyTasks = policyTasks.filter(t => t.id !== taskId);
  
  if (updatedPolicyTasks.length === policyTasks.length) return false;
  
  plan.stages[stage].policyTasks = updatedPolicyTasks;
  plan.lastUpdated = new Date().toISOString();
  
  return true;
};