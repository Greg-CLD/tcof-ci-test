import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle } from 'lucide-react';
import StepNavigation from '@/components/StepNavigation';
import MakeAPlanLayout from '@/layouts/MakeAPlanLayout';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useHeuristicTasks } from '@/hooks/useHeuristicTasks';
import { EditableTaskPanel, StageType } from '@/components/task/EditableTaskPanel';

export default function Block2Step4() {
  const { projectId } = useParams();
  const { toast } = useToast();
  
  // Get the project name
  const { currentProject } = useProjectContext();
  
  // Tool progress tracking
  const { updateToolProgress } = useToolProgress();
  
  // Use our custom hook for heuristic tasks
  const {
    unlinkedHeuristics,
    selectedHeuristicId,
    setSelectedHeuristicId,
    formattedTasks,
    isLoading,
    isSaving,
    saveStatus,
    handleSaveTask,
    handleAddTask,
    handleDeleteTask
  } = useHeuristicTasks(projectId);
  
  // When complete, update progress
  const handleComplete = async () => {
    if (projectId) {
      await updateToolProgress(projectId, 'make-a-plan', 'block-2-step-4', { completed: true });
      toast({
        title: "Progress saved",
        description: "Your progress has been saved successfully",
      });
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <MakeAPlanLayout
        title="Create tasks for your unlinked heuristics"
        description="For any personal heuristics not linked to success factors, you need to create tasks manually."
        currentStep={4}
        block={2}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg text-muted-foreground">Loading your heuristics and tasks...</span>
        </div>
      </MakeAPlanLayout>
    );
  }
  
  return (
    <MakeAPlanLayout
      title="Create tasks for your unlinked heuristics"
      description="For any personal heuristics not linked to success factors, you need to create tasks manually."
      currentStep={4}
      block={2}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Unlinked Personal Heuristics</CardTitle>
            <CardDescription>
              Your personal heuristics that aren't linked to any TCOF Success Factors need manually-created tasks.
              You can add up to 3 tasks per stage for each heuristic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unlinkedHeuristics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold">No unlinked heuristics found</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  All of your personal heuristics are linked to TCOF Success Factors. 
                  This means tasks will be automatically generated for them.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-6">
                {/* Heuristic list */}
                <div className="col-span-12 md:col-span-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-md">Select a heuristic</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                      {unlinkedHeuristics.map(heuristic => (
                        <div
                          key={heuristic.id}
                          className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 border ${
                            selectedHeuristicId === heuristic.id
                              ? 'border-tcof-teal bg-tcof-teal/10'
                              : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedHeuristicId(heuristic.id)}
                        >
                          <div className="font-medium">{heuristic.text}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Task editor */}
                <div className="col-span-12 md:col-span-8">
                  {selectedHeuristicId ? (
                    <EditableTaskPanel
                      title="Heuristic Tasks"
                      description="Add up to 3 tasks per stage for this heuristic."
                      tasks={formattedTasks}
                      onSaveTask={handleSaveTask}
                      onAddTask={handleAddTask}
                      onDeleteTask={handleDeleteTask}
                      isSaving={isSaving}
                      saveStatus={saveStatus}
                    />
                  ) : (
                    <Card className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
                      <div>
                        <p className="mb-2">Select a heuristic from the list to create tasks.</p>
                        <p className="text-sm">You can add up to 3 tasks per stage for each heuristic.</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <StepNavigation
          prevLink={`/make-a-plan/${projectId}/block-2/step-3`}
          nextLink={`/make-a-plan/${projectId}/block-2`}
          onComplete={handleComplete}
        />
      </div>
    </MakeAPlanLayout>
  );
}