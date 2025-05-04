import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Stage } from '@/lib/plan-db';
import { 
  getAllGoodPractices, 
  getFrameworkByCode, 
  getFrameworkDescription,
  Framework
} from '@/lib/goodPracticeData';
import styles from '@/lib/styles/gp.module.css';
import { AlertTriangle } from 'lucide-react';

interface FrameworkPickerProps {
  selectedFrameworks: string[];
  onFrameworkToggle: (frameworkCode: string) => void;
  onTaskToggle: (text: string, frameworkCode: string, stage: Stage) => void;
  selectedTasks: Record<string, Record<Stage, string[]>>;
  onSkip: () => void;
  onClearAllTasks?: () => void;
}

export default function FrameworkPicker({
  selectedFrameworks,
  onFrameworkToggle,
  onTaskToggle,
  selectedTasks,
  onSkip,
  onClearAllTasks
}: FrameworkPickerProps) {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [expandedFrameworks, setExpandedFrameworks] = useState<string[]>([]);
  const [totalTaskCount, setTotalTaskCount] = useState(0);
  
  // Load all frameworks
  useEffect(() => {
    setFrameworks(getAllGoodPractices());
  }, []);
  
  // Auto-expand selected frameworks
  useEffect(() => {
    setExpandedFrameworks(prev => {
      const newExpanded = [...prev];
      
      // Add newly selected frameworks to expanded list
      selectedFrameworks.forEach(code => {
        if (!newExpanded.includes(code)) {
          newExpanded.push(code);
        }
      });
      
      return newExpanded;
    });
  }, [selectedFrameworks]);
  
  // Calculate total task count
  useEffect(() => {
    let count = 0;
    
    Object.values(selectedTasks).forEach(framework => {
      Object.values(framework).forEach(tasks => {
        count += tasks.length;
      });
    });
    
    setTotalTaskCount(count);
  }, [selectedTasks]);
  
  const toggleFrameworkExpansion = (code: string) => {
    setExpandedFrameworks(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const isStageHidden = (tasks: string[]) => {
    return tasks.length === 0;
  };
  
  const isTaskSelected = (text: string, frameworkCode: string, stage: Stage) => {
    return selectedTasks[frameworkCode]?.[stage]?.includes(text) || false;
  };
  
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {frameworks.map(framework => (
          <div 
            key={framework.code} 
            className={`${styles.frameworkChip} ${
              selectedFrameworks.includes(framework.code) ? styles.frameworkChipSelected : ''
            }`}
            onClick={() => onFrameworkToggle(framework.code)}
          >
            {framework.name}
          </div>
        ))}
      </div>
      
      {selectedFrameworks.length > 0 && (
        <Accordion
          type="multiple"
          value={expandedFrameworks}
          className="mt-4"
        >
          {selectedFrameworks.map(code => {
            const framework = getFrameworkByCode(code);
            if (!framework) return null;
            
            return (
              <AccordionItem key={code} value={code}>
                <AccordionTrigger onClick={() => toggleFrameworkExpansion(code)}>
                  <span className={styles.frameworkTitle}>{framework.name}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className={styles.frameworkDescription}>
                    {getFrameworkDescription(code)}
                  </div>
                  
                  {/* Stage: Identification */}
                  {!isStageHidden(framework.tasks.Identification) && (
                    <>
                      <div className={styles.stageDivider}>Identification Stage</div>
                      {framework.tasks.Identification.map(task => (
                        <div key={`${code}-identification-${task}`} className={styles.taskCheckbox}>
                          <Checkbox 
                            id={`${code}-identification-${task}`}
                            checked={isTaskSelected(task, code, 'Identification')}
                            onCheckedChange={() => onTaskToggle(task, code, 'Identification')}
                          />
                          <label 
                            htmlFor={`${code}-identification-${task}`} 
                            className={styles.taskCheckboxLabel}
                          >
                            {task}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Stage: Definition */}
                  {!isStageHidden(framework.tasks.Definition) && (
                    <>
                      <div className={styles.stageDivider}>Definition Stage</div>
                      {framework.tasks.Definition.map(task => (
                        <div key={`${code}-definition-${task}`} className={styles.taskCheckbox}>
                          <Checkbox 
                            id={`${code}-definition-${task}`}
                            checked={isTaskSelected(task, code, 'Definition')}
                            onCheckedChange={() => onTaskToggle(task, code, 'Definition')}
                          />
                          <label 
                            htmlFor={`${code}-definition-${task}`} 
                            className={styles.taskCheckboxLabel}
                          >
                            {task}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Stage: Delivery */}
                  {!isStageHidden(framework.tasks.Delivery) && (
                    <>
                      <div className={styles.stageDivider}>Delivery Stage</div>
                      {framework.tasks.Delivery.map(task => (
                        <div key={`${code}-delivery-${task}`} className={styles.taskCheckbox}>
                          <Checkbox 
                            id={`${code}-delivery-${task}`}
                            checked={isTaskSelected(task, code, 'Delivery')}
                            onCheckedChange={() => onTaskToggle(task, code, 'Delivery')}
                          />
                          <label 
                            htmlFor={`${code}-delivery-${task}`} 
                            className={styles.taskCheckboxLabel}
                          >
                            {task}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Stage: Closure */}
                  {!isStageHidden(framework.tasks.Closure) && (
                    <>
                      <div className={styles.stageDivider}>Closure Stage</div>
                      {framework.tasks.Closure.map(task => (
                        <div key={`${code}-closure-${task}`} className={styles.taskCheckbox}>
                          <Checkbox 
                            id={`${code}-closure-${task}`}
                            checked={isTaskSelected(task, code, 'Closure')}
                            onCheckedChange={() => onTaskToggle(task, code, 'Closure')}
                          />
                          <label 
                            htmlFor={`${code}-closure-${task}`} 
                            className={styles.taskCheckboxLabel}
                          >
                            {task}
                          </label>
                        </div>
                      ))}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
      
      {totalTaskCount > 30 && (
        <div className={styles.taskWarning}>
          <AlertTriangle className={styles.taskWarningIcon} size={16} />
          <span>Consider trimming tasks for better focus. You have selected {totalTaskCount} tasks.</span>
        </div>
      )}
      
      <div className="flex justify-between mt-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip This Step
          </Button>
          {totalTaskCount > 0 && onClearAllTasks && (
            <Button 
              variant="destructive" 
              onClick={onClearAllTasks}
              size="sm"
            >
              Clear All Tasks
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}