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
      console.log('PATCH payload →', JSON.stringify(blockData, null, 2));

      // Log the JSON payload to be sent in the PATCH request
      console.log('Payload for PATCH /api/plans/project/:projectId/block/:blockId:', JSON.stringify(blockData, null, 2));

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

      // Log the JSON response from the PATCH request
      const result = await response.json();
      console.log('Response from PATCH /api/plans/project/:projectId/block/:blockId:', JSON.stringify(result, null, 2));

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