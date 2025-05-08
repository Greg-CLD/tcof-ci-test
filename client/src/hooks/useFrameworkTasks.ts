import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types for framework tasks
export interface FrameworkTask {
  id: string;
  name: string;
  description: string;
}

export interface Framework {
  tasks: FrameworkTask[];
}

export interface FrameworksData {
  frameworks: Record<string, Framework>;
  savedTasks: SavedTask[];
}

export interface SavedTask {
  taskId: string;
  frameworkCode: string;
  stage: string;
  included: boolean;
  addedAt: string;
}

export interface SaveTaskParams {
  projectId: string;
  taskId: string;
  frameworkCode: string;
  stage: string;
  included: boolean;
}

/**
 * Hook to fetch and manage framework tasks
 */
export function useFrameworkTasks(projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to fetch framework tasks
  const { 
    data: frameworkTasks,
    isLoading,
    error,
    refetch
  } = useQuery<FrameworksData>({
    queryKey: ['project-framework-tasks', projectId],
    queryFn: async () => {
      if (!projectId) return { frameworks: {}, savedTasks: [] };
      
      const res = await apiRequest('GET', `/api/projects/${projectId}/framework-tasks`);
      if (!res.ok) {
        throw new Error('Failed to fetch framework tasks');
      }
      
      return res.json();
    },
    enabled: !!projectId,
  });

  // Mutation to save framework task
  const saveTaskMutation = useMutation({
    mutationFn: async ({ projectId, taskId, frameworkCode, stage, included }: SaveTaskParams) => {
      const res = await apiRequest(
        'POST',
        `/api/projects/${projectId}/framework-tasks`,
        { taskId, frameworkCode, stage, included }
      );
      
      if (!res.ok) {
        throw new Error('Failed to save task');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-framework-tasks', projectId] });
    },
    onError: (error) => {
      console.error('Error saving framework task:', error);
      toast({
        title: 'Error',
        description: 'Failed to save framework task',
        variant: 'destructive',
      });
    }
  });

  // Get included tasks (those marked for inclusion in the checklist)
  const getIncludedTasks = () => {
    if (!frameworkTasks?.savedTasks) return [];
    
    return frameworkTasks.savedTasks.filter(task => task.included);
  };

  // Get tasks by stage
  const getTasksByStage = (stage: string) => {
    if (!frameworkTasks?.savedTasks) return [];
    
    return frameworkTasks.savedTasks.filter(task => 
      task.included && task.stage === stage
    );
  };

  // Get original task details by ID and framework code
  const getTaskDetails = (taskId: string, frameworkCode: string): FrameworkTask | undefined => {
    if (!frameworkTasks?.frameworks) return undefined;
    
    const framework = frameworkTasks.frameworks[frameworkCode];
    if (!framework) return undefined;
    
    return framework.tasks.find(task => task.id === taskId);
  };

  // Convenience function to save a task
  const saveTask = async (params: SaveTaskParams) => {
    await saveTaskMutation.mutateAsync(params);
  };

  return {
    frameworkTasks,
    isLoading,
    error,
    refetch,
    saveTask,
    getIncludedTasks,
    getTasksByStage,
    getTaskDetails,
    isSaving: saveTaskMutation.isPending,
  };
}