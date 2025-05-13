import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Framework {
  id: string;
  code: string;
  name: string;
  description: string;
}

export function useFrameworks() {
  const { data: frameworks, isLoading, error } = useQuery({
    queryKey: ['/api/frameworks'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/frameworks');
      if (!res.ok) {
        throw new Error('Failed to fetch frameworks');
      }
      return await res.json();
    }
  });

  return {
    frameworks: frameworks || [],
    isLoading,
    error
  };
}