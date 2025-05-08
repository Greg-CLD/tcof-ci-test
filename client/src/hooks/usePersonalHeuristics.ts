import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PersonalHeuristic {
  id: string;
  text: string;
  projectId: string;
  userId: number;
  createdAt?: string;
  updatedAt?: string;
}

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
    mutationFn: async (text: string) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/heuristics`, { text });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/heuristics`] });
    },
    onError: (error) => {
      console.error('Error creating heuristic:', error);
      throw error;
    }
  });
  
  // Mutation to update an existing heuristic
  const updateHeuristicMutation = useMutation({
    mutationFn: async ({ heuristicId, text }: { heuristicId: string, text: string }) => {
      const res = await apiRequest('PUT', `/api/projects/${projectId}/heuristics/${heuristicId}`, { text });
      return await res.json();
    },
    onSuccess: () => {
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