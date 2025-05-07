import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  ArrowLeft, Target as TargetIcon, Compass as CompassIcon, 
  GitBranch as GitBranchIcon, File as FileIcon
} from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { GoalMappingTable } from "@/components/GoalMappingTable";
import { GoalMappingView } from "@/components/GoalMappingView";

type ToolNavLinkProps = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  isCurrent?: boolean;
};

function ToolNavLink({ href, label, icon, isCurrent = false }: ToolNavLinkProps) {
  return (
    <Link href={href}>
      <Button 
        variant={isCurrent ? "default" : "ghost"} 
        size="sm"
        className={`flex items-center gap-1 ${isCurrent ? 'bg-tcof-teal text-white hover:bg-tcof-teal/90' : 'text-tcof-dark hover:bg-tcof-light'}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </Link>
  );
}

function ToolNavigation({ currentTool }: { currentTool: 'goal-mapping' | 'cynefin' | 'tcof-journey' }) {
  return (
    <div className="flex justify-between items-center w-full mb-6 pb-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Button>
        </Link>
      </div>
      
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <ToolNavLink 
          href="/tools/goal-mapping" 
          label="Goal-Mapping" 
          icon={<TargetIcon className="h-4 w-4" />} 
          isCurrent={currentTool === 'goal-mapping'} 
        />
        <ToolNavLink 
          href="/tools/cynefin-orientation" 
          label="Cynefin" 
          icon={<CompassIcon className="h-4 w-4" />} 
          isCurrent={currentTool === 'cynefin'} 
        />
        <ToolNavLink 
          href="/tools/tcof-journey" 
          label="TCOF Journey" 
          icon={<GitBranchIcon className="h-4 w-4" />} 
          isCurrent={currentTool === 'tcof-journey'} 
        />
      </div>
      
      <Link href="/tools/starter-access">
        <Button variant="ghost" size="sm" className="flex items-center gap-1 text-tcof-teal">
          <FileIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Pro Tools</span>
        </Button>
      </Link>
    </div>
  );
}

interface GoalMappingToolProps {
  projectId?: string | null;
}

export default function GoalMappingTool({ projectId: propProjectId }: GoalMappingToolProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [isViewMode, setIsViewMode] = useState(false);
  const { currentProject } = useProjectContext();
  
  // Get the project ID from props or context
  const projectId = propProjectId || currentProject?.id;
  
  // Toggle between view and edit modes
  const handleToggleViewMode = () => {
    setIsViewMode(prev => !prev);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold mb-2">🎯 Success Mapping Tool</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleToggleViewMode}>
              {isViewMode ? "Edit Mode" : "View Mode"}
            </Button>
          </div>
        </div>
        <p className="text-gray-600">
          Map out your strategic goals and their relationships to visualize your path to success.
        </p>
      </div>
      
      {showIntro && (
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">How to use the Success Mapping Tool</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowIntro(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-lg"></i>
              </Button>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p>Success Mapping helps you break down your key goals into a hierarchy, from high-level organizational
                values to specific project objectives.</p>
              
              <ol className="list-decimal pl-5 space-y-2 my-4">
                <li><strong>Add goals</strong> using the table interface</li>
                <li><strong>Assign a level</strong> to each goal (1-5)</li>
                <li><strong>Provide timeframes</strong> to track achievement schedules</li>
                <li><strong>Save your draft</strong> regularly as you work</li>
                <li><strong>Submit your plan</strong> when complete</li>
              </ol>
              
              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-300">
                <p className="text-blue-800">Think of this as a goal breakdown structure - start with your highest level
                  goals at the top (Level 1), then break them down into more specific objectives as you move down (Levels 2-5).</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="border rounded-lg">
        {isViewMode ? (
          <GoalMappingView 
            projectId={projectId || ""} 
            onEdit={handleToggleViewMode}
          />
        ) : (
          projectId ? (
            <GoalMappingTable projectId={projectId} />
          ) : (
            <div className="p-6 text-center text-gray-500">
              Please select a project to use the Goal Mapping Tool
            </div>
          )
        )}
      </div>
    </div>
  );
}