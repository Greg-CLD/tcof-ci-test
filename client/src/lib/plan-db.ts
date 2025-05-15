import { v4 as uuidv4 } from 'uuid';
import { storage } from './storageAdapter';

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

export type Stage = 'identification' | 'definition' | 'delivery' | 'closure';

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

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskItem = {
  id: string;
  text: string;
  stage: Stage;
  origin: 'heuristic' | 'factor' | 'policy';
  sourceId?: string;
  completed?: boolean;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  order?: number;
  owner?: string;
};

export type PolicyTask = {
  id: string;
  text: string;
  stage: Stage;
};

export type GoodPracticeTask = {
  id: string;
  text: string;
  stage: Stage;
  frameworkCode: string;
  completed?: boolean;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  order?: number;
  owner?: string;
};

export type CustomFramework = {
  id: string;
  name: string;
  tasks: Record<Stage, string[]>;
};

export type GoodPractice = {
  zone: string | null;
  frameworks: string[];
  tasks: GoodPracticeTask[];
  customFrameworks?: CustomFramework[];
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
  goodPractice?: GoodPractice;
};

export type DeliveryApproachData = {
  scope: 'Small' | 'Medium' | 'Large';
  uncertainty: 'Low' | 'Medium' | 'High';
  zone: string;
  methods: string[];
  tools: string[];
};

export type PlanGoodPractice = {
  deliveryApproach?: DeliveryApproachData;
  [key: string]: any;
};

export type PlanRecord = {
  id: string;
  projectId: string; // Associate with a specific project
  name?: string;
  description?: string;
  created: string;
  lastUpdated?: string;
  stages: Record<Stage, StageData>;
  goodPractice?: PlanGoodPractice;
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
  policyTasks: [],
  goodPractice: {
    zone: null,
    frameworks: [],
    tasks: [],
    customFrameworks: []
  }
});

// Create empty plan record
const createEmptyPlanRecord = (name?: string, description?: string, projectId?: string): PlanRecord => ({
  id: uuidv4(),
  projectId: projectId || 'default', // Use default if no project ID provided
  name,
  description,
  created: new Date().toISOString(),
  stages: {
    identification: createEmptyStageData(),
    definition: createEmptyStageData(),
    delivery: createEmptyStageData(),
    closure: createEmptyStageData()
  }
});

// Store for plans (in-memory for now, can be swapped for Replit DB later)
const plans: Record<string, PlanRecord> = {};

/**
 * Creates an empty plan and returns its ID
 * @param name Optional name for the plan
 * @param description Optional description for the plan
 * @param projectId ID of the project this plan belongs to
 */
export const createEmptyPlan = async (name?: string, description?: string, projectId?: string): Promise<string> => {
  // Get the project ID from parameter, localStorage, or use default
  const selectedProjectId = projectId || localStorage.getItem('selectedProjectId') || 'default';
  
  const newPlan = createEmptyPlanRecord(name, description, selectedProjectId);
  plans[newPlan.id] = newPlan;
  
  try {
    // Store the new plan in persistent storage
    await storage.save(newPlan.id, newPlan);
    
    // Set this as the selected project ID in localStorage
    localStorage.setItem('selectedProjectId', newPlan.id);
    
    return newPlan.id;
  } catch (error) {
    console.error('Error creating empty plan:', error);
    return newPlan.id; // Still return the ID even if storage fails
  }
};

/**
 * Loads a plan by its ID
 * If no ID is provided, attempts to load the selected plan
 */
export const loadPlan = async (id?: string): Promise<PlanRecord | null> => {
  // If no ID provided, try to get the selected plan ID from localStorage
  let planId = id;
  if (!planId) {
    const storedId = localStorage.getItem('selectedProjectId');
    if (!storedId) return null;
    planId = storedId;
  }
  
  // Check if the plan is in memory first
  const plan = plans[planId];
  if (plan) return plan;
  
  // If not in memory, try to load from storage
  try {
    const storedPlan = await storage.load(planId);
    if (storedPlan) {
      // Cache the plan in memory for faster access
      plans[planId] = storedPlan;
      return storedPlan;
    }
    return null;
  } catch (error) {
    console.error('Error loading plan:', error);
    return null;
  }
};

