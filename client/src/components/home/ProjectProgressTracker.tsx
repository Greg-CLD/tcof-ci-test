import React, { useState, useEffect } from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useProjectContext } from '@/contexts/ProjectContext';
import { PlanRecord, loadPlan } from '@/lib/plan-db';
import { 
  STORAGE_KEYS, 
  loadFromLocalStorage, 
  CynefinSelection, 
  GoalMapData, 
  TCOFJourneyData 
} from '@/lib/storage';

interface ProgressItemProps {
  title: string;
  status: 'completed' | 'in-progress' | 'not-started';
  progress?: number;
}

const ProgressItem: React.FC<ProgressItemProps> = ({ title, status, progress = 0 }) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md bg-white">
      <div className="flex items-center gap-2">
        {status === 'completed' ? (
          <div className="bg-green-100 p-1 rounded-full">
            <Check className="h-4 w-4 text-green-600" />
          </div>
        ) : status === 'in-progress' ? (
          <div className="bg-amber-100 p-1 rounded-full">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
        ) : (
          <div className="bg-gray-100 p-1 rounded-full">
            <AlertCircle className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <span className="font-medium">{title}</span>
      </div>
      
      {status === 'in-progress' && typeof progress === 'number' ? (
        <div className="flex items-center gap-2 w-32">
          <Progress value={progress} className="h-2" />
          <span className="text-xs font-medium">{Math.round(progress)}%</span>
        </div>
      ) : null}
    </div>
  );
};

export const ProjectProgressTracker: React.FC = () => {
  const { projectId } = useProjectContext();
  const [bearingsStatus, setBearingsStatus] = useState<'completed' | 'in-progress' | 'not-started'>('not-started');
  const [planStatus, setPlanStatus] = useState<'completed' | 'in-progress' | 'not-started'>('not-started');
  const [checklistStatus, setChecklistStatus] = useState<'completed' | 'in-progress' | 'not-started'>('not-started');
  const [planProgress, setPlanProgress] = useState(0);
  const [checklistProgress, setChecklistProgress] = useState(0);
  
  useEffect(() => {
    async function checkToolsStatus() {
      if (!projectId) return;
      
      // Using projectId from context
      
      // Check "Get Your Bearings" tools status
      const goalMapPromise = loadFromLocalStorage<GoalMapData>(`${STORAGE_KEYS.GOAL_MAP}-${projectId}`);
      const cynefinPromise = loadFromLocalStorage<CynefinSelection>(`${STORAGE_KEYS.CYNEFIN_SELECTION}-${projectId}`);
      const journeyPromise = loadFromLocalStorage<TCOFJourneyData>(`${STORAGE_KEYS.TCOF_JOURNEY}-${projectId}`);
      
      const [goalMap, cynefin, journey] = await Promise.all([goalMapPromise, cynefinPromise, journeyPromise]);
      
      // Check if all three "Get Your Bearings" tools have data
      const hasGoalMap = goalMap && goalMap.nodes && goalMap.nodes.length > 0;
      const hasCynefin = cynefin && cynefin.quadrant !== null;
      const hasJourney = journey && journey.stage !== null;
      
      if (hasGoalMap && hasCynefin && hasJourney) {
        setBearingsStatus('completed');
      } else if (hasGoalMap || hasCynefin || hasJourney) {
        setBearingsStatus('in-progress');
      }
      
      // Check "Make a Plan" status
      try {
        const plan: PlanRecord | null = await loadPlan(projectId);
        
        if (plan) {
          // Calculate plan progress using the same logic as the Checklist page
          let total = 0;
          let completed = 0;
          
          Object.values(plan.stages || {}).forEach(stage => {
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
          
          const progress = total > 0 ? (completed / total) * 100 : 0;
          setPlanProgress(progress);
          
          if (progress === 100) {
            setPlanStatus('completed');
          } else if (progress > 0) {
            setPlanStatus('in-progress');
          }
          
          // Also update checklist progress since they use the same data
          setChecklistProgress(progress);
          if (progress === 100) {
            setChecklistStatus('completed');
          } else if (progress > 0) {
            setChecklistStatus('in-progress');
          }
        }
      } catch (error) {
        console.error('Error loading plan for progress tracker:', error);
      }
    }
    
    checkToolsStatus();
  }, [projectId]);
  
  if (!projectId) return null;
  
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 text-tcof-dark">Project Progress</h2>
      <div className="space-y-2">
        <ProgressItem 
          title="Get Your Bearings" 
          status={bearingsStatus} 
        />
        <ProgressItem 
          title="Make a Plan" 
          status={planStatus} 
          progress={planProgress}
        />
        <ProgressItem 
          title="Checklist" 
          status={checklistStatus} 
          progress={checklistProgress}
        />
      </div>
    </div>
  );
};

export default ProjectProgressTracker;