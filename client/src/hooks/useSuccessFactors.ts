import { useQuery } from '@tanstack/react-query';

export interface SuccessFactor {
  id: string;
  factor: string; // This is the title/name in the API
  description: string;
  category?: string;
}

// Create a normalized interface that's consistent with our UI
export interface NormalizedSuccessFactor {
  id: string;
  title: string; // Renamed from 'factor' for UI consistency
  description: string;
  category?: string;
}

export function useSuccessFactors() {
  const {
    data: rawSuccessFactors,
    isLoading,
    error,
    refetch
  } = useQuery<SuccessFactor[]>({
    queryKey: ['/api/success-factors'],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  // Normalize the data to match our UI expectations
  const successFactors: NormalizedSuccessFactor[] = rawSuccessFactors 
    ? rawSuccessFactors.map(factor => ({
        id: factor.id,
        title: factor.factor, // Map 'factor' to 'title'
        description: factor.description,
        category: factor.category
      }))
    : [];

  return {
    successFactors,
    isLoading,
    error,
    refetch
  };
}