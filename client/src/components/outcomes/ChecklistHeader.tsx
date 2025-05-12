import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { PlusCircle, Clock, Info, FileText, Mail } from "lucide-react";
import { format } from "date-fns";
import { useOutcomes } from "@/hooks/useOutcomes";
import { OutcomeSelectorModal } from "./OutcomeSelectorModal";
import { OutcomeRadarChart, type OutcomeRadarChartRef } from "./OutcomeRadarChart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { exportOutcomesToPDF } from "@/lib/pdfExport";
import { useQuery } from "@tanstack/react-query";
import { RadarChart, type RadarChartPoint } from "@/components/checklist/RadarChart";
import { Stage, TaskItem, GoodPracticeTask, PlanRecord, loadPlan } from "@/lib/plan-db";
import { usePlan } from "@/contexts/PlanContext";

interface ChecklistHeaderProps {
  projectId: string;
}

export function ChecklistHeader({ projectId }: ChecklistHeaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSelectingOutcomes, setIsSelectingOutcomes] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEmailingTaskList, setIsEmailingTaskList] = useState(false);
  const radarChartRef = useRef<OutcomeRadarChartRef>(null);
  const { selectedPlanId } = usePlan();
  
  // Get project details for the PDF header
  const { data: projectData } = useQuery<{ id: string; name: string; description: string }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  
  const {
    selectedOutcomes,
    progressValues,
    latestProgress,
    allGoalMapOutcomes,
    updateProgress,
    isUpdatingProgress,
  } = useOutcomes({ projectId });
  
  // Format the last update timestamp
  const formatLastUpdate = (outcomeId: string): string => {
    const timestamp = latestProgress[outcomeId]?.updatedAt;
    if (!timestamp) return "";
    
    try {
      return format(new Date(timestamp), "yyyy-MM-dd");
    } catch (e) {
      return "";
    }
  };

  // Transform outcomes data into radar chart format
  const radarChartData: RadarChartPoint[] = useMemo(() => {
    return selectedOutcomes.map(outcome => ({
      id: outcome.id,
      label: outcome.title,
      value: progressValues[outcome.id] ?? 0
    }));
  }, [selectedOutcomes, progressValues]);
  
  // Determine if user can edit outcome progress
  // For this implementation we'll check if user is authenticated
  const canEditProgress = !!user;
  
  // Handle PDF export
  const handleExportPDF = async () => {
    if (!user) return;
    
    try {
      setIsExporting(true);
      const svgElement = radarChartRef.current?.getSvgElement();
      
      if (!svgElement) {
        toast({
          title: "Export failed",
          description: "Could not create PDF from the chart.",
          variant: "destructive",
        });
        return;
      }
      
      // Use nullish coalescing to handle type safety
      const projectName = projectData && 'name' in projectData 
        ? projectData.name 
        : 'Project';
      
      const success = await exportOutcomesToPDF(
        projectName,
        svgElement,
        selectedOutcomes,
        Object.values(latestProgress)
      );
      
      if (success) {
        toast({
          title: "PDF ready!",
          description: "Check your downloads.",
          variant: "default",
        });
      } else {
        toast({
          title: "Export failed",
          description: "Unable to generate PDF.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export failed",
        description: "Unable to generate PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Check if there are any tasks in the plan
  const checkForTasks = async (): Promise<boolean> => {
    if (!selectedPlanId) return false;
    
    // Load the current plan
    const plan = await loadPlan(selectedPlanId);
    if (!plan) return false;
    
    // Check if there are any tasks in any stage
    let hasTasks = false;
    Object.keys(plan.stages).forEach((stageName) => {
      const stage = stageName as Stage;
      const stageData = plan.stages[stage];
      
      // Regular tasks
      if (stageData.tasks && stageData.tasks.length > 0) {
        hasTasks = true;
      }
      
      // Good practice tasks
      if (stageData.goodPractice?.tasks && stageData.goodPractice.tasks.length > 0) {
        hasTasks = true;
      }
    });
    
    return hasTasks;
  };
  
  // Track if there are tasks in the plan
  const [hasTasks, setHasTasks] = useState<boolean | null>(null);
  
  // Check for tasks when the plan changes
  useEffect(() => {
    const checkTasks = async () => {
      if (selectedPlanId) {
        const result = await checkForTasks();
        setHasTasks(result);
      } else {
        setHasTasks(false);
      }
    };
    
    checkTasks();
  }, [selectedPlanId]);
  
  // Handle Email Task List
  const handleEmailTaskList = async () => {
    try {
      setIsEmailingTaskList(true);
      
      if (!selectedPlanId) {
        toast({
          title: "No plan selected",
          description: "Please select a project plan first.",
          variant: "destructive",
        });
        return;
      }
      
      // Check again if there are tasks
      const tasksExist = await checkForTasks();
      if (!tasksExist) {
        toast({
          title: "No tasks to email",
          description: "Please add some tasks to your plan first.",
          variant: "destructive",
        });
        return;
      }
      
      // Get project name from data
      const projectName = projectData && 'name' in projectData 
        ? projectData.name 
        : 'Project';
      
      // Load the current plan
      const plan = await loadPlan(selectedPlanId);
      if (!plan) {
        toast({
          title: "Plan not found",
          description: "Unable to load the current project plan.",
          variant: "destructive",
        });
        return;
      }
      
      // Collect all tasks across stages
      const tasksByStage: Record<Stage, Array<TaskItem | GoodPracticeTask>> = {
        'Identification': [],
        'Definition': [],
        'Delivery': [],
        'Closure': []
      };
      
      // Process tasks for each stage
      Object.keys(plan.stages).forEach((stageName) => {
        const stage = stageName as Stage;
        const stageData = plan.stages[stage];
        
        // Regular tasks
        if (stageData.tasks && stageData.tasks.length > 0) {
          tasksByStage[stage].push(...stageData.tasks);
        }
        
        // Good practice tasks
        if (stageData.goodPractice?.tasks && stageData.goodPractice.tasks.length > 0) {
          tasksByStage[stage].push(...stageData.goodPractice.tasks);
        }
      });
      
      // Format email body
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      let emailBody = `Project: ${projectName}\nDate: ${currentDate}\n\n`;
      
      // Add tasks by stage
      Object.keys(tasksByStage).forEach((stageName) => {
        const stage = stageName as Stage;
        const stageTasks = tasksByStage[stage];
        
        if (stageTasks.length > 0) {
          emailBody += `${stage}:\n`;
          
          stageTasks.forEach((task) => {
            const checkbox = task.completed ? '[x]' : '[ ]';
            const taskText = task.text;
            const owner = 'owner' in task ? task.owner || 'Unassigned' : 'Unassigned';
            const status = task.completed ? 'Done' : 'To Do';
            
            emailBody += ` • ${checkbox} ${taskText} — Owner: ${owner} — Status: ${status}\n`;
          });
          
          emailBody += '\n';
        }
      });
      
      // Create and open mailto link
      const subject = `TCOF Task List – ${projectName}`;
      
      try {
        // Handle potential encoding issues with special characters
        const encodedBody = encodeURIComponent(emailBody);
        const encodedSubject = encodeURIComponent(subject);
        
        // Check if the mailto URI might be too long (most email clients have limits around 2000 chars)
        if (encodedBody.length > 1500) {
          // If too long, truncate and add a note
          const truncatedBody = encodedBody.substring(0, 1500) + encodeURIComponent("\n\n[Note: Task list was truncated due to length. Please use the app to view all tasks.]");
          const mailtoLink = `mailto:?subject=${encodedSubject}&body=${truncatedBody}`;
          
          // Open the email client
          window.location.href = mailtoLink;
          
          // Show warning toast
          toast({
            title: "Task list was truncated",
            description: "The task list was too long and was shortened for email compatibility.",
            variant: "destructive",
          });
        } else {
          // Normal case - open with full content
          const mailtoLink = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
          
          // Open the email client
          window.location.href = mailtoLink;
          
          // Show confirmation toast
          toast({
            title: "Launching email client",
            description: "Your task list will open in your mail app.",
          });
        }
      } catch (encodingError) {
        console.error('Encoding error:', encodingError);
        
        // Fallback with simplified content if encoding fails
        try {
          // Create a simpler version without special characters
          const simplifiedBody = `Task list for project: ${projectName}\nDate: ${format(new Date(), 'yyyy-MM-dd')}\n\nPlease view the full task list in the TCOF app.`;
          const fallbackLink = `mailto:?subject=${encodeURIComponent("TCOF Task List")}&body=${encodeURIComponent(simplifiedBody)}`;
          
          window.location.href = fallbackLink;
          
          toast({
            title: "Email client opened with limited content",
            description: "Some special characters couldn't be included in the email.",
            variant: "destructive",
          });
        } catch (fallbackError) {
          // If even the fallback fails, show an error
          console.error('Fallback encoding error:', fallbackError);
          throw new Error("Unable to generate email with this content. Please try again with fewer tasks.");
        }
      }
    } catch (error) {
      console.error('Email task list error:', error);
      toast({
        title: "Error sending task list",
        description: "Unable to generate the email.",
        variant: "destructive",
      });
    } finally {
      setIsEmailingTaskList(false);
    }
  };
  
  return (
    <div className="space-y-4 mb-8">
      {selectedOutcomes.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Outcome Progress</h3>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={handleExportPDF}
                        disabled={!user || isExporting}
                      >
                        {isExporting ? (
                          <div className="animate-spin mr-1 h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 mr-1" />
                        )}
                        <span>{isExporting ? "Exporting..." : "📄 Export PDF"}</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!user && (
                    <TooltipContent>
                      <p>You must be logged in to export a PDF.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                {selectedOutcomes.map((outcome) => (
                  <div key={outcome.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{outcome.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="font-medium text-primary mr-2">
                          {progressValues[outcome.id] ?? 0}%
                        </span>
                        {formatLastUpdate(outcome.id) && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            (Updated: {formatLastUpdate(outcome.id)})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Slider
                              defaultValue={[progressValues[outcome.id] ?? 0]}
                              max={100}
                              step={5}
                              value={[progressValues[outcome.id] ?? 0]}
                              onValueChange={(value) => {
                                // Update local state immediately for responsive UI
                              }}
                              onValueCommit={(value) => {
                                // Only save to server when the slider is released
                                if (canEditProgress) {
                                  updateProgress(outcome.id, value[0]);
                                }
                              }}
                              disabled={!canEditProgress || isUpdatingProgress}
                              className={!canEditProgress ? "cursor-not-allowed opacity-70" : ""}
                            />
                          </div>
                        </TooltipTrigger>
                        {!canEditProgress && (
                          <TooltipContent>
                            <p>You need to be a Pro user to track outcome progress</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
                
                <div className="flex items-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSelectingOutcomes(true)}
                    className="flex items-center gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Manage Outcomes</span>
                  </Button>
                </div>
                
                {/* Mini radar chart for small screens */}
                <div className="mt-6 block lg:hidden">
                  <div className="p-2 border border-gray-100 rounded-md bg-gray-50">
                    <h4 className="text-xs font-medium text-center mb-2 text-gray-600">Progress Overview</h4>
                    <div className="flex justify-center">
                      <RadarChart data={radarChartData} size={180} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-col justify-center items-center hidden lg:flex">
                {/* Large radar chart section for PDF export */}
                <OutcomeRadarChart
                  ref={radarChartRef}
                  outcomes={selectedOutcomes}
                  outcomeProgress={Object.values(latestProgress)}
                />
                
                {/* Mini radar chart for larger screens */}
                <div className="mt-4 p-3 border border-gray-100 rounded-md bg-gray-50">
                  <h4 className="text-xs font-medium text-center mb-2 text-gray-600">Live Progress Summary</h4>
                  <RadarChart data={radarChartData} size={150} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Email Task List button card */}
      <Card className="bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h3 className="text-lg font-semibold">Task Management</h3>
              <p className="text-sm text-gray-600 mt-1">
                Share and collaborate on project tasks
              </p>
            </div>
            
            <div className="mt-3 md:mt-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        size="default"
                        className="flex items-center gap-2"
                        onClick={handleEmailTaskList}
                        disabled={isEmailingTaskList || !selectedPlanId || hasTasks === false}
                        data-testid="email-task-list-button"
                        aria-label="Email task list to collaborators"
                      >
                        {isEmailingTaskList ? (
                          <div className="animate-spin mr-1 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        <span>{isEmailingTaskList ? "Generating..." : "Email Task List"}</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!selectedPlanId && (
                    <TooltipContent>
                      <p>Please select a project plan first</p>
                    </TooltipContent>
                  )}
                  {selectedPlanId && hasTasks === false && (
                    <TooltipContent>
                      <p>No tasks to email. Add tasks to your plan first.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
      
      
      <OutcomeSelectorModal
        isOpen={isSelectingOutcomes}
        onClose={() => setIsSelectingOutcomes(false)}
        projectId={projectId}
        existingOutcomes={allGoalMapOutcomes}
      />
    </div>
  );
}