import React, { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Define plan data structure
export interface PlanData {
  id?: string;
  projectId: string;
  blocks: {
    block1?: {
      successFactors: any[];
      personalHeuristics: any[];
      successFactorRatings?: {[key: string]: number};
      successCriteria?: string;
      lastUpdated?: string;
      completed: boolean;
    };
    block2?: {
      tasks: any[];
      stakeholders: any[];
      heuristicLinks?: any[];
      completed: boolean;
    };
    block3?: {
      timeline: any;
      deliveryApproach: string;
      deliveryNotes: string;
      frameworks?: {
        selectedFrameworkCodes: string[];
        projectSize: string;
        pathClarity: string;
      };
      frameworkTasks?: Array<{
        taskId: string;
        frameworkCode: string;
        stage: string;
        included: boolean;
        addedAt: string;
      }>;
      completed: boolean;
    };
  };
  createdAt?: string;
  updatedAt?: string;
  source?: string; // Source of the plan (used for debugging)
  lastUpdated?: number; // Last updated timestamp
}

// Define the context type
interface PlanContextType {
  plan: PlanData | null;
  isLoading: boolean;
  error: Error | null;
  savePlan: (planData: PlanData) => Promise<void>;
  saveBlock: (blockId: string, blockData: any) => Promise<void>;
  markBlockComplete: (blockId: string) => Promise<void>;
}

// Create the context
const PlanContext = createContext<PlanContextType | null>(null);

// Create a hook for using the plan context
export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}

// Create the provider component
export const PlanProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const { projectId } = useParams<{ projectId?: string }>();
  const { toast } = useToast();
  
  // Fetch the plan data for the current project
  const { data: plan, isLoading, error } = useQuery<PlanData | null>({
    queryKey: ["plan", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      try {
        const res = await apiRequest("GET", `/api/plans/project/${projectId}`);
        if (!res.ok) {
          if (res.status === 401) {
            console.warn("Authentication required to fetch plan");
            // Return an empty plan structure for unauthenticated users
            return {
              projectId,
              blocks: {}
            };
          }
          console.error(`Failed to fetch plan: ${res.status} ${res.statusText}`);
          return null;
        }
        
        return await res.json();
      } catch (err) {
        console.error("Error fetching plan:", err);
        return null;
      }
    },
    enabled: !!projectId
  });
  
  // Mutation to save the entire plan
  const savePlanMutation = useMutation({
    mutationFn: async (planData: PlanData) => {
      // Always use POST as our API handles both create and update
      const response = await apiRequest(
        "POST",
        "/api/plans",
        planData
      );
      
      if (!response.ok) {
        throw new Error("Failed to save plan");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["plan", projectId]});
      toast({
        title: "Plan saved",
        description: "Your plan has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving plan",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Save the entire plan
  const savePlan = async (planData: PlanData) => {
    await savePlanMutation.mutateAsync(planData);
  };
  
  // Mutation for updating just one block
  const saveBlockMutation = useMutation({
    mutationFn: async ({ planId, blockId, blockData }: { planId: string, blockId: string, blockData: any }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/plans/${planId}/block/${blockId}`,
        blockData
      );
      
      if (!response.ok) {
        throw new Error(`Failed to save block ${blockId}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["plan", projectId]});
      toast({
        title: "Block saved",
        description: "Your changes have been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving block",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Save just one block of the plan
  const saveBlock = async (blockId: string, blockData: any) => {
    if (!plan) return;
    
    // Use proper logging to trace the data flow
    console.info(`[SAVE] PlanContext.saveBlock - Saving ${blockId} for project ${projectId}`);
    
    if (blockData.personalHeuristics) {
      console.info(`[SAVE] PlanContext.saveBlock - Saving ${blockData.personalHeuristics.length} personal heuristics`);
    }
    
    if (plan.id) {
      // If the plan already exists, use the PATCH endpoint for the specific block
      console.info(`[SAVE] PlanContext.saveBlock - Plan exists with ID ${plan.id}, using PATCH endpoint`);
      await saveBlockMutation.mutateAsync({
        planId: plan.id,
        blockId,
        blockData
      });
    } else {
      // If the plan doesn't exist yet, use the project-block endpoint which handles both create and update
      console.info(`[SAVE] PlanContext.saveBlock - Plan doesn't exist yet (no ID), using project-block endpoint`);
      
      try {
        // This endpoint creates the plan if needed
        const response = await apiRequest(
          "PATCH", 
          `/api/plans/project/${projectId}/block/${blockId}`,
          blockData
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[SAVE] Error saving block via project-block endpoint: ${errorText}`);
          throw new Error(`Failed to save ${blockId}: ${errorText}`);
        }
        
        const result = await response.json();
        console.info(`[SAVE] Block saved via project-block endpoint, received ID: ${result.id || 'null'}`);
        
        // Invalidate queries to refresh the plan data
        queryClient.invalidateQueries({queryKey: ["plan", projectId]});
        
        toast({
          title: "Block saved",
          description: "Your changes have been saved successfully",
        });
      } catch (error) {
        console.error(`[SAVE] Error in saveBlock:`, error);
        toast({
          title: "Error saving block",
          description: (error as Error).message,
          variant: "destructive",
        });
        throw error;
      }
    }
  };
  
  // Mark a block as complete
  const markBlockComplete = async (blockId: string) => {
    if (!plan) return;
    
    // Use the saveBlock function that will either use PATCH for an existing plan
    // or POST for a new plan
    await saveBlock(blockId, { completed: true });
    
    toast({
      title: "Block completed",
      description: `Block ${blockId.replace('block', '')} has been marked as complete`,
    });
  };
  
  return (
    <PlanContext.Provider value={{
      plan: plan || null,
      isLoading,
      error: error as Error | null,
      savePlan,
      saveBlock,
      markBlockComplete
    }}>
      {children}
    </PlanContext.Provider>
  );
};