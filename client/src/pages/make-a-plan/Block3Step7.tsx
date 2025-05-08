import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react';
import MakeAPlanLayout from '@/layouts/MakeAPlanLayout';
import StepNavigation from '@/components/StepNavigation';
import { useFrameworkTasks } from '@/hooks/useFrameworkTasks';
import { useToolProgress } from '@/hooks/useToolProgress';
import { usePlan } from '@/contexts/PlanContext';
import EditableTaskPanel from '@/components/task/EditableTaskPanel';

export default function Block3Step7() {
  const { projectId } = useParams<{ projectId?: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { updateToolProgress } = useToolProgress();
  const { plan, saveBlock } = usePlan();
  
  // Use our framework tasks hook
  const {
    frameworks,
    selectedFrameworkCode,
    setSelectedFrameworkCode,
    formattedTasks,
    isLoading,
    isSaving,
    saveStatus,
    handleSaveTask,
    handleToggleTaskInclusion,
    getFrameworkName
  } = useFrameworkTasks(projectId);
  
  // Save all data to plan context
  const saveToContext = async () => {
    if (!projectId) return;
    
    try {
      // Save selected tasks to plan context for persistence
      await saveBlock('block3', {
        frameworkTasks: frameworks
      });
      
      toast({
        title: "Tasks saved",
        description: "Your task selections have been saved successfully",
      });
    } catch (error) {
      console.error("Error saving to context:", error);
      toast({
        title: "Error saving tasks",
        description: "Failed to save your task selections",
        variant: "destructive",
      });
    }
  };

  // Mark step as complete and navigate to next step
  const handleComplete = async () => {
    if (!projectId) return;
    
    // Save current state before marking complete
    await saveToContext();
    
    // Mark this step as complete
    await updateToolProgress(projectId, 'make-a-plan', 'block-3-step-7', { completed: true });
    
    // Navigate to block-3 summary page
    navigate(`/make-a-plan/${projectId}/block-3/summary`);
  };

  // Check if any frameworks are available
  const hasFrameworks = (): boolean => {
    return Object.keys(frameworks).length > 0;
  };

  // Loading state
  if (isLoading) {
    return (
      <MakeAPlanLayout
        title="Add Framework Tasks"
        description="Add good practice tasks from your selected frameworks"
        currentStep={7}
        block={3}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg text-muted-foreground">Loading framework tasks...</span>
        </div>
      </MakeAPlanLayout>
    );
  }

  // No frameworks selected state
  if (!hasFrameworks()) {
    return (
      <MakeAPlanLayout
        title="Add Framework Tasks"
        description="Add good practice tasks from your selected frameworks"
        currentStep={7}
        block={3}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>No Frameworks Selected</CardTitle>
            <CardDescription>
              You haven't selected any frameworks in the previous step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please go back to Step 6 and select at least one framework to see tasks here.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => navigate(`/make-a-plan/${projectId}/block-3/step-6`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Framework Selection
            </Button>
          </CardFooter>
        </Card>
        
        <StepNavigation
          prevLink={`/make-a-plan/${projectId}/block-3/step-6`}
          nextLink={`/make-a-plan/${projectId}/block-3/summary`}
          disableComplete={true}
        />
      </MakeAPlanLayout>
    );
  }

  return (
    <MakeAPlanLayout
      title="Add Framework Tasks"
      description="Add good practice tasks from your selected frameworks"
      currentStep={7}
      block={3}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Framework Tasks</CardTitle>
            <CardDescription>
              Select tasks from your chosen frameworks and assign them to project stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-6">
              {/* Framework list */}
              <div className="col-span-12 md:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Frameworks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                    {Object.keys(frameworks).map(frameworkCode => (
                      <div
                        key={frameworkCode}
                        className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 border ${
                          selectedFrameworkCode === frameworkCode
                            ? 'border-tcof-teal bg-tcof-teal/10'
                            : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedFrameworkCode(frameworkCode)}
                      >
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-tcof-teal flex-shrink-0" />
                          <div className="font-medium">
                            {getFrameworkName(frameworkCode)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              {/* Task editor */}
              <div className="col-span-12 md:col-span-8">
                {selectedFrameworkCode ? (
                  <EditableTaskPanel
                    title={`${getFrameworkName(selectedFrameworkCode)} Tasks`}
                    description="Select which tasks to include for this framework and which project stages they belong to."
                    tasks={formattedTasks}
                    onSaveTask={handleSaveTask}
                    onDeleteTask={() => {}} // Not used for frameworks
                    onAddTask={() => {}} // Not used for frameworks
                    isSaving={isSaving}
                    saveStatus={saveStatus}
                    showStatusToggle={true}
                    onUpdateTaskStatus={(taskId, completed) => 
                      handleToggleTaskInclusion(formattedTasks['Identification'].find(t => t.id === taskId)?.stage || 'Identification', taskId)
                    }
                  />
                ) : (
                  <Card className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
                    <div>
                      <p className="mb-2">Select a framework from the list to see available tasks.</p>
                      <p className="text-sm">You can add framework-specific tasks to your project.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(`/make-a-plan/${projectId}/block-3/step-6`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              variant="outline" 
              onClick={saveToContext}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="ml-2 h-4 w-4" /> 
              )}
              Save Progress
            </Button>
          </CardFooter>
        </Card>
        
        <StepNavigation
          prevLink={`/make-a-plan/${projectId}/block-3/step-6`}
          nextLink={`/make-a-plan/${projectId}/block-3/summary`}
          onComplete={handleComplete}
        />
      </div>
    </MakeAPlanLayout>
  );
}