/**
 * Saves plan data with the given ID
 * If the plan doesn't exist in memory, attempts to load it first
 */
export const savePlan = async (id: string, data: Partial<PlanRecord>): Promise<boolean> => {
  // Check if plan exists in memory, if not try to load it first
  if (!plans[id]) {
    console.log(`Plan ${id} not found in memory, attempting to load from storage`);
    try {
      // Try to load from storage
      const storedPlan = await storage.load(id);
      if (storedPlan) {
        plans[id] = storedPlan;
        console.log(`Successfully loaded plan ${id} from storage`);
      } else {
        // If the plan doesn't exist yet, initialize it
        console.log(`Creating new plan record for ID ${id} as it doesn't exist in storage`);
        
        // Get the project ID from data, localStorage, or use default
        const projectId = data.projectId || localStorage.getItem('selectedProjectId') || 'default';
        
        plans[id] = {
          id,
          projectId, // Ensure we set the projectId
          created: new Date().toISOString(),
          stages: {
            Identification: createEmptyStageData(),
            Definition: createEmptyStageData(),
            Delivery: createEmptyStageData(),
            Closure: createEmptyStageData()
          },
          ...data
        } as PlanRecord;
      }
    } catch (error) {
      console.error(`Failed to load or initialize plan ${id}:`, error);
      return false;
    }
  }
  
  // Update the plan with new data and timestamp
  plans[id] = {
    ...plans[id],
    ...data,
    lastUpdated: new Date().toISOString()
  };
  
  // Save to localStorage as selected plan
  localStorage.setItem('selectedProjectId', id);
  
  // Persist to storage
  try {
    console.log(`Saving plan ${id} to persistent storage`);
    await storage.save(id, plans[id]);
    console.log(`Successfully saved plan ${id}`);
    return true;
  } catch (error) {
    console.error('Error saving plan:', error);
    return false;
  }
};

// Export the plans object for debugging
export const getPlans = (): Record<string, PlanRecord> => ({ ...plans });

/**
 * Gets a single plan by ID
 * @param planId - The ID of the plan to retrieve
 */
export const getPlan = (planId: string): PlanRecord | null => {
  return plans[planId] || null;
};

interface ParentItem {
  id: string;
  label: string;
  source: 'heuristic' | 'factor' | 'policy' | 'framework';
  tasks: string[];
}

/**
 * Get tasks organized by parent and stage
 * @param planId - The ID of the plan
 */
