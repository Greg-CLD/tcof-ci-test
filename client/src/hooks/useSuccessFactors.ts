import { useQuery } from '@tanstack/react-query';

export interface SuccessFactor {
  id: string;
  factor: string;
  description: string;
  category?: string;
}

export interface NormalizedSuccessFactor {
  id: string;
  title: string;
  description: string;
  category?: string;
}

export function useSuccessFactors() {
  console.log('📊 useSuccessFactors hook initialized');

  const queryKey = ['/api/success-factors'];
  console.log('Query key:', queryKey);

  const {
    data: rawSuccessFactors,
    isLoading,
    error,
    refetch
  } = useQuery<SuccessFactor[]>({
    queryKey,
    staleTime: 0, // Force fresh network calls 
    refetchOnWindowFocus: true,
  });

  console.log('Fetching...', isLoading);
  console.log('Data:', rawSuccessFactors);
  console.log('Error:', error);

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


  const successFactors: NormalizedSuccessFactor[] = [];

  if (rawSuccessFactors) {
    rawSuccessFactors.forEach((factor: SuccessFactor) => {
      if (!factor.id || !factor.factor) {
        console.warn('📊 useSuccessFactors - Malformed factor data:', factor);
      }
      successFactors.push({
        id: factor.id,
        title: factor.factor,
        description: factor.description || '',
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