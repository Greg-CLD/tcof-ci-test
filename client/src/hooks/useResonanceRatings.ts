import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ResonanceEvaluation, EvaluationInput } from '@shared/types';

export function useResonanceRatings(projectId?: string | number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle null or undefined projectId
  const projectQueryKey = projectId ? ['/api/projects', projectId, 'success-factor-ratings'] : [];
  
  // Fetch evaluations
  const {
    data: evaluations,
    isLoading,
    error,
    refetch
  } = useQuery<ResonanceEvaluation[]>({
    queryKey: projectId ? projectQueryKey : ['disabled-ratings-query'],
    enabled: !!projectId, // Only run query if projectId exists
  });
  
  // Save evaluations mutation
  const saveEvaluationsMutation = useMutation({
    mutationFn: async (evaluationsData: EvaluationInput[]) => {
      if (!projectId) throw new Error('Project ID is required');
      
      console.log('🔄 useResonanceRatings - saving evaluations for projectId:', projectId);
      console.log('🔍 incoming payload:', evaluationsData);

      // First get existing ratings to include IDs
      const existingRatings = evaluations || [];
      const ratingWithIds = evaluationsData.map(newRating => {
        const existing = existingRatings.find(e => e.factorId === newRating.factorId);
        return {
          ...newRating,
          id: existing?.id // Include ID if rating exists
        };
      });
      
      const toCreate = ratingWithIds.filter(e => !e.id);
      console.log('🆕 toCreate (no id):', toCreate);
      const toUpdate = ratingWithIds.filter(e => e.id);
      console.log('♻️ toUpdate (has id):', toUpdate);
      
      // Build payload items with or without id
      const payload = evaluationsData.map(input => {
        const existing = evaluations?.find(e => e.factorId === input.factorId);
        return existing?.id
          ? { id: existing.id, factorId: input.factorId, resonance: input.resonance }
          : { factorId: input.factorId, resonance: input.resonance };
      });

      // Split into create and update arrays
      const toCreate = payload.filter(p => !p.id);
      const toUpdate = payload.filter(p => p.id);

      let results = [];

      // Handle new ratings with POST
      if (toCreate.length > 0) {
        const createRes = await apiRequest(
          'POST',
          `/api/projects/${projectId}/success-factor-ratings`,
          toCreate
        );
        const createJson = await createRes.json();
        results = results.concat(createJson);
      }

      // Handle updates with PUT
      if (toUpdate.length > 0) {
        const updateRes = await apiRequest(
          'PUT',
          `/api/projects/${projectId}/success-factor-ratings`,
          toUpdate
        );
        const updateJson = await updateRes.json();
        results = results.concat(updateJson);
      }

      console.log('🔄 useResonanceRatings - server response:', results);
      return results;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      console.log('🔄 useResonanceRatings - mutation success, invalidating query cache');
      if (projectQueryKey) {
        queryClient.invalidateQueries({ queryKey: projectQueryKey });
      }
      
      toast({
        title: 'Success',
        description: 'Factor evaluations saved successfully',
      });
    },
    onError: (error: any) => {
      console.error('🔴 useResonanceRatings - save error:', error);
      
      // Try to extract detailed error message if available
      let errorMessage = 'Failed to save evaluations';
      
      if (error.message) {
        // Direct error message
        errorMessage = error.message;
        console.error('🔴 useResonanceRatings - error.message:', error.message);
      }
      
      if (error.response) {
        try {
          const responseData = error.response.json();
          console.error('🔴 useResonanceRatings - error.response:', responseData);
          if (responseData.error) errorMessage = responseData.error;
        } catch (e) {
          console.error('🔴 useResonanceRatings - error parsing response JSON');
        }
      }
      
      toast({
        title: 'Error saving evaluations',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
  
  // Helper to get an evaluation for a specific factor
  const getEvaluationForFactor = (factorId: string): ResonanceEvaluation | undefined => {
    return evaluations?.find((evaluation: ResonanceEvaluation) => evaluation.factorId === factorId);
  };
  
  // Helper to update a single evaluation
  const updateSingleEvaluation = async (evaluation: EvaluationInput): Promise<void> => {
    console.log('🔄 updateSingleEvaluation called with:', evaluation);
    await saveEvaluationsMutation.mutateAsync([evaluation]);
    console.log('🔄 updateSingleEvaluation completed successfully');
  };
  
  // Helper to update multiple evaluations at once
  const updateEvaluations = async (evaluationsData: EvaluationInput[]): Promise<void> => {
    console.log('🔄 updateEvaluations called with', evaluationsData.length, 'evaluations');
    
    // Validate and filter empty or invalid evaluations
    const validEvaluations = evaluationsData.filter(evaluation => {
      return (
        evaluation.factorId && 
        evaluation.factorId !== 'undefined' &&
        typeof evaluation.resonance === 'number' && 
        evaluation.resonance >= 1 && 
        evaluation.resonance <= 5
      );
    });

    if (validEvaluations.length === 0) {
      console.warn('⚠️ No valid evaluations to save');
      return;
    }

    console.log('🔄 updateEvaluations - saving', validEvaluations.length, 'valid evaluations');
    await saveEvaluationsMutation.mutateAsync(validEvaluations);
    console.log('🔄 updateEvaluations completed successfully');
  };
  
  return {
    ratings: evaluations || [], // Keep original key for backward compatibility
    isLoading,
    error,
    isSaving: saveEvaluationsMutation.isPending,
    saveError: saveEvaluationsMutation.error,
    refetch,
    getRatingForFactor: getEvaluationForFactor, // Keep original method for backward compatibility
    updateSingleRating: updateSingleEvaluation, // Keep original method for backward compatibility
    updateRatings: updateEvaluations, // Keep original method for backward compatibility
    // Also provide new method names for forward compatibility
    evaluations: evaluations || [],
    getEvaluationForFactor,
    updateSingleEvaluation,
    updateEvaluations
  };
}