import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface ResonanceEvaluation {
  id: string;
  projectId: number;
  factorId: string;
  resonance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationInput {
  factorId: string;
  resonance: number;
  notes?: string;
}

export function useResonanceRatings(projectId?: string | number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle null or undefined projectId
  const projectQueryKey = projectId ? ['/api/projects', projectId, 'success-factor-ratings'] : null;
  
  // Fetch evaluations
  const {
    data: evaluations,
    isLoading,
    error,
    refetch
  } = useQuery<ResonanceEvaluation[]>({
    queryKey: projectQueryKey,
    enabled: !!projectId, // Only run query if projectId exists
  });
  
  // Save evaluations mutation
  const saveEvaluationsMutation = useMutation({
    mutationFn: async (evaluationsData: EvaluationInput[]) => {
      if (!projectId) throw new Error('Project ID is required');
      
      const res = await apiRequest(
        'PUT', 
        `/api/projects/${projectId}/success-factor-ratings`,
        evaluationsData
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
        description: 'Factor evaluations saved successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving evaluations',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Helper to get an evaluation for a specific factor
  const getEvaluationForFactor = (factorId: string): ResonanceEvaluation | undefined => {
    return evaluations?.find(evaluation => evaluation.factorId === factorId);
  };
  
  // Helper to update a single evaluation
  const updateSingleEvaluation = async (evaluation: EvaluationInput): Promise<void> => {
    await saveEvaluationsMutation.mutateAsync([evaluation]);
  };
  
  // Helper to update multiple evaluations at once
  const updateEvaluations = async (evaluationsData: EvaluationInput[]): Promise<void> => {
    await saveEvaluationsMutation.mutateAsync(evaluationsData);
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