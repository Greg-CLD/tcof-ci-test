import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type SaveProgressOptions = {
  /**
   * The URL to save data to
   */
  url: string;
  
  /**
   * HTTP method to use (defaults to POST)
   */
  method?: 'POST' | 'PATCH' | 'PUT';
  
  /**
   * Query keys to invalidate after successful save
   */
  invalidateKeys: string[][];
  
  /**
   * Optional callback function that transforms the data before sending
   */
  transformData?: (data: any) => any;
  
  /**
   * Success message title (defaults to "Progress saved")
   */
  successTitle?: string;
  
  /**
   * Success message description (defaults to "Your changes have been saved successfully")
   */
  successDescription?: string;
  
  /**
   * Error message title (defaults to "Failed to save")
   */
  errorTitle?: string;
  
  /**
   * Error message description (defaults to "There was an error saving your changes")
   */
  errorDescription?: string;
  
  /**
   * Show a saving message (defaults to true)
   */
  showSavingMessage?: boolean;
};

/**
 * A hook for saving progress consistently across the application
 */
export function useSaveProgress(options: SaveProgressOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      setIsSaving(true);
      
      if (options.showSavingMessage !== false) {
        toast({
          title: "Saving progress...",
          description: "Your changes are being saved.",
        });
      }
      
      const transformedData = options.transformData ? options.transformData(data) : data;
      
      const response = await apiRequest(
        options.method || 'POST',
        options.url,
        transformedData
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save progress');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      options.invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      toast({
        title: options.successTitle || "Progress saved",
        description: options.successDescription || "Your changes have been saved successfully",
      });
      
      setIsSaving(false);
    },
    onError: (error: Error) => {
      toast({
        title: options.errorTitle || "Failed to save",
        description: options.errorDescription || `There was an error saving your changes: ${error.message}`,
        variant: "destructive",
      });
      
      setIsSaving(false);
    }
  });
  
  const saveProgress = async (data: any) => {
    return saveMutation.mutateAsync(data);
  };
  
  return {
    saveProgress,
    isSaving
  };
}

/**
 * A specialized version of useSaveProgress for plan data
 */
export function usePlanSaveProgress(projectId: string | undefined, blockId?: string) {
  // Don't proceed if projectId is not available
  if (!projectId) {
    return {
      saveProgress: async () => {
        throw new Error('Project ID is required');
      },
      isSaving: false
    };
  }
  
  const options: SaveProgressOptions = blockId 
    ? {
        url: `/api/plans/project/${projectId}/block/${blockId}`,
        method: 'PATCH',
        invalidateKeys: [['plan', projectId]],
      }
    : {
        url: '/api/plans',
        method: 'POST',
        invalidateKeys: [['plan', projectId]],
      };
  
  return useSaveProgress(options);
}

/**
 * A specialized version of useSaveProgress for tool progress
 */
export function useToolProgressSave(projectId: string | undefined, toolName: string, stepName: string) {
  // Don't proceed if any required values are missing
  if (!projectId || !toolName || !stepName) {
    return {
      saveProgress: async () => {
        throw new Error('Project ID, tool name, and step name are required');
      },
      isSaving: false
    };
  }
  
  const options: SaveProgressOptions = {
    url: `/api/projects/${projectId}/progress`,
    method: 'POST',
    invalidateKeys: [['project', projectId], ['progress', projectId]],
    transformData: (data) => ({
      toolName,
      stepName,
      ...data
    })
  };
  
  return useSaveProgress(options);
}