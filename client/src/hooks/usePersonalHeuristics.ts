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
    staleTime: 30000, // 30 seconds before refetching
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes (formerly cacheTime in v4)
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
  const createHeuristic = async (nameOrHeuristic: string | { name: string; description?: string; favourite?: boolean }) => {
    // Convert string to heuristic object if needed
    const heuristic = typeof nameOrHeuristic === 'string' 
      ? { name: nameOrHeuristic } 
      : nameOrHeuristic;
    
    console.log('Creating heuristic:', heuristic);
    return await createHeuristicMutation.mutateAsync(heuristic);
  };
  
  const updateHeuristic = async (
    heuristicId: string, 
    nameOrHeuristic: string | { name: string; description?: string; favourite?: boolean }
  ) => {
    // Convert string to heuristic object if needed
    const heuristic = typeof nameOrHeuristic === 'string' 
      ? { name: nameOrHeuristic } 
      : nameOrHeuristic;
    
    console.log(`Updating heuristic ${heuristicId}:`, heuristic);
    return await updateHeuristicMutation.mutateAsync({ heuristicId, heuristic });
  };
  
  const deleteHeuristic = async (heuristicId: string) => {
    return await deleteHeuristicMutation.mutateAsync(heuristicId);
  };
  
  // Function to toggle favorite status
  const toggleFavorite = async (heuristicId: string, currentValue: boolean) => {
    if (!heuristics) {
      console.error('Heuristics not loaded yet');
      return;
    }
    
    // Type assertion to make TypeScript happy
    const foundHeuristic = heuristics.find((h: PersonalHeuristic) => h.id === heuristicId);
    if (!foundHeuristic) {
      console.error('Heuristic not found:', heuristicId);
      return;
    }
    
    return await updateHeuristic(heuristicId, {
      name: foundHeuristic.name,
      description: foundHeuristic.description ? String(foundHeuristic.description) : '',
      favourite: !currentValue
    });
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