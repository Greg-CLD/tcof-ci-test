import { createEmptyPlan, savePlan, loadPlan, PlanRecord, planExists } from './plan-db';
import { v4 as uuidv4 } from 'uuid';

// Default preset heuristics for quick start
interface PresetHeuristic {
  id: string;
  text: string;
  notes: string;
}

const presetHeuristics: PresetHeuristic[] = [
  { id: "H1", text: "Start slow to go fast", notes: "" },
  { id: "H2", text: "Test it small before you scale it big", notes: "" }
];

// Default heuristics and tasks
// This would normally be loaded from a JSON file or API
const defaultHeuristics = {
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
  // Create a new empty plan
  const planId = createEmptyPlan();
  
  // Load the plan
  const plan = await loadPlan(planId);
  
  if (!plan) {
    throw new Error('Failed to create and load plan');
  }
  
  // Update the plan with default heuristics and preset personal heuristics
  const updatedPlan: PlanRecord = {
    ...plan,
    stages: {
      ...plan.stages,
      ...defaultHeuristics
    }
  };
  
  // Add the preset heuristics to personal heuristics in the Identification stage
  if (!updatedPlan.stages.Identification.personalHeuristics) {
    updatedPlan.stages.Identification.personalHeuristics = [];
  }
  
  // Convert the preset heuristics to the correct format and add them
  const formattedHeuristics = presetHeuristics.map(h => ({
    id: h.id,
    text: h.text,
    notes: h.notes,
    favourite: false
  }));
  
  updatedPlan.stages.Identification.personalHeuristics = [
    ...updatedPlan.stages.Identification.personalHeuristics,
    ...formattedHeuristics
  ];
  
  // Save the updated plan
  await savePlan(planId, updatedPlan);
  
  // Store this plan ID in localStorage as the most recent plan
  localStorage.setItem('tcof_most_recent_plan', planId);
  
  return planId;
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
  const planId = getLatestPlanId();
  
  if (!planId) {
    return false;
  }
  
  // Verify the plan exists
  return await planExists(planId);
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