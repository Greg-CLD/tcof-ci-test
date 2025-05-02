import { useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight, ChevronDown, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

import { useProgress } from '@/hooks/use-progress';
import { ToolType, getToolName, getToolRoute } from '@/lib/progress-tracking';

interface ProgressTrackerProps {
  showDetailed?: boolean;
  className?: string;
}

export default function ProgressTracker({ showDetailed = false, className = '' }: ProgressTrackerProps) {
  const { progress, isToolStarted, isToolCompleted } = useProgress();
  const [isOpen, setIsOpen] = useState(showDetailed);
  
  const toolTypes: ToolType[] = [
    'goal-mapping',
    'cynefin',
    'tcof-journey',
    'plan-block1',
    'plan-block2',
    'plan-block3',
    'checklist'
  ];
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-tcof-dark">
          Your Progress
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-2xl font-bold text-tcof-teal">
                {progress.overallProgress}%
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Overall progress across all tools</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Progress 
        value={progress.overallProgress} 
        className="h-2 mt-2"
        aria-label="Progress across all tools"
      />
      
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="mt-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {isOpen ? 'Hide details' : 'Show details'}
          </p>
          <CollapsibleTrigger asChild>
            <button className="rounded-full p-1 hover:bg-gray-100">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="mt-3 space-y-2">
          {toolTypes.map((toolType) => {
            const isStarted = isToolStarted(toolType);
            const isCompleted = isToolCompleted(toolType);
            
            return (
              <div 
                key={toolType}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  ) : isStarted ? (
                    <Circle className="h-5 w-5 text-amber-500 mr-2" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 mr-2" />
                  )}
                  
                  <span className={`text-sm ${isStarted ? 'text-tcof-dark font-medium' : 'text-gray-500'}`}>
                    {getToolName(toolType)}
                  </span>
                </div>
                
                <Link href={getToolRoute(toolType)}>
                  <Button
                    size="sm"
                    variant={isCompleted ? "outline" : "default"}
                    className={`text-xs ${
                      isCompleted 
                        ? 'border-green-500 text-green-600 hover:bg-green-50' 
                        : 'bg-tcof-teal hover:bg-tcof-teal/90 text-white'
                    }`}
                  >
                    {isCompleted ? 'Review' : isStarted ? 'Continue' : 'Start'}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}