import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ToolProgressData {
  completed?: boolean;
  timestamp?: number;
  data?: Record<string, any>;
}

interface ToolProgressStatus {
  toolId: string;
  categoryId: string;
  stepId: string;
  completed: boolean;
  timestamp: number;
  data?: Record<string, any>;
}

export function useToolProgress() {
  const queryClient = useQueryClient();
  
  // Query to fetch progress for a specific step
  const getStepProgress = (projectId: string, toolId: string, categoryId: string, stepId: string) => {
    return useQuery<ToolProgressStatus>({
      queryKey: [`/api/project-progress/${toolId}/${categoryId}/${stepId}`, projectId],
      queryFn: async () => {
        const res = await apiRequest('GET', `/api/project-progress/${toolId}/${categoryId}/${stepId}?projectId=${projectId}`);
        return await res.json();
      },
      retry: false,
    });
  };
  
  // Query to fetch tool status 
  const getToolStatus = (projectId: string, toolId: string) => {
    return useQuery<{ completed: boolean, steps: ToolProgressStatus[] }>({
      queryKey: [`/api/project-progress/${toolId}/status`, projectId],
      queryFn: async () => {
        const res = await apiRequest('GET', `/api/project-progress/${toolId}/status?projectId=${projectId}`);
        return await res.json();
      },
      retry: false,
    });
  };
  
  // Mutation to update progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ 
      projectId, 
      toolId, 
      categoryId, 
      stepId, 
      data 
    }: { 
      projectId: string;
      toolId: string;
      categoryId: string;
      stepId: string;
      data: ToolProgressData;
    }) => {
      const res = await apiRequest('POST', `/api/project-progress/${toolId}/${categoryId}/${stepId}/complete`, {
        projectId,
        ...data,
      });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: [`/api/project-progress/${variables.toolId}/${variables.categoryId}/${variables.stepId}`, variables.projectId]
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/project-progress/${variables.toolId}/status`, variables.projectId]
      });
    },
    onError: (error) => {
      console.error('Error updating tool progress:', error);
      throw error;
    }
  });
  
  // Convenience function for updating progress
  const updateToolProgress = async (
    projectId: string, 
    toolId: string, 
    stepId: string, 
    data: ToolProgressData,
    categoryId: string = 'default'
  ) => {
    return await updateProgressMutation.mutateAsync({
      projectId,
      toolId,
      categoryId,
      stepId,
      data
    });
  };
  
  return {
    getStepProgress,
    getToolStatus,
    updateToolProgress,
    isUpdating: updateProgressMutation.isPending,
  };
}