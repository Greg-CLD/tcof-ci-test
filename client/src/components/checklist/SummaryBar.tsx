import React from 'react';
import { PlanRecord, Stage } from '@/lib/plan-db';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Task type (simplified from Checklist.tsx)
interface TaskItem {
  id: string;
  stage: Stage;
  completed: boolean;
  text?: string;
  [key: string]: any;
}

// Type for stage data that might be used in canonicalChecklist
interface StageData {
  tasks?: Array<{ completed?: boolean; [key: string]: any }>;
  goodPractice?: {
    tasks?: Array<{ completed?: boolean; [key: string]: any }>;
  };
  [key: string]: any;
}

interface SummaryBarProps {
  plan?: PlanRecord | null;
  canonicalChecklist?: {
    stages?: Record<string, StageData>;
    [key: string]: any;
  }; 
  tasks?: TaskItem[]; // New prop for direct task list
}

interface StageMetrics {
  total: number;
  completed: number;
  percentage: number;
}

type StageMetricsMap = Record<Stage, StageMetrics>;

export default function SummaryBar({ plan, canonicalChecklist, tasks }: SummaryBarProps) {
  // Create default empty metrics
  const defaultMetrics = (): StageMetricsMap => {
    return {
      Identification: { total: 0, completed: 0, percentage: 0 },
      Definition: { total: 0, completed: 0, percentage: 0 },
      Delivery: { total: 0, completed: 0, percentage: 0 },
      Closure: { total: 0, completed: 0, percentage: 0 }
    };
  };

  // Calculate metrics for each stage
  const calculateStageMetrics = (): StageMetricsMap => {
    const metrics: Partial<StageMetricsMap> = {};
    
    // If we have direct tasks array, use that (highest priority)
    if (tasks && tasks.length > 0) {
      // Initialize metrics for all stages
      const stageNames: Stage[] = ['Identification', 'Definition', 'Delivery', 'Closure'];
      stageNames.forEach(stage => {
        // Filter tasks for this stage
        const stageTasks = tasks.filter(t => t.stage === stage);
        const completed = stageTasks.filter(t => t.completed).length;
        const total = stageTasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        metrics[stage] = { total, completed, percentage };
      });
    }
    // If we have a plan, use that
    else if (plan && plan.stages) {
      Object.entries(plan.stages).forEach(([stageName, stageData]) => {
        const stage = stageName as Stage;
        
        // Count regular tasks
        const regularTasks = stageData.tasks || [];
        const regularCompleted = regularTasks.filter(t => t.completed).length;
        
        // Count good practice tasks
        const gpTasks = stageData.goodPractice?.tasks || [];
        const gpCompleted = gpTasks.filter(t => t.completed).length;
        
        // Calculate totals
        const total = regularTasks.length + gpTasks.length;
        const completed = regularCompleted + gpCompleted;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        metrics[stage] = { total, completed, percentage };
      });
    } 
    // If we don't have a plan but we have canonical checklist data, use that
    else if (canonicalChecklist && canonicalChecklist.stages) {
      Object.entries(canonicalChecklist.stages).forEach(([stageName, stageData]) => {
        const stage = stageName as Stage;
        
        // Count tasks from canonical checklist - with type safety
        const taskList = stageData && stageData.tasks ? stageData.tasks : [];
        const completed = taskList.filter(t => !!t.completed).length;
        
        // Calculate percentage
        const total = taskList.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        metrics[stage] = { total, completed, percentage };
      });
    } 
    // If we don't have any data source, return default empty metrics
    else {
      return defaultMetrics();
    }
    
    return metrics as StageMetricsMap;
  };
  
  const stageMetrics = calculateStageMetrics();
  
  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    let totalTasks = 0;
    let completedTasks = 0;
    
    Object.values(stageMetrics).forEach(metrics => {
      totalTasks += metrics.total;
      completedTasks += metrics.completed;
    });
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };
  
  const overallProgress = calculateOverallProgress();
  
  // Stage colors for visual distinction
  const stageColors: Record<Stage, string> = {
    'Identification': 'bg-blue-500',
    'Definition': 'bg-purple-500',
    'Delivery': 'bg-green-500',
    'Closure': 'bg-amber-500'
  };
  
  // Status label based on progress percentage
  const getStatusLabel = (percentage: number): string => {
    if (percentage === 0) return 'Not Started';
    if (percentage < 25) return 'Just Started';
    if (percentage < 50) return 'In Progress';
    if (percentage < 75) return 'Well Underway';
    if (percentage < 100) return 'Almost Complete';
    return 'Complete';
  };
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      {/* Overall progress */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <h3 className="text-sm font-medium text-gray-700">Overall Progress</h3>
          <span className="text-sm font-medium text-gray-700">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" aria-label="Overall progress" />
        <p className="text-xs text-gray-500 mt-1">
          Status: {getStatusLabel(overallProgress)}
        </p>
      </div>
      
      {/* Stage progress grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(stageMetrics).map(([stageName, metrics]) => (
          <div 
            key={stageName}
            className="p-3 rounded-md bg-gray-50 border"
          >
            <div className="flex justify-between mb-1">
              <h4 className="text-sm font-medium">{stageName}</h4>
              <span className="text-xs font-medium">{metrics.percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full", stageColors[stageName as Stage])}
                style={{ width: `${metrics.percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {metrics.completed}/{metrics.total} tasks
              </span>
              <span className="text-xs font-medium text-gray-600">
                {getStatusLabel(metrics.percentage)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}