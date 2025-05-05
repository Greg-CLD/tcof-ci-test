import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Outcome } from "@/components/outcomes/OutcomeSelectorModal";
import { type OutcomeProgress } from "@/components/outcomes/OutcomeProgressTracker";

interface UseOutcomesProps {
  projectId: string;
}

export function useOutcomes({ projectId }: UseOutcomesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  
  // Define response types for API endpoints
  interface OutcomesResponse {
    selectedOutcomeIds: string[];
    customOutcomes: Outcome[];
  }
  
  // Fetch selected outcomes and custom outcomes
  const { 
    data: outcomesData, 
    isLoading: isLoadingOutcomes,
    isError: isOutcomesError,
    error: outcomesError
  } = useQuery<OutcomesResponse>({
    queryKey: [`/api/projects/${projectId}/outcomes`],
    enabled: !!projectId,
  });
  
  // Fetch outcome progress
  const { 
    data: progressData = [],
    isLoading: isLoadingProgress,
    isError: isProgressError,
    error: progressError
  } = useQuery<OutcomeProgress[]>({
    queryKey: [`/api/projects/${projectId}/outcomes/progress`],
    enabled: !!projectId,
  });
  
  // Fetch goal map outcomes
  const { 
    data: goalMapOutcomes = [],
    isLoading: isLoadingGoalMapOutcomes,
  } = useQuery<Outcome[]>({
    queryKey: ['/api/goal-maps/outcomes'],
    enabled: !!projectId,
  });
  
  // Mutation to update selected outcomes
  const selectOutcomesMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/projects/${projectId}/outcomes`, 
        { selectedOutcomeIds: selectedIds }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outcomes`] });
      toast({
        title: "Outcomes updated",
        description: "Your tracked outcomes have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update outcomes",
        description: error.message || "An error occurred while updating outcomes.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to create a custom outcome
  const createOutcomeMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest(
        "POST", 
        `/api/projects/${projectId}/outcomes`, 
        { title, level: "custom" }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outcomes`] });
      toast({
        title: "Custom outcome created",
        description: "Your custom outcome has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create outcome",
        description: error.message || "An error occurred while creating the outcome.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update outcome progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ outcomeId, value }: { outcomeId: string; value: number }) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/projects/${projectId}/outcomes/${outcomeId}`, 
        { value }
      );
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outcomes/progress`] });
      
      // Update the local state with the server response
      setProgressValues(prev => ({
        ...prev,
        [data.outcomeId]: data.value
      }));
      
      toast({
        title: "Progress saved",
        description: `Updated ${findOutcomeTitle(data.outcomeId)}: ${data.value}%`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save progress",
        description: error.message || "An error occurred while saving progress.",
        variant: "destructive",
      });
    },
  });
  
  // Helper to find an outcome's title by ID
  const findOutcomeTitle = (outcomeId: string): string => {
    const selectedOutcomes = getSelectedOutcomes();
    const outcome = selectedOutcomes.find(o => o.id === outcomeId);
    return outcome?.title || "Outcome";
  };
  
  // Initialize progress values from the latest progress data
  useEffect(() => {
    const values: Record<string, number> = {};
    
    // Group progress by outcomeId and get the latest entry for each
    const latestProgressByOutcome = progressData.reduce((acc, progress) => {
      if (!acc[progress.outcomeId] || new Date(progress.updatedAt) > new Date(acc[progress.outcomeId].updatedAt)) {
        acc[progress.outcomeId] = progress;
      }
      return acc;
    }, {} as Record<string, OutcomeProgress>);
    
    // Set the values
    Object.values(latestProgressByOutcome).forEach(progress => {
      values[progress.outcomeId] = progress.value;
    });
    
    setProgressValues(values);
  }, [progressData]);
  
  // Prepare the list of selected outcomes
  const getSelectedOutcomes = (): Outcome[] => {
    if (!outcomesData || !outcomesData.selectedOutcomeIds) return [];
    
    const selectedIds = new Set(outcomesData.selectedOutcomeIds);
    const customOutcomes = outcomesData.customOutcomes || [];
    const allOutcomes = [...goalMapOutcomes, ...customOutcomes];
    
    return allOutcomes.filter(outcome => selectedIds.has(outcome.id));
  };
  
  const selectedOutcomes = getSelectedOutcomes();
  
  // Get the latest progress data for each outcome
  const getLatestProgress = (): Record<string, OutcomeProgress> => {
    return progressData.reduce((acc, progress) => {
      if (!acc[progress.outcomeId] || new Date(progress.updatedAt) > new Date(acc[progress.outcomeId].updatedAt)) {
        acc[progress.outcomeId] = progress;
      }
      return acc;
    }, {} as Record<string, OutcomeProgress>);
  };
  
  return {
    // Data
    selectedOutcomes,
    progressValues,
    latestProgress: getLatestProgress(),
    allGoalMapOutcomes: goalMapOutcomes,
    customOutcomes: outcomesData?.customOutcomes || [],
    selectedOutcomeIds: outcomesData?.selectedOutcomeIds || [],
    
    // Loading states
    isLoading: isLoadingOutcomes || isLoadingProgress || isLoadingGoalMapOutcomes,
    isError: isOutcomesError || isProgressError,
    error: outcomesError || progressError,
    
    // Mutations
    selectOutcomes: (selectedIds: string[]) => selectOutcomesMutation.mutate(selectedIds),
    createOutcome: (title: string) => createOutcomeMutation.mutate(title),
    updateProgress: (outcomeId: string, value: number) => 
      updateProgressMutation.mutate({ outcomeId, value }),
      
    // Mutation states
    isUpdatingProgress: updateProgressMutation.isPending,
    isSelectingOutcomes: selectOutcomesMutation.isPending,
    isCreatingOutcome: createOutcomeMutation.isPending,
  };
}