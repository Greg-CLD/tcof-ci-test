import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface Project {
  id: number;
  name: string;
  description?: string;
  sector?: string;
  organisationId?: string;
}

export function useProject(projectId?: string | number) {
  const queryClient = useQueryClient();
  
  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId
  });

  const updateProject = async (updatedProject: Partial<Project>) => {
    if (!projectId) return null;
    
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedProject),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update project');
    }
    
    const updatedData = await response.json();
    
    // Update the cache with the new data
    queryClient.setQueryData(['/api/projects', projectId], updatedData);
    
    // Invalidate the projects list query to refresh it
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    
    return updatedData;
  };
  
  return {
    project,
    isLoading,
    error,
    updateProject
  };
}