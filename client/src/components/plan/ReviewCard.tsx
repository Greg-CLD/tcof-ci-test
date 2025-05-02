import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getTaskCounts } from '@/lib/plan-db';
import styles from '@/lib/styles/gp.module.css';
import { CheckCircle, ListChecks, Folder } from 'lucide-react';

interface ReviewCardProps {
  planId: string;
  onGenerateChecklist: () => void;
}

export default function ReviewCard({ planId, onGenerateChecklist }: ReviewCardProps) {
  const { heuristics, factorTasks, gpTasks } = getTaskCounts(planId);
  
  const totalTasks = factorTasks + gpTasks;
  
  return (
    <Card className={styles.reviewCard}>
      <h3 className={styles.reviewTitle}>Review Your Plan</h3>
      
      <div className="space-y-4 mb-6">
        <div className={styles.reviewStat}>
          <CheckCircle className={styles.reviewStatIcon} size={20} />
          <span className={styles.reviewStatNumber}>{heuristics}</span>
          <span className={styles.reviewStatText}>Personal heuristics identified</span>
        </div>
        
        <div className={styles.reviewStat}>
          <ListChecks className={styles.reviewStatIcon} size={20} />
          <span className={styles.reviewStatNumber}>{factorTasks}</span>
          <span className={styles.reviewStatText}>Tasks from success factors</span>
        </div>
        
        <div className={styles.reviewStat}>
          <Folder className={styles.reviewStatIcon} size={20} />
          <span className={styles.reviewStatNumber}>{gpTasks}</span>
          <span className={styles.reviewStatText}>Tasks from good practice frameworks</span>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Your plan contains a total of {totalTasks} tasks across all project stages.
      </div>
      
      <Button onClick={onGenerateChecklist} className="w-full">
        Review & Generate Checklist
      </Button>
    </Card>
  );
}