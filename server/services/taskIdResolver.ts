/**
 * Task ID Resolver Service
 * 
 * A unified service to handle task ID resolution, translation, and lookup
 * across different formats: UUID, compound ID, and sourceId
 * 
 * Supports:
 * - UUID extraction from compound IDs
 * - Canonical source ID mapping
 * - Bidirectional ID translation 
 * - Comprehensive ID lookup strategies
 */

import { validate as validateUUID } from 'uuid';

// Define debug flags 
const DEBUG_TASK_LOOKUP = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_MAPPING = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_PERSISTENCE = process.env.DEBUG_TASKS === 'true';
const DEBUG_TASK_ID_RESOLUTION = process.env.DEBUG_TASKS === 'true';

/**
 * Interface for task lookup results with detailed resolution information
 */
interface TaskLookupResult {
  task: any;
  lookupMethod: 'exact' | 'clean-uuid' | 'source-id' | 'compound-id' | 'canonical-id' | 'not-found';
  originalId: string;
  resolvedId?: string;
  metadata?: {
    isCompoundId?: boolean;
    hasSourceId?: boolean;
    sourceOrigin?: string;
    resolutionPath?: string[];
  };
}

/**
 * Class to handle unified task ID resolution
 */
export class TaskIdResolver {
  /**
   * Clean a potentially compound task ID to extract just the UUID part
   * 
   * @param id The task ID which might be a compound ID
   * @returns The extracted UUID part only
   */
  static cleanTaskId(id: string): string {
    if (!id) return id;
    
    // If the ID contains a hyphen and is longer than a standard UUID,
    // it might be a compound ID with format uuid-suffix
    if (id.includes('-') && id.length > 36) {
      // Try to extract a valid UUID pattern from the beginning
      const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
      const match = id.match(uuidPattern);
      
      if (match && match[1]) {
        if (DEBUG_TASK_MAPPING) {
          console.log(`[TASK_RESOLVER] Extracted UUID ${match[1]} from compound ID ${id}`);
        }
        return match[1];
      }
    }
    
    // Return original ID if no UUID pattern found
    return id;
  }
  
  /**
   * Check if a string is a valid UUID
   * 
   * @param id The ID to check
   * @returns True if the ID is a valid UUID
   */
  static isValidUUID(id: string): boolean {
    if (!id) return false;
    return validateUUID(id);
  }
  
  /**
   * Create a compound ID from a UUID and a suffix
   * 
   * @param uuid The base UUID
   * @param suffix The suffix to append
   * @returns A compound ID with format uuid-suffix
   */
  static createCompoundId(uuid: string, suffix: string): string {
    if (!uuid) return uuid;
    return `${uuid}-${suffix}`;
  }
  
