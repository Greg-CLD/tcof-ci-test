import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface ProjectTask {
  id?: string;
  projectId: string;
  text: string;
  stage: 'identification' | 'definition' | 'delivery' | 'closure';
  origin: 'heuristic' | 'factor';
  sourceId: string; // heuristicId or factorId
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useProjectTasks(projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch tasks for the project
  const { data: tasks = [], isLoading, error } = useQuery<ProjectTask[]>({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const res = await apiRequest("GET", `/api/projects/${projectId}/tasks`);
      if (!res.ok) {
        throw new Error("Failed to fetch project tasks");
      }
      return res.json();
    },
    enabled: !!projectId,
  });
  
  // Create or update a task
  const saveTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      
      // Make the API request
      const res = await apiRequest("POST", `/api/projects/${projectId}/tasks`, taskData);
      if (!res.ok) {
        throw new Error("Failed to save task");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate the tasks query to trigger a refetch
      queryClient.invalidateQueries({queryKey: ["project-tasks", projectId]});
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving task",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      
      const res = await apiRequest("DELETE", `/api/projects/${projectId}/tasks/${taskId}`);
      if (!res.ok) {
        throw new Error("Failed to delete task");
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["project-tasks", projectId]});
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Get tasks for a specific heuristic and stage
  const getTasksForHeuristic = (heuristicId: string, stage: string) => {
    return tasks.filter(
      task => task.sourceId === heuristicId && 
              task.origin === 'heuristic' && 
              task.stage === stage
    );
  };
  
  // Save a task
  const saveTask = async (taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    return saveTaskMutation.mutateAsync(taskData);
  };
  
  // Delete a task
  const deleteTask = async (taskId: string) => {
    return deleteTaskMutation.mutateAsync(taskId);
  };
  
  return {
    tasks,
    isLoading,
    error,
    getTasksForHeuristic,
    saveTask,
    deleteTask,
    isSaving: saveTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending
  };
}