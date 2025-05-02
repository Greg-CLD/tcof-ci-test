import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProgress } from '@/hooks/use-progress';
import { getToolName } from '@/lib/progress-tracking';

interface NextStepsProps {
  className?: string;
}

export default function NextSteps({ className = '' }: NextStepsProps) {
  const { getNextTool, progress } = useProgress();
  const nextTool = getNextTool();
  
  if (!nextTool) {
    // All tools completed
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-tcof-dark mb-2">Congratulations!</h3>
        <p className="text-gray-600 mb-4">
          You've completed all the tools in the TCOF Toolkit. You can now export your plan or review your work.
        </p>
        <div className="flex space-x-4">
          <Link href="/checklist">
            <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
              View Checklist
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-tcof-dark mb-2">Next Step</h3>
      <p className="text-gray-600 mb-4">
        Continue your journey with the TCOF Toolkit. Your next recommended step is:
      </p>
      
      <div className="bg-tcof-light p-3 rounded-md mb-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-tcof-dark">
            {getToolName(nextTool.toolType)}
          </span>
          <Link href={nextTool.route}>
            <Button size="sm" className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
              {progress.tools[nextTool.toolType].started ? 'Continue' : 'Start'} 
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {progress.overallProgress > 0 
          ? `You're ${progress.overallProgress}% through the TCOF Toolkit`
          : "Start your journey with the TCOF Toolkit"
        }
      </div>
    </div>
  );
}