  /**
   * Find a task by ID using multiple resolution strategies
   * 
   * @param projectId The project ID
   * @param taskId The task ID (can be exact ID, UUID part, compound ID, or related to sourceId)
   * @param projectsDb The projects database module
   * @returns Promise resolving to a TaskLookupResult with detailed resolution information
   */
  static async findTaskById(projectId: string, taskId: string, projectsDb: any): Promise<TaskLookupResult> {
    if (!projectId || !taskId) {
      return { 
        task: null,
        lookupMethod: 'not-found',
        originalId: taskId,
        metadata: {
          resolutionPath: ['invalid-input']
        }
      };
    }
    
    if (DEBUG_TASK_LOOKUP || DEBUG_TASK_ID_RESOLUTION) {
      console.log(`[TASK_RESOLVER] Looking up task with ID: ${taskId} in project: ${projectId}`);
    }
    
    // Track resolution path for debugging
    const resolutionPath: string[] = ['start'];
    
    // Attempt to clean the task ID (extract UUID if compound)
    const cleanId = this.cleanTaskId(taskId);
    const isCompoundId = cleanId !== taskId;
    
    if (isCompoundId && DEBUG_TASK_ID_RESOLUTION) {
      console.log(`[TASK_RESOLVER] Extracted clean UUID ${cleanId} from compound ID ${taskId}`);
      resolutionPath.push('compound-id-detected');
    }
    
    try {
      // Get all tasks for the project
      const allTasks = await projectsDb.getTasksForProject(projectId);
      
      if (!allTasks || allTasks.length === 0) {
        if (DEBUG_TASK_LOOKUP) {
          console.log(`[TASK_RESOLVER] No tasks found for project: ${projectId}`);
        }
        resolutionPath.push('no-tasks-found');
        return {
          task: null,
          lookupMethod: 'not-found',
          originalId: taskId,
          metadata: {
            isCompoundId,
            resolutionPath
          }
        };
      }
      
      resolutionPath.push(`found-${allTasks.length}-tasks`);
      
      // Step 1: Try to find by exact ID match
      const exactMatch = allTasks.find((task: Record<string, any>) => task.id === taskId);
      if (exactMatch) {
        if (DEBUG_TASK_LOOKUP || DEBUG_TASK_ID_RESOLUTION) {
          console.log(`[TASK_RESOLVER] Found task by exact ID match: ${taskId}`);
        }
        
        resolutionPath.push('exact-match');
        return {
          task: exactMatch,
          lookupMethod: 'exact',
          originalId: taskId,
          resolvedId: exactMatch.id,
          metadata: {
            isCompoundId,
            hasSourceId: !!exactMatch.sourceId,
            sourceOrigin: exactMatch.origin || 'unknown',
            resolutionPath
          }
        };
      }
      
      resolutionPath.push('no-exact-match');
      
      // Step 2: If cleanId is different from taskId, try to find by clean UUID
      if (isCompoundId) {
        const cleanIdMatch = allTasks.find((task: Record<string, any>) => task.id === cleanId);
        if (cleanIdMatch) {
          if (DEBUG_TASK_LOOKUP || DEBUG_TASK_ID_RESOLUTION) {
            console.log(`[TASK_RESOLVER] Found task by clean UUID match: ${cleanId} (from compound ID ${taskId})`);
          }
          
          resolutionPath.push('compound-id-match');
          return {
            task: cleanIdMatch,
            lookupMethod: 'compound-id',
            originalId: taskId,
            resolvedId: cleanIdMatch.id,
            metadata: {
              isCompoundId: true,
              hasSourceId: !!cleanIdMatch.sourceId,
              sourceOrigin: cleanIdMatch.origin || 'unknown',
              resolutionPath
            }
          };
        }
        resolutionPath.push('no-compound-id-match');
      }
      
      // Step 3: For Success Factor tasks, try to find by sourceId
      if (this.isValidUUID(cleanId)) {
        resolutionPath.push('valid-uuid-format');
        
        // Find tasks with matching sourceId, prioritizing 'factor' origin
        const sourceIdMatches = allTasks.filter((task: Record<string, any>) => task.sourceId === cleanId);
        const factorMatch = sourceIdMatches.find((task: Record<string, any>) => task.origin === 'factor');
        const sourceIdMatch = factorMatch || sourceIdMatches[0]; // Use factor match if available, otherwise first match
        
        if (sourceIdMatch) {
          if (DEBUG_TASK_LOOKUP || DEBUG_TASK_ID_RESOLUTION) {
            console.log(`[TASK_RESOLVER] Found task by sourceId match: ${cleanId}`);
            console.log(`[TASK_RESOLVER] Actual task ID: ${sourceIdMatch.id}, origin: ${sourceIdMatch.origin}`);
          }
          
          resolutionPath.push('source-id-match');
          return {
            task: sourceIdMatch,
            lookupMethod: 'source-id',
            originalId: taskId,
            resolvedId: sourceIdMatch.id,
            metadata: {
              isCompoundId,
              hasSourceId: true,
              sourceOrigin: sourceIdMatch.origin || 'unknown',
              resolutionPath
            }
          };
        }
        resolutionPath.push('no-source-id-match');
      }
      
      // Step 4: Check for canonical ID (success factor original ID)
      // This is for newer versions where we use the UUID as sourceId directly
      const canonicalMatches = allTasks.filter((task: Record<string, any>) => 
        task.origin === 'factor' && 
        (task.id === cleanId || task.sourceId === cleanId)
      );
      
      if (canonicalMatches.length > 0) {
        // Sort to prioritize exact ID matches over sourceId matches
        canonicalMatches.sort((a: Record<string, any>, b: Record<string, any>) => {
          if (a.id === cleanId) return -1;
          if (b.id === cleanId) return 1;
          return 0;
        });
        
        const canonicalMatch = canonicalMatches[0];
        
        if (DEBUG_TASK_LOOKUP || DEBUG_TASK_ID_RESOLUTION) {
          console.log(`[TASK_RESOLVER] Found task by canonical ID match: ${cleanId}`);
          console.log(`[TASK_RESOLVER] Canonical task ID: ${canonicalMatch.id}, origin: ${canonicalMatch.origin}`);
        }
        
        resolutionPath.push('canonical-id-match');
        return {
          task: canonicalMatch,
          lookupMethod: 'canonical-id',
          originalId: taskId,
          resolvedId: canonicalMatch.id,
          metadata: {
            isCompoundId,
            hasSourceId: !!canonicalMatch.sourceId,
            sourceOrigin: canonicalMatch.origin || 'unknown',
            resolutionPath
          }
        };
      }
      
      // Task not found through any method
      if (DEBUG_TASK_LOOKUP || DEBUG_TASK_ID_RESOLUTION) {
        console.log(`[TASK_RESOLVER] Task not found with ID: ${taskId}`);
        console.log(`[TASK_RESOLVER] Resolution path: ${resolutionPath.join(' → ')}`);
      }
      
      resolutionPath.push('exhausted-all-methods');
      
    } catch (err) {
      console.error('[TASK_RESOLVER] Error during task lookup:', err);
      resolutionPath.push('lookup-error');
    }
    
    // Create detailed "not found" result with resolution path
    return {
      task: null,
      lookupMethod: 'not-found',
      originalId: taskId,
      metadata: {
        isCompoundId,
        resolutionPath
      }
    };
  }
  
