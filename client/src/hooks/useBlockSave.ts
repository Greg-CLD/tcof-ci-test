import { useMutation } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to save block data for a specific project
 * This handles optimistic updates, API calls, and error handling
 */
export function useBlockSave() {
  const { projectId } = useParams<{ projectId?: string }>();
  const { toast } = useToast();
  
  const mutation = useMutation({
    mutationFn: async ({ blockId, blockData }: { blockId: string, blockData: any }) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      console.info(`[SAVE] useBlockSave.mutationFn - Saving ${blockId} for project ${projectId}`);
      console.info(`[SAVE] useBlockSave.mutationFn - Data:`, blockData);
      
      // If saving personal heuristics, ensure each one has proper id/fields
      if (blockData.personalHeuristics && Array.isArray(blockData.personalHeuristics)) {
        console.info(`[SAVE] useBlockSave.mutationFn - Processing ${blockData.personalHeuristics.length} heuristics`);
        
        // Deep clone to avoid reference issues
        const clonedHeuristics = JSON.parse(JSON.stringify(blockData.personalHeuristics));
        
        // Ensure every heuristic has an ID and all required fields
        blockData.personalHeuristics = clonedHeuristics.map((h: any, index: number) => {
          const id = h.id || `h-${Date.now()}-${index}`;
          return {
            id,
            name: h.name || h.text || `Heuristic ${index + 1}`,
            description: h.description || h.notes || '',
            text: h.text || h.name || `Heuristic ${index + 1}`,
            notes: h.notes || h.description || '',
            favourite: !!h.favourite,
          };
        });
        
        console.info(`[SAVE] useBlockSave.mutationFn - Processed heuristics:`, blockData.personalHeuristics);
      }
      
      // If saving success factor ratings, ensure no undefined keys
      if (blockData.successFactorRatings && typeof blockData.successFactorRatings === 'object') {
        const cleanedRatings: Record<string, number> = {};
        let invalidKeysFound = false;
        
        for (const [key, value] of Object.entries(blockData.successFactorRatings)) {
          if (key && key !== 'undefined' && key !== 'null') {
            cleanedRatings[key] = Number(value);
          } else {
            invalidKeysFound = true;
            console.warn(`[SAVE] useBlockSave.mutationFn - Removing invalid rating key: "${key}"`);
          }
        }
        
        if (invalidKeysFound) {
          console.info(`[SAVE] useBlockSave.mutationFn - Cleaned success factor ratings`);
          blockData.successFactorRatings = cleanedRatings;
        }
      }
      
      const response = await apiRequest(
        'PATCH',
        `/api/plans/project/${projectId}/block/${blockId}`,
        blockData
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SAVE] useBlockSave.mutationFn - Error: ${errorText}`);
        throw new Error(`Failed to save block: ${response.statusText}`);
      }
      
      // Parse the response
      const result = await response.json();
      console.info(`[SAVE] useBlockSave.mutationFn - Success:`, result);
      
      // Return the full response which includes blockData
      return result;
    },
    onMutate: ({ blockId, blockData }) => {
      console.info(`[SAVE] useBlockSave.onMutate - Optimistically updating UI for ${blockId}`);
      
      // Cancel outgoing refetches
      queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot current value
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      
      // Optimistically update
      queryClient.setQueryData(['plan', projectId], (old: any) => {
        if (!old) return old;
        
        // Create a deep clone of the updated blocks to avoid reference issues
        const updatedBlocks = {
          ...old.blocks,
          [blockId]: {
            ...old.blocks?.[blockId],
            ...JSON.parse(JSON.stringify(blockData)),
            lastUpdated: new Date().toISOString()
          }
        };
        
        return {
          ...old,
          blocks: updatedBlocks
        };
      });
      
      // Show pending toast for immediate feedback
      toast({
        title: 'Saving changes...',
        description: 'Your changes are being saved.',
      });
      
      return { previousPlan };
    },
    onSuccess: (data) => {
      console.info(`[SAVE] useBlockSave.onSuccess - Save completed`);
      
      // If we have a blockData field in the response, update the cache with it
      if (data.blockData) {
        const { blockId } = data;
        
        console.info(`[SAVE] useBlockSave.onSuccess - Updating cache with server data for ${blockId}`);
        
        // Update the cache with the actual data from the server
        queryClient.setQueryData(['plan', projectId], (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            id: data.id, // Ensure plan ID is updated
            blocks: {
              ...old.blocks,
              [blockId]: data.blockData
            },
            lastUpdated: data.lastUpdated
          };
        });
      }
      
      toast({
        title: 'Success',
        description: 'Your changes have been saved.',
      });
    },
    onError: (error, variables, context) => {
      // Roll back on error
      if (context?.previousPlan) {
        console.info(`[SAVE] useBlockSave.onError - Rolling back changes`);
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      console.error('[SAVE] useBlockSave.onError - Error saving block:', error);
      toast({
        title: 'Error',
        description: `Failed to save changes: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Invalidate query to ensure data is fresh
      console.info(`[SAVE] useBlockSave.onSettled - Refreshing data`);
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  return {
    saveBlock: ({ blockId, blockData }: { blockId: string, blockData: any }) => {
      console.info(`[SAVE] useBlockSave.saveBlock - Called for ${blockId}`);
      return mutation.mutateAsync({ blockId, blockData });
    },
    isLoading: mutation.isPending,
    error: mutation.error
  };
}