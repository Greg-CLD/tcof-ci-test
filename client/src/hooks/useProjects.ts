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
    onSuccess: (newProject) => {
      // Invalidate projects query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Also add the new project to the query cache
      queryClient.setQueryData(['/api/projects', newProject.id], newProject);
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
      const response = await apiRequest('PUT', `/api/projects/${id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }
      
      return response.json();
    },
    onSuccess: (updatedProject) => {
      // Invalidate projects query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Also invalidate the specific project query to update ProjectContext
      queryClient.invalidateQueries({ queryKey: ['/api/projects', updatedProject.id] });
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
  
  /**
   * Checks if a project's profile is complete with all required fields
   * @param project The project to check
   * @returns boolean indicating if the project profile is complete
   */
  const isProjectProfileComplete = (project: Project): boolean => {
    // Check for required fields
    if (!project.name || project.name.trim() === '') {
      return false;
    }
    
    if (!project.sector || project.sector.trim() === '') {
      return false;
    }
    
    // For 'other' sector, customSector is required
    if (project.sector === 'other' && (!project.customSector || project.customSector.trim() === '')) {
      return false;
    }
    
    if (!project.orgType || project.orgType.trim() === '') {
      return false;
    }
    
    if (!project.currentStage || project.currentStage.trim() === '') {
      return false;
    }
    
    return true;
  };
  
  /**
   * Get the currently selected project from localStorage
   * @returns The selected project or undefined if none selected
   */
  const getSelectedProject = (): Project | undefined => {
    const selectedProjectId = localStorage.getItem('selectedProjectId');
    if (!selectedProjectId) return undefined;
    
    return projects.find(p => p.id === selectedProjectId);
  };
  
  /**
   * Checks if the selected project has a complete profile
   * @returns boolean indicating if the selected project's profile is complete
   */
  const isSelectedProjectProfileComplete = (): boolean => {
    const selectedProject = getSelectedProject();
    if (!selectedProject) return false;
    
    return isProjectProfileComplete(selectedProject);
  };
  
  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    isProjectProfileComplete,
    getSelectedProject,
    isSelectedProjectProfileComplete,
  };
}