  /**
   * Synchronize all related Success Factor tasks with the same sourceId
   * 
   * @param projectId The project ID
   * @param sourceId The source ID to match
   * @param updates The updates to apply to all matching tasks
   * @param projectsDb The projects database module
   * @returns Promise resolving to number of tasks updated
   */
  /**
   * Synchronize all related Success Factor tasks with the same sourceId
   * 
   * @param projectId The project ID
   * @param sourceId The source ID to match
   * @param updates The updates to apply to all matching tasks
   * @param projectsDb The projects database module
   * @returns Promise resolving to number of tasks updated
   */
  static async syncRelatedTasks(
    projectId: string, 
    sourceId: string, 
    updates: Record<string, any>,
    projectsDb: any
  ): Promise<number> {
    if (!projectId || !sourceId || !this.isValidUUID(sourceId)) {
      if (DEBUG_TASK_ID_RESOLUTION) {
        console.log(`[TASK_RESOLVER] Invalid inputs for syncRelatedTasks: projectId=${projectId}, sourceId=${sourceId}`);
      }
      return 0;
    }
    
    try {
      // First get all tasks for the project
      const allTasks = await projectsDb.getTasksForProject(projectId);
      
      if (!allTasks || allTasks.length === 0) {
        if (DEBUG_TASK_ID_RESOLUTION) {
          console.log(`[TASK_RESOLVER] No tasks found for project: ${projectId}`);
        }
        return 0;
      }
      
      // Find all related Success Factor tasks with matching sourceId
      const relatedTasks = allTasks.filter((task: Record<string, any>) => 
        task.sourceId === sourceId && 
        (task.origin === 'factor' || task.origin === 'custom') &&
        task.projectId === projectId
      );
      
      if (relatedTasks.length === 0) {
        if (DEBUG_TASK_ID_RESOLUTION) {
          console.log(`[TASK_RESOLVER] No tasks found with sourceId: ${sourceId}`);
        }
        return 0;
      }
      
      if (DEBUG_TASK_PERSISTENCE || DEBUG_TASK_ID_RESOLUTION) {
        console.log(`[TASK_RESOLVER] Found ${relatedTasks.length} related tasks with sourceId: ${sourceId}`);
        console.log(`[TASK_RESOLVER] Applying updates: ${JSON.stringify(updates)}`);
      }
      
      // Update each related task
      let updatedCount = 0;
      for (const task of relatedTasks) {
        try {
          // Use the existing updateTask method from projectsDb
          await projectsDb.updateTask(task.id, projectId, {
            ...updates,
            // Include original properties to prevent losing data
            sourceId: task.sourceId,
            origin: task.origin,
            // Add timestamp to ensure changes are tracked
            updatedAt: new Date()
          });
          updatedCount++;
          
          if (DEBUG_TASK_PERSISTENCE) {
            console.log(`[TASK_RESOLVER] Updated related task ${task.id} (origin: ${task.origin})`);
          }
        } catch (err) {
          console.error(`[TASK_RESOLVER] Error updating related task ${task.id}:`, err);
        }
      }
      
      if (DEBUG_TASK_PERSISTENCE || DEBUG_TASK_ID_RESOLUTION) {
        console.log(`[TASK_RESOLVER] Successfully synchronized ${updatedCount} related tasks with sourceId: ${sourceId}`);
      }
      
      return updatedCount;
    } catch (err) {
      console.error('[TASK_RESOLVER] Error synchronizing related tasks:', err);
      return 0;
    }
  }
  
  /**
   * Create a consistent task endpoint URL
   * 
   * @param projectId The project ID
   * @param taskId The task ID
   * @returns The endpoint URL for the task
   */
  static createTaskEndpoint(projectId: string, taskId: string): string {
    const cleanId = this.cleanTaskId(taskId);
    return `/api/projects/${projectId}/tasks/${cleanId}`;
  }
}

// Create custom error class for task not found
export class TaskNotFoundError extends Error {
  code: string;
  
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
    this.code = 'TASK_NOT_FOUND';
  }
}