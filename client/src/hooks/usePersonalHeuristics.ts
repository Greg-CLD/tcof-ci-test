import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { type PersonalHeuristic } from '@shared/schema';

export function usePersonalHeuristics(projectId?: string) {
  const queryClient = useQueryClient();
  
  // Query to fetch personal heuristics for the project
  const { 
    data: heuristics,
    isLoading,
    error,
    refetch
  } = useQuery<PersonalHeuristic[]>({
    queryKey: [`/api/projects/${projectId}/heuristics`],
    enabled: !!projectId,
  });
  
  // Mutation to create a new heuristic
  const createHeuristicMutation = useMutation({
    mutationFn: async (heuristic: { name: string; description?: string; favourite?: boolean }) => {
      const res = await apiRequest(
        'POST', 
        `/api/projects/${projectId}/heuristics`, 
        heuristic
      );
      return await res.json();
    },
    onSuccess: () => {
      console.log('Successfully created heuristic, invalidating queries');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/heuristics`] });
    },
    onError: (error) => {
      console.error('Error creating heuristic:', error);
      throw error;
    }
  });
  
  // Mutation to update an existing heuristic
  const updateHeuristicMutation = useMutation({
    mutationFn: async ({ 
      heuristicId, 
      heuristic 
    }: { 
      heuristicId: string, 
      heuristic: { name: string; description?: string; favourite?: boolean } 
    }) => {
      const res = await apiRequest(
        'PUT', 
        `/api/projects/${projectId}/heuristics/${heuristicId}`, 
        heuristic
      );
      return await res.json();
    },
    onSuccess: () => {
      console.log('Successfully updated heuristic, invalidating queries');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/heuristics`] });
    },
    onError: (error) => {
      console.error('Error updating heuristic:', error);
      throw error;
    }
  });
  
  // Mutation to delete a heuristic
  const deleteHeuristicMutation = useMutation({
    mutationFn: async (heuristicId: string) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}/heuristics/${heuristicId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/heuristics`] });
    },
    onError: (error) => {
      console.error('Error deleting heuristic:', error);
      throw error;
    }
  });
  
  // Convenience functions
  const createHeuristic = async (text: string) => {
    return await createHeuristicMutation.mutateAsync(text);
  };
  
  const updateHeuristic = async (heuristicId: string, text: string) => {
    return await updateHeuristicMutation.mutateAsync({ heuristicId, text });
  };
  
  const deleteHeuristic = async (heuristicId: string) => {
    return await deleteHeuristicMutation.mutateAsync(heuristicId);
  };
  
  return {
    heuristics,
    isLoading,
    error,
    refetch,
    createHeuristic,
    updateHeuristic,
    deleteHeuristic,
    isCreating: createHeuristicMutation.isPending,
    isUpdating: updateHeuristicMutation.isPending,
    isDeleting: deleteHeuristicMutation.isPending,
  };
}