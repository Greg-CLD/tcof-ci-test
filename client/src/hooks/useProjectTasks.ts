import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { isValidUUID, isNumericId } from '@/lib/uuid-utils';
import { extractUuid, safeProjectId } from '@/hooks/extractUuid';
import { logTaskNetworkRequest, logTaskNetworkResponse } from '@/utils/net-logging';
import { 
  DEBUG_TASKS, 
  DEBUG_TASK_MAPPING, 
  DEBUG_TASK_PERSISTENCE,
  DEBUG_TASK_COMPLETION,
  DEBUG_TASK_API
} from '@shared/constants.debug';

import { ProjectTask as DBProjectTask } from '@shared/schema';
// Local interface for client-side project tasks
interface ProjectTask {
  id: string;
  projectId: string;
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceId: string | null; // Allow null for flexibility
  completed?: boolean;
  notes?: string;
  priority?: string;
  dueDate?: string;
  owner?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTaskParams {
  projectId: string;
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceId: string | null;
  completed?: boolean;
  notes?: string;
  priority?: string;
  dueDate?: string;
  owner?: string;
  status?: string;
}

interface UpdateTaskParams {
  text?: string;
  stage?: 'identification' | 'definition' | 'delivery' | 'closure';
  origin?: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceId?: string | null;
  completed?: boolean;
  notes?: string;
  priority?: string;
  dueDate?: string;
  owner?: string;
  status?: string;
}

// Helper function to get consistent task query keys
function getTasksKey(projectId: string | null | undefined): string[] {
  if (!projectId) return [];
  if (isNumericId(projectId)) return []; // Reject numeric IDs
  if (!isValidUUID(projectId)) return []; // Reject invalid UUIDs
  return ['projectTasks', projectId];
}
// TODO: unit test

export function useProjectTasks(projectId?: string) {
  const queryClient = useQueryClient();
  
  // Reject numeric IDs - we no longer convert them to UUIDs
  const normalizedProjectId = projectId ? 
    (isNumericId(projectId) ? undefined : projectId) : 
    undefined;
    
  // Log a warning if we're rejecting a numeric ID
  if (projectId && isNumericId(projectId)) {
    console.error(`Numeric project ID rejected: ${projectId}`);
  }
  
  // If we have a project ID but it's not valid UUID, we can't fetch tasks
  const isValidId = !normalizedProjectId || isValidUUID(normalizedProjectId);
  
  if (projectId && !isValidId) {
    console.error(`Invalid project ID format: ${projectId}`);
  }
  
  // Get the tasks query key using our helper function
  const tasksQueryKey = getTasksKey(normalizedProjectId);
  
  // Query to fetch tasks for the project directly from database
  const { 
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery<ProjectTask[]>({
    queryKey: getTasksKey(normalizedProjectId),
    queryFn: async () => {
      if (!normalizedProjectId || !isValidId) return [];
      
      try {
        // Use native fetch for more control over error handling
        if (DEBUG_TASKS) console.log(`Fetching tasks for project ${normalizedProjectId}`);
        const res = await apiRequest('GET', `/api/projects/${normalizedProjectId}/tasks`);
        
        if (!res.ok) {
          console.error(`Error fetching tasks: ${res.status} ${res.statusText}`);
          // If we get a 401, throw an error to trigger retry on login
          if (res.status === 401) {
            throw new Error('Authentication required');
          }
          // If we get a 400, it might be an invalid UUID format
          if (res.status === 400) {
            console.error(`Invalid UUID format for project ID: ${normalizedProjectId}`);
          }
          return [];
        }
        
        const data = await res.json();
        if (DEBUG_TASKS) console.log(`Fetched ${data.length} tasks for project ${normalizedProjectId}`);
        return data;
      } catch (err) {
        console.error('Error in task query:', err);
        return [];
      }
    },
    enabled: !!normalizedProjectId && isValidId,
    retry: 3,
    retryDelay: attempt => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000),
    staleTime: 0, // Don't use stale data at all, always refresh from server
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Ensure it refreshes when component mounts
  });
  
  // Log initial data when it changes and verify query key
  useEffect(() => {
    if (tasks && DEBUG_TASKS) {
      console.log('Initial fetch:', tasks);
      console.log('Current query key:', tasksQueryKey);
    }
  }, [tasks, tasksQueryKey]);
  
  // Mutation to create a new task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateTaskParams) => {
      if (DEBUG_TASKS) console.log(`Creating task for project ${projectId}:`, taskData.text);
      
      // Silently normalize invalid UUID sourceId to null
      if (taskData.sourceId && !isValidUUID(taskData.sourceId)) {
        taskData.sourceId = null;
      }
      
      try {
        const res = await apiRequest('POST', `/api/projects/${projectId}/tasks`, taskData);
        
        if (!res.ok) {
          console.error(`Error creating task: ${res.status} ${res.statusText}`);
          // Handle authentication errors specially
          if (res.status === 401) {
            throw new Error('Authentication required to create task');
          }
          throw new Error(`Failed to create task: ${res.status} ${res.statusText}`);
        }
        
        const resJson = await res.json();
        
        if (resJson.success === false) {
          throw new Error(resJson.message || 'Failed to create task');
        }
        if (DEBUG_TASKS) console.log('Task created successfully:', resJson.task?.id);
        // Return the task object directly for consistent access
        return resJson.task || resJson;
      } catch (err) {
        console.error('Task creation exception:', err);
        throw err;
      }
    },
    onSuccess: async (newTask, variables) => {
      if (DEBUG_TASKS) console.log('Task created, invalidating cache and refetching');
      
      // First log the new task that was created
      if (DEBUG_TASKS) console.log('Created task:', newTask);
      
      // Get the exact query key using our helper
      const key = getTasksKey(variables.projectId);
      
      // Update cache optimistically to show the new task immediately
      queryClient.setQueryData(key, (oldTasks: ProjectTask[] = []) => {
        if (DEBUG_TASKS) console.log('Optimistically adding task to UI:', newTask);
        return [...oldTasks, newTask];
      });
      
      // Ensure cache invalidation and refetching with 100% guarantee
      try {
        // Invalidate the query cache with exact matching to ensure consistency
        await queryClient.invalidateQueries({ queryKey: key, exact: true });
        
        // Force immediate refetch from backend to ensure UI shows persisted state
        const freshData = await refetch();
        if (DEBUG_TASKS) console.log(`Refetched ${freshData.data?.length || 0} tasks after create`);
        
        // Manually verify the created task exists in the refetched data
        const taskExists = freshData.data?.some(task => task.id === newTask.id);
        if (DEBUG_TASKS) console.log(`Task ${newTask.id} exists in refetched data: ${taskExists}`);
        
        if (!taskExists) {
          console.warn('Task was created but not found in refetched data. Forcing another refetch...');
          setTimeout(() => refetch(), 1000); // Try once more after a delay
        }
      } catch (err) {
        console.error('Error during cache invalidation/refetch:', err);
        // Still attempt a final refetch to recover
        setTimeout(() => refetch(), 2000);
      }
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      // TRACE: Log the error during task creation
      console.debug(`[TRACE_RQ] Task creation failed:
  - Error: ${error.message}
  - Status: Error`);
      // Don't throw from the callback
    }
  });
  
  /**
 * Extract the UUID part from a potentially compound task ID
 * SuccessFactor tasks use a compound ID format: uuid-suffix
 * This function extracts just the UUID part for API calls
 * 
 * @param id The task ID which might be a compound ID
 * @returns The extracted UUID part only
 */
