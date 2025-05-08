import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePlan } from "@/contexts/PlanContext";
import { useToast } from "@/hooks/use-toast";

export interface HeuristicLink {
  heuristicId: string;
  factorId: string | null;
}

export function useHeuristicLinks(projectId?: string) {
  const { plan, saveBlock } = usePlan();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch existing heuristic links
  const { data: heuristicLinks = [] } = useQuery<HeuristicLink[]>({
    queryKey: ["heuristicLinks", projectId],
    queryFn: async () => {
      if (!projectId || !plan) return [];
      
      // If we have heuristic links in the plan context, use those
      if (plan.blocks?.block2?.heuristicLinks) {
        return plan.blocks.block2.heuristicLinks;
      }
      
      return [];
    },
    enabled: !!projectId && !!plan,
  });
  
  // Mutation to update a heuristic link
  const updateHeuristicLinkMutation = useMutation({
    mutationFn: async (linkData: HeuristicLink) => {
      if (!projectId || !plan) {
        throw new Error("Project ID or plan not available");
      }
      
      // Get current links or initialize empty array
      const currentLinks = plan.blocks?.block2?.heuristicLinks || [];
      
      // Update or add the link
      const updatedLinks = [...currentLinks];
      const existingLinkIndex = updatedLinks.findIndex(
        link => link.heuristicId === linkData.heuristicId
      );
      
      if (existingLinkIndex >= 0) {
        updatedLinks[existingLinkIndex] = linkData;
      } else {
        updatedLinks.push(linkData);
      }
      
      // Save to plan context
      await saveBlock('block2', {
        heuristicLinks: updatedLinks,
        lastUpdated: new Date().toISOString(),
      });
      
      return updatedLinks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["heuristicLinks", projectId]});
      toast({
        title: "Link updated",
        description: "The heuristic mapping has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating link",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Function to update a heuristic link
  const updateHeuristicLink = async (heuristicId: string, factorId: string | null) => {
    await updateHeuristicLinkMutation.mutateAsync({ heuristicId, factorId });
  };
  
  // Function to get the factor ID for a heuristic
  const getFactorIdForHeuristic = (heuristicId: string): string | null => {
    const link = heuristicLinks.find(link => link.heuristicId === heuristicId);
    return link ? link.factorId : null;
  };
  
  // Function to get all linked heuristics
  const getLinkedHeuristics = (): string[] => {
    return heuristicLinks
      .filter(link => link.factorId !== null)
      .map(link => link.heuristicId);
  };
  
  return {
    heuristicLinks,
    updateHeuristicLink,
    getFactorIdForHeuristic,
    getLinkedHeuristics,
    isLoading: updateHeuristicLinkMutation.isPending
  };
}