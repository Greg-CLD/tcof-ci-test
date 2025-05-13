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
      console.log('[ADMIN] factor tasks', factors);
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