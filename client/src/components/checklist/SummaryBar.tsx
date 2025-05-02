import React from 'react';
import { PlanRecord, Stage, TaskItem, GoodPracticeTask } from '@/lib/plan-db';
import styles from '@/lib/styles/checklist.module.css';

interface SummaryBarProps {
  plan: PlanRecord;
}

interface StageCounts {
  total: number;
  completed: number;
}

export default function SummaryBar({ plan }: SummaryBarProps) {
  // Count tasks by stage and get totals
  const { stageCounts, totalCompleted, totalTasks } = countTasks(plan);
  
  // Calculate completion percentage
  const completionPercentage = totalTasks > 0 
    ? Math.round((totalCompleted / totalTasks) * 100) 
    : 0;
  
  return (
    <div className={styles.summaryBar}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryTotal}>
          Tasks completed: <span className={styles.summaryCount}>{totalCompleted}/{totalTasks}</span>
        </div>
        <div className={styles.stageCounters}>
          {Object.entries(stageCounts).map(([stage, counts]) => (
            <div key={stage} className={styles.stagePill}>
              {stage}: {counts.completed}/{counts.total}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.progressBarContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${completionPercentage}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionPercentage}
          role="progressbar"
        />
      </div>
    </div>
  );
}

// Helper function to count tasks by stage and completion status
function countTasks(plan: PlanRecord): { 
  stageCounts: Record<Stage, StageCounts>, 
  totalCompleted: number, 
  totalTasks: number 
} {
  const stageCounts: Record<Stage, StageCounts> = {
    'Identification': { total: 0, completed: 0 },
    'Definition': { total: 0, completed: 0 },
    'Delivery': { total: 0, completed: 0 },
    'Closure': { total: 0, completed: 0 }
  };
  
  let totalCompleted = 0;
  let totalTasks = 0;
  
  // Process each stage
  Object.keys(plan.stages).forEach(stageName => {
    const stage = stageName as Stage;
    const stageData = plan.stages[stage];
    
    // Count regular tasks
    const tasks = stageData.tasks || [];
    tasks.forEach(task => {
      stageCounts[stage].total++;
      totalTasks++;
      
      if (task.completed) {
        stageCounts[stage].completed++;
        totalCompleted++;
      }
    });
    
    // Count good practice tasks
    const gpTasks = stageData.goodPractice?.tasks || [];
    gpTasks.forEach(task => {
      stageCounts[stage].total++;
      totalTasks++;
      
      if (task.completed) {
        stageCounts[stage].completed++;
        totalCompleted++;
      }
    });
  });
  
  return { stageCounts, totalCompleted, totalTasks };
}