function extractUuid(id: string): string {
  // Check if this appears to be a compound ID (contains more than 4 hyphens)
  const hyphenCount = (id.match(/-/g) || []).length;
  
  if (hyphenCount > 4) {
    // Standard UUID has 4 hyphens, extract just the UUID part (first 5 segments)
    const uuidParts = id.split('-');
    if (uuidParts.length >= 5) {
      const uuidOnly = uuidParts.slice(0, 5).join('-');
      return uuidOnly;
    }
  }
  
  // If not a compound ID or extraction failed, return the original
  return id;
}

// Mutation to update an existing task
const updateTaskMutation = useMutation({
  mutationFn: async ({ taskId, data }: { taskId: string, data: UpdateTaskParams }) => {
    // Extract the valid UUID part if this is a compound ID
    const rawId = taskId;
    const cleanId = extractUuid(rawId);
    
    // Define the endpoint with clean UUID immediately
    const endpoint = `/api/projects/${projectId}/tasks/${cleanId}`;
    
    // Log network request details with our utility function
    logTaskNetworkRequest('updateTask', rawId, cleanId, endpoint, safeProjectId(projectId));
    
    // Log if we had to extract a UUID from a compound ID
    if (cleanId !== taskId && DEBUG_TASK_MAPPING) {
      console.log(`[DEBUG_TASK_MAPPING] Extracted base UUID ${cleanId} from compound ID ${taskId}`);
    }
    
    // Enhanced diagnostic logging for task updates
    if (DEBUG_TASKS) console.log(`Updating task ${taskId} (using ${cleanId}) for project ${projectId}:`, data);
    
    // Special diagnostics for completion status changes (key issue we're debugging)
    if (DEBUG_TASK_COMPLETION && data.hasOwnProperty('completed')) {
      console.log(`[DEBUG_TASK_COMPLETION] Task ${taskId} completion update request`);
      console.log(`[DEBUG_TASK_COMPLETION] Using extracted ID: ${cleanId}`);
      console.log(`[DEBUG_TASK_COMPLETION] New completion value: ${data.completed}`);
      
      // Check if this is a task from existing data to get more context
      const existingTask = tasks?.find(t => t.id === taskId);
      if (existingTask) {
        console.log(`[DEBUG_TASK_COMPLETION] Existing task details:`);
        console.log(`[DEBUG_TASK_COMPLETION]   - ID: ${existingTask.id}`);
        console.log(`[DEBUG_TASK_COMPLETION]   - Current completion: ${existingTask.completed}`);
        console.log(`[DEBUG_TASK_COMPLETION]   - Origin: ${existingTask.origin}`);
        console.log(`[DEBUG_TASK_COMPLETION]   - Source ID: ${existingTask.sourceId || 'null'}`);
        
        // Special focus on SuccessFactor tasks
        if (existingTask.origin === 'factor') {
          console.log(`[DEBUG_TASK_COMPLETION] *** SuccessFactor task detected ***`);
        }
      }
    }
      
      // Silently normalize invalid UUID sourceId to null
      if (data.sourceId && !isValidUUID(data.sourceId)) {
        if (DEBUG_TASK_MAPPING) {
          console.log(`[DEBUG_TASK_MAPPING] Invalid sourceId detected: ${data.sourceId}`);
          console.log(`[DEBUG_TASK_MAPPING] Normalizing to null`);
        }
        data.sourceId = null;
      }
      
      // Track request timing for persistence debugging
      const requestStartTime = performance.now();
      if (DEBUG_TASK_PERSISTENCE) {
        console.log(`[DEBUG_TASK_PERSISTENCE] Starting update request for task ${taskId}`);
        console.log(`[DEBUG_TASK_PERSISTENCE] Request payload:`, JSON.stringify(data));
      }
      
      try {
        // Use the extracted UUID for the API request instead of the potentially compound taskId
        const res = await apiRequest('PUT', endpoint, data);
        
        // Measure round-trip time for performance analysis
        if (DEBUG_TASK_PERSISTENCE) {
          const requestDuration = performance.now() - requestStartTime;
          console.log(`[DEBUG_TASK_PERSISTENCE] Update request completed in ${requestDuration.toFixed(2)}ms`);
          console.log(`[DEBUG_TASK_PERSISTENCE] Used task ID for API request: ${cleanId}`);
        }
        
        if (!res.ok) {
          console.error(`Error updating task: ${res.status} ${res.statusText}`);
          // Handle authentication errors specially
          if (res.status === 401) {
            throw new Error('Authentication required to update task');
          }
          throw new Error(`Failed to update task: ${res.status} ${res.statusText}`);
        }
        
        const resJson = await res.json();
        if (resJson.success === false) {
          throw new Error(resJson.message || 'Failed to update task');
        }
        
        // Standard debug logging
        if (DEBUG_TASKS) console.log('Task updated successfully:', resJson.task?.id);
        
        // Detailed diagnostic logging for SuccessFactor tasks and completion updates
        if (DEBUG_TASK_COMPLETION) {
          const updatedTask = resJson.task || resJson;
          console.log(`[DEBUG_TASK_COMPLETION] Response task details:`);
          console.log(`[DEBUG_TASK_COMPLETION]   - ID: ${updatedTask.id}`);
          console.log(`[DEBUG_TASK_COMPLETION]   - Completion: ${updatedTask.completed}`);
          
          // Compare with requested values
          if (data.hasOwnProperty('completed') && updatedTask.completed !== data.completed) {
            console.log(`[DEBUG_TASK_COMPLETION] *** CRITICAL ERROR: Completion mismatch ***`);
            console.log(`[DEBUG_TASK_COMPLETION]   - Requested: ${data.completed}`);
            console.log(`[DEBUG_TASK_COMPLETION]   - Returned: ${updatedTask.completed}`);
          } else if (data.hasOwnProperty('completed')) {
            console.log(`[DEBUG_TASK_COMPLETION] Completion value successfully updated to ${updatedTask.completed}`);
          }
        }
        
        // Return the task object directly for consistent access
        return resJson.task || resJson;
      } catch (err) {
        console.error('Task update exception:', err);
        
        if (DEBUG_TASK_PERSISTENCE) {
          console.log(`[DEBUG_TASK_PERSISTENCE] Update request failed with error:`);
          console.log(err);
        }
        
        throw err;
      }
    },
    onSuccess: async (updatedTask, variables) => {
      // TRACE: Log the response data and status on successful task update
      console.debug(`[TRACE_RQ] Task update succeeded:
  - Task ID: ${updatedTask.id}
  - Original requested ID: ${variables.taskId}
  - Response status: 200
  - Updated completion: ${updatedTask.completed}`);
      
      if (DEBUG_TASKS) console.log('Task updated, invalidating cache and refetching');
      
      // Track task update in cache
      if (DEBUG_TASK_PERSISTENCE) {
        console.log(`[DEBUG_TASK_PERSISTENCE] Update successful for task ${updatedTask.id}`);
        console.log(`[DEBUG_TASK_PERSISTENCE] Current cache state before update:`, queryClient.getQueryData(getTasksKey(projectId)));
      }
      
      // First log the updated task
      if (DEBUG_TASKS) console.log('Updated task:', updatedTask);
      
      // Special logging for completion status
      if (DEBUG_TASK_COMPLETION && 
          variables.data.hasOwnProperty('completed') && 
          updatedTask.origin === 'factor') {
        console.log(`[DEBUG_TASK_COMPLETION] SuccessFactor task ${updatedTask.id} updated successfully`);
        console.log(`[DEBUG_TASK_COMPLETION] New completion value: ${updatedTask.completed}`);
      }
      
      // Get the exact query key using our helper
      const key = getTasksKey(projectId);
      
      // Update cache optimistically to show the updated task immediately
      queryClient.setQueryData(key, (oldTasks: ProjectTask[] = []) => {
        if (DEBUG_TASKS) console.log('Optimistically updating task in UI:', updatedTask);
        
        // Diagnostic logging for cache updates to help trace the bug
        if (DEBUG_TASK_PERSISTENCE || DEBUG_TASK_COMPLETION) {
          console.log(`[DEBUG_CACHE] Updating task ${updatedTask.id} in cache`);
          
          // Check if this task exists in the cache
          const existingTask = oldTasks.find(t => t.id === updatedTask.id);
          if (existingTask) {
            console.log(`[DEBUG_CACHE] Found existing task in cache:`);
            console.log(`[DEBUG_CACHE]   - Current completion: ${existingTask.completed}`);
            console.log(`[DEBUG_CACHE]   - New completion: ${updatedTask.completed}`);
          } else {
            console.log(`[DEBUG_CACHE] Task ${updatedTask.id} not found in current cache!`);
          }
        }
        
        return oldTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });
      
      // Robust cache invalidation and refetching
      try {
        // Invalidate the query cache with exact matching to ensure consistency
        if (DEBUG_TASK_PERSISTENCE) {
          console.log(`[DEBUG_TASK_PERSISTENCE] Invalidating cache for key:`, key);
        }
        await queryClient.invalidateQueries({ queryKey: key, exact: true });
        
        // Force immediate refetch from backend to ensure UI shows persisted state
        if (DEBUG_TASK_PERSISTENCE) {
          console.log(`[DEBUG_TASK_PERSISTENCE] Executing refetch to verify persistence...`);
        }
        
        const refetchStartTime = performance.now();
        const freshData = await refetch();
        
        if (DEBUG_TASK_PERSISTENCE) {
          const refetchTime = performance.now() - refetchStartTime;
          console.log(`[DEBUG_TASK_PERSISTENCE] Refetch completed in ${refetchTime.toFixed(2)}ms`);
        }
        
        if (DEBUG_TASKS) console.log(`Refetched ${freshData.data?.length || 0} tasks after update`);
        
        // Verify the update was reflected in the fetched data
        if (updatedTask && updatedTask.id) {
          const taskInData = freshData.data?.find(task => task.id === updatedTask.id);
          
          if (DEBUG_TASKS) console.log('Updated task in refetched data:', taskInData);
          
          // Enhanced diagnostic for SuccessFactor task completion verification
          if (DEBUG_TASK_COMPLETION && 
              variables.data.hasOwnProperty('completed') && 
              updatedTask.origin === 'factor') {
            console.log(`[DEBUG_TASK_COMPLETION] Verifying SuccessFactor task persistence after refetch`);
            
            if (taskInData) {
              console.log(`[DEBUG_TASK_COMPLETION] SuccessFactor task found in refetched data:`);
              console.log(`[DEBUG_TASK_COMPLETION]   - ID: ${taskInData.id}`);
              console.log(`[DEBUG_TASK_COMPLETION]   - Completion in response: ${updatedTask.completed}`);
              console.log(`[DEBUG_TASK_COMPLETION]   - Completion after refetch: ${taskInData.completed}`);
              
              if (updatedTask.completed !== taskInData.completed) {
                console.log(`[DEBUG_TASK_COMPLETION] *** CRITICAL ERROR: Completion value LOST after refetch ***`);
                console.log(`[DEBUG_TASK_COMPLETION] This indicates the database update succeeded but values were lost`);
              } else {
                console.log(`[DEBUG_TASK_COMPLETION] Completion state persisted correctly`);
              }
            } else {
              console.log(`[DEBUG_TASK_COMPLETION] *** ERROR: SuccessFactor task not found after refetch ***`);
            }
          }
          
          if (!taskInData) {
            console.warn('Updated task not found in refetched data. Forcing another refetch...');
            
            if (DEBUG_TASK_PERSISTENCE) {
              console.log(`[DEBUG_TASK_PERSISTENCE] Task ${updatedTask.id} missing from refetched data!`);
              console.log(`[DEBUG_TASK_PERSISTENCE] Scheduling emergency refetch in 1 second...`);
            }
            
            setTimeout(() => refetch(), 1000);
          } else if (taskInData.updatedAt !== updatedTask.updatedAt) {
            console.warn('Task found but update timestamp mismatch. Forcing another refetch...');
            
            if (DEBUG_TASK_PERSISTENCE) {
              console.log(`[DEBUG_TASK_PERSISTENCE] Task ${updatedTask.id} timestamp mismatch:`);
              console.log(`[DEBUG_TASK_PERSISTENCE]   - Response timestamp: ${updatedTask.updatedAt}`);
              console.log(`[DEBUG_TASK_PERSISTENCE]   - Refetched timestamp: ${taskInData.updatedAt}`);
              console.log(`[DEBUG_TASK_PERSISTENCE] Scheduling verification refetch in 1 second...`);
            }
            
            setTimeout(() => refetch(), 1000);
          } else if (variables.data.hasOwnProperty('completed') && 
                    taskInData.completed !== variables.data.completed) {
            // Special check for the completion value that triggers additional diagnostic
            console.warn(`Task completion value mismatch after refetch. Original update not persisted.`);
            
            if (DEBUG_TASK_COMPLETION) {
              console.log(`[DEBUG_TASK_COMPLETION] *** CRITICAL: Completion value mismatch after refetch ***`);
              console.log(`[DEBUG_TASK_COMPLETION]   - Requested completion: ${variables.data.completed}`);
              console.log(`[DEBUG_TASK_COMPLETION]   - Actual completion after refetch: ${taskInData.completed}`);
              console.log(`[DEBUG_TASK_COMPLETION] Scheduling emergency refetch in 1 second...`);
            }
            
            // This is a critical error, so we force an additional refetch 
            setTimeout(() => refetch(), 1000);
          }
        }
      } catch (err) {
        console.error('Error during cache invalidation/refetch:', err);
        // Still attempt a final refetch to recover
        setTimeout(() => refetch(), 2000);
      }
    },
    onError: (error, variables) => {
      console.error('Error updating task:', error);
      
      // TRACE: Log the error details when task update fails
      console.debug(`[TRACE_RQ] Task update failed:
  - Task ID: ${variables.taskId}
  - Error: ${error.message}
  - Status: Error`);
      
      // Don't throw from the callback
    }
  });
  
  // Mutation to delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // Extract the valid UUID part if this is a compound ID
      const rawId = taskId;
      const cleanId = rawId.split('-').slice(0,5).join('-');
      
      // Define the endpoint with clean UUID immediately
      const endpoint = `/api/projects/${projectId}/tasks/${cleanId}`;
      
      // Log network request details with our utility function
      logTaskNetworkRequest('deleteTask', rawId, cleanId, endpoint, projectId);
      
      try {
        if (DEBUG_TASKS) console.log(`Deleting task ${taskId} (using ${cleanId}) for project ${projectId}`);
        const res = await apiRequest('DELETE', endpoint);
        
        if (!res.ok) {
          console.error(`Error deleting task: ${res.status} ${res.statusText}`);
          // Handle authentication errors specially
          if (res.status === 401) {
            throw new Error('Authentication required to delete task');
          }
          throw new Error(`Failed to delete task: ${res.status} ${res.statusText}`);
        }
        
        const resJson = await res.json();
        if (resJson.success === false) {
          throw new Error(resJson.message || 'Failed to delete task');
        }
        if (DEBUG_TASKS) console.log('Task deleted successfully:', taskId);
        return resJson;
      } catch (err) {
        console.error('Task deletion exception:', err);
        throw err;
      }
    },
    onSuccess: async (result, deletedTaskId) => {
      if (DEBUG_TASKS) console.log('Task deleted, invalidating cache and refetching');
      if (DEBUG_TASKS) console.log('Delete result:', result);
      if (DEBUG_TASKS) console.log('Deleted task ID:', deletedTaskId);
      
      // Get the exact query key using our helper
      const key = getTasksKey(projectId);
      
      // Update cache optimistically to remove the deleted task immediately
      queryClient.setQueryData(key, (oldTasks: ProjectTask[] = []) => {
        if (DEBUG_TASKS) console.log('Optimistically removing deleted task from UI:', deletedTaskId);
        return oldTasks.filter(task => task.id !== deletedTaskId);
      });
      
      // Robust cache invalidation and refetching
      try {
        // Invalidate the query cache with exact matching to ensure consistency
        await queryClient.invalidateQueries({ queryKey: key, exact: true });
        
        // Manually refetch to get fresh data
        const freshData = await refetch();
        if (DEBUG_TASKS) console.log('Refetched list after delete:', freshData.data);
        
        // Verify the task is actually gone from the fresh data
        const taskStillExists = freshData.data?.some(task => task.id === deletedTaskId);
        if (taskStillExists) {
          console.warn(`Task ${deletedTaskId} was not actually deleted from the server! Forcing another refetch...`);
          setTimeout(() => refetch(), 1000);
        } else {
          if (DEBUG_TASKS) console.log(`Verified task ${deletedTaskId} is no longer in the task list`);
        }
      } catch (err) {
        console.error('Error during cache invalidation/refetch after delete:', err);
        // Still attempt a final refetch to recover
        setTimeout(() => refetch(), 2000);
      }
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      throw error;
    }
  });
  
  // Convenience functions
  const createTask = async (taskData: CreateTaskParams) => {
    // Silently normalize invalid UUID sourceId to null
    // This prevents database constraint errors
    if (taskData.sourceId && !isValidUUID(taskData.sourceId)) {
      taskData.sourceId = null;
    }
    
    return await createTaskMutation.mutateAsync(taskData);
  };
  
  const updateTask = async (taskId: string, data: UpdateTaskParams) => {
    // Validate the task ID format before sending to the server
    if (!isValidUUID(taskId)) {
      console.error(`Invalid task ID format for update: ${taskId}. Task IDs must be valid UUIDs.`);
      
      // Check if this is a source-based ID (like sf-1-f8af97e9)
      if (taskId.includes('-')) {
        console.warn(`Task ID ${taskId} appears to be a source-based ID, not a database UUID`);
        
        // Try to find the actual UUID for this task from our existing tasks array
        if (tasks && tasks.length > 0) {
          // Check if we can find a matching task by sourceId
          const sourceIdParts = taskId.split('-');
          
          if (sourceIdParts.length >= 2) {
            const sourceType = sourceIdParts[0]; // 'sf', 'h', etc.
            const sourceId = taskId; // Use the full string as sourceId
            
            // Look for a task with this sourceId
            const matchingTask = tasks.find(t => t.sourceId === sourceId);
            
            if (matchingTask) {
              if (DEBUG_TASKS) console.log(`Found matching task with UUID ${matchingTask.id} for source ID ${sourceId}`);
              
              // Use the actual UUID for the API call
              return await updateTaskMutation.mutateAsync({ taskId: matchingTask.id, data });
            } else {
              console.error(`No matching task found with sourceId ${sourceId}`);
              throw new Error(`Cannot update task: No database record found for task ID ${taskId}`);
            }
          }
        }
      }
      
      throw new Error(`Invalid task ID format: ${taskId}. Task IDs must be valid UUIDs.`);
    }
    
    // Extract the clean UUID from potentially compound ID before making API request
    const cleanId = extractUuid(taskId);
    
    // TRACE: Log the original vs. clean ID for debugging
    console.debug(`[TRACE_NET] Task update clean ID extraction:
  - Original task ID: ${taskId}
  - Cleaned UUID for API: ${cleanId}`);
    
    return await updateTaskMutation.mutateAsync({ taskId: cleanId, data });
  };
  
  const deleteTask = async (taskId: string) => {
    // Validate the task ID format before sending to the server
    if (!isValidUUID(taskId)) {
      console.error(`Invalid task ID format for deletion: ${taskId}. Task IDs must be valid UUIDs.`);
      
      // Check if this is a source-based ID (like sf-1-f8af97e9)
      if (taskId.includes('-')) {
        console.warn(`Task ID ${taskId} appears to be a source-based ID, not a database UUID`);
        
        // Try to find the actual UUID for this task from our existing tasks array
        if (tasks && tasks.length > 0) {
          // Look for a task with this sourceId
          const matchingTask = tasks.find(t => t.sourceId === taskId);
          
          if (matchingTask) {
            if (DEBUG_TASKS) console.log(`Found matching task with UUID ${matchingTask.id} for source ID ${taskId}`);
            
            // Use the actual UUID for the API call
            return await deleteTaskMutation.mutateAsync(matchingTask.id);
          } else {
            console.error(`No matching task found with sourceId ${taskId}`);
            throw new Error(`Cannot delete task: No database record found for task ID ${taskId}`);
          }
        }
      }
      
      throw new Error(`Invalid task ID format: ${taskId}. Task IDs must be valid UUIDs.`);
    }
    
    return await deleteTaskMutation.mutateAsync(taskId);
  };
  
  // Filter tasks by stage
  const getTasksByStage = (stage: string) => {
    if (!tasks) return [];
    return tasks.filter(task => task.stage.toLowerCase() === stage.toLowerCase());
  };
  
  // Find tasks by their sourceId
  const getTasksBySourceId = (sourceId: string) => {
    if (!tasks || !sourceId) return [];
    return tasks.filter(task => task.sourceId === sourceId);
  };
  
  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    getTasksByStage,
    getTasksBySourceId,
    refetch
  };
}