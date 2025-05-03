import { storage } from '@/lib/storageAdapter';
import { apiRequest } from '@/lib/queryClient';

// Cache the factor data to avoid repeated file reads
let cachedFactors = null;

// Official TCOF success factors - these are the ones we want to keep and merge duplicates into
const officialFactorTitles = [
  "1.1 Ask Why",
  "1.2 Get a Masterbuilder",
  "1.3 Get Your People on the Bus",
  "1.4 Make Friends and Keep them Friendly",
  "2.1 Recognise that your project is not unique",
  "2.2 Look for Tried & Tested Options",
  "3.1 Think Big, Start Small",
  "3.2 Learn by Experimenting",
  "3.3 Keep on top of risks",
  "4.1 Adjust for optimism",
  "4.2 Measure What Matters, Be Ready to Step Away",
  "4.3 Be Ready to Adapt"
];

// Official canonical IDs for the 12 TCOF success factors
const officialFactorIds = [
  "sf-1", "sf-2", "sf-3", "sf-4", 
  "sf-5", "sf-6", "sf-7", "sf-8", 
  "sf-9", "sf-10", "sf-11", "sf-12"
];

// Default set of factors (basic implementation of the 12 official TCOF factors)
const defaultFactors = officialFactorTitles.map((title, index) => ({
  id: officialFactorIds[index],
  title: title,
  tasks: {
    Identification: [],
    Definition: [],
    Delivery: [],
    Closure: []
  }
}));

/**
 * Ensures we have exactly 12 unique success factors
 * @param {Array} factors - Array of success factors
 * @returns {Array} 12 unique success factors matching the official TCOF factors
 */
function ensureUnique12Factors(factors) {
  if (!factors || factors.length === 0) {
    console.error('No factors found, returning default');
    return defaultFactors;
  }
  
  // Enforce 12 unique factors by deduplicating based on titles
  const dedupMap = {};
  const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
  
  // Map of official titles to IDs for consistency
  const officialIdMap = {};
  
  // First pass - identify official factors by exact title match
  factors.forEach(factor => {
    const normalizedTitle = factor.title.trim();
    
    // If this is an official factor title, remember its ID
    if (officialFactorTitles.includes(normalizedTitle)) {
      officialIdMap[normalizedTitle] = factor.id;
    }
  });
  
  // Process each factor
  factors.forEach(item => {
    const normalizedTitle = item.title.trim();
    
    // If this title already exists in our map, merge tasks
    if (dedupMap[normalizedTitle]) {
      // Merge tasks from all stages
      stages.forEach(stage => {
        const sourceTasks = item.tasks?.[stage] || [];
        
        for (const task of sourceTasks) {
          // Only add unique tasks (avoid duplicates)
          if (!dedupMap[normalizedTitle].tasks[stage].includes(task)) {
            dedupMap[normalizedTitle].tasks[stage].push(task);
          }
        }
      });
    } 
    // If this is a new title, add it to the map
    else {
      // Create a base entry
      dedupMap[normalizedTitle] = { 
        title: normalizedTitle, 
        id: officialIdMap[normalizedTitle] || item.id, // Use official ID if available
        tasks: {
          Identification: [...(item.tasks?.Identification || [])],
          Definition: [...(item.tasks?.Definition || [])],
          Delivery: [...(item.tasks?.Delivery || [])],
          Closure: [...(item.tasks?.Closure || [])]
        }
      };
    }
  });
  
  // Make sure all official factors exist
  officialFactorTitles.forEach((title, index) => {
    if (!dedupMap[title]) {
      dedupMap[title] = {
        title: title,
        id: officialIdMap[title] || officialFactorIds[index],
        tasks: {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        }
      };
    }
  });
  
  // Filter to keep only the official factors
  const dedupFactors = officialFactorTitles.map(title => dedupMap[title]);
  
  // Verify we have exactly 12 factors
  if (dedupFactors.length !== 12) {
    console.error(`Error: Expected 12 deduplicated factors but found ${dedupFactors.length}`);
    return defaultFactors;
  }
  
  // Assign consistent IDs for canonical factors
  dedupFactors.forEach((factor, index) => {
    if (!factor.id || factor.id.includes("duplicate")) {
      factor.id = officialFactorIds[index];
    }
  });
  
  return dedupFactors;
}

