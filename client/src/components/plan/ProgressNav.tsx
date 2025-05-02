import React from 'react';
import styles from '@/lib/styles.module.css';
import { CheckCircle } from 'lucide-react';

export interface Step {
  id: string;
  label: string;
  completed: boolean;
}

interface ProgressNavProps {
  steps: Step[];
  currentStepId: string;
}

export default function ProgressNav({ steps, currentStepId }: ProgressNavProps) {
  return (
    <div className={styles.progressNav}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStepId;
        const isCompleted = step.completed;
        
        return (
          <div 
            key={step.id}
            className={`${styles.progressStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
          >
            <div className={styles.progressStepNumber}>
              {isCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}