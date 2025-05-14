import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface ProjectTask {
  id: string;
  projectId: string;
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor' | 'policy';
  sourceId: string;
  completed?: boolean;
  assignedTo?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CreateTaskParams {
  projectId: string;
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor' | 'policy';
  sourceId: string;
  assignedTo?: string;
  dueDate?: string;
}

interface UpdateTaskParams {
  text?: string;
  stage?: 'identification' | 'definition' | 'delivery' | 'closure';
  completed?: boolean;
  assignedTo?: string;
  dueDate?: string;
}

export function useProjectTasks(projectId?: string) {
  const queryClient = useQueryClient();
  
  // Query to fetch tasks for the project
  const { 
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery<ProjectTask[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !!projectId,
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
      const res = await apiRequest('POST', `/api/projects/${projectId}/tasks`, taskData);
      const resJson = await res.json();
      console.log('Post-mutation response (create):', resJson);
      return resJson;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      // Manually refetch to get fresh data
      const freshData = await refetch();
      console.log('Refetched list after create:', freshData.data);
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      throw error;
    }
  });
  
  // Mutation to update an existing task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string, data: UpdateTaskParams }) => {
      const res = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskId}`, data);
      const resJson = await res.json();
      console.log('Post-mutation response (update):', resJson);
      return resJson;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      // Manually refetch to get fresh data
      const freshData = await refetch();
      console.log('Refetched list after update:', freshData.data);
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      throw error;
    }
  });
  
  // Mutation to delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}/tasks/${taskId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
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