/**
 * Gets all success factors from the JSON file or cache
 * @param {boolean} bypassCache - Whether to bypass the cache
 * @param {boolean} enforceUnique - Whether to enforce 12 unique factors
 * @returns {Promise<Array>} Array of success factor objects
 */
export async function getFactors(bypassCache = false, enforceUnique = true) {
  if (cachedFactors && !bypassCache) {
    // Even when using cache, enforce 12 unique factors if requested
    return enforceUnique ? ensureUnique12Factors(cachedFactors) : cachedFactors;
  }

  try {
    // First try to load from API using the new endpoint
    try {
      const response = await apiRequest('GET', '/api/admin/success-factors');
      if (response.ok) {
        const data = await response.json();
        
        // Apply uniqueness enforcement if requested
        const processedData = enforceUnique ? ensureUnique12Factors(data) : data;
        cachedFactors = processedData;
        
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
        const response = await apiRequest('GET', '/api/admin/tcof-tasks');
        if (response.ok) {
          const data = await response.json();
          
          // Apply uniqueness enforcement if requested
          const processedData = enforceUnique ? ensureUnique12Factors(data) : data;
          cachedFactors = processedData;
          
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
    const dbFactors = await storage.get('successFactors');
    if (dbFactors && dbFactors.length > 0) {
      // Apply uniqueness enforcement if requested
      const processedData = enforceUnique ? ensureUnique12Factors(dbFactors) : dbFactors;
      cachedFactors = processedData;
      
      // Check if we have the expected 12 factors
      if (dbFactors.length !== 12) {
        console.warn(`⚠ Unexpected factor count: ${dbFactors.length} (expected 12). Consider running deduplication.`);
      }
      
      return cachedFactors;
    }
    
    // Fall back to default factors if all else fails
    cachedFactors = defaultFactors;
    await storage.set('successFactors', cachedFactors);
    
    return cachedFactors;
  } catch (error) {
    console.error('Error loading success factors:', error);
    return defaultFactors;
  }
}

/**
 * Saves updated success factors to storage
 * @param {Array} updatedFactors - The updated factors to save
 * @returns {Promise<boolean>} True if save was successful
 */
export async function saveFactors(updatedFactors) {
  try {
    // Update the cache
    cachedFactors = updatedFactors;
    
    // Save to local storage
    await storage.set('successFactors', updatedFactors);
    
    // Save via new API endpoint
    try {
      // Save all factors as a batch through the tcof-tasks endpoint
      const response = await apiRequest('POST', '/api/admin/tcof-tasks', updatedFactors);
      
      if (!response.ok) {
        console.warn('Failed to save to API:', await response.text());
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
 * @param {string} factorId - The ID of the factor to retrieve
 * @returns {Promise<Object|null>} The factor object or null if not found
 */
export async function getFactorById(factorId) {
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
 * @param {string} factorId - The ID of the success factor
 * @param {string} stage - The stage name (Identification, Definition, Delivery, Closure)
 * @returns {Promise<Array<string>>} Array of task strings
 */
export async function getFactorTasks(factorId, stage) {
  const factor = await getFactorById(factorId);
  
  if (!factor || !factor.tasks || !factor.tasks[stage]) {
    return [];
  }
  
  return factor.tasks[stage];
}

/**
 * Gets factor name by ID
 * @param {string} factorId - The ID of the success factor
 * @returns {Promise<string>} Formatted factor name with ID
 */
export async function getFactorNameById(factorId) {
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
 * @param {Object} factor - The factor data to create
 * @returns {Promise<Object|null>} The created factor or null if operation failed
 */
export async function createFactor(factor) {
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
 * @param {string} factorId - ID of the factor to update
 * @param {Object} updatedFactor - The updated factor data
 * @returns {Promise<Object|null>} The updated factor or null if operation failed
 */
export async function updateFactor(factorId, updatedFactor) {
  try {
    const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
    
    if (response.ok) {
      const savedFactor = await response.json();
      
      // Update the local cache
      const currentFactors = await getFactors();
      cachedFactors = currentFactors.map(f => 
        f.id === factorId ? savedFactor : f
      );
      await storage.set('successFactors', cachedFactors);
      
      return savedFactor;
    } else {
      console.error('Failed to update factor:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error updating factor:', error);
    return null;
  }
}

/**
 * Deletes a success factor
 * @param {string} factorId - ID of the factor to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export async function deleteFactor(factorId) {
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