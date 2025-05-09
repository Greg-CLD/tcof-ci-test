/**
 * Custom hook for reliable block data persistence in Make-a-Plan
 * Implements the same robust save pattern used in Goal-Mapping
 */
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Type for the data structure received from API
export interface BlockSaveResponse {
  id: string;
  blocks: Record<string, any>;
  logs?: any;
  [key: string]: any;
}

// Define supported block IDs
export type BlockId = "block1" | "block2" | "block3";

// Interface for block data to be saved
export interface BlockData {
  [key: string]: any;
}

// Local storage helpers for fallback persistence
const LOCAL_STORAGE_KEY_PREFIX = "tcof_block_";

function saveLocalStorageBlock(blockId: BlockId, projectId: string, data: BlockData): void {
  const key = `${LOCAL_STORAGE_KEY_PREFIX}${projectId}_${blockId}`;
  localStorage.setItem(key, JSON.stringify({
    blockId,
    projectId,
    data,
    timestamp: Date.now()
  }));
}

function getLocalStorageBlock(blockId: BlockId, projectId: string): BlockData | null {
  const key = `${LOCAL_STORAGE_KEY_PREFIX}${projectId}_${blockId}`;
  const item = localStorage.getItem(key);
  if (!item) return null;
  
  try {
    const parsed = JSON.parse(item);
    return parsed.data;
  } catch (error) {
    console.error(`Error parsing block data from localStorage for ${blockId}:`, error);
    return null;
  }
}

/**
 * Hook for reliably saving block data with proper error handling and fallback
 */
export function useBlockSave(blockId: BlockId, projectId: string | undefined) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Mutation for saving block data
  const saveBlockMutation = useMutation({
    mutationFn: async (data: BlockData) => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }
      
      setIsSaving(true);
      
      // Always save to localStorage as fallback
      saveLocalStorageBlock(blockId, projectId, data);
      
      // Prepare the API payload
      const payload = {
        projectId,
        blockId,
        blockData: data,
      };
      
      console.log(`🔶 SAVE BLOCK ${blockId} - Sending payload:`, JSON.stringify(payload, null, 2));
      
      // Send the data to the server
      const response = await apiRequest("PATCH", `/api/plans/${projectId}/block/${blockId}`, data);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔶 SAVE BLOCK ${blockId} - Failed with status ${response.status}: ${errorText}`);
        throw new Error(`Failed to save ${blockId}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`🔶 SAVE BLOCK ${blockId} - Success. Response:`, JSON.stringify(result, null, 2));
      return result;
    },
    onSuccess: (data) => {
      console.log(`🔶 SAVE BLOCK ${blockId} - Successfully saved block data`);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/plans/${projectId}/block/${blockId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plans/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plans`] });
      
      toast({
        title: "Progress saved",
        description: `${blockId.replace("block", "Block ")} has been saved successfully.`,
      });
    },
    onError: (error: Error) => {
      console.error(`🔶 SAVE BLOCK ${blockId} - Error:`, error);
      
      // Check if we have a local fallback saved
      const localData = getLocalStorageBlock(blockId, projectId || "");
      if (localData) {
        console.log(`🔶 SAVE BLOCK ${blockId} - Fallback data available in localStorage`);
      }
      
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });
  
  /**
   * Save block data with proper error handling
   */
  const saveBlock = async (data: BlockData) => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      await saveBlockMutation.mutateAsync(data);
      return true;
    } catch (error) {
      // Error is already handled in onError
      return false;
    }
  };
  
  /**
   * Mark block as complete
   */
  const markBlockComplete = async (data: BlockData) => {
    // Add the completed flag
    const updatedData = {
      ...data,
      completed: true
    };
    
    return await saveBlock(updatedData);
  };
  
  /**
   * Load block data with fallback to localStorage
   */
  const loadBlockData = (): BlockData | null => {
    if (!projectId) return null;
    
    // Try to get from localStorage
    return getLocalStorageBlock(blockId, projectId);
  };
  
  return {
    saveBlock,
    markBlockComplete,
    loadBlockData,
    isSaving
  };
}