import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { usePersonalHeuristics } from '@/hooks/usePersonalHeuristics';
import { useHeuristicLinks } from '@/hooks/useHeuristicLinks';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
// We don't need ToolCard for this component
import StepNavigation from '@/components/StepNavigation';
import MakeAPlanLayout from '@/layouts/MakeAPlanLayout';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useToolProgress } from '@/hooks/useToolProgress';

export default function Block2Step4() {
  const { projectId } = useParams();
  const { toast } = useToast();
  
  // Get the project name
  const { currentProject } = useProjectContext();
  
  // Tool progress tracking
  const { updateToolProgress } = useToolProgress();
  
  // Get personal heuristics
  const { heuristics, isLoading: loadingHeuristics } = usePersonalHeuristics(projectId);
  
  // Get heuristic links to identify unlinked heuristics
  const { links, isLoading: loadingLinks } = useHeuristicLinks(projectId);
  
  // Get and manage project tasks
  const {
    tasks,
    isLoading: loadingTasks,
    createTask,
    updateTask,
    deleteTask,
    isCreating,
    isUpdating,
    isDeleting,
  } = useProjectTasks(projectId);
  
  // UI state: which heuristic is expanded
  const [expandedHeuristicId, setExpandedHeuristicId] = useState<string | null>(null);
  
  // State to track task text inputs for each heuristic and stage
  const [taskInputs, setTaskInputs] = useState<Record<string, Record<string, string>>>({});
  
  // Keep track of which tasks are being saved
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
  
  // Project stages
  const stages = [
    { id: 'identification', label: 'Identification' },
    { id: 'definition', label: 'Definition' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'closure', label: 'Closure' }
  ];
  
  // Filter to get only unlinked heuristics
  const unlinkedHeuristics = React.useMemo(() => {
    if (!heuristics || !links) return [];
    
    // A heuristic is linked if it appears in any link
    const linkedHeuristicIds = links.map(link => link.heuristicId);
    
    // Return only heuristics that don't appear in any link
    return heuristics.filter(heuristic => !linkedHeuristicIds.includes(heuristic.id));
  }, [heuristics, links]);
  
  // Initialize task inputs when tasks are loaded
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const newTaskInputs: Record<string, Record<string, string>> = {};
      
      // Group tasks by heuristic and stage
      tasks.forEach(task => {
        if (task.origin === 'heuristic') {
          if (!newTaskInputs[task.sourceId]) {
            newTaskInputs[task.sourceId] = {};
          }
          
          // If we already have 3 tasks for this heuristic and stage, skip
          const existingTasksForStage = tasks.filter(
            t => t.sourceId === task.sourceId && t.stage === task.stage && t.origin === 'heuristic'
          );
          
          const stageKey = `${task.stage}-${existingTasksForStage.indexOf(task)}`;
          newTaskInputs[task.sourceId][stageKey] = task.text;
        }
      });
      
      setTaskInputs(newTaskInputs);
    }
  }, [tasks]);
  
  // Handle saving a task
  const handleSaveTask = async (heuristicId: string, stage: string, text: string, existingTaskId?: string) => {
    if (!text.trim()) return;
    
    const taskKey = `${heuristicId}-${stage}${existingTaskId ? `-${existingTaskId}` : ''}`;
    setSavingStatus(prev => ({ ...prev, [taskKey]: true }));
    
    try {
      if (existingTaskId) {
        // Update existing task
        await updateTask(existingTaskId, { text });
        toast({
          title: "Task updated",
          description: "Your task has been updated successfully",
        });
      } else {
        // Create new task
        const existingTasksForStage = tasks ? tasks.filter(
          t => t.sourceId === heuristicId && t.stage === stage && t.origin === 'heuristic'
        ) : [];
        
        // Only allow up to 3 tasks per stage per heuristic
        if (existingTasksForStage.length >= 3) {
          toast({
            title: "Maximum tasks reached",
            description: "You can only have up to 3 tasks per stage for each heuristic",
            variant: "destructive",
          });
          setSavingStatus(prev => ({ ...prev, [taskKey]: false }));
          return;
        }
        
        await createTask({
          projectId: projectId || '',
          text,
          stage: stage as 'identification' | 'definition' | 'delivery' | 'closure',
          origin: 'heuristic',
          sourceId: heuristicId,
        });
        
        toast({
          title: "Task created",
          description: "Your task has been saved successfully",
        });
        
        // Clear the input after successful creation
        setTaskInputs(prev => {
          const newInputs = { ...prev };
          if (!newInputs[heuristicId]) newInputs[heuristicId] = {};
          newInputs[heuristicId][`${stage}-new`] = '';
          return newInputs;
        });
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error saving task",
        description: "There was an error saving your task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingStatus(prev => ({ ...prev, [taskKey]: false }));
    }
  };
  
  // Handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error deleting task",
        description: "There was an error deleting your task. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle input change for task text
  const handleTaskInputChange = (
    heuristicId: string,
    stage: string,
    value: string,
    index: number
  ) => {
    setTaskInputs(prev => {
      const newInputs = { ...prev };
      if (!newInputs[heuristicId]) newInputs[heuristicId] = {};
      newInputs[heuristicId][`${stage}-${index}`] = value;
      return newInputs;
    });
  };
  
  // Handle task editing saving (triggered by blur or enter key)
  const handleTaskBlur = (
    heuristicId: string,
    stage: string,
    text: string,
    taskId?: string
  ) => {
    if (text.trim()) {
      handleSaveTask(heuristicId, stage, text, taskId);
    }
  };
  
  // Handle enter key for task input
  const handleTaskKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    heuristicId: string,
    stage: string,
    text: string,
    taskId?: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTaskBlur(heuristicId, stage, text, taskId);
    }
  };
  
  // Get the tasks for a specific heuristic and stage
  const getTasksForHeuristic = (heuristicId: string, stage: string) => {
    if (!tasks) return [];
    
    return tasks.filter(
      task => task.sourceId === heuristicId && 
              task.stage === stage && 
              task.origin === 'heuristic'
    );
  };
  
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
  if (loadingHeuristics || loadingLinks || loadingTasks) {
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
              <div className="space-y-6">
                {unlinkedHeuristics.map(heuristic => (
                  <Card key={heuristic.id} className="border-tcof-blue">
                    <CardHeader 
                      className="cursor-pointer hover:bg-slate-50" 
                      onClick={() => setExpandedHeuristicId(
                        expandedHeuristicId === heuristic.id ? null : heuristic.id
                      )}
                    >
                      <CardTitle className="text-lg">{heuristic.text}</CardTitle>
                    </CardHeader>
                    
                    {expandedHeuristicId === heuristic.id && (
                      <CardContent>
                        <Tabs defaultValue="identification">
                          <TabsList className="mb-4">
                            {stages.map(stage => (
                              <TabsTrigger key={stage.id} value={stage.id}>
                                {stage.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          
                          {stages.map(stage => (
                            <TabsContent key={stage.id} value={stage.id}>
                              <TasksForStage
                                stage={stage.id}
                                heuristics={[heuristic]}
                                getTasksForHeuristic={getTasksForHeuristic}
                                onSaveTask={handleSaveTask}
                                onDeleteTask={handleDeleteTask}
                                isSaving={isCreating || isUpdating}
                                saveStatus={savingStatus}
                              />
                            </TabsContent>
                          ))}
                        </Tabs>
                      </CardContent>
                    )}
                  </Card>
                ))}
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

interface TasksForStageProps {
  stage: string;
  heuristics: Array<{
    id: string;
    text: string;
  }>;
  getTasksForHeuristic: (heuristicId: string, stage: string) => any[];
  onSaveTask: (heuristicId: string, stage: string, text: string, existingTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  isSaving: boolean;
  saveStatus: Record<string, boolean>;
}

function TasksForStage({
  stage,
  heuristics,
  getTasksForHeuristic,
  onSaveTask,
  onDeleteTask,
  isSaving,
  saveStatus,
}: TasksForStageProps) {
  return (
    <div className="space-y-6">
      {heuristics.map(heuristic => (
        <div key={`${heuristic.id}-${stage}`} className="space-y-4">
          <h3 className="text-md font-medium">Tasks for this stage:</h3>
          
          <TaskList
            heuristicId={heuristic.id}
            stage={stage}
            tasks={getTasksForHeuristic(heuristic.id, stage)}
            onSaveTask={onSaveTask}
            onDeleteTask={onDeleteTask}
            isSaving={isSaving}
            saveStatus={saveStatus}
          />
        </div>
      ))}
    </div>
  );
}

interface TaskListProps {
  heuristicId: string;
  stage: string;
  tasks: any[];
  onSaveTask: (heuristicId: string, stage: string, text: string, existingTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  isSaving: boolean;
  saveStatus: Record<string, boolean>;
}

function TaskList({
  heuristicId,
  stage,
  tasks,
  onSaveTask,
  onDeleteTask,
  isSaving,
  saveStatus,
}: TaskListProps) {
  const [newTaskText, setNewTaskText] = useState('');
  
  // Handle saving a new task
  const handleSaveNewTask = () => {
    if (newTaskText.trim()) {
      onSaveTask(heuristicId, stage, newTaskText);
      setNewTaskText('');
    }
  };
  
  // Handle editing an existing task
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  
  // Start editing a task
  const handleEditTask = (taskId: string, text: string) => {
    setEditTaskId(taskId);
    setEditTaskText(text);
  };
  
  // Save edits to an existing task
  const handleSaveEdit = (taskId: string) => {
    if (editTaskText.trim()) {
      onSaveTask(heuristicId, stage, editTaskText, taskId);
      setEditTaskId(null);
    }
  };
  
  // Cancel task editing
  const handleCancelEdit = () => {
    setEditTaskId(null);
  };
  
  // Handle keypress in edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, taskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(taskId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  // Determine if we've reached the maximum number of tasks (3) for this stage
  const maxTasksReached = tasks.length >= 3;
  
  return (
    <div className="space-y-4">
      {/* Existing tasks */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              {editTaskId === task.id ? (
                // Edit mode
                <>
                  <Input
                    value={editTaskText}
                    onChange={(e) => setEditTaskText(e.target.value)}
                    onBlur={() => handleSaveEdit(task.id)}
                    onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                    className="flex-1"
                    autoFocus
                  />
                  {saveStatus[`${heuristicId}-${stage}-${task.id}`] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                </>
              ) : (
                // View mode
                <>
                  <div 
                    className="flex-1 py-2 px-3 bg-gray-50 rounded-md cursor-text"
                    onClick={() => handleEditTask(task.id, task.text)}
                  >
                    {task.text}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-4 text-center bg-gray-50 rounded-md">
          <p className="text-muted-foreground">No tasks yet. Add up to 3 tasks for this stage.</p>
        </div>
      )}
      
      {/* Add new task input */}
      {!maxTasksReached && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add a new task for this stage..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveNewTask();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSaveNewTask}
            disabled={!newTaskText.trim() || isSaving}
            size="sm"
          >
            {saveStatus[`${heuristicId}-${stage}-new`] ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add
          </Button>
        </div>
      )}
      
      {maxTasksReached && (
        <div className="flex items-center text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-2" />
          Maximum of 3 tasks reached for this stage
        </div>
      )}
      
      <Separator className="my-4" />
    </div>
  );
}