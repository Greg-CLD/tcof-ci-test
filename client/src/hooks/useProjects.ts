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
  organisationId?: string;
  isProfileComplete?: boolean;
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
  isProfileComplete?: boolean;
}

export interface UpdateProjectParams {
  id: string;
  data: Partial<CreateProjectData> & { isProfileComplete?: boolean };
}

/**
 * Hook to fetch a single project by ID with full details
 */
export function useProject(projectId?: string) {
  const enabled = !!projectId;

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      // Use the correct endpoint for single project retrieval
      const response = await apiRequest("GET", `/api/projects/${projectId}`);
      if (!response.ok) {
        console.error(`Failed to fetch project details: ${response.status}`);
        const errorData = await response.json().catch(() => ({message: 'Unknown error'}));
        throw new Error(errorData.message || 'Failed to fetch project details');
      }
      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes,
    retry: 2, // Retry failed requests up to 2 times
  });

  return {
    project,
    isLoading,
    error,
  };
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
      console.log(`Updating project with ID ${id} and data:`, data);
      // NOTE: The response is already checked in apiRequest, so we don't need to check again
      const response = await apiRequest('PUT', `/api/projects/${id}`, data);

      // Log the response to help with debugging
      console.log(`Update project response:`, response);

      // We don't check response.ok again because apiRequest already does that
      return response.json();
    },
    onSuccess: (updatedProject) => {
      // Ensure localStorage is updated with the correct project ID
      const selectedProjectId = localStorage.getItem('selectedProjectId');
      if (!selectedProjectId || selectedProjectId === updatedProject.id) {
        localStorage.setItem('selectedProjectId', updatedProject.id);
      }

      // Invalidate projects query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      // Also invalidate the specific project query to update ProjectContext
      queryClient.invalidateQueries({ queryKey: ['/api/projects', updatedProject.id] });

      // Update the project in the cache directly to ensure immediate consistency
      queryClient.setQueryData(['/api/projects', updatedProject.id], updatedProject);

      // Also update the project in the projects array in the cache
      const projects = queryClient.getQueryData<Project[]>(['/api/projects']);
      if (projects) {
        const updatedProjects = projects.map(p => 
          p.id === updatedProject.id ? updatedProject : p
        );
        queryClient.setQueryData(['/api/projects'], updatedProjects);
      }

      toast({
        title: 'Project Updated',
        description: 'The project has been successfully updated.',
      });
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
      console.log(`Deleting project with ID ${id}`);
      // apiRequest will throw an error if the response is not ok
      await apiRequest('DELETE', `/api/projects/${id}`);
      console.log(`Project deleted successfully`);
    },
    onSuccess: () => {
      // Invalidate projects query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Redirect will be handled by the component that calls this
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
    // First check if we have the flag set in the database
    if (project.isProfileComplete === true) {
      return true;
    }

    // Otherwise, fall back to checking required fields
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
   * Gets the missing profile fields for a project
   * @param project The project to check
   * @returns Array of field names that are missing
   */
  const getMissingProfileFields = (project: Project): string[] => {
    const missingFields = [];

    if (!project.name || project.name.trim() === '') {
      missingFields.push('name');
    }

    if (!project.sector || project.sector.trim() === '') {
      missingFields.push('sector');
    }

    if (project.sector === 'other' && (!project.customSector || project.customSector.trim() === '')) {
      missingFields.push('custom sector');
    }

    if (!project.orgType || project.orgType.trim() === '') {
      missingFields.push('organization type');
    }

    if (!project.currentStage || project.currentStage.trim() === '') {
      missingFields.push('current stage');
    }

    return missingFields;
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

  /**
   * Sets the currently selected project ID in localStorage
   * @param id The project ID to set as selected
   */
  const setSelectedProjectId = (id: string) => {
    localStorage.setItem('selectedProjectId', id);
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  };

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    isProjectProfileComplete,
    getMissingProfileFields,
    getSelectedProject,
    isSelectedProjectProfileComplete,
    setSelectedProjectId,
  };
}