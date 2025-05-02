import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import ActionButtons from '@/components/plan/ActionButtons';
import IntroAccordion from '@/components/plan/IntroAccordion';

export default function Block3Deliver() {
  const [_, setLocation] = useLocation();
  
  // Define steps for the progress bar
  const steps: Step[] = [
    { id: 'block-1', label: 'Block 1: Discover', completed: true },
    { id: 'block-2', label: 'Block 2: Design', completed: true },
    { id: 'block-3', label: 'Block 3: Deliver', completed: false },
  ];
  
  const handleBack = () => {
    setLocation('/make-a-plan/full/block-2');
  };
  
  const handleNext = () => {
    setLocation('/checklist');
  };
  
  const handleSkipToChecklist = () => {
    setLocation('/checklist');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <ProgressNav steps={steps} currentStepId="block-3" />
        
        <h1 className="text-3xl font-bold text-tcof-dark mb-6">Block 3: Deliver Your Plan</h1>
        
        <IntroAccordion title="From strategy to action">
          <p>
            This is a placeholder for the Block 3 content. This block will help you turn your
            strategy into actionable tasks and trackable metrics.
          </p>
        </IntroAccordion>
        
        <div className="bg-white p-6 rounded-lg border mb-8">
          <div className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-4 text-tcof-dark">Block 3 is under development</h2>
            <p className="text-gray-600 mb-6">
              The Deliver block is coming soon. You can go back to Block 2 or proceed to your checklist.
            </p>
          </div>
        </div>
        
        <ActionButtons 
          onPrevious={handleBack}
          onNext={handleNext}
          onSkip={handleSkipToChecklist}
          showNext={true}
          showSkip={false}
        />
      </div>
    </div>
  );
}