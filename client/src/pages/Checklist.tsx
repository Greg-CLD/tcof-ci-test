import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SummaryBar from '@/components/checklist/SummaryBar';
import StageAccordion from '@/components/checklist/StageAccordion';
import { useToast } from '@/hooks/use-toast';
import { PlanRecord, loadPlan } from '@/lib/plan-db';
import { exportCSV, exportPDF, emailChecklist } from '@/lib/exportUtils';
import styles from '@/lib/styles/checklist.module.css';

export default function Checklist() {
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Load the plan data
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const loadedPlan = await loadPlan();
        if (!loadedPlan) {
          // No plan found, redirect to make-a-plan
          setLocation('/make-a-plan');
          return;
        }
        
        setPlan(loadedPlan);
      } catch (error) {
        console.error('Error loading plan:', error);
        toast({
          title: 'Error loading plan',
          description: 'There was a problem loading your plan. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlan();
  }, [setLocation, toast]);
  
  // Handle plan updates from child components
  const handlePlanUpdate = (updatedPlan: PlanRecord) => {
    setPlan(updatedPlan);
  };
  
  // Handle CSV export
  const handleExportCSV = () => {
    if (!plan) return;
    
    try {
      exportCSV(plan);
      toast({
        title: 'CSV export successful',
        description: 'Your checklist has been exported to CSV format.',
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: 'Export failed',
        description: 'There was a problem exporting your checklist.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      await exportPDF('checklist-content');
      toast({
        title: 'PDF export successful',
        description: 'Your checklist has been exported to PDF format.',
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Export failed',
        description: 'There was a problem exporting your checklist.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle email
  const handleEmailChecklist = () => {
    if (!plan) return;
    
    try {
      emailChecklist(plan);
    } catch (error) {
      console.error('Error opening email client:', error);
      toast({
        title: 'Email failed',
        description: 'There was a problem opening your email client.',
        variant: 'destructive',
      });
    }
  };
  
  // Check if all tasks are completed
  const allTasksCompleted = () => {
    if (!plan) return false;
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    Object.values(plan.stages).forEach(stage => {
      // Count regular tasks
      (stage.tasks || []).forEach(task => {
        totalTasks++;
        if (task.completed) completedTasks++;
      });
      
      // Count good practice tasks
      (stage.goodPractice?.tasks || []).forEach(task => {
        totalTasks++;
        if (task.completed) completedTasks++;
      });
    });
    
    return totalTasks > 0 && completedTasks === totalTasks;
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-tcof-light">
        <SiteHeader />
        <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-tcof-teal" />
            <h2 className="mt-4 text-xl font-semibold text-tcof-dark">Loading your checklist...</h2>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }
  
  // Render no plan state
  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col bg-tcof-light">
        <SiteHeader />
        <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-tcof-dark mb-4">No Plan Found</h2>
            <p className="text-gray-600 mb-6">You need to create a plan first before viewing your checklist.</p>
            <Button
              onClick={() => setLocation('/make-a-plan')}
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            >
              Create a Plan
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-tcof-light">
      <SiteHeader />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div id="checklist-content" className="max-w-4xl mx-auto">
          <div className={styles.pageTitle}>
            <h1 className={styles.pageTitleText}>
              {allTasksCompleted() && '🎉 '} Your Project Checklist
            </h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="ml-2 h-5 w-5 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tick items as you complete them. Changes save automatically.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <SummaryBar plan={plan} />
          
          {/* Stage accordions */}
          <StageAccordion
            stage="Identification"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          <StageAccordion
            stage="Definition"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          <StageAccordion
            stage="Delivery"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          <StageAccordion
            stage="Closure"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          
          {/* Export options */}
          <div className={styles.exportBar}>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
            >
              Export PDF
            </Button>
            <Button
              onClick={handleEmailChecklist}
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            >
              Email via Mail App
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}