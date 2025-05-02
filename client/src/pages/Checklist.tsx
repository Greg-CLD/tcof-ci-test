import React, { useEffect, useState } from 'react';
import { loadPlan, PlanRecord, StageData, Stage } from '@/lib/plan-db';
import { getLatestPlanId } from '@/lib/planHelpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, FileDown, RefreshCw } from 'lucide-react';

export default function Checklist() {
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [activeStage, setActiveStage] = useState<Stage>('Identification');
  
  useEffect(() => {
    const planId = getLatestPlanId();
    if (planId) {
      const loadedPlan = loadPlan(planId);
      if (loadedPlan) {
        setPlan(loadedPlan);
      }
    }
  }, []);
  
  const handleExportPDF = () => {
    // Placeholder for PDF export function
    console.log('Exporting plan as PDF...');
  };
  
  const handleRefresh = () => {
    const planId = getLatestPlanId();
    if (planId) {
      const loadedPlan = loadPlan(planId);
      if (loadedPlan) {
        setPlan(loadedPlan);
      }
    }
  };
  
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-tcof-blue mb-4">No Plan Found</h1>
        <p className="mb-8">
          You don't have any active plans. Start by creating one from the "Make a Plan" section.
        </p>
        <Button onClick={() => window.location.href = '/make-a-plan'}>
          Create a Plan
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-tcof-blue">Your Checklist</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Plan ID: {plan.id.substring(0, 8)}...</span>
          <span>Created: {new Date(plan.created).toLocaleDateString()}</span>
          {plan.lastUpdated && <span>Updated: {new Date(plan.lastUpdated).toLocaleDateString()}</span>}
        </div>
      </div>
      
      <Tabs defaultValue="Identification" onValueChange={(value) => setActiveStage(value as Stage)}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="Identification">Identification</TabsTrigger>
          <TabsTrigger value="Definition">Definition</TabsTrigger>
          <TabsTrigger value="Delivery">Delivery</TabsTrigger>
          <TabsTrigger value="Closure">Closure</TabsTrigger>
        </TabsList>
        
        {Object.entries(plan.stages).map(([stage, data]) => (
          <TabsContent key={stage} value={stage} className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">Heuristics</h2>
              <div className="space-y-3">
                {data.heuristics.map((heuristic) => (
                  <div key={heuristic.id} className="flex items-start gap-2 p-3 border rounded-lg">
                    <Checkbox id={heuristic.id} checked={heuristic.completed} />
                    <label htmlFor={heuristic.id} className="text-sm text-gray-700">
                      {heuristic.text}
                    </label>
                  </div>
                ))}
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Impact Factors</h2>
              <div className="space-y-3">
                {data.factors.map((factor) => (
                  <div key={factor.id} className="flex items-start justify-between gap-2 p-3 border rounded-lg">
                    <span className="text-sm text-gray-700">{factor.text}</span>
                    <Badge className={getImpactColor(factor.impact)}>
                      {factor.impact}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Practice Tasks</h2>
              <div className="space-y-3">
                {data.practiceTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 p-3 border rounded-lg">
                    <Checkbox id={task.id} checked={task.completed} />
                    <div className="flex-1">
                      <label htmlFor={task.id} className="text-sm text-gray-700">
                        {task.text}
                      </label>
                      {task.dueDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {task.assignee && (
                      <Badge variant="outline" className="text-xs">
                        {task.assignee}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}