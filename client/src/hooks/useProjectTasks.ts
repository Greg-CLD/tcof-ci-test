import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

import { ProjectTask as DBProjectTask } from '@shared/schema';


// Validate UUID format
function isValidUUID(uuid: string) {
  const regexExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexExp.test(uuid);
}
// Local interface for client-side project tasks
interface ProjectTask {
  id: string;
  projectId: string;
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceId: string;
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
  sourceId: string;
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
  sourceId?: string;
  completed?: boolean;
  notes?: string;
  priority?: string;
  dueDate?: string;
  owner?: string;
  status?: string;
}

export function useProjectTasks(projectId?: string) {
  const queryClient = useQueryClient();
  
  // Query to fetch tasks for the project directly from database
  const { 
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery<ProjectTask[]>({
    queryKey: ['api', 'projects', projectId, 'tasks'],
    queryFn: async () => {
      if (!projectId) return [];
      
      try {
        // Use native fetch for more control over error handling
        console.log(`Fetching tasks for project ${projectId}`);
        const res = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
        
        if (!res.ok) {
          console.error(`Error fetching tasks: ${res.status} ${res.statusText}`);
          // If we get a 401, throw an error to trigger retry on login
          if (res.status === 401) {
            throw new Error('Authentication required');
          }
          return [];
        }
        
        const data = await res.json();
        console.log(`Fetched ${data.length} tasks for project ${projectId}`);
        return data;
      } catch (err) {
        console.error('Error in task query:', err);
        return [];
      }
    },
    enabled: !!projectId,
    retry: 3,
    retryDelay: attempt => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000),
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
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
      console.log('Invalidating task cache after create');
      // First invalidate the query cache
      await queryClient.invalidateQueries({ queryKey: ['api', 'projects', projectId, 'tasks'] });
      
      // Then optimistically update the cache to avoid waiting for refetch
      queryClient.setQueryData(['api', 'projects', projectId, 'tasks'], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [newTask];
        return [...oldData, newTask];
      });
      
      // Finally refetch to ensure consistency
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
      console.log('Invalidating task cache after update');
      // First invalidate the query cache
      await queryClient.invalidateQueries({ queryKey: ['api', 'projects', projectId, 'tasks'] });
      
      // Then optimistically update the cache to avoid waiting for refetch
      queryClient.setQueryData(['api', 'projects', projectId, 'tasks'], (oldData: ProjectTask[] | undefined) => {
        if (!oldData) return [updatedTask];
        return oldData.map(task => task.id === updatedTask.id ? updatedTask : task);
      });
      
      // Finally refetch to ensure consistency
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
      await queryClient.invalidateQueries({ queryKey: ['api', 'projects', projectId, 'tasks'] });
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