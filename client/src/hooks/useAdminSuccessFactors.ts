import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface AdminSuccessFactor {
  id: string;
  title: string;
  description: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

export function useAdminSuccessFactors() {
  console.log('[ADMIN] useAdminSuccessFactors hook initialized');
  const queryClient = useQueryClient();
  
  const {
    data: factors,
    isLoading,
    error,
    refetch
  } = useQuery<AdminSuccessFactor[]>({
    queryKey: ['/api/admin/success-factors'],
    staleTime: 0, // No caching - always fetch fresh data
    refetchOnWindowFocus: true,
  });

  // Log diagnostic info
  if (factors) {
    console.log(`[ADMIN] Success factors loaded: ${factors.length}`);
    if (factors.length > 0) {
      console.log('[ADMIN] First factor tasks', factors[0].tasks);
      // Smoke test to verify task data structure across all factors
      let taskCounts = {};
      factors.forEach(factor => {
        const totalTasks = 
          (factor.tasks.Identification?.length || 0) + 
          (factor.tasks.Definition?.length || 0) + 
          (factor.tasks.Delivery?.length || 0) + 
          (factor.tasks.Closure?.length || 0);
        taskCounts[factor.id] = {
          total: totalTasks,
          byStage: {
            Identification: factor.tasks.Identification?.length || 0,
            Definition: factor.tasks.Definition?.length || 0,
            Delivery: factor.tasks.Delivery?.length || 0,
            Closure: factor.tasks.Closure?.length || 0
          }
        };
      });
      console.log('[ADMIN] Task counts by factor:', taskCounts);
    }
  }

  // Function to invalidate the cache after changes
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
  };

  return {
    factors,
    isLoading,
    error,
    refetch,
    invalidateCache
  };
}