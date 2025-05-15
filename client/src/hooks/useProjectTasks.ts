import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { isValidUUID, isNumericId, convertNumericIdToUuid } from '@/lib/uuid-utils';

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

export function useProjectTasks(projectId?: string) {
  const queryClient = useQueryClient();
  
  // Normalize the project ID if needed
  const normalizedProjectId = projectId ? 
    (isNumericId(projectId) ? convertNumericIdToUuid(projectId) : projectId) : 
    undefined;
  
  // If we have a project ID but it's not valid UUID, we can't fetch tasks
  const isValidId = !normalizedProjectId || isValidUUID(normalizedProjectId);
  
  if (projectId && !isValidId) {
    console.error(`Invalid project ID format: ${projectId}`);
  }
  
  // Query to fetch tasks for the project directly from database
  const { 
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery<ProjectTask[]>({
    queryKey: normalizedProjectId && isValidId ? [`/api/projects/${normalizedProjectId}/tasks`] : [],
    queryFn: async () => {
      if (!normalizedProjectId || !isValidId) return [];
      
      try {
        // Use native fetch for more control over error handling
        console.log(`Fetching tasks for project ${normalizedProjectId}`);
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
        console.log(`Fetched ${data.length} tasks for project ${normalizedProjectId}`);
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
  
  // Log initial data when it changes
  useEffect(() => {
    if (tasks) {
      console.log('Initial fetch:', tasks);
    }
  }, [tasks]);
  
  // Mutation to create a new task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateTaskParams) => {
      console.log(`Creating task for project ${projectId}:`, taskData.text);
      
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
        console.log('Task created successfully:', resJson.id);
        return resJson;
      } catch (err) {
        console.error('Task creation exception:', err);
        throw err;
      }
    },
    onSuccess: async (newTask) => {
      console.log('Task created, invalidating cache and refetching');
      // Invalidate the query cache with the correct query key format
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      
      // Immediately refetch from backend to ensure UI shows persisted state
      const freshData = await refetch();
      console.log(`Refetched ${freshData.data?.length || 0} tasks after create`);
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      // Don't throw from the callback
    }
  });
  
  // Mutation to update an existing task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string, data: UpdateTaskParams }) => {
      console.log(`Updating task ${taskId} for project ${projectId}:`, data);
      
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
        console.log('Task updated successfully:', resJson.id);
        return resJson;
      } catch (err) {
        console.error('Task update exception:', err);
        throw err;
      }
    },
    onSuccess: async (updatedTask) => {
      console.log('Task updated, invalidating cache and refetching');
      // Invalidate the query cache with the correct query key format
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      
      // Immediately refetch from backend to ensure UI shows persisted state
      const freshData = await refetch();
      console.log(`Refetched ${freshData.data?.length || 0} tasks after update`);
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      // Don't throw from the callback
    }
  });
  
  // Mutation to delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}/tasks/${taskId}`);
      return await res.json();
    },
    onSuccess: async () => {
      // Use consistent query key format for invalidation
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      // Manually refetch to get fresh data
      const freshData = await refetch();
      console.log('Refetched list after delete:', freshData.data);
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      throw error;
    }
  });
  
  // Convenience functions
  const createTask = async (taskData: CreateTaskParams) => {
    return await createTaskMutation.mutateAsync(taskData);
  };
  
  const updateTask = async (taskId: string, data: UpdateTaskParams) => {
    return await updateTaskMutation.mutateAsync({ taskId, data });
  };
  
  const deleteTask = async (taskId: string) => {
    return await deleteTaskMutation.mutateAsync(taskId);
  };
  
  // Helper function to get tasks by source ID and stage
  const getTasksBySource = (sourceId: string, stage?: string) => {
    if (!tasks) return [];
    
    if (stage) {
      return tasks.filter(task => task.sourceId === sourceId && task.stage === stage);
    }
    
    return tasks.filter(task => task.sourceId === sourceId);
  };
  
  return {
    tasks,
    isLoading,
    error,
    refetch,
    createTask,
    updateTask,
    deleteTask,
    getTasksBySource,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}