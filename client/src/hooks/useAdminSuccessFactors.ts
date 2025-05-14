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

// Helper function to clean and filter null values from task arrays
function cleanTaskArray(tasks: any[]): string[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter(task => task !== null && task !== undefined && task !== "");
}

// Helper function to normalize factor task structure
function normalizeFactorTasks(factor: any): AdminSuccessFactor {
  if (!factor) return null;
  
  // Make sure tasks object exists with proper stage arrays
  const normalizedTasks = {
    Identification: cleanTaskArray(factor.tasks?.Identification || []),
    Definition: cleanTaskArray(factor.tasks?.Definition || []),
    Delivery: cleanTaskArray(factor.tasks?.Delivery || []),
    Closure: cleanTaskArray(factor.tasks?.Closure || [])
  };
  
  return {
    id: factor.id,
    title: factor.title || '',
    description: factor.description || '',
    tasks: normalizedTasks
  };
}

export function useAdminSuccessFactors() {
  console.log('[ADMIN] useAdminSuccessFactors hook initialized');
  const queryClient = useQueryClient();
  
  const {
    data: rawFactors,
    isLoading,
    error,
    refetch
  } = useQuery<any[]>({
    queryKey: ['/api/admin/success-factors'],
    staleTime: 0, // No caching - always fetch fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always fetch fresh data on mount
  });

  // Process and normalize the task arrays
  const factors = rawFactors?.map(normalizeFactorTasks).filter(Boolean) || [];

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