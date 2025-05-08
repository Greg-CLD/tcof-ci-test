import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface FactorTask {
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

export function useFactors() {
  const [factors, setFactors] = useState<FactorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadFactors = async () => {
      try {
        // Uncomment to test error handling
        // throw new Error('Test error');
        
        setLoading(true);
        setError(null);
        
        const response = await apiRequest('GET', '/api/factors');
        if (!response.ok) {
          throw new Error('Failed to load success factors');
        }
        
        const data = await response.json();
        console.log('Loaded factors:', data);
        setFactors(data);
      } catch (error) {
        console.error('Error loading success factors:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        
        toast({
          title: 'Error',
          description: 'Failed to load success factors. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadFactors();
  }, [toast]);

  return { factors, loading, error };
}