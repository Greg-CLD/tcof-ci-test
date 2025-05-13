import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

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
    refetchOnMount: true, // Always fetch fresh data on mount
  });

  // Force a refetch when the hook is initialized (on component mount)
  useEffect(() => {
    console.log('[ADMIN] Forcing initial refetch of success factors');
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Log diagnostic info
  if (factors) {
    console.log(`[ADMIN] Success factors loaded: ${factors.length}`);
    if (factors.length > 0) {
      console.log('[ADMIN] First factor tasks', factors[0].tasks);
      // Smoke test to verify task data structure across all factors
      const taskCounts: Record<string, {
        total: number;
        byStage: {
          Identification: number;
          Definition: number;
          Delivery: number;
          Closure: number;
        }
      }> = {};
      
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