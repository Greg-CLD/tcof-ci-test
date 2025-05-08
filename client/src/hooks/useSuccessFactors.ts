import { useQuery } from '@tanstack/react-query';

export interface SuccessFactor {
  id: string;
  title: string;
  description: string;
}

export function useSuccessFactors() {
  const {
    data: successFactors,
    isLoading,
    error,
    refetch
  } = useQuery<SuccessFactor[]>({
    queryKey: ['/api/admin/success-factors'],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  return {
    successFactors: successFactors || [],
    isLoading,
    error,
    refetch
  };
}