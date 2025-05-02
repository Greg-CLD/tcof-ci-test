import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Compass, ClipboardCheck, BarChart3, DoorOpen, AlertTriangle, Check } from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { ToolType, getToolName, getToolRoute } from '@/lib/progress-tracking';

interface NextStepsProps {
  className?: string;
}

export default function NextSteps({ className = '' }: NextStepsProps) {
  const { getNextTool, progress } = useProgress();
  
  // Get the next recommended tool
  const nextToolInfo = getNextTool();
  
  // If all tools are completed, show a "complete" message
  const allToolsCompleted = !nextToolInfo;
  
  // Helper function to get the icon for a tool type
  const getToolIcon = (toolType: ToolType | null) => {
    if (!toolType) return <Check className="h-12 w-12 text-green-500" />;
    
    const iconMap: Record<ToolType, React.ReactNode> = {
      'goal-mapping': <BarChart3 className="h-12 w-12 text-tcof-teal" />,
      'cynefin': <Compass className="h-12 w-12 text-tcof-teal" />,
      'tcof-journey': <DoorOpen className="h-12 w-12 text-tcof-teal" />,
      'plan-block1': <ClipboardCheck className="h-12 w-12 text-tcof-teal" />,
      'plan-block2': <ClipboardCheck className="h-12 w-12 text-tcof-teal" />,
      'plan-block3': <ClipboardCheck className="h-12 w-12 text-tcof-teal" />,
      'checklist': <ClipboardCheck className="h-12 w-12 text-tcof-teal" />
    };
    
    return iconMap[toolType];
  };
  
  // Helper function to get descriptive text for a tool
  const getToolDescription = (toolType: ToolType | null) => {
    if (!toolType) return "You've completed all the tools in the TCOF framework!";
    
    const descriptionMap: Record<ToolType, string> = {
      'goal-mapping': "Map out your strategic goals and desired outcomes using the Goal Mapping Tool.",
      'cynefin': "Identify your domain's complexity level with the Cynefin Orientation Tool.",
      'tcof-journey': "Determine your current journey stage using the TCOF Journey Decision Tree.",
      'plan-block1': "Start creating your plan with Block 1: Discover - understand what you're trying to achieve.",
      'plan-block2': "Continue with Block 2: Design - develop your plan based on insights from Block 1.",
      'plan-block3': "Finish your plan with Block 3: Deliver - create practical steps for implementation.",
      'checklist': "Review your complete plan and create a final checklist for your project."
    };
    
    return descriptionMap[toolType];
  };
  
  return (
    <Card className={`shadow-md ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold text-tcof-dark">
          {allToolsCompleted ? "All Tools Completed" : "Recommended Next Step"}
        </CardTitle>
        <CardDescription>
          {allToolsCompleted 
            ? "Great job! You've made progress through all the tools." 
            : "Continue your journey with the next recommended tool."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center p-4">
          <div className="mb-4">
            {allToolsCompleted ? (
              <div className="rounded-full bg-green-100 p-3 inline-flex">
                <Check className="h-12 w-12 text-green-500" />
              </div>
            ) : (
              <div className="rounded-full bg-tcof-light p-3 inline-flex">
                {getToolIcon(nextToolInfo?.toolType || null)}
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-tcof-dark mb-2">
            {allToolsCompleted 
              ? "All Complete!" 
              : getToolName(nextToolInfo?.toolType as ToolType)}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {getToolDescription(nextToolInfo?.toolType || null)}
          </p>
          
          {!allToolsCompleted && nextToolInfo && (
            <Link href={nextToolInfo.route}>
              <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                {progress.tools[nextToolInfo.toolType].started 
                  ? "Continue" 
                  : "Start"} {getToolName(nextToolInfo.toolType)} 
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
          
          {allToolsCompleted && (
            <div className="space-y-3 w-full">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full border-tcof-teal text-tcof-teal hover:bg-tcof-light">
                  View Dashboard
                </Button>
              </Link>
              <Link href="/make-a-plan">
                <Button variant="outline" className="w-full border-tcof-teal text-tcof-teal hover:bg-tcof-light">
                  Start a New Plan
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}