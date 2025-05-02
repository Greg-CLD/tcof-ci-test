import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { ToolType, getToolName } from '@/lib/progress-tracking';

interface ProgressTrackerProps {
  showDetailed?: boolean;
  className?: string;
}

export default function ProgressTracker({ showDetailed = false, className = '' }: ProgressTrackerProps) {
  const { progress, isToolStarted, isToolCompleted } = useProgress();
  
  // Define tool types in the correct order for display
  const bearingTools: ToolType[] = ['goal-mapping', 'cynefin', 'tcof-journey'];
  const planTools: ToolType[] = ['plan-block1', 'plan-block2', 'plan-block3', 'checklist'];
  
  // Helper function to get status indicator icon
  const getStatusIcon = (toolType: ToolType) => {
    if (isToolCompleted(toolType)) {
      return <Check className="h-4 w-4 text-green-500" />;
    } else if (isToolStarted(toolType)) {
      return <Clock className="h-4 w-4 text-amber-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-gray-300" />;
    }
  };
  
  return (
    <Card className={`shadow-md ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold text-tcof-dark flex items-center justify-between">
          <span>Overall Progress</span>
          <Badge className="ml-2 bg-tcof-teal font-medium text-white">
            {progress.overallProgress}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Progress value={progress.overallProgress} className="h-2 bg-gray-100" />
        </div>
        
        {showDetailed && (
          <div className="space-y-6">
            {/* Get Your Bearings Tools Progress */}
            <div>
              <h4 className="font-medium text-tcof-dark mb-3">Get Your Bearings</h4>
              <div className="space-y-3">
                {bearingTools.map(tool => (
                  <div key={tool} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(tool)}
                      <span className="ml-2 text-gray-700">{getToolName(tool)}</span>
                    </div>
                    <Progress 
                      value={progress.tools[tool].progress} 
                      className="h-1.5 w-24 bg-gray-100" 
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Make a Plan Tools Progress */}
            <div>
              <h4 className="font-medium text-tcof-dark mb-3">Make a Plan</h4>
              <div className="space-y-3">
                {planTools.map(tool => (
                  <div key={tool} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(tool)}
                      <span className="ml-2 text-gray-700">{getToolName(tool)}</span>
                    </div>
                    <Progress 
                      value={progress.tools[tool].progress} 
                      className="h-1.5 w-24 bg-gray-100" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}