export const getParentsByStage = (planId: string): Record<Stage, ParentItem[]> => {
  const plan = plans[planId];
  if (!plan) {
    return {
      identification: [],
      definition: [],
      delivery: [],
      closure: []
    };
  }
  
  const result: Record<Stage, ParentItem[]> = {
    identification: [],
    definition: [],
    delivery: [],
    closure: []
  };
  
  // Process all stages
  Object.keys(plan.stages).forEach(stageName => {
    const stage = stageName as Stage;
    const stageData = plan.stages[stage];
    const parentGroups: Record<string, ParentItem> = {};
    
    // Process tasks from factors and heuristics
    (stageData.tasks || []).forEach(task => {
      const sourceId = task.sourceId || 'unknown';
      let label = 'Unknown Source';
      let source: 'heuristic' | 'factor' | 'policy' = task.origin;
      
      // Determine parent label based on source
      if (task.origin === 'heuristic') {
        const heuristic = (stageData.personalHeuristics || []).find(h => h.id === sourceId);
        label = heuristic ? heuristic.text : 'Personal Heuristic';
      } else if (task.origin === 'factor') {
        label = 'Success Factor Tasks';
      } else if (task.origin === 'policy') {
        label = 'Organizational Policy';
      }
      
      // Create or update parent group
      if (!parentGroups[sourceId]) {
        parentGroups[sourceId] = {
          id: sourceId,
          label,
          source,
          tasks: []
        };
      }
      
      parentGroups[sourceId].tasks.push(task.text);
    });
    
    // Process tasks from policies
    (stageData.policyTasks || []).forEach(task => {
      const policyId = 'policy';
      
      if (!parentGroups[policyId]) {
        parentGroups[policyId] = {
          id: policyId,
          label: 'Organizational Policy',
          source: 'policy',
          tasks: []
        };
      }
      
      parentGroups[policyId].tasks.push(task.text);
    });
    
    // Process good practice tasks
    if (stageData.goodPractice) {
      (stageData.goodPractice.tasks || []).forEach(task => {
        const frameworkId = task.frameworkCode;
        
        if (!parentGroups[frameworkId]) {
          parentGroups[frameworkId] = {
            id: frameworkId,
            label: `Framework: ${frameworkId}`,
            source: 'framework',
            tasks: []
          };
        }
        
        parentGroups[frameworkId].tasks.push(task.text);
      });
      
      // Process custom frameworks
      (stageData.goodPractice.customFrameworks || []).forEach(framework => {
        const frameworkId = framework.id;
        const stageTasks = framework.tasks[stage] || [];
        
        if (stageTasks.length > 0) {
          if (!parentGroups[frameworkId]) {
            parentGroups[frameworkId] = {
              id: frameworkId,
              label: framework.name,
              source: 'framework',
              tasks: []
            };
          }
          
          parentGroups[frameworkId].tasks.push(...stageTasks);
        }
      });
    }
    
    // Convert parentGroups object to array
    result[stage] = Object.values(parentGroups);
  });
  
  return result;
};

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
  
  // Save changes to storage asynchronously but don't wait for it
  savePlan(planId, plan).catch(err => {
    console.error('Error saving mapping:', err);
  });
  
  return true;
};

/**
 * Adds a task to the plan
 */
