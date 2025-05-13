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
  console.log('📊 useSuccessFactors hook initialized');
  
  const {
    data: rawSuccessFactors,
    isLoading,
    error,
    refetch
  } = useQuery<SuccessFactor[]>({
    queryKey: ['/api/success-factors'],
    staleTime: 1000, // 1 second cache
    refetchOnWindowFocus: true,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Log diagnostic info but directly without effects
  if (rawSuccessFactors) {
    console.log(`📊 useSuccessFactors - Successfully fetched ${rawSuccessFactors.length} success factors`);
    if (rawSuccessFactors.length > 0) {
      console.log('📊 First success factor sample:', rawSuccessFactors[0]);
    }
  }

  if (error) {
    console.error('📊 useSuccessFactors - Error fetching success factors:', error);
  }

  // Normalize the data to match our UI expectations
  const successFactors: NormalizedSuccessFactor[] = [];
  
  if (rawSuccessFactors) {
    rawSuccessFactors.forEach((factor: SuccessFactor) => {
      if (!factor.id || !factor.factor) {
        console.warn('📊 useSuccessFactors - Malformed factor data:', factor);
      }
      
      successFactors.push({
        id: factor.id,
        title: factor.factor, // Map 'factor' to 'title'
        description: factor.description || '', // Ensure description has a default
        category: factor.category
      });
    });
    
    console.log(`📊 useSuccessFactors - Normalized ${successFactors.length} success factors`);
    
    if (successFactors.length > 0 && rawSuccessFactors && successFactors.length !== rawSuccessFactors.length) {
      console.warn('📊 useSuccessFactors - Count mismatch between raw and normalized data');
    }
  }

  return {
    successFactors,
    isLoading,
    error,
    refetch
  };
}