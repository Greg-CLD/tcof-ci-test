import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getTaskCounts } from '@/lib/plan-db';
import styles from '@/lib/styles/gp.module.css';
import { 
  CheckCircle, 
  ListChecks, 
  Folder, 
  FileDown, 
  FileText, 
  ArrowRight,
  CheckSquare
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { exportPDF, exportCSV } from '@/lib/exportUtils';

interface ReviewCardProps {
  planId: string;
  onGenerateChecklist: () => void;
}

export default function ReviewCard({ planId, onGenerateChecklist }: ReviewCardProps) {
  const { heuristics, factorTasks, gpTasks } = getTaskCounts(planId);
  const [isExporting, setIsExporting] = useState(false);
  
  const totalTasks = factorTasks + gpTasks;
  
  const handleExportPDF = async () => {
    if (!planId) return;
    setIsExporting(true);
    try {
      await exportPDF(planId);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!planId) return;
    setIsExporting(true);
    try {
      await exportCSV(planId);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
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
      
      <div className="flex flex-col gap-3">
        <Button 
          onClick={onGenerateChecklist} 
          className="w-full bg-tcof-teal hover:bg-tcof-teal/90 flex items-center justify-center gap-2"
        >
          <CheckSquare size={18} />
          Generate My Checklist
          <ArrowRight size={16} className="ml-1" />
        </Button>
        
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Export PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download a PDF version of your plan</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <FileDown size={16} />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export your tasks as a CSV spreadsheet</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}