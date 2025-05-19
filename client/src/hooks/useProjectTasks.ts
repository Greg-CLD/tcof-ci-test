import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { isValidUUID, isNumericId } from '@/lib/uuid-utils';
import { 
  DEBUG_TASKS, 
  DEBUG_TASK_MAPPING, 
  DEBUG_TASK_PERSISTENCE,
  DEBUG_TASK_COMPLETION 
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
      // Don't throw from the callback
    }
  });
  
  // Mutation to update an existing task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string, data: UpdateTaskParams }) => {
      if (DEBUG_TASKS) console.log(`Updating task ${taskId} for project ${projectId}:`, data);
      
      // Silently normalize invalid UUID sourceId to null
      if (data.sourceId && !isValidUUID(data.sourceId)) {
        data.sourceId = null;
      }
      
      try {
        const res = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskId}`, data);
        
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
        if (DEBUG_TASKS) console.log('Task updated successfully:', resJson.task?.id);
        // Return the task object directly for consistent access
        return resJson.task || resJson;
      } catch (err) {
        console.error('Task update exception:', err);
        throw err;
      }
    },
    onSuccess: async (updatedTask, variables) => {
      if (DEBUG_TASKS) console.log('Task updated, invalidating cache and refetching');
      
      // First log the updated task
      if (DEBUG_TASKS) console.log('Updated task:', updatedTask);
      
      // Get the exact query key using our helper
      const key = getTasksKey(projectId);
      
      // Update cache optimistically to show the updated task immediately
      queryClient.setQueryData(key, (oldTasks: ProjectTask[] = []) => {
        if (DEBUG_TASKS) console.log('Optimistically updating task in UI:', updatedTask);
        return oldTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });
      
      // Robust cache invalidation and refetching
      try {
        // Invalidate the query cache with exact matching to ensure consistency
        await queryClient.invalidateQueries({ queryKey: key, exact: true });
        
        // Force immediate refetch from backend to ensure UI shows persisted state
        const freshData = await refetch();
        if (DEBUG_TASKS) console.log(`Refetched ${freshData.data?.length || 0} tasks after update`);
        
        // Verify the update was reflected in the fetched data
        if (updatedTask && updatedTask.id) {
          const taskInData = freshData.data?.find(task => task.id === updatedTask.id);
          if (DEBUG_TASKS) console.log('Updated task in refetched data:', taskInData);
          
          if (!taskInData) {
            console.warn('Updated task not found in refetched data. Forcing another refetch...');
            setTimeout(() => refetch(), 1000);
          } else if (taskInData.updatedAt !== updatedTask.updatedAt) {
            console.warn('Task found but update timestamp mismatch. Forcing another refetch...');
            setTimeout(() => refetch(), 1000);
          }
        }
      } catch (err) {
        console.error('Error during cache invalidation/refetch:', err);
        // Still attempt a final refetch to recover
        setTimeout(() => refetch(), 2000);
      }
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      // Don't throw from the callback
    }
  });
  
  // Mutation to delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      try {
        if (DEBUG_TASKS) console.log(`Deleting task ${taskId} for project ${projectId}`);
        const res = await apiRequest('DELETE', `/api/projects/${projectId}/tasks/${taskId}`);
        
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
    
    return await updateTaskMutation.mutateAsync({ taskId, data });
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