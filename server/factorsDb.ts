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

// Global database instance - will be shared across all imports
const factorsArray: FactorTask[] = [];

// Public API for the factors database
export const factorsDb = {
  // Get all factors as array
  getAll: (): FactorTask[] => [...factorsArray],
  
  // Get the length of the factors array
  get length(): number {
    return factorsArray.length;
  },
  
  // Set all factors (replaces current array)
  setAll: (factors: FactorTask[]): void => {
    factorsArray.length = 0;
    factorsArray.push(...factors);
  },
  
  // Add a single factor
  add: (factor: FactorTask): void => {
    factorsArray.push(factor);
  },
  
  // Find a factor by ID
  findById: (id: string): FactorTask | undefined => {
    return factorsArray.find(f => f.id === id);
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
      factorsArray[index] = updatedFactor;
      return true;
    }
    return false;
  },
  
  // Clear all factors
  clear: (): void => {
    factorsArray.length = 0;
  }
};