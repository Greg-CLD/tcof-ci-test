import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProgress } from '@/contexts/ProgressContext';
import { Award, Target, Compass, Map, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ToolProgressTrackerProps {
  projectId?: string;
  organisationId?: string;
  className?: string;
}

export function ToolProgressTracker({ projectId, organisationId, className = '' }: ToolProgressTrackerProps) {
  const [, navigate] = useLocation();
  const { progress, isLoading } = useProgress();
  
  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (!progress?.tools) return 0;
    
    const tools = [
      progress.tools.goalMapping?.completed,
      progress.tools.cynefinOrientation?.completed,
      progress.tools.tcofJourney?.completed
    ];
    
    const completedCount = tools.filter(Boolean).length;
    return Math.round((completedCount / 3) * 100);
  };
  
  const overallProgress = calculateOverallProgress();
  const allToolsComplete = overallProgress === 100;
  
  // Check which tools are complete
  const isGoalMappingComplete = !!progress?.tools?.goalMapping?.completed;
  const isCynefinComplete = !!progress?.tools?.cynefinOrientation?.completed;
  const isTcofJourneyComplete = !!progress?.tools?.tcofJourney?.completed;
  
  // Navigate to the appropriate tool
  const navigateToTool = (toolName: string) => {
    if (!projectId) return;
    
    let basePath = '';
    if (organisationId) {
      basePath = `/organisations/${organisationId}/projects/${projectId}`;
    } else {
      basePath = `/projects/${projectId}`;
    }
    
    switch (toolName) {
      case 'goalMapping':
        navigate(`${basePath}/tools/goal-mapping`);
        break;
      case 'cynefin':
        navigate(`${basePath}/tools/cynefin`);
        break;
      case 'tcofJourney':
        navigate(`${basePath}/tools/tcof-journey`);
        break;
      case 'makeAPlan':
        navigate(`${basePath}/make-a-plan`);
        break;
      default:
        break;
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className={`shadow-sm ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Award className="w-5 h-5 mr-2 text-tcof-teal" />
            Tool Progress
          </CardTitle>
          <CardDescription>Loading progress data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-24">
            <div className="w-6 h-6 border-2 border-tcof-teal border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <Award className="w-5 h-5 mr-2 text-tcof-teal" />
            Tool Progress
          </CardTitle>
          <div className="text-sm font-medium">
            {overallProgress}% Complete
          </div>
        </div>
        <CardDescription>
          Complete these tools to unlock the Make a Plan feature
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          {/* Progress bar changes color based on completion percentage */}
          <Progress 
            value={overallProgress} 
            className="h-2" 
            indicatorClassName={
              overallProgress === 100 
                ? "bg-green-500" 
                : overallProgress > 66 
                  ? "bg-tcof-teal" 
                  : overallProgress > 33 
                    ? "bg-amber-500" 
                    : "bg-red-500"
            }
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className={`w-4 h-4 mr-2 ${isGoalMappingComplete ? "text-green-500" : "text-gray-400"}`} />
              <span className={`text-sm ${isGoalMappingComplete ? "font-medium" : "text-gray-500"}`}>
                Goal Mapping
              </span>
            </div>
            <div className="flex items-center">
              {isGoalMappingComplete ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs px-2 py-1 h-7 text-blue-600 hover:text-blue-800"
                  onClick={() => navigateToTool('goalMapping')}
                >
                  Start <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Compass className={`w-4 h-4 mr-2 ${isCynefinComplete ? "text-green-500" : "text-gray-400"}`} />
              <span className={`text-sm ${isCynefinComplete ? "font-medium" : "text-gray-500"}`}>
                Cynefin Orientation
              </span>
            </div>
            <div className="flex items-center">
              {isCynefinComplete ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs px-2 py-1 h-7 text-blue-600 hover:text-blue-800"
                  onClick={() => navigateToTool('cynefin')}
                >
                  Start <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Map className={`w-4 h-4 mr-2 ${isTcofJourneyComplete ? "text-green-500" : "text-gray-400"}`} />
              <span className={`text-sm ${isTcofJourneyComplete ? "font-medium" : "text-gray-500"}`}>
                TCOF Journey
              </span>
            </div>
            <div className="flex items-center">
              {isTcofJourneyComplete ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs px-2 py-1 h-7 text-blue-600 hover:text-blue-800"
                  onClick={() => navigateToTool('tcofJourney')}
                >
                  Start <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <Button 
            variant={allToolsComplete ? "default" : "outline"}
            size="sm" 
            className={allToolsComplete 
              ? "w-full bg-green-600 hover:bg-green-700 text-white"
              : "w-full text-tcof-teal border-tcof-teal hover:bg-tcof-teal/10"
            }
            onClick={() => navigateToTool('makeAPlan')}
          >
            {allToolsComplete ? (
              <>
                Make a Plan Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              "Make a Plan"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}