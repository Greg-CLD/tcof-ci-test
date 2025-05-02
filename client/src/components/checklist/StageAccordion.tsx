import React, { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { PlanRecord, Stage, TaskItem, GoodPracticeTask } from '@/lib/plan-db';
import styles from '@/lib/styles/checklist.module.css';
import { savePlan } from '@/lib/plan-db';
import { getLatestPlanId } from '@/lib/planHelpers';

interface StageAccordionProps {
  stage: Stage;
  plan: PlanRecord;
  onPlanUpdate: (updatedPlan: PlanRecord) => void;
}

export default function StageAccordion({ stage, plan, onPlanUpdate }: StageAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();
  
  // Sort tasks by origin
  const tasks = plan.stages[stage].tasks || [];
  const heuristicTasks = tasks.filter(task => task.origin === 'heuristic');
  const factorTasks = tasks.filter(task => task.origin === 'factor');
  const gpTasks = plan.stages[stage].goodPractice?.tasks || [];
  
  // Toggle accordion state
  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle task checkbox toggle
  const handleTaskToggle = (taskIndex: number, isGoodPractice: boolean = false) => {
    const updatedPlan = { ...plan };
    
    if (isGoodPractice) {
      if (!updatedPlan.stages[stage].goodPractice?.tasks) return;
      
      updatedPlan.stages[stage].goodPractice.tasks[taskIndex].completed = 
        !updatedPlan.stages[stage].goodPractice.tasks[taskIndex].completed;
    } else {
      if (!updatedPlan.stages[stage].tasks) return;
      
      updatedPlan.stages[stage].tasks[taskIndex].completed = 
        !updatedPlan.stages[stage].tasks[taskIndex].completed;
    }
    
    // Save to database and update the plan in parent component
    savePlan(updatedPlan, true);
    onPlanUpdate(updatedPlan);
  };
  
  // Handle task deletion
  const handleDeleteTask = (taskIndex: number, isGoodPractice: boolean = false, origin?: string) => {
    // Don't allow deletion of TCOF factor tasks
    if (!isGoodPractice && origin === 'factor') {
      toast({
        title: "Cannot delete TCOF factor task",
        description: "These tasks are part of the core framework and can't be removed.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedPlan = { ...plan };
    
    if (isGoodPractice) {
      if (!updatedPlan.stages[stage].goodPractice?.tasks) return;
      
      updatedPlan.stages[stage].goodPractice.tasks = 
        updatedPlan.stages[stage].goodPractice.tasks.filter((_, idx) => idx !== taskIndex);
    } else {
      if (!updatedPlan.stages[stage].tasks) return;
      
      updatedPlan.stages[stage].tasks = 
        updatedPlan.stages[stage].tasks.filter((_, idx) => idx !== taskIndex);
    }
    
    // Save to database and update the plan in parent component
    savePlan(updatedPlan, true);
    onPlanUpdate(updatedPlan);
    
    toast({
      title: "Task deleted",
      description: "The task has been removed from your checklist.",
    });
  };
  
  return (
    <div className={styles.accordionWrapper}>
      {/* Accordion header */}
      <div 
        className={`${styles.accordionHeader} ${isOpen ? styles.accordionHeaderCollapsed : ''}`}
        onClick={toggleAccordion}
      >
        <span>{stage} Stage</span>
        <ChevronRight 
          className={`${styles.accordionCaret} ${isOpen ? styles.accordionCaretOpen : ''}`} 
          size={20} 
        />
      </div>
      
      {/* Accordion content */}
      {isOpen && (
        <div className={styles.accordionContent}>
          {/* Personal Heuristics section */}
          <div className={`${styles.taskSection} ${!gpTasks.length ? styles.taskSectionLast : ''}`}>
            <h3 className={styles.taskSectionHeader}>Your Heuristics</h3>
            
            {heuristicTasks.length > 0 ? (
              <div className={styles.taskList}>
                {heuristicTasks.map((task, index) => (
                  <TaskRow 
                    key={`heuristic-${index}`}
                    task={task}
                    index={tasks.indexOf(task)}
                    isEven={index % 2 === 0}
                    onToggle={handleTaskToggle}
                    onDelete={handleDeleteTask}
                    badgeType="heuristic"
                    isDeletable={true}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyList}>— no personal heuristics —</div>
            )}
          </div>
          
          {/* TCOF Factors section */}
          <div className={`${styles.taskSection} ${!gpTasks.length && !heuristicTasks.length ? styles.taskSectionLast : ''}`}>
            <h3 className={styles.taskSectionHeader}>TCOF Success Factors</h3>
            
            {factorTasks.length > 0 ? (
              <div className={styles.taskList}>
                {factorTasks.map((task, index) => (
                  <TaskRow 
                    key={`factor-${index}`}
                    task={task}
                    index={tasks.indexOf(task)}
                    isEven={index % 2 === 0}
                    onToggle={handleTaskToggle}
                    onDelete={handleDeleteTask}
                    badgeType="factor"
                    isDeletable={false}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyList}>— no TCOF factor tasks —</div>
            )}
          </div>
          
          {/* Good Practice section */}
          {(gpTasks.length > 0 || factorTasks.length > 0 || heuristicTasks.length > 0) && (
            <div className={styles.taskSection + ' ' + styles.taskSectionLast}>
              <h3 className={styles.taskSectionHeader}>Good Practice Tasks</h3>
              
              {gpTasks.length > 0 ? (
                <div className={styles.taskList}>
                  {gpTasks.map((task, index) => (
                    <GoodPracticeTaskRow 
                      key={`gp-${index}`}
                      task={task}
                      index={index}
                      isEven={index % 2 === 0}
                      onToggle={(idx) => handleTaskToggle(idx, true)}
                      onDelete={(idx) => handleDeleteTask(idx, true)}
                      badgeType="gp"
                      isDeletable={true}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyList}>— no good practice tasks —</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Task row component for regular tasks
function TaskRow({ 
  task, 
  index, 
  isEven, 
  onToggle, 
  onDelete, 
  badgeType,
  isDeletable
}: { 
  task: TaskItem; 
  index: number; 
  isEven: boolean; 
  onToggle: (idx: number) => void; 
  onDelete: (idx: number, isGp: boolean, origin?: string) => void; 
  badgeType: 'heuristic' | 'factor';
  isDeletable: boolean;
}) {
  return (
    <div 
      className={`${styles.taskRow} ${isEven ? styles.taskRowEven : styles.taskRowOdd} ${task.completed ? styles.taskRowCompleted : ''}`}
    >
      <Checkbox 
        checked={task.completed}
        onCheckedChange={() => onToggle(index)}
        className={styles.taskCheckbox}
        id={`task-${badgeType}-${index}`}
      />
      <label 
        htmlFor={`task-${badgeType}-${index}`}
        className={styles.taskText}
      >
        {task.text}
      </label>
      <span className={`${styles.taskBadge} ${styles[`taskBadge${badgeType === 'heuristic' ? 'Heuristic' : 'Factor'}`]}`}>
        {badgeType === 'heuristic' ? 'Heuristic' : 'Factor'}
      </span>
      <Trash2 
        size={16} 
        className={`${styles.deleteIcon} ${!isDeletable ? styles.deleteIconDisabled : ''}`}
        onClick={() => isDeletable ? onDelete(index, false, task.origin) : null}
      />
    </div>
  );
}

// Task row component for good practice tasks
function GoodPracticeTaskRow({ 
  task, 
  index, 
  isEven, 
  onToggle, 
  onDelete, 
  badgeType,
  isDeletable
}: { 
  task: GoodPracticeTask; 
  index: number; 
  isEven: boolean; 
  onToggle: (idx: number) => void; 
  onDelete: (idx: number) => void; 
  badgeType: 'gp';
  isDeletable: boolean;
}) {
  return (
    <div 
      className={`${styles.taskRow} ${isEven ? styles.taskRowEven : styles.taskRowOdd} ${task.completed ? styles.taskRowCompleted : ''}`}
    >
      <Checkbox 
        checked={task.completed}
        onCheckedChange={() => onToggle(index)}
        className={styles.taskCheckbox}
        id={`task-${badgeType}-${index}`}
      />
      <label 
        htmlFor={`task-${badgeType}-${index}`}
        className={styles.taskText}
      >
        {task.text}
      </label>
      <span className={`${styles.taskBadge} ${styles.taskBadgeGp}`}>
        {task.frameworkCode}
      </span>
      <Trash2 
        size={16} 
        className={`${styles.deleteIcon} ${!isDeletable ? styles.deleteIconDisabled : ''}`}
        onClick={() => isDeletable ? onDelete(index) : null}
      />
    </div>
  );
}