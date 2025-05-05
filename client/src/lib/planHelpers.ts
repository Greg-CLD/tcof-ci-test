/**
 * Helper functions for working with plans
 */
import { PlanRecord, DeliveryApproachData, CustomFramework, Stage, TaskPriority, savePlan, loadPlan, createEmptyPlan } from '@/lib/plan-db';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storageAdapter';

/**
 * Gets the ID of the selected plan from localStorage
 * @returns The ID of the selected plan, or undefined if none exists
 */
export const getLatestPlanId = (): string | undefined => {
  const planId = localStorage.getItem('selectedProjectId');
  return planId !== null ? planId : undefined;
};

/**
 * Sets the ID of the selected plan in localStorage
 * @param planId The ID of the plan to set as selected
 */
export const setLatestPlanId = (planId: string): void => {
  localStorage.setItem('selectedProjectId', planId);
};

/**
 * Checks if there is an existing selected plan
 * @returns Whether there is an existing selected plan
 */
export const hasExistingPlan = (): boolean => {
  const planId = localStorage.getItem('selectedProjectId');
  return !!planId;
};

/**
 * Formats a task display name based on its origin type
 * @param text The task text
 * @param origin The origin of the task ('heuristic', 'factor', 'policy')
 * @param index The task index (for numbering)
 * @param stage The stage the task belongs to
 * @returns Formatted task name with appropriate prefix
 */
export const formatTaskDisplayName = (
  text: string,
  origin: 'heuristic' | 'factor' | 'policy',
  index: number,
  stage: string
): string => {
  switch (origin) {
    case 'heuristic':
      return `UH${String(index).padStart(2, '0')} - ${stage} - Task ${index + 1}: ${text}`;
    case 'factor':
      return `SF${String(index).padStart(2, '0')} - ${stage} - Task ${index + 1}: ${text}`;
    case 'policy':
      return `Policy: ${text} - ${stage} - Task ${index + 1}`;
    default:
      return text;
  }
};

/**
 * Formats a framework task display name
 * @param text The task text
 * @param frameworkCode The framework code
 * @param index The task index (for numbering)
 * @param stage The stage the task belongs to
 * @returns Formatted task name with appropriate prefix
 */
export const formatFrameworkTaskDisplayName = (
  text: string,
  frameworkCode: string,
  index: number,
  stage: string
): string => {
  return `${frameworkCode}${String(index).padStart(2, '0')} - ${stage} - Task ${index + 1}: ${text}`;
};

/**
 * Extracts the base task name (without prefix) from a formatted task name
 * @param displayName The formatted display name
 * @returns The base task name
 */
export const extractBaseTaskName = (displayName: string): string => {
  // Check for task pattern: [PREFIX] - [STAGE] - Task [N]: [ACTUAL TASK]
  const taskPattern = /^(?:.*?) - (?:.*?) - Task (?:\d+): (.*)$/;
  const match = displayName.match(taskPattern);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Special case for policy tasks which have a different pattern
  const policyPattern = /^Policy: (.*) - (?:.*?) - Task (?:\d+)$/;
  const policyMatch = displayName.match(policyPattern);
  
  if (policyMatch && policyMatch[1]) {
    return policyMatch[1];
  }
  
  // If no patterns match, return the original string
  return displayName;
};

/**
 * Gets all available plans with their full data
 * @returns An array of all plan records
 */
export const getAllPlans = async (): Promise<PlanRecord[]> => {
  try {
    console.log('Getting all plan IDs...');
    // Get all plan IDs
    const planIds = await storage.list();
    console.log(`Found ${planIds.length} plan IDs:`, planIds);
    
    if (planIds.length === 0) {
      return [];
    }
    
    // Load each plan
    const loadPromises = planIds.map(id => {
      // Extract the ID from the storage key
      const planId = id.replace('tcof_plan_', '');
      console.log(`Loading plan ${planId}...`);
      return loadPlan(planId);
    });
    
    // Wait for all plans to load and filter out any nulls
    const loadedPlans = await Promise.all(loadPromises);
    const validPlans = loadedPlans.filter((plan): plan is PlanRecord => plan !== null);
    console.log(`Successfully loaded ${validPlans.length} plans`);
    return validPlans;
  } catch (error) {
    console.error('Error getting all plans:', error);
    return [];
  }
};

/**
 * Gets basic info for all plans (for listing in UI)
 * @returns An array of basic plan info objects
 */
