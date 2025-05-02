import tcofTasksData from '../../data/tcofTasks.json';

// Memoized function to get the TCOF data
let cachedData = null;

/**
 * Returns the TCOF data with tasks and other information
 * @returns {Array} Array of TCOF success factors with tasks
 */
export function getTcofData() {
  if (cachedData) {
    return cachedData;
  }
  
  cachedData = tcofTasksData;
  return cachedData;
}

/**
 * Returns a list of TCOF factors formatted for selection dropdowns
 * @returns {Array<{value: string, label: string}>} Formatted options for dropdowns
 */
export function getTcofFactorOptions() {
  const factors = getTcofData();
  return factors.map(factor => ({
    value: factor.id,
    label: `${factor.id} - ${factor.name}`
  }));
}

/**
 * Gets tasks for a specific factor and stage
 * @param {string} factorId - The ID of the success factor
 * @param {string} stage - The stage name (Identification, Definition, Delivery, Closure)
 * @returns {Array<string>} Array of task strings
 */
export function getFactorTasks(factorId, stage) {
  const factors = getTcofData();
  const factor = factors.find(f => f.id === factorId);
  
  if (!factor || !factor.tasks || !factor.tasks[stage]) {
    return [];
  }
  
  return factor.tasks[stage];
}