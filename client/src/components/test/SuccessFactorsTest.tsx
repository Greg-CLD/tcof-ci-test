
import React from 'react';
import { useSuccessFactors } from '../../hooks/useSuccessFactors';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

export default function SuccessFactorsTest() {
  const { successFactors, isLoading, error, refetch } = useSuccessFactors();
  
  useEffect(() => {
    console.log('SuccessFactorsTest component mounted');
    // Log React Query config
    console.log('React Query config:', {
      queryKey: ['/api/success-factors'],
      staleTime: 0,
      refetchOnWindowFocus: true
    });
  }, []);

  console.log('SuccessFactorsTest component render');

  if (isLoading) {
    return <div>Loading success factors...</div>;
  }

  if (error) {
    return (
      <div>
        <Alert variant="destructive">
          Failed to load success factors
        </Alert>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!successFactors || successFactors.length === 0) {
    return (
      <div className="p-4 text-center">
        <Alert>No success factors available</Alert>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2>Success Factors ({successFactors.length})</h2>
      <Button onClick={() => refetch()} className="mb-4">
        Refresh Data
      </Button>
      
      <div className="grid gap-4">
        {successFactors.map(factor => (
          <div key={factor.id} className="border p-4 rounded">
            <h3>{factor.title}</h3>
            <p>{factor.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
