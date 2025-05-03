import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import ActionButtons from '@/components/plan/ActionButtons';
import IntroAccordion from '@/components/plan/IntroAccordion';
import { loadPlan, savePlan } from '@/lib/plan-db';
import { getLatestPlanId } from '@/lib/planHelpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Block3Deliver() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  
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
  
  const handleClearBlockRequest = () => {
    setClearConfirmOpen(true);
  };
  
  const handleClearBlockConfirmed = async () => {
    try {
      // Get the current plan
      const planId = await getLatestPlanId();
      if (!planId) {
        toast({
          title: "Error",
          description: "No active plan found",
          variant: "destructive"
        });
        setClearConfirmOpen(false);
        return;
      }
      
      // Load plan data
      const plan = await loadPlan(planId);
      if (!plan) {
        toast({
          title: "Error",
          description: "Failed to load plan data",
          variant: "destructive"
        });
        setClearConfirmOpen(false);
        return;
      }
      
      // Clear Block 3 data
      const updatedPlan = {
        ...plan, 
        stages: { 
          ...plan.stages,
          Delivery: {
            ...plan.stages.Delivery,
            mappings: [],
            tasks: [],
            policyTasks: [],
            frameworkTasks: [],
            customFrameworks: []
          },
          Closure: {
            ...plan.stages.Closure,
            mappings: [],
            tasks: [],
            policyTasks: [],
            frameworkTasks: [],
            customFrameworks: []
          }
        }
      };
      
      // Save the updated plan
      const success = await savePlan(planId, updatedPlan);
      
      if (success) {
        toast({
          title: "Block cleared",
          description: "All data for Block 3 has been reset",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to clear block data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error clearing block:', error);
      toast({
        title: "Error",
        description: "Failed to clear block data",
        variant: "destructive"
      });
    } finally {
      setClearConfirmOpen(false);
    }
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
          onClear={handleClearBlockRequest}
          showNext={true}
          showSkip={false}
          showClear={true}
        />
        
        {/* Clear Block Confirmation Dialog */}
        <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Block 3 Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all your tasks, mappings and framework customizations from Block 3.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleClearBlockConfirmed} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear Block
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}