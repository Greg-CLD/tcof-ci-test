import { factorsStorage as storage } from '@/utils/factorsStorage';
import { apiRequest } from '@/lib/queryClient';

// Cache the factor data to avoid repeated file reads
let cachedFactors: FactorTask[] | null = null;

// Define the interface for a factor task
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

// Default empty set of factors
const defaultFactors: FactorTask[] = [
  {
    id: "1.1",
    title: "Ask Why",
    tasks: {
      Identification: ["Consult key stakeholders", "Understand pains and wants"],
      Definition: ["Document key business objectives"],
      Delivery: ["Verify solution alignment with objectives"],
      Closure: ["Measure outcomes against objectives"]
    }
  }
];

/**
 * Ensures we have exactly 12 unique success factors
 */
function ensureUnique12Factors(factors: FactorTask[]): FactorTask[] {
  if (!factors || factors.length === 0) {
    console.error('No factors found, returning default');
    return defaultFactors;
  }
  
  // Enforce 12 unique factors by deduplicating based on titles
  const uniqueMap: Record<string, FactorTask> = {};
  
  // First pass - get unique factors by title
  factors.forEach(factor => {
    const title = factor.title.trim();
    if (!uniqueMap[title] || factor.id.startsWith("sf-")) {
      uniqueMap[title] = factor;
    }
  });
  
  // Get unique values
  const uniqueFactors = Object.values(uniqueMap);
  
  // If we have more than 12, trim to first 12
  if (uniqueFactors.length > 12) {
    console.warn(`⚠ Too many unique factors (${uniqueFactors.length}), trimming to 12`);
    return uniqueFactors.slice(0, 12);
  }
  
  // If we have exactly 12, perfect!
  if (uniqueFactors.length === 12) {
    return uniqueFactors;
  }
  
  // If we have less than 12, fill with defaults (this should rarely happen)
  if (uniqueFactors.length < 12) {
    console.warn(`⚠ Too few unique factors (${uniqueFactors.length}), adding defaults to reach 12`);
    const extraNeeded = 12 - uniqueFactors.length;
    const defaultsToAdd = defaultFactors.slice(0, extraNeeded).map((factor, idx) => ({
      ...factor,
      id: `missing-${idx + 1}`,
      title: `Default Factor ${idx + 1}`
    }));
    
    return [...uniqueFactors, ...defaultsToAdd];
  }
  
  return uniqueFactors;
}

/**
 * Gets all success factors from the data source with automatic deduplication
 */
/**
 * Debug and log task structure
 */
function debugFactorTasks(label: string, factors: FactorTask[]) {
  console.debug(`📊 [FactorStore] ${label} - ${factors.length} factors`);
  
  // Log task counts for each factor
  factors.forEach(factor => {
    const taskCounts = {
      Identification: factor.tasks?.Identification?.length || 0,
      Definition: factor.tasks?.Definition?.length || 0,
      Delivery: factor.tasks?.Delivery?.length || 0,
      Closure: factor.tasks?.Closure?.length || 0,
      total: (factor.tasks?.Identification?.length || 0) + 
             (factor.tasks?.Definition?.length || 0) + 
             (factor.tasks?.Delivery?.length || 0) + 
             (factor.tasks?.Closure?.length || 0)
    };
    
    if (taskCounts.total > 0) {
      console.debug(`  📌 [${factor.id}] ${factor.title} - Total tasks: ${taskCounts.total}`, taskCounts);
    } else {
      console.warn(`  ⚠️ [${factor.id}] ${factor.title} - NO TASKS FOUND!`);
    }
  });
}

/**
 * Normalize all task arrays in the factor structure
 */
export function normalizeFactorTasks(factors: FactorTask[]): FactorTask[] {
  return factors.map(factor => ({
    id: factor.id,
    title: factor.title,
    tasks: {
      Identification: Array.isArray(factor.tasks?.Identification) ? factor.tasks.Identification : [],
      Definition: Array.isArray(factor.tasks?.Definition) ? factor.tasks.Definition : [],
      Delivery: Array.isArray(factor.tasks?.Delivery) ? factor.tasks.Delivery : [],
      Closure: Array.isArray(factor.tasks?.Closure) ? factor.tasks.Closure : []
    }
  }));
}