export const addTask = async (
  planId: string,
  task: Omit<TaskItem, 'id'>,
  stage: Stage
): Promise<boolean> => {
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
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * Updates a task's completed status
 */
export const updateTaskStatus = async (
  planId: string,
  taskId: string,
  completed: boolean,
  stage: Stage
): Promise<boolean> => {
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
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * Adds a policy task to the plan
 */
export const addPolicyTask = async (
  planId: string,
  text: string,
  stage: Stage
): Promise<boolean> => {
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
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * Removes a policy task from the plan
 */
export const removePolicyTask = async (
  planId: string,
  taskId: string,
  stage: Stage
): Promise<boolean> => {
  const plan = plans[planId];
  if (!plan) return false;
  
  const policyTasks = [...(plan.stages[stage].policyTasks || [])];
  const updatedPolicyTasks = policyTasks.filter(t => t.id !== taskId);
  
  if (updatedPolicyTasks.length === policyTasks.length) return false;
  
  plan.stages[stage].policyTasks = updatedPolicyTasks;
  plan.lastUpdated = new Date().toISOString();
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * Set the Praxis zone for the plan
 */
export const setZone = async (
  planId: string,
  zone: string
): Promise<boolean> => {
  const plan = plans[planId];
  if (!plan) return false;
  
  // Initialize goodPractice if it doesn't exist
  if (!plan.stages.identification.goodPractice) {
    plan.stages.identification.goodPractice = {
      zone: null,
      frameworks: [],
      tasks: [],
      customFrameworks: []
    };
  }
  
  // Ensure goodPractice exists in all stages
  Object.keys(plan.stages).forEach(stageName => {
    const stage = stageName as Stage;
    if (!plan.stages[stage].goodPractice) {
      plan.stages[stage].goodPractice = {
        zone: null,
        frameworks: [],
        tasks: []
      };
    }
    
    // Set zone for all stages
    if (plan.stages[stage].goodPractice) {
      plan.stages[stage].goodPractice.zone = zone;
    }
  });
  
  plan.lastUpdated = new Date().toISOString();
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * Toggle a framework's selection status
 */
export const toggleFramework = async (
  planId: string,
  frameworkCode: string
): Promise<boolean> => {
  const plan = plans[planId];
  if (!plan) return false;
  
  // Ensure all stages have a goodPractice property
  Object.keys(plan.stages).forEach(stageName => {
    const stage = stageName as Stage;
    if (!plan.stages[stage].goodPractice) {
      plan.stages[stage].goodPractice = {
        zone: null,
        frameworks: [],
        tasks: []
      };
    }
    
    const goodPractice = plan.stages[stage].goodPractice!;
    
    // Toggle framework selection
    if (goodPractice.frameworks.includes(frameworkCode)) {
      // Remove framework and its tasks
      goodPractice.frameworks = goodPractice.frameworks.filter(f => f !== frameworkCode);
      goodPractice.tasks = goodPractice.tasks.filter(t => t.frameworkCode !== frameworkCode);
    } else {
      // Add framework
      goodPractice.frameworks.push(frameworkCode);
    }
  });
  
  plan.lastUpdated = new Date().toISOString();
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * Toggle a good practice task's selection
 */
export const toggleGpTask = async (
  planId: string,
  text: string,
  frameworkCode: string,
  stage: Stage
): Promise<boolean> => {
  const plan = plans[planId];
  if (!plan) return false;
  
  // Ensure goodPractice exists
  if (!plan.stages[stage].goodPractice) {
    plan.stages[stage].goodPractice = {
      zone: null,
      frameworks: [],
      tasks: [],
      customFrameworks: []
    };
  }
  
  const goodPractice = plan.stages[stage].goodPractice!;
  
  // Check if task already exists
  const existingTaskIndex = goodPractice.tasks.findIndex(
    t => t.text === text && t.frameworkCode === frameworkCode && t.stage === stage
  );
  
  if (existingTaskIndex >= 0) {
    // Remove the task
    goodPractice.tasks = goodPractice.tasks.filter((_, index) => index !== existingTaskIndex);
  } else {
    // Add the task
    goodPractice.tasks.push({
      id: uuidv4(),
      text,
      stage,
      frameworkCode,
      completed: false
    });
  }
  
  plan.lastUpdated = new Date().toISOString();
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * Get the count of different task types
 */
export const getTaskCounts = (
  planId: string
): { heuristics: number, factorTasks: number, gpTasks: number } => {
  const plan = plans[planId];
  if (!plan) return { heuristics: 0, factorTasks: 0, gpTasks: 0 };
  
  let heuristicsCount = 0;
  let factorTasksCount = 0;
  let gpTasksCount = 0;
  
  // Count across all stages
  Object.keys(plan.stages).forEach(stageName => {
    const stage = stageName as Stage;
    const stageData = plan.stages[stage];
    
    // Count personal heuristics
    heuristicsCount += (stageData.personalHeuristics || []).length;
    
    // Count factor tasks
    factorTasksCount += (stageData.tasks || []).filter(t => t.origin === 'factor').length;
    
    // Count good practice tasks
    gpTasksCount += (stageData.goodPractice?.tasks || []).length;
  });
  
  return {
    heuristics: heuristicsCount,
    factorTasks: factorTasksCount,
    gpTasks: gpTasksCount
  };
};

/**
 * Mark a plan as complete
 */
export const markPlanComplete = async (
  planId: string,
  complete: boolean = true
): Promise<boolean> => {
  const plan = plans[planId];
  if (!plan) return false;
  
  // Add a complete flag to the plan
  (plan as any).complete = complete;
  plan.lastUpdated = new Date().toISOString();
  
  // Save changes to storage
  await savePlan(planId, plan);
  
  return true;
};

/**
 * List all existing plans
 */
export const listExistingPlans = async (): Promise<string[]> => {
  return await storage.list();
};

/**
 * Check if a plan exists
 */
export const planExists = async (id: string): Promise<boolean> => {
  return (await storage.load(id)) !== null;
};