import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface ResonanceRating {
  id: string;
  projectId: number;
  factorId: string;
  resonance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingInput {
  factorId: string;
  resonance: number;
  notes?: string;
}

export function useResonanceRatings(projectId?: string | number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle null or undefined projectId
  const projectQueryKey = projectId ? ['/api/projects', projectId, 'success-factor-ratings'] : null;
  
  // Fetch ratings
  const {
    data: ratings,
    isLoading,
    error,
    refetch
  } = useQuery<ResonanceRating[]>({
    queryKey: projectQueryKey,
    enabled: !!projectId, // Only run query if projectId exists
  });
  
  // Save ratings mutation
  const saveRatingsMutation = useMutation({
    mutationFn: async (ratingsData: RatingInput[]) => {
      if (!projectId) throw new Error('Project ID is required');
      
      const res = await apiRequest(
        'PUT', 
        `/api/projects/${projectId}/success-factor-ratings`,
        ratingsData
      );
      
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      if (projectQueryKey) {
        queryClient.invalidateQueries({ queryKey: projectQueryKey });
      }
      
      toast({
        title: 'Success',
        description: 'Factor ratings saved successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving ratings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Helper to get a rating for a specific factor
  const getRatingForFactor = (factorId: string): ResonanceRating | undefined => {
    return ratings?.find(rating => rating.factorId === factorId);
  };
  
  // Helper to update a single rating
  const updateSingleRating = async (rating: RatingInput): Promise<void> => {
    await saveRatingsMutation.mutateAsync([rating]);
  };
  
  // Helper to update multiple ratings at once
  const updateRatings = async (ratingsData: RatingInput[]): Promise<void> => {
    await saveRatingsMutation.mutateAsync(ratingsData);
  };
  
  return {
    ratings: ratings || [],
    isLoading,
    error,
    isSaving: saveRatingsMutation.isPending,
    saveError: saveRatingsMutation.error,
    refetch,
    getRatingForFactor,
    updateSingleRating,
    updateRatings,
  };
}