export async function getFactors(bypassCache = false): Promise<FactorTask[]> {
  if (cachedFactors && !bypassCache) {
    // Even when using cache, enforce 12 unique factors
    const normalizedFactors = normalizeFactorTasks(ensureUnique12Factors(cachedFactors));
    debugFactorTasks('From cache', normalizedFactors);
    return normalizedFactors;
  }

  try {
    // First try to load from API using the new endpoint
    try {
      console.debug('Fetching factors from /api/admin/success-factors...');
      const response = await apiRequest('GET', '/api/admin/success-factors');
      if (response.ok) {
        const data = await response.json();
        
        // Apply uniqueness enforcement and normalize task structure
        const rawProcessedData = ensureUnique12Factors(data);
        const processedData = normalizeFactorTasks(rawProcessedData);
        cachedFactors = processedData;
        
        // Debug task data
        debugFactorTasks('From API (success-factors)', processedData);
        
        // Check if we have the expected 12 factors
        if (data.length !== 12) {
          console.warn(`⚠ Unexpected factor count: ${data.length} (expected 12). Consider running deduplication.`);
        }
        
        // Store in local cache for future access
        await storage.set('successFactors', cachedFactors);
        return cachedFactors;
      }
    } catch (fetchError) {
      console.warn('Could not fetch from new API endpoint:', fetchError);
      
      // Fall back to old API endpoint
      try {
        console.debug('Fetching factors from /api/admin/tcof-tasks...');
        const response = await apiRequest('GET', '/api/admin/tcof-tasks');
        if (response.ok) {
          const data = await response.json();
          
          // Apply uniqueness enforcement and normalize task structure
          const rawProcessedData = ensureUnique12Factors(data);
          const processedData = normalizeFactorTasks(rawProcessedData);
          cachedFactors = processedData;
          
          // Debug task data
          debugFactorTasks('From API (tcof-tasks)', processedData);
          
          // Check if we have the expected 12 factors
          if (data.length !== 12) {
            console.warn(`⚠ Unexpected factor count: ${data.length} (expected 12). Consider running deduplication.`);
          }
          
          // Store in local cache for future access
          await storage.set('successFactors', cachedFactors);
          return cachedFactors;
        }
      } catch (oldApiError) {
        console.warn('Could not fetch from old API endpoint:', oldApiError);
      }
    }
    
    // If API fails, try to load from local storage
    console.debug('Fetching factors from local storage...');
    const dbFactors = await storage.get('successFactors');
    if (dbFactors && dbFactors.length > 0) {
      // Apply uniqueness enforcement and normalize task structure
      const rawProcessedData = ensureUnique12Factors(dbFactors);
      const processedData = normalizeFactorTasks(rawProcessedData);
      cachedFactors = processedData;
      
      // Debug task data
      debugFactorTasks('From local storage', processedData);
      
      // Check if we have the expected 12 factors
      if (dbFactors.length !== 12) {
        console.warn(`⚠ Unexpected factor count: ${dbFactors.length} (expected 12). Consider running deduplication.`);
      }
      
      return cachedFactors;
    }
    
    // Fall back to default factors if all else fails
    console.debug('Using default factors as fallback...');
    cachedFactors = normalizeFactorTasks(defaultFactors);
    await storage.set('successFactors', cachedFactors);
    
    debugFactorTasks('Default factors', cachedFactors);
    return cachedFactors;
  } catch (error) {
    console.error('Error loading success factors:', error);
    return defaultFactors;
  }
}

/**
 * Saves updated success factors to storage
 */
