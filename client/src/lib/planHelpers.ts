import { 
  createEmptyPlan, 
  savePlan, 
  loadPlan, 
  PlanRecord, 
  planExists,
  DeliveryApproachData,
  Stage,
  TaskItem
} from './plan-db';
import { v4 as uuidv4 } from 'uuid';
import { loadFactors } from '@/utils/factorLoader';

// Default preset heuristics types
export interface PresetHeuristic {
  id: string;
  text: string;
  notes: string;
}

// Async function to load presetHeuristics from API
async function loadPresetHeuristics(): Promise<PresetHeuristic[]> {
  try {
    const response = await fetch('/api/admin/preset-heuristics');
    if (!response.ok) {
      throw new Error(`Failed to load preset heuristics: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading preset heuristics:', error);
    // Fallback default heuristics if API call fails
    return [
      { id: "H1", text: "Start slow to go fast", notes: "" },
      { id: "H2", text: "Test it small before you scale it big", notes: "" }
    ];
  }
}

// Async function to load success factors from API
async function loadSuccessFactorTasks(): Promise<any[]> {
  try {
    const response = await fetch('/api/admin/tcof-tasks');
    if (!response.ok) {
      throw new Error(`Failed to load TCOF tasks: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading TCOF tasks:', error);
    // Return empty array if API call fails - will fall back to defaults
    return [];
  }
}

// Default heuristics and tasks
// This would normally be loaded from a JSON file or API
interface DefaultHeuristicsType {
  [key: string]: {
    heuristics: { id: string; text: string; completed: boolean }[];
    factors: { id: string; text: string; impact: 'low' | 'medium' | 'high' }[];
    practiceTasks: { id: string; text: string; completed: boolean }[];
  };
}

const defaultHeuristics: DefaultHeuristicsType = {
  Identification: {
    heuristics: [
      { id: 'h1', text: 'Define the problem statement clearly', completed: false },
      { id: 'h2', text: 'Identify key stakeholders', completed: false },
      { id: 'h3', text: 'Document current state assessment', completed: false }
    ],
    factors: [
      { id: 'f1', text: 'Organizational readiness', impact: 'high' as const },
      { id: 'f2', text: 'Budget constraints', impact: 'medium' as const },
      { id: 'f3', text: 'Technical complexity', impact: 'high' as const }
    ],
    practiceTasks: [
      { id: 'pt1', text: 'Conduct stakeholder interviews', completed: false },
      { id: 'pt2', text: 'Prepare project charter', completed: false },
      { id: 'pt3', text: 'Develop communication plan', completed: false }
    ]
  },
  Definition: {
    heuristics: [
      { id: 'h4', text: 'Create detailed requirements', completed: false },
      { id: 'h5', text: 'Develop success criteria', completed: false },
      { id: 'h6', text: 'Define project scope boundaries', completed: false }
    ],
    factors: [
      { id: 'f4', text: 'Stakeholder alignment', impact: 'high' as const },
      { id: 'f5', text: 'Resource availability', impact: 'medium' as const },
      { id: 'f6', text: 'Dependencies on other projects', impact: 'medium' as const }
    ],
    practiceTasks: [
      { id: 'pt4', text: 'Create work breakdown structure', completed: false },
      { id: 'pt5', text: 'Develop risk management plan', completed: false },
      { id: 'pt6', text: 'Schedule kickoff meeting', completed: false }
    ]
  },
  Delivery: {
    heuristics: [
      { id: 'h7', text: 'Follow iterative delivery approach', completed: false },
      { id: 'h8', text: 'Maintain regular communication', completed: false },
      { id: 'h9', text: 'Track progress against milestones', completed: false }
    ],
    factors: [
      { id: 'f7', text: 'Team capability', impact: 'high' as const },
      { id: 'f8', text: 'Change management effectiveness', impact: 'high' as const },
      { id: 'f9', text: 'External dependencies', impact: 'medium' as const }
    ],
    practiceTasks: [
      { id: 'pt7', text: 'Conduct sprint planning sessions', completed: false },
      { id: 'pt8', text: 'Hold regular status meetings', completed: false },
      { id: 'pt9', text: 'Update stakeholders on progress', completed: false }
    ]
  },
  Closure: {
    heuristics: [
      { id: 'h10', text: 'Conduct formal project closeout', completed: false },
      { id: 'h11', text: 'Gather lessons learned', completed: false },
      { id: 'h12', text: 'Document knowledge transfer', completed: false }
    ],
    factors: [
      { id: 'f10', text: 'User adoption', impact: 'high' as const },
      { id: 'f11', text: 'Handover readiness', impact: 'high' as const },
      { id: 'f12', text: 'Operational stability', impact: 'medium' as const }
    ],
    practiceTasks: [
      { id: 'pt10', text: 'Conduct post-implementation review', completed: false },
      { id: 'pt11', text: 'Archive project documentation', completed: false },
      { id: 'pt12', text: 'Release project resources', completed: false }
    ]
  }
};

/**
 * Creates a plan with default heuristics and tasks
 * @returns The ID of the newly created plan
 */
export async function quickStartPlan(): Promise<string> {
  try {
    // Create a new empty plan (now an async operation)
    const planId = await createEmptyPlan();
    
    // Load the plan
    const plan = await loadPlan(planId);
    
    if (!plan) {
      throw new Error('Failed to create and load plan');
    }
    
    // Initialize the updated plan with default structure
    const updatedPlan: PlanRecord = {
      ...plan,
      stages: {
        ...plan.stages
      }
    };
    
    // Ensure the personalHeuristics array exists in each stage
    Object.keys(updatedPlan.stages).forEach(stageName => {
      const stageKey = stageName as keyof typeof updatedPlan.stages;
      if (!updatedPlan.stages[stageKey].personalHeuristics) {
        updatedPlan.stages[stageKey].personalHeuristics = [];
      }
    });
    
    // Load preset heuristics from API
    const presetHeuristics = await loadPresetHeuristics();
    
    if (!presetHeuristics || presetHeuristics.length === 0) {
      console.error('No preset heuristics found, using defaults');
    } else {
      // Convert the preset heuristics to the correct format and add them
      const formattedHeuristics = presetHeuristics.map((h: PresetHeuristic) => ({
        id: h.id,
        text: h.text,
        notes: h.notes || "",
        favourite: false
      }));
      
      // Add preset heuristics to all stages to ensure coverage
      Object.keys(updatedPlan.stages).forEach(stageName => {
        const stageKey = stageName as keyof typeof updatedPlan.stages;
        updatedPlan.stages[stageKey].personalHeuristics = [
          ...updatedPlan.stages[stageKey].personalHeuristics || [],
          ...formattedHeuristics
        ];
      });
    }
    
    // Load factors from Excel file using our new loader
    const excelFactors = await loadFactors();
    
    if (!excelFactors || excelFactors.length === 0) {
      console.error('No factors loaded from Excel, falling back to API');
      
      // Try the API as a fallback
      const tcofTasks = await loadSuccessFactorTasks();
      
      if (!tcofTasks || tcofTasks.length === 0) {
        console.error('No TCOF tasks found from API, using defaults');
        
        // Fall back to default factors if no Excel or API data available
        Object.keys(defaultHeuristics).forEach(stageName => {
          const stageKey = stageName as keyof typeof defaultHeuristics;
          const defaultStage = defaultHeuristics[stageKey];
          const planStageKey = stageName as keyof typeof updatedPlan.stages;
          
          // Add default factors
          if (defaultStage.factors) {
            if (!updatedPlan.stages[planStageKey].factors) {
              updatedPlan.stages[planStageKey].factors = [];
            }
            
            updatedPlan.stages[planStageKey].factors = defaultStage.factors;
          }
          
          // Add default practice tasks
          if (defaultStage.practiceTasks) {
            if (!updatedPlan.stages[planStageKey].practiceTasks) {
              updatedPlan.stages[planStageKey].practiceTasks = [];
            }
            
            updatedPlan.stages[planStageKey].practiceTasks = defaultStage.practiceTasks;
          }
          
          // Add default heuristics if none were loaded from the API
          if (presetHeuristics.length === 0 && defaultStage.heuristics) {
            // Convert default heuristics to PersonalHeuristic format
            updatedPlan.stages[planStageKey].personalHeuristics = defaultStage.heuristics.map(h => ({
              id: h.id,
              text: h.text,
              notes: "",
              favourite: false
            }));
          }
          
          // Create tasks from the factors
          if (defaultStage.factors && defaultStage.factors.length > 0) {
            if (!updatedPlan.stages[planStageKey].tasks) {
              updatedPlan.stages[planStageKey].tasks = [];
            }
            
            // Create new task items with proper typing
            const factorTasks: TaskItem[] = defaultStage.factors.map(factor => ({
              id: `task-${factor.id}`,
              text: `Address ${factor.text}`,
              completed: false,
              origin: 'factor' as const,
              stage: planStageKey as Stage
            }));
            
            // Add the typed tasks to the plan
            updatedPlan.stages[planStageKey].tasks = [
              ...updatedPlan.stages[planStageKey].tasks || [],
              ...factorTasks
            ];
          }
        });
        
        // Ensure we have success factor ratings for all factors
        const successFactorRatings: Record<string, any> = {};
        
        // Collect all factor IDs from all stages
        Object.keys(defaultHeuristics).forEach(stageName => {
          const stageKey = stageName as keyof typeof defaultHeuristics;
          const defaultStage = defaultHeuristics[stageKey];
          
          if (defaultStage.factors) {
            defaultStage.factors.forEach(factor => {
              successFactorRatings[factor.id] = {
                rating: 0,
                notes: '',
                favourite: false
              };
            });
          }
        });
        
        // Add the success factor ratings to the Identification stage
        updatedPlan.stages.Identification.successFactorRatings = successFactorRatings;
      } else {
        // Process TCOF tasks from the API response
        const successFactorRatings: Record<string, any> = {};
        const stageTasks: Record<string, TaskItem[]> = {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        };
        
        // Create ratings for all factors and extract tasks for each stage
        tcofTasks.forEach(task => {
          // Create rating for this factor
          successFactorRatings[task.id] = {
            rating: 0,
            notes: '',
            favourite: false
          };
          
          // Process tasks for each stage
          if (task.tasks) {
            // Add tasks for each stage
            Object.keys(task.tasks).forEach(stageName => {
              const stageKey = stageName as keyof typeof stageTasks;
              if (task.tasks[stageName]) {
                task.tasks[stageName].forEach((taskText: string) => {
                  const newTask: TaskItem = {
                    id: `task-${task.id}-${stageTasks[stageKey].length}`,
                    text: taskText,
                    completed: false,
                    origin: 'factor' as const,
                    stage: stageKey as Stage
                  };
                  stageTasks[stageKey].push(newTask);
                });
              }
            });
          }
        });
        
        // Add success factor ratings to the Identification stage
        updatedPlan.stages.Identification.successFactorRatings = successFactorRatings;
        
        // Add tasks to each stage
        Object.keys(stageTasks).forEach(stageName => {
          const stageKey = stageName as keyof typeof updatedPlan.stages;
          if (!updatedPlan.stages[stageKey].tasks) {
            updatedPlan.stages[stageKey].tasks = [];
          }
          
          updatedPlan.stages[stageKey].tasks = [
            ...updatedPlan.stages[stageKey].tasks || [],
            ...stageTasks[stageName]
          ];
        });
      }
    } else {
      // Success - we have Excel data!
      // Create success factor ratings for all factors
      const successFactorRatings: Record<string, any> = {};
      const stageTasks: Record<string, TaskItem[]> = {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
      
      // Process the Excel factors
      excelFactors.forEach((factor, index) => {
        // Create a factor ID if one doesn't exist
        const factorId = factor.id || `factor-${index + 1}`;
        
        // Add rating entry for this factor
        successFactorRatings[factorId] = {
          rating: 0,
          notes: '',
          favourite: false
        };
        
        // Process tasks for each stage
        if (factor.tasks) {
          Object.keys(factor.tasks).forEach(stageName => {
            if (stageTasks[stageName] && factor.tasks[stageName]) {
              factor.tasks[stageName].forEach((taskText, taskIndex) => {
                const newTask: TaskItem = {
                  id: `task-${factorId}-${taskIndex}`,
                  text: taskText,
                  completed: false,
                  origin: 'factor' as const,
                  stage: stageName as Stage
                };
                stageTasks[stageName].push(newTask);
              });
            }
          });
        }
      });
      
      // Add success factor ratings to the Identification stage
      updatedPlan.stages.Identification.successFactorRatings = successFactorRatings;
      
      // Add tasks to each stage
      Object.keys(stageTasks).forEach(stageName => {
        const stageKey = stageName as keyof typeof updatedPlan.stages;
        if (!updatedPlan.stages[stageKey].tasks) {
          updatedPlan.stages[stageKey].tasks = [];
        }
        
        updatedPlan.stages[stageKey].tasks = [
          ...updatedPlan.stages[stageKey].tasks || [],
          ...stageTasks[stageName]
        ];
      });
      
      // Log success and statistics
      const taskTotal = Object.values(stageTasks).reduce((total, tasks) => total + tasks.length, 0);
      console.info('✅ Quick-Start loaded', {
        factorCount: excelFactors.length,
        taskTotal,
        ratingCount: Object.keys(successFactorRatings).length
      });
    }
    
    // Save the updated plan
    const success = await savePlan(planId, updatedPlan);
    
    if (!success) {
      throw new Error('Failed to save plan');
    }
    
    // Store this plan ID in localStorage as the most recent plan
    localStorage.setItem('tcof_most_recent_plan', planId);
    
    return planId;
  } catch (error) {
    console.error('Error in quickStartPlan:', error);
    throw new Error('Quick-Start failed – presets not found');
  }
}

/**
 * Gets the ID of the most recent plan from localStorage
 * @returns The ID of the most recent plan or null if none exists
 */
export function getLatestPlanId(): string | null {
  return localStorage.getItem('tcof_most_recent_plan');
}

/**
 * Checks if there's a valid most recent plan
 * @returns True if there's a valid plan, false otherwise
 */
export async function hasExistingPlan(): Promise<boolean> {
  try {
    const planId = getLatestPlanId();
    
    if (!planId) {
      return false;
    }
    
    // Get all plans from storage
    const existingPlans = await getAllPlans();
    
    // No plans at all
    if (existingPlans.length === 0) {
      return false;
    }
    
    // Verify the plan exists
    const exists = await planExists(planId);
    
    // If the most recent plan doesn't exist but we have other plans,
    // update the most recent plan ID to the first available plan
    if (!exists && existingPlans.length > 0) {
      localStorage.setItem('tcof_most_recent_plan', existingPlans[0]);
      return true;
    }
    
    return exists;
  } catch (error) {
    console.error('Error checking if plan exists:', error);
    return false;
  }
}

/**
 * Creates a new plan ID if none exists
 * @returns The plan ID (either existing or newly created)
 */
export async function ensurePlanExists(): Promise<string> {
  let currentPlanId = getLatestPlanId();
  
  if (!currentPlanId) {
    // Generate a new UUID and create an empty plan
    currentPlanId = uuidv4();
    await quickStartPlan();
    localStorage.setItem('tcof_most_recent_plan', currentPlanId);
  }
  
  return currentPlanId;
}

/**
 * Returns all saved plans
 * @returns Array of plan IDs
 */
export async function getAllPlans(): Promise<string[]> {
  // Import the function here to avoid circular dependencies
  const { listExistingPlans } = await import('./plan-db');
  return await listExistingPlans();
}

/**
 * Sets the delivery approach for a plan and saves it
 * @param planId Plan ID
 * @param data Delivery approach data to save
 * @returns True if the plan was saved successfully
 */
export async function setDeliveryApproach(
  planId: string, 
  data: DeliveryApproachData
): Promise<boolean> {
  try {
    const plan = await loadPlan(planId);
    
    if (!plan) {
      console.error('No plan found with ID:', planId);
      return false;
    }
    
    // Initialize goodPractice if it doesn't exist
    if (!plan.goodPractice) {
      plan.goodPractice = {};
    }
    
    // Update the delivery approach
    plan.goodPractice.deliveryApproach = data;
    
    // Save the updated plan
    return await savePlan(planId, plan);
  } catch (error) {
    console.error('Error setting delivery approach:', error);
    return false;
  }
}