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

// Export these functions for external use
export function getLocalStorageBlock(blockId: BlockId, projectId: string): BlockData | null {
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

export function saveLocalStorageBlock(blockId: BlockId, projectId: string, data: BlockData): void {
  const key = `${LOCAL_STORAGE_KEY_PREFIX}${projectId}_${blockId}`;
  localStorage.setItem(key, JSON.stringify({
    blockId,
    projectId,
    data,
    timestamp: Date.now()
  }));
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
      
      // Special handling for personal heuristics to ensure they're properly saved
      if (data.personalHeuristics) {
        // Deep clone them for safety
        data = {
          ...data,
          personalHeuristics: JSON.parse(JSON.stringify(data.personalHeuristics))
        };
        
        // Verify they have the correct structure
        console.info(`🔍 [SAVE-HOOK] HEURISTICS CHECK: Found ${data.personalHeuristics.length} personal heuristics to save`);
        console.info(`📋 [SAVE-HOOK] Operation: VERIFY HEURISTICS`);
        console.info(`📋 [SAVE-HOOK] Count: ${data.personalHeuristics.length}`);
        console.info(`📋 [SAVE-HOOK] Array Type: ${Array.isArray(data.personalHeuristics) ? 'Valid Array' : 'NOT AN ARRAY!'}`);
        console.info(`📋 [SAVE-HOOK] BlockId: ${blockId}`);
        console.info(`📋 [SAVE-HOOK] ProjectId: ${projectId}`);
        
        if (data.personalHeuristics.length > 0) {
          const sample = data.personalHeuristics[0];
          console.info(`🔍 [SAVE-HOOK] HEURISTICS STRUCTURE CHECK: First heuristic:`, JSON.stringify(sample, null, 2));
          console.info(`🔍 [SAVE-HOOK] First heuristic has properties:`, Object.keys(sample).join(', '));
        }
      } else {
        console.warn(`⚠️ [SAVE-HOOK] No personalHeuristics found in save data!`);
      }
      
      // Always save to localStorage as fallback first
      saveLocalStorageBlock(blockId, projectId, data);
      console.info(`🔶 [SAVE-HOOK] Saved to localStorage as fallback`);
      
      // Verify localStorage backup worked
      const localBackup = getLocalStorageBlock(blockId, projectId);
      if (localBackup?.personalHeuristics) {
        console.info(`✅ [SAVE-HOOK] Verified localStorage backup contains ${localBackup.personalHeuristics.length} heuristics`);
      } else {
        console.warn(`⚠️ [SAVE-HOOK] LocalStorage backup may have failed - no heuristics found!`);
      }
      
      // Prepare the API payload
      const payload = {
        projectId,
        blockId,
        blockData: data,
      };
      
      console.info(`🔶 [SAVE-HOOK] Sending payload to server:`, JSON.stringify(payload, null, 2));
      
      // Send the data to the server
      console.info(`🔶 [SAVE-HOOK] Sending PATCH request to /api/plans/project/${projectId}/block/${blockId}`);
      
      // Debug pre-save - especially for personal heuristics
      if (data.personalHeuristics) {
        console.info(`🔍 [SAVE-HOOK] Personal heuristics API payload:`, 
          JSON.stringify(data.personalHeuristics, null, 2));
      }
      
      // Log the queryKey being used for cache invalidation
      console.info(`🔑 [SAVE-HOOK] Using query key for invalidation: ["project-block", "${projectId}", "${blockId}"]`);
      
      const response = await apiRequest("PATCH", `/api/plans/project/${projectId}/block/${blockId}`, data);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [SAVE-HOOK] API request failed with status ${response.status}: ${errorText}`);
        throw new Error(`Failed to save ${blockId}: ${errorText}`);
      }
      
      const result = await response.json();
      console.info(`✅ [SAVE-HOOK] API request succeeded with response:`, JSON.stringify(result, null, 2));
      
      // Check if server returned the expected data structure
      if (result.blockData) {
        console.info(`✅ [SAVE-HOOK] Server returned blockData in response`);
        if (result.blockData.personalHeuristics) {
          console.info(`✅ [SAVE-HOOK] Server returned ${result.blockData.personalHeuristics.length} heuristics in response`);
          console.info(`📊 [SAVE-HOOK] First server-returned heuristic:`, 
            result.blockData.personalHeuristics.length > 0 ? 
              JSON.stringify(result.blockData.personalHeuristics[0], null, 2) : 'none');
        } else {
          console.warn(`⚠️ [SAVE-HOOK] Server response missing personalHeuristics!`);
        }
      } else {
        console.warn(`⚠️ [SAVE-HOOK] Server did not return blockData in response!`);
      }
      
      // Double check the localStorage save occurred
      const storedData = getLocalStorageBlock(blockId, projectId);
      console.info(`🔍 [SAVE-HOOK] LocalStorage verification after API save:`, 
        storedData ? 'Data found' : 'NO DATA FOUND', 
        storedData?.personalHeuristics ? 
          `(${storedData.personalHeuristics.length} heuristics)` : 'No heuristics found');
          
      return result;
    },
    onSuccess: (data) => {
      console.info(`✅ [SAVE-HOOK] Successfully saved block data (onSuccess callback)`);
      console.info(`📋 [SAVE-HOOK] Operation: SAVE SUCCESS`);
      console.info(`📋 [SAVE-HOOK] BlockId: ${blockId}`);
      console.info(`📋 [SAVE-HOOK] ProjectId: ${projectId}`);
      console.info(`📋 [SAVE-HOOK] Response: ${data ? 'Data returned' : 'No data returned'}`);
      console.info(`📋 [SAVE-HOOK] Next: Invalidating queries`);
      
      // Invalidate relevant queries to refresh data using a consistent query key pattern
      // Main specific block query key for this block
      console.info(`🔄 [SAVE-HOOK] Invalidating primary query: ["project-block", "${projectId}", "${blockId}"]`);
      queryClient.invalidateQueries({ queryKey: ["project-block", projectId, blockId] });
      
      // Legacy path-based query keys for backward compatibility
      console.info(`🔄 [SAVE-HOOK] Invalidating legacy query paths for compatibility`);
      queryClient.invalidateQueries({ queryKey: [`/api/plans/project/${projectId}/block/${blockId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plans/project/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plans`] });
      
      // Verify the block data in React Query cache was refreshed
      const cachedData = queryClient.getQueryData(["project-block", projectId, blockId]);
      console.info(`🔍 [SAVE-HOOK] Query cache after invalidation:`, 
        cachedData ? 'Cached data exists' : 'No cached data yet');
      
      if (cachedData && (cachedData as any).personalHeuristics) {
        console.info(`✅ [SAVE-HOOK] Cache contains ${(cachedData as any).personalHeuristics.length} heuristics`);
      }
      
      toast({
        title: "Progress saved",
        description: `${blockId.replace("block", "Block ")} has been saved successfully.`,
      });
    },
    onError: (error: Error) => {
      console.error(`❌ [SAVE-HOOK] Error in save operation:`, error);
      console.info(`📋 [SAVE-HOOK] Operation: SAVE ERROR`);
      console.info(`📋 [SAVE-HOOK] BlockId: ${blockId}`);
      console.info(`📋 [SAVE-HOOK] ProjectId: ${projectId}`);
      console.info(`📋 [SAVE-HOOK] Error: ${error.message}`);
      console.info(`📋 [SAVE-HOOK] Next: Checking localStorage fallback`);
      
      // Check if we have a local fallback saved
      const localData = getLocalStorageBlock(blockId, projectId || "");
      if (localData) {
        console.info(`🛟 [SAVE-HOOK] Fallback data available in localStorage`);
        if (localData.personalHeuristics) {
          console.info(`🛟 [SAVE-HOOK] Fallback contains ${localData.personalHeuristics.length} heuristics`);
        }
      } else {
        console.warn(`⚠️ [SAVE-HOOK] No fallback data available in localStorage!`);
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