import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export interface Project {
  id: string;
  userId: number;
  name: string;
  description?: string;
  sector?: string;
  customSector?: string;
  orgType?: string;
  teamSize?: string;
  currentStage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  sector?: string;
  customSector?: string;
  orgType?: string;
  teamSize?: string;
  currentStage?: string;
}

export interface UpdateProjectParams {
  id: string;
  data: Partial<CreateProjectData>;
}

export function useProjects() {
  const queryClient = useQueryClient();
  
  // Fetch all projects for the current user
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Create a new project
  const createProject = useMutation({
    mutationFn: async (data: CreateProjectData): Promise<Project> => {
      const response = await apiRequest('POST', '/api/projects', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate projects query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create project: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update an existing project
  const updateProject = useMutation({
    mutationFn: async ({ id, data }: UpdateProjectParams): Promise<Project> => {
      const response = await apiRequest('PATCH', `/api/projects/${id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate projects query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update project: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete a project
  const deleteProject = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiRequest('DELETE', `/api/projects/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete project');
      }
    },
    onSuccess: () => {
      // Invalidate projects query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: 'Project Deleted',
        description: 'The project has been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete project: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
  };
}