export const getAllPlanSummaries = async (): Promise<{
  id: string;
  created: string;
  lastUpdated?: string;
  name?: string;
}[]> => {
  try {
    // Force reload of all plans from storage
    const plans = await getAllPlans();
    console.log('Getting plan summaries for UI:', plans.length);
    
    // Extract just the summary info we need for listing
    return plans.map(plan => ({
      id: plan.id,
      created: plan.created,
      lastUpdated: plan.lastUpdated,
      name: plan.name || `Project ${plan.id.slice(0, 5)}` // Use name if available, otherwise generate one
    }));
  } catch (error) {
    console.error('Error getting plan summaries:', error);
    return [];
  }
};

/**
 * Sets the delivery approach data for a plan
 * @param planId Plan ID
 * @param data Delivery approach data
 * @returns Success status
 */
export const setDeliveryApproach = async (
  planId: string,
  data: DeliveryApproachData
): Promise<boolean> => {
  try {
    const plan = await loadPlan(planId);
    if (!plan) return false;
    
    if (!plan.goodPractice) {
      plan.goodPractice = { deliveryApproach: data };
    } else {
      plan.goodPractice.deliveryApproach = data;
    }
    
    return await savePlan(planId, plan);
  } catch (error) {
    console.error('Error setting delivery approach:', error);
    return false;
  }
};

/**
 * Creates a new custom framework
 * @param planId Plan ID
 * @param name Framework name
 * @returns The created framework ID or undefined if failed
 */
export const createCustomFramework = async (
  planId: string,
  name: string
): Promise<string | undefined> => {
  try {
    const plan = await loadPlan(planId);
    if (!plan) return undefined;
    
    // Check that goodPractice exists
    if (!plan.goodPractice) {
      plan.goodPractice = {
        deliveryApproach: undefined,
        zone: null,
        frameworks: [],
        tasks: [],
        customFrameworks: []
      };
    }
    
    // Check that customFrameworks array exists
    if (!plan.goodPractice.customFrameworks) {
      plan.goodPractice.customFrameworks = [];
    }
    
    // Create new framework with ID
    const frameworkId = uuidv4();
    const newFramework: CustomFramework = {
      id: frameworkId,
      name,
      tasks: {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      }
    };
    
    // Add to plan and save
    plan.goodPractice.customFrameworks.push(newFramework);
    const saved = await savePlan(planId, plan);
    
    return saved ? frameworkId : undefined;
  } catch (error) {
    console.error('Error creating custom framework:', error);
    return undefined;
  }
};

/**
 * Adds a task to a custom framework
 * @param planId Plan ID
 * @param frameworkId Framework ID
 * @param stage Stage to add the task to
 * @param task Task text
 * @returns Success status
 */
export const addTaskToCustomFramework = async (
  planId: string,
  frameworkId: string,
  stage: Stage,
  task: string
): Promise<boolean> => {
  try {
    const plan = await loadPlan(planId);
    if (!plan || !plan.goodPractice || !plan.goodPractice.customFrameworks) return false;
    
    // Find the framework
    const frameworkIndex = plan.goodPractice.customFrameworks.findIndex(
      (f: CustomFramework) => f.id === frameworkId
    );
    if (frameworkIndex === -1) return false;
    
    // Add task to the appropriate stage
    plan.goodPractice.customFrameworks[frameworkIndex].tasks[stage].push(task);
    
    return await savePlan(planId, plan);
  } catch (error) {
    console.error('Error adding task to custom framework:', error);
    return false;
  }
};

/**
 * Removes a task from a custom framework
 * @param planId Plan ID
 * @param frameworkId Framework ID
 * @param stage Stage to remove the task from
 * @param taskIndex Index of the task to remove
 * @returns Success status
 */
export const removeTaskFromCustomFramework = async (
  planId: string,
  frameworkId: string,
  stage: Stage,
  taskIndex: number
): Promise<boolean> => {
  try {
    const plan = await loadPlan(planId);
    if (!plan || !plan.goodPractice || !plan.goodPractice.customFrameworks) return false;
    
    // Find the framework
    const frameworkIndex = plan.goodPractice.customFrameworks.findIndex(
      (f: CustomFramework) => f.id === frameworkId
    );
    if (frameworkIndex === -1) return false;
    
    // Remove task from the appropriate stage
    const stageTasks = plan.goodPractice.customFrameworks[frameworkIndex].tasks[stage];
    if (taskIndex < 0 || taskIndex >= stageTasks.length) return false;
    
    stageTasks.splice(taskIndex, 1);
    
    return await savePlan(planId, plan);
  } catch (error) {
    console.error('Error removing task from custom framework:', error);
    return false;
  }
};

