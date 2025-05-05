import React, { useState, useEffect } from 'react';
import { PlanRecord, loadPlan, savePlan } from '@/lib/plan-db';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CircleX, Download, FileText, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SummaryBar from '@/components/checklist/SummaryBar';
import FactorAccordion from '@/components/checklist/FactorAccordion';
import { useToast } from '@/hooks/use-toast';
import { exportPlanPDF, exportCSV } from '@/lib/exportUtils';
import { usePlan } from '@/contexts/PlanContext';

export default function FactorChecklist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedPlanId } = usePlan();
  
  // Plan state
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'factors'>('factors'); // Set 'factors' as default
  
  // Load plan data when component mounts
  useEffect(() => {
    setLoading(true);
    if (!selectedPlanId) {
      setLoading(false);
      return;
    }
    
    loadPlan(selectedPlanId)
      .then(pl => {
        setPlan(pl || null);
      })
      .catch(err => {
        console.error('Error loading plan:', err);
        toast({
          title: "Error loading plan",
          description: "There was a problem loading your plan data.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [selectedPlanId, toast]);
  
  // Handle plan update
  const handlePlanUpdate = (updatedPlan: PlanRecord) => {
    setPlan(updatedPlan);
  };
  
  // Handle exporting the plan
  const handleExportPDF = () => {
    if (!plan) return;
    
    exportPlanPDF(plan);
    
    toast({
      title: "Checklist Exported",
      description: "Your checklist has been exported as a PDF.",
    });
  };
  
  const handleExportCSV = () => {
    if (!plan) return;
    
    exportCSV(plan);
    
    toast({
      title: "Checklist Exported",
      description: "Your checklist has been exported as a CSV file.",
    });
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-tcof-teal animate-spin" />
          <p className="text-tcof-dark font-medium">Loading your plan...</p>
        </div>
      </div>
    );
  }
  
  // No plan state
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <CircleX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-tcof-dark mb-2">No Plan Found</h2>
          <p className="text-gray-600 mb-6">
            You need to create a plan first before accessing your task checklist.
          </p>
          <Button asChild>
            <Link to="/make-a-plan">
              Create Your Plan
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Calculate total tasks and completed tasks
  const getTotalAndCompleted = () => {
    let total = 0;
    let completed = 0;
    
    Object.values(plan.stages).forEach(stage => {
      // Regular tasks
      if (stage.tasks) {
        total += stage.tasks.length;
        completed += stage.tasks.filter(t => t.completed).length;
      }
      
      // Good practice tasks
      if (stage.goodPractice?.tasks) {
        total += stage.goodPractice.tasks.length;
        completed += stage.goodPractice.tasks.filter(t => t.completed).length;
      }
    });
    
    return { total, completed };
  };
  
  const { total: totalTasks, completed: completedTasks } = getTotalAndCompleted();
  
  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-tcof-dark">Project Checklist</h1>
            <p className="text-gray-600 mt-1">
              Track and manage your project tasks across all stages
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-sm font-medium">
                Progress: {completedTasks}/{totalTasks} tasks completed
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleExportPDF}
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Summary bar */}
        <div className="mb-6">
          <SummaryBar plan={plan} />
        </div>
        
        {/* View Toggle Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'tasks' | 'factors')} 
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Tasks by Stage</TabsTrigger>
            <TabsTrigger value="factors">Tasks by Success Factor</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks" className="mt-4">
            <Button asChild className="mb-4">
              <Link to="/checklist">
                Go to Stage-Based Checklist
              </Link>
            </Button>
          </TabsContent>
          
          <TabsContent value="factors" className="mt-4">
            {/* Factor Accordion component */}
            <FactorAccordion selectedProjectId={selectedPlanId || ''} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}