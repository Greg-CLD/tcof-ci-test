import React from 'react';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';

export default function MakeAPlanFull() {
  const { blockId } = useParams();
  
  // Define the steps for the full configuration
  const steps: Step[] = [
    { id: 'block-1', label: 'Block 1', completed: false },
    { id: 'block-2', label: 'Block 2', completed: false },
    { id: 'block-3', label: 'Block 3', completed: false },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-tcof-blue mb-4">Full Configuration</h1>
        
        <ProgressNav 
          steps={steps} 
          currentStepId={blockId || 'block-1'} 
        />
        
        <div className="p-6 border border-gray-200 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {blockId === 'block-1' && 'Block 1: Initial Planning'}
            {blockId === 'block-2' && 'Block 2: Resource Allocation'}
            {blockId === 'block-3' && 'Block 3: Implementation Strategy'}
          </h2>
          
          <p className="mb-4">This is a placeholder for the {blockId} configuration screen.</p>
          
          <p className="italic text-gray-500 mb-6">
            In the final implementation, this would contain form fields and configuration options
            specific to this block of the planning process.
          </p>
        </div>
      </div>
    </div>
  );
}