/**
 * Removes a custom framework
 * @param planId Plan ID
 * @param frameworkId Framework ID
 * @returns Success status
 */
export const removeCustomFramework = async (
  planId: string,
  frameworkId: string
): Promise<boolean> => {
  try {
    const plan = await loadPlan(planId);
    if (!plan || !plan.goodPractice || !plan.goodPractice.customFrameworks) return false;
    
    // Find and remove the framework
    const initialLength = plan.goodPractice.customFrameworks.length;
    plan.goodPractice.customFrameworks = plan.goodPractice.customFrameworks.filter(
      (f: CustomFramework) => f.id !== frameworkId
    );
    
    // Check if anything was removed
    if (plan.goodPractice.customFrameworks.length === initialLength) return false;
    
    return await savePlan(planId, plan);
  } catch (error) {
    console.error('Error removing custom framework:', error);
    return false;
  }
};

/**
 * Load Success Factor tasks from the API
 * @returns A Promise that resolves to an array of Success Factor tasks, organized by stage
 */
export const loadSuccessFactorTasks = async (): Promise<Record<Stage, { 
  id: string; 
  text: string; 
  stage: Stage; 
  origin: 'heuristic' | 'factor' | 'policy';
  sourceId?: string;
  completed: boolean;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
}[]>> => {
  try {
    // Initialize empty result
    const result: Record<Stage, { 
      id: string; 
      text: string; 
      stage: Stage; 
      origin: 'heuristic' | 'factor' | 'policy';
      sourceId?: string;
      completed: boolean;
      notes?: string;
      priority?: TaskPriority;
      dueDate?: string;
    }[]> = {
      Identification: [],
      Definition: [],
      Delivery: [],
      Closure: []
    };
    
    // Fetch success factors from API
    const response = await fetch('/api/admin/tcof-tasks');
    if (!response.ok) {
      console.warn('Failed to fetch success factors for default tasks');
      return result;
    }
    
    const factors = await response.json();
    
    // Process each factor's tasks into the appropriate stage
    factors.forEach((factor: any) => {
      if (!factor.tasks) return;
      
      // Process tasks for each stage
      Object.keys(factor.tasks).forEach((stageName) => {
        const stage = stageName as Stage;
        const tasks = factor.tasks[stage] || [];
        
        // Add each task to the result
        tasks.forEach((taskText: string) => {
          if (!taskText) return; // Skip empty tasks
          
          result[stage].push({
            id: uuidv4(),
            text: taskText,
            stage,
            origin: 'factor',
            sourceId: factor.id,
            completed: false
          });
        });
      });
    });
    
    return result;
  } catch (error) {
    console.error('Error loading success factor tasks:', error);
    return {
      Identification: [],
      Definition: [],
      Delivery: [],
      Closure: []
    };
  }
};

/**
 * Creates a new plan with default settings and saves it
 * @returns The ID of the newly created plan
 */
export const quickStartPlan = async (): Promise<string> => {
  try {
    // Create a new empty plan with a default name
    const projectId = await createEmptyPlan("Quick Start Project", "Project created with default settings and Success Factor tasks");
    
    // Load success factor tasks
    console.log('Loading success factor tasks for new plan');
    const successFactorTasks = await loadSuccessFactorTasks();
    
    // Load the plan to update it
    const plan = await loadPlan(projectId);
    if (!plan) {
      throw new Error('Failed to load newly created plan');
    }
    
    // Add success factor tasks to the plan
    Object.keys(successFactorTasks).forEach((stageName) => {
      const stage = stageName as Stage;
      plan.stages[stage].tasks = [
        ...(plan.stages[stage].tasks || []),
        ...successFactorTasks[stage]
      ];
    });
    
    // Save the updated plan
    const saved = await savePlan(projectId, plan);
    
    if (!saved) {
      throw new Error('Failed to save plan with success factor tasks');
    }
    
    // Set as the most recent plan
    setLatestPlanId(projectId);
    
    return projectId;
  } catch (error) {
    console.error('Error creating quick start plan:', error);
    throw error;
  }
};