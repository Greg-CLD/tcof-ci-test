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
      completed: boolean;
    };
    block2?: {
      tasks: any[];
      stakeholders: any[];
      completed: boolean;
    };
    block3?: {
      timeline: any;
      deliveryApproach: string;
      deliveryNotes: string;
      completed: boolean;
    };
  };
  createdAt?: string;
  updatedAt?: string;
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
        const res = await apiRequest("GET", `/api/plans/${projectId}`);
        if (!res.ok) {
          // If no plan exists yet, return a default empty plan structure
          if (res.status === 404) {
            return {
              projectId,
              blocks: {
                block1: {
                  successFactors: [],
                  personalHeuristics: [],
                  completed: false
                },
                block2: {
                  tasks: [],
                  stakeholders: [],
                  completed: false
                },
                block3: {
                  timeline: null,
                  deliveryApproach: "",
                  deliveryNotes: "",
                  completed: false
                }
              }
            };
          }
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
      const response = await apiRequest(
        planData.id ? "PUT" : "POST",
        planData.id ? `/api/plans/${planData.id}` : "/api/plans",
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
  
  // Save just one block of the plan
  const saveBlock = async (blockId: string, blockData: any) => {
    if (!plan) return;
    
    const updatedPlan = {
      ...plan,
      blocks: {
        ...plan.blocks,
        [blockId]: {
          ...plan.blocks[blockId as keyof typeof plan.blocks],
          ...blockData
        }
      }
    };
    
    await savePlan(updatedPlan);
  };
  
  // Mark a block as complete
  const markBlockComplete = async (blockId: string) => {
    if (!plan) return;
    
    const updatedPlan = {
      ...plan,
      blocks: {
        ...plan.blocks,
        [blockId]: {
          ...plan.blocks[blockId as keyof typeof plan.blocks],
          completed: true
        }
      }
    };
    
    await savePlan(updatedPlan);
    
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