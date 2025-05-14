import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface AdminSuccessFactor {
  id: string;
  title: string;
  description: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

export type Stage = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

export function useAdminSuccessFactors() {
  console.log('[ADMIN] useAdminSuccessFactors hook initialized');
  const queryClient = useQueryClient();
  
  const {
    data: factors,
    isLoading,
    error,
    refetch
  } = useQuery<AdminSuccessFactor[]>({
    queryKey: ['/api/admin/success-factors'],
    staleTime: 0, // No caching - always fetch fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always fetch fresh data on mount
  });

  // Force a refetch when the hook is initialized (on component mount)
  useEffect(() => {
    console.log('[ADMIN] Forcing initial refetch of success factors');
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Task mutations
  const addTaskMutation = useMutation({
    mutationFn: async ({ factorId, stage, taskText = '' }: { factorId: string, stage: Stage, taskText?: string }) => {
      console.log(`[ADMIN] Adding new task to ${factorId} in ${stage} stage`);
      
      // Get current factor data
      const response = await apiRequest('GET', `/api/admin/success-factors/${factorId}`);
      const currentFactor = await response.json();
      
      if (!currentFactor) {
        throw new Error(`Factor ${factorId} not found`);
      }
      
      // Ensure the tasks structure exists
      const tasks = {
        Identification: Array.isArray(currentFactor.tasks?.Identification) ? [...currentFactor.tasks.Identification] : [],
        Definition: Array.isArray(currentFactor.tasks?.Definition) ? [...currentFactor.tasks.Definition] : [],
        Delivery: Array.isArray(currentFactor.tasks?.Delivery) ? [...currentFactor.tasks.Delivery] : [],
        Closure: Array.isArray(currentFactor.tasks?.Closure) ? [...currentFactor.tasks.Closure] : []
      };
      
      // Add the new task
      tasks[stage].push(taskText);
      
      // Update the factor with the new task
      const updatedFactor = {
        ...currentFactor,
        tasks
      };
      
      // Send the update to the server
      const updateResponse = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      return await updateResponse.json();
    },
    onSuccess: () => {
      // Invalidate both the list and individual factor queries
      console.log('[ADMIN] Task added successfully, invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/success-factors'] });
    }
  });
  
  const updateTaskMutation = useMutation({
    mutationFn: async ({ 
      factorId, 
      stage, 
      taskIndex, 
      newText 
    }: { 
      factorId: string, 
      stage: Stage, 
      taskIndex: number, 
      newText: string 
    }) => {
      console.log(`[ADMIN] Updating task at index ${taskIndex} for ${factorId} in ${stage} stage`);
      
      // Get current factor data
      const response = await apiRequest('GET', `/api/admin/success-factors/${factorId}`);
      const currentFactor = await response.json();
      
      if (!currentFactor) {
        throw new Error(`Factor ${factorId} not found`);
      }
      
      // Ensure the tasks structure exists
      const tasks = {
        Identification: Array.isArray(currentFactor.tasks?.Identification) ? [...currentFactor.tasks.Identification] : [],
        Definition: Array.isArray(currentFactor.tasks?.Definition) ? [...currentFactor.tasks.Definition] : [],
        Delivery: Array.isArray(currentFactor.tasks?.Delivery) ? [...currentFactor.tasks.Delivery] : [],
        Closure: Array.isArray(currentFactor.tasks?.Closure) ? [...currentFactor.tasks.Closure] : []
      };
      
      // Update the task if it exists
      if (tasks[stage].length > taskIndex) {
        tasks[stage][taskIndex] = newText;
        
        // Update the factor with the modified tasks
        const updatedFactor = {
          ...currentFactor,
          tasks
        };
        
        // Send the update to the server
        const updateResponse = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
        return await updateResponse.json();
      } else {
        throw new Error(`Task index ${taskIndex} out of bounds for ${stage} stage`);
      }
    },
    onSuccess: () => {
      // Invalidate both the list and individual factor queries
      console.log('[ADMIN] Task updated successfully, invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/success-factors'] });
    }
  });
  
  const removeTaskMutation = useMutation({
    mutationFn: async ({ 
      factorId, 
      stage, 
      taskIndex 
    }: { 
      factorId: string, 
      stage: Stage, 
      taskIndex: number 
    }) => {
      console.log(`[ADMIN] Removing task at index ${taskIndex} from ${factorId} in ${stage} stage`);
      
      // Get current factor data
      const response = await apiRequest('GET', `/api/admin/success-factors/${factorId}`);
      const currentFactor = await response.json();
      
      if (!currentFactor) {
        throw new Error(`Factor ${factorId} not found`);
      }
      
      // Ensure the tasks structure exists
      const tasks = {
        Identification: Array.isArray(currentFactor.tasks?.Identification) ? [...currentFactor.tasks.Identification] : [],
        Definition: Array.isArray(currentFactor.tasks?.Definition) ? [...currentFactor.tasks.Definition] : [],
        Delivery: Array.isArray(currentFactor.tasks?.Delivery) ? [...currentFactor.tasks.Delivery] : [],
        Closure: Array.isArray(currentFactor.tasks?.Closure) ? [...currentFactor.tasks.Closure] : []
      };
      
      // Remove the task if it exists
      if (tasks[stage].length > taskIndex) {
        tasks[stage] = [
          ...tasks[stage].slice(0, taskIndex),
          ...tasks[stage].slice(taskIndex + 1)
        ];
        
        // Update the factor with the modified tasks
        const updatedFactor = {
          ...currentFactor,
          tasks
        };
        
        // Send the update to the server
        const updateResponse = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
        return await updateResponse.json();
      } else {
        throw new Error(`Task index ${taskIndex} out of bounds for ${stage} stage`);
      }
    },
    onSuccess: () => {
      // Invalidate both the list and individual factor queries
      console.log('[ADMIN] Task removed successfully, invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/success-factors'] });
    }
  });

  // Log diagnostic info
  if (factors) {
    console.log(`[ADMIN] Success factors loaded: ${factors.length}`);
    if (factors.length > 0) {
      console.log('[ADMIN] First factor tasks', factors[0].tasks);
      // Smoke test to verify task data structure across all factors
      const taskCounts: Record<string, {
        total: number;
        byStage: {
          Identification: number;
          Definition: number;
          Delivery: number;
          Closure: number;
        }
      }> = {};
      
      factors.forEach(factor => {
        // Add defensive check for missing tasks object
        if (!factor.tasks) {
          console.error('[ADMIN] Factor missing tasks property:', factor.id);
          taskCounts[factor.id] = { 
            total: 0, 
            byStage: { Identification: 0, Definition: 0, Delivery: 0, Closure: 0 } 
          };
          return;
        }
        
        const totalTasks = 
          (factor.tasks.Identification?.length || 0) + 
          (factor.tasks.Definition?.length || 0) + 
          (factor.tasks.Delivery?.length || 0) + 
          (factor.tasks.Closure?.length || 0);
        taskCounts[factor.id] = {
          total: totalTasks,
          byStage: {
            Identification: factor.tasks.Identification?.length || 0,
            Definition: factor.tasks.Definition?.length || 0,
            Delivery: factor.tasks.Delivery?.length || 0,
            Closure: factor.tasks.Closure?.length || 0
          }
        };
      });
      console.log('[ADMIN] Task counts by factor:', taskCounts);
    }
  }

  // Function to invalidate the cache after changes
  const invalidateCache = () => {
    console.log('[ADMIN] Manually invalidating cache');
    queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
    queryClient.refetchQueries({ queryKey: ['/api/admin/success-factors'] });
  };

  return {
    factors: factors || [],
    isLoading,
    error,
    refetch,
    invalidateCache,
    addTask: addTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    removeTask: removeTaskMutation.mutate,
    isAddingTask: addTaskMutation.isPending,
    isUpdatingTask: updateTaskMutation.isPending,
    isRemovingTask: removeTaskMutation.isPending
  };
}