export async function saveFactors(updatedFactors: FactorTask[]): Promise<boolean> {
  try {
    // Normalize task arrays in the factors data
    const normalizedFactors = normalizeFactorTasks(updatedFactors);
    
    // Debug the normalized tasks data
    debugFactorTasks('Saving factors', normalizedFactors);
    
    // Update the cache with normalized data
    cachedFactors = normalizedFactors;
    
    // Save to local storage
    await storage.set('successFactors', normalizedFactors);
    
    // Save via new API endpoint
    try {
      // Save all factors as a batch through the tcof-tasks endpoint
      console.debug('Saving factors to API...');
      const response = await apiRequest('POST', '/api/admin/tcof-tasks', normalizedFactors);
      
      if (!response.ok) {
        console.warn('Failed to save to API:', await response.text());
      } else {
        console.debug('Factors saved successfully to API');
      }
    } catch (apiError) {
      console.warn('Could not save to API:', apiError);
      // Non-fatal error, we've already saved to localStorage
    }
    
    return true;
  } catch (error) {
    console.error('Error saving success factors:', error);
    return false;
  }
}

/**
 * Gets a specific factor by ID
 */
export async function getFactorById(factorId: string): Promise<FactorTask | null> {
  try {
    // Try to get single factor from the API first
    const response = await apiRequest('GET', `/api/admin/success-factors/${factorId}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn(`Could not fetch factor ${factorId} from API:`, error);
  }
  
  // Fall back to getting the factor from the cached/local factors
  const factors = await getFactors();
  return factors.find(factor => factor.id === factorId) || null;
}

/**
 * Gets tasks for a specific factor and stage
 */
export async function getFactorTasks(factorId: string, stage: 'Identification' | 'Definition' | 'Delivery' | 'Closure'): Promise<string[]> {
  const factor = await getFactorById(factorId);
  
  if (!factor || !factor.tasks || !factor.tasks[stage]) {
    return [];
  }
  
  return factor.tasks[stage];
}

/**
 * Gets factor name by ID
 */
export async function getFactorNameById(factorId: string): Promise<string> {
  try {
    const factor = await getFactorById(factorId);
    return factor ? `${factor.id}: ${factor.title}` : factorId;
  } catch (error) {
    console.error('Error getting factor name by ID:', error);
    return factorId;
  }
}

/**
 * Creates a new success factor
 */
export async function createFactor(factor: FactorTask): Promise<FactorTask | null> {
  try {
    const response = await apiRequest('POST', '/api/admin/success-factors', factor);
    
    if (response.ok) {
      const createdFactor = await response.json();
      
      // Update the local cache
      const currentFactors = await getFactors();
      cachedFactors = [...currentFactors, createdFactor];
      await storage.set('successFactors', cachedFactors);
      
      return createdFactor;
    } else {
      console.error('Failed to create factor:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error creating factor:', error);
    return null;
  }
}

/**
 * Updates an existing success factor
 */
export async function updateFactor(factorId: string, updatedFactor: FactorTask): Promise<FactorTask | null> {
  try {
    // Ensure tasks property has all required stage arrays
    const validatedFactor = {
      ...updatedFactor,
      tasks: {
        Identification: Array.isArray(updatedFactor.tasks?.Identification) ? updatedFactor.tasks.Identification : [],
        Definition: Array.isArray(updatedFactor.tasks?.Definition) ? updatedFactor.tasks.Definition : [],
        Delivery: Array.isArray(updatedFactor.tasks?.Delivery) ? updatedFactor.tasks.Delivery : [],
        Closure: Array.isArray(updatedFactor.tasks?.Closure) ? updatedFactor.tasks.Closure : []
      }
    };
    
    // Make the API request
    const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, validatedFactor);
    
    if (response.ok) {
      const savedFactor = await response.json();
      
      // Update the local cache
      const currentFactors = await getFactors(true); // Force refresh from server
      cachedFactors = currentFactors.map(f => 
        f.id === factorId ? savedFactor : f
      );
      await storage.set('successFactors', cachedFactors);
      
      return savedFactor;
    } else {
      console.error('Failed to update factor:', await response.text());
      throw new Error(`Failed to update factor: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating factor:', error);
    throw error; // Rethrow error to be handled by the caller
  }
}

/**
 * Deletes a success factor
 */
export async function deleteFactor(factorId: string): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/admin/success-factors/${factorId}`);
    
    if (response.ok) {
      // Update the local cache
      const currentFactors = await getFactors();
      cachedFactors = currentFactors.filter(f => f.id !== factorId);
      await storage.set('successFactors', cachedFactors);
      
      return true;
    } else {
      console.error('Failed to delete factor:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error deleting factor:', error);
    return false;
  }
}