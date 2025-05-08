import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePlan } from "@/contexts/PlanContext";

export interface PersonalHeuristic {
  id: string;
  text: string;
}

export function usePersonalHeuristics(projectId?: string) {
  const { plan } = usePlan();
  
  return useQuery<PersonalHeuristic[]>({
    queryKey: ["personalHeuristics", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // If we have heuristics in the plan context, transform them into the expected format
      if (plan?.blocks?.block1?.personalHeuristics) {
        return plan.blocks.block1.personalHeuristics.map((text: string, index: number) => ({
          id: `heuristic-${index}`,
          text
        }));
      }
      
      // Fallback to fetching from API if needed in the future
      try {
        const res = await apiRequest("GET", `/api/plans/project/${projectId}/heuristics`);
        if (!res.ok) {
          return [];
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching personal heuristics:", error);
        return [];
      }
    },
    enabled: !!projectId && !!plan,
  });
}