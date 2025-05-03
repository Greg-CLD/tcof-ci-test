/**
 * Helper functions for accessing TCOF data
 */
import tcofTasksData from '../../data/tcofTasks.json';

// Define types for TCOF data
interface TcofTask {
  id: string;
  name: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

/**
 * Get TCOF data from the JSON file
 */
export const getTcofData = (): TcofTask[] => {
  return tcofTasksData as TcofTask[];
};

/**
 * Get TCOF success factor options for dropdown menus
 */
export const getTcofFactorOptions = (): Array<{ value: string; label: string }> => {
  return getTcofData().map(factor => ({
    value: factor.id,
    label: `${factor.id} ${factor.name}`
  }));
};

/**
 * Get tasks for a specific success factor and stage
 */
export const getTasksForFactorAndStage = (factorId: string, stage: string): string[] => {
  const factor = getTcofData().find(f => f.id === factorId);
  
  if (!factor || !factor.tasks[stage as keyof typeof factor.tasks]) {
    return [];
  }
  
  return factor.tasks[stage as keyof typeof factor.tasks];
};