/**
 * Shared database module for success factors
 * This module provides a centralized store for success factors data
 * to avoid circular references and initialization issues
 */

export interface FactorTask {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

// Helper function to normalize task structure
function normalizeFactorTask(factor: FactorTask): FactorTask {
  // Create a normalized copy of the factor
  return {
    id: factor.id,
    title: factor.title,
    tasks: {
      Identification: Array.isArray(factor.tasks?.Identification) ? factor.tasks.Identification : [],
      Definition: Array.isArray(factor.tasks?.Definition) ? factor.tasks.Definition : [],
      Delivery: Array.isArray(factor.tasks?.Delivery) ? factor.tasks.Delivery : [],
      Closure: Array.isArray(factor.tasks?.Closure) ? factor.tasks.Closure : []
    }
  };
}

// Global database instance - will be shared across all imports
const factorsArray: FactorTask[] = [];

// Public API for the factors database
export const factorsDb = {
  // Get all factors as array
  getAll: (): FactorTask[] => {
    // Return normalized copies of all factors
    return factorsArray.map(normalizeFactorTask);
  },
  
  // Get the length of the factors array
  get length(): number {
    return factorsArray.length;
  },
  
  // Set all factors (replaces current array)
  setAll: (factors: FactorTask[]): void => {
    // Clear the array
    factorsArray.length = 0;
    
    // Add normalized factors
    factors.forEach(factor => {
      factorsArray.push(normalizeFactorTask(factor));
    });
  },
  
  // Add a single factor
  add: (factor: FactorTask): void => {
    // Add normalized factor
    factorsArray.push(normalizeFactorTask(factor));
  },
  
  // Find a factor by ID
  findById: (id: string): FactorTask | undefined => {
    const factor = factorsArray.find(f => f.id === id);
    // Return normalized factor if found
    return factor ? normalizeFactorTask(factor) : undefined;
  },
  
  // Remove a factor by ID
  removeById: (id: string): boolean => {
    const index = factorsArray.findIndex(f => f.id === id);
    if (index !== -1) {
      factorsArray.splice(index, 1);
      return true;
    }
    return false;
  },
  
  // Update a factor by ID
  updateById: (id: string, updatedFactor: FactorTask): boolean => {
    const index = factorsArray.findIndex(f => f.id === id);
    if (index !== -1) {
      // Update with normalized factor
      factorsArray[index] = normalizeFactorTask(updatedFactor);
      return true;
    }
    return false;
  },
  
  // Clear all factors
  clear: (): void => {
    factorsArray.length = 0;
  }
};