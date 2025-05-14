
import React from 'react';
import { useSuccessFactors } from '../../hooks/useSuccessFactors';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

export default function SuccessFactorsTest() {
  const { successFactors, isLoading, error, refetch } = useSuccessFactors();
  
  console.log('SuccessFactorsTest component render');

  if (isLoading) {
    return <div>Loading success factors...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        Failed to load success factors
        <Button onClick={() => refetch()}>Retry</Button>
      </Alert>
    );
  }

  if (!successFactors || successFactors.length === 0) {
    return <div>No success factors available</div>;
  }

  return (
    <div>
      <h2>Success Factors ({successFactors.length})</h2>
      <Button onClick={() => refetch()}>Refresh</Button>
      <ul>
        {successFactors.map(factor => (
          <li key={factor.id}>
            {factor.title} - {factor.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
