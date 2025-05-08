import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface HeuristicLink {
  id: string;
  heuristicId: string;
  factorId: string;
  projectId: string;
  userId: number;
  createdAt?: string;
  updatedAt?: string;
}

export function useHeuristicLinks(projectId?: string) {
  const queryClient = useQueryClient();
  
  // Query to fetch heuristic links for the project
  const { 
    data: links,
    isLoading,
    error,
    refetch
  } = useQuery<HeuristicLink[]>({
    queryKey: [`/api/projects/${projectId}/heuristic-links`],
    enabled: !!projectId,
  });
  
  // Mutation to create or update a heuristic link
  const updateLinkMutation = useMutation({
    mutationFn: async ({ heuristicId, factorId }: { heuristicId: string, factorId: string | null }) => {
      // If factorId is null, we're removing the link
      if (factorId === null) {
        // Find the existing link if any
        const existingLink = links?.find(link => link.heuristicId === heuristicId);
        if (existingLink) {
          // Delete the link
          const res = await apiRequest('DELETE', `/api/projects/${projectId}/heuristic-links/${existingLink.id}`);
          return await res.json();
        }
        return null;
      } else {
        // Find if there's already a link for this heuristic
        const existingLink = links?.find(link => link.heuristicId === heuristicId);
        
        if (existingLink) {
          // Update existing link
          const res = await apiRequest('PUT', `/api/projects/${projectId}/heuristic-links/${existingLink.id}`, { factorId });
          return await res.json();
        } else {
          // Create new link
          const res = await apiRequest('POST', `/api/projects/${projectId}/heuristic-links`, { 
            heuristicId,
            factorId
          });
          return await res.json();
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/heuristic-links`] });
    },
    onError: (error) => {
      console.error('Error updating heuristic link:', error);
      throw error;
    }
  });
  
  // Convenience functions for updating links
  const updateHeuristicLink = async (heuristicId: string, factorId: string | null) => {
    return await updateLinkMutation.mutateAsync({ heuristicId, factorId });
  };
  
  // Helper function to get the factor ID for a heuristic (if linked)
  const getFactorIdForHeuristic = (heuristicId: string) => {
    if (!links) return null;
    
    const link = links.find(link => link.heuristicId === heuristicId);
    return link ? link.factorId : null;
  };
  
  // Helper function to get all linked heuristic IDs
  const getLinkedHeuristics = () => {
    if (!links) return [];
    
    return links.map(link => link.heuristicId);
  };
  
  return {
    links,
    isLoading,
    error,
    refetch,
    updateHeuristicLink,
    getFactorIdForHeuristic,
    getLinkedHeuristics,
    isUpdating: updateLinkMutation.isPending,
  };
}