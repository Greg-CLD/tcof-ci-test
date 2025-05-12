interface StagedTasks {
  Identification: string[];
  Definition: string[];
  Delivery: string[];
  Closure: string[];
}

export interface FactorTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tasks: StagedTasks;
  // Optional properties for client-side data
  projectId?: string;
  nodes?: any[];
  connections?: any[];
  lastUpdated?: string | number;
  // Track changes
  createdAt?: string;
  updatedAt?: string;
}

// Database operations
const factorsArray: FactorTask[] = [];

export const factorsDb = {
  length: 0,
  getAll(): FactorTask[] {
    return factorsArray;
  },
  setAll: function(factors: FactorTask[]): void {
    // Clear existing array
    factorsArray.length = 0;
    // Add normalized factors
    factors.forEach(factor => {
      factorsArray.push({
        id: factor.id,
        title: factor.title,
        description: factor.description || '',
        category: factor.category || 'Uncategorized',
        tasks: {
          Identification: Array.isArray(factor.tasks?.Identification) ? factor.tasks.Identification : [],
          Definition: Array.isArray(factor.tasks?.Definition) ? factor.tasks.Definition : [],
          Delivery: Array.isArray(factor.tasks?.Delivery) ? factor.tasks.Delivery : [],
          Closure: Array.isArray(factor.tasks?.Closure) ? factor.tasks.Closure : []
        }
      });
    });
    this.length = factorsArray.length;
  },
  add: function(factor: FactorTask): void {
    factorsArray.push({
      id: factor.id,
      title: factor.title,
      description: factor.description || '',
      category: factor.category || 'Uncategorized',
      tasks: {
        Identification: Array.isArray(factor.tasks?.Identification) ? factor.tasks.Identification : [],
        Definition: Array.isArray(factor.tasks?.Definition) ? factor.tasks.Definition : [],
        Delivery: Array.isArray(factor.tasks?.Delivery) ? factor.tasks.Delivery : [],
        Closure: Array.isArray(factor.tasks?.Closure) ? factor.tasks.Closure : []
      }
    });
    this.length = factorsArray.length;
  },
  findById: (id: string): FactorTask | undefined => {
    const factor = factorsArray.find(f => f.id === id);
    return factor ? factor : undefined;
  },
  removeById: function(id: string): boolean {
    const index = factorsArray.findIndex(f => f.id === id);
    if (index !== -1) {
      factorsArray.splice(index, 1);
      this.length = factorsArray.length;
      return true;
    }
    return false;
  },
  updateById: (id: string, updatedFactor: FactorTask): boolean => {
    const index = factorsArray.findIndex(f => f.id === id);
    if (index !== -1) {
      factorsArray[index] = {
        id: updatedFactor.id,
        title: updatedFactor.title,
        description: updatedFactor.description || '',
        category: updatedFactor.category || 'Uncategorized',
        tasks: {
          Identification: Array.isArray(updatedFactor.tasks?.Identification) ? updatedFactor.tasks.Identification : [],
          Definition: Array.isArray(updatedFactor.tasks?.Definition) ? updatedFactor.tasks.Definition : [],
          Delivery: Array.isArray(updatedFactor.tasks?.Delivery) ? updatedFactor.tasks.Delivery : [],
          Closure: Array.isArray(updatedFactor.tasks?.Closure) ? updatedFactor.tasks.Closure : []
        }
      };
      return true;
    }
    return false;
  },
  clear: function(): void {
    factorsArray.length = 0;
    this.length = factorsArray.length;
  }
};