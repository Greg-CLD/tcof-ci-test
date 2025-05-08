import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useProjectPolicies } from '@/hooks/useProjectPolicies';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Edit, 
  Save, 
  X 
} from 'lucide-react';
import StepNavigation from '@/components/StepNavigation';
import MakeAPlanLayout from '@/layouts/MakeAPlanLayout';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useToolProgress } from '@/hooks/useToolProgress';

export default function Block2Step5() {
  const { projectId } = useParams();
  const { toast } = useToast();
  
  // Get the project name
  const { currentProject } = useProjectContext();
  
  // Tool progress tracking
  const { updateToolProgress } = useToolProgress();
  
  // Get policies for this project
  const { 
    policies, 
    isLoading: loadingPolicies, 
    createPolicy,
    updatePolicy,
    deletePolicy,
    isCreating: isCreatingPolicy,
    isDeleting: isDeletingPolicy 
  } = useProjectPolicies(projectId);
  
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
  
  // UI state: which policy is expanded
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);
  
  // State for new policy input
  const [newPolicyName, setNewPolicyName] = useState('');
  
  // State to track task text inputs for each policy and stage
  const [taskInputs, setTaskInputs] = useState<Record<string, Record<string, string>>>({});
  
  // Keep track of which tasks are being saved
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
  
  // Policy editing states
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editedPolicyName, setEditedPolicyName] = useState('');
  
  // Project stages
  const stages = [
    { id: 'identification', label: 'Identification' },
    { id: 'definition', label: 'Definition' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'closure', label: 'Closure' }
  ];
  
  // Initialize task inputs when tasks are loaded
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const newTaskInputs: Record<string, Record<string, string>> = {};
      
      // Group tasks by policy and stage
      tasks.forEach(task => {
        if (task.origin === 'policy') {
          if (!newTaskInputs[task.sourceId]) {
            newTaskInputs[task.sourceId] = {};
          }
          
          // If we already have 3 tasks for this policy and stage, skip
          const existingTasksForStage = tasks.filter(
            t => t.sourceId === task.sourceId && t.stage === task.stage && t.origin === 'policy'
          );
          
          const stageKey = `${task.stage}-${existingTasksForStage.indexOf(task)}`;
          newTaskInputs[task.sourceId][stageKey] = task.text;
        }
      });
      
      setTaskInputs(newTaskInputs);
    }
  }, [tasks]);
  
  // Handle creating a new policy
  const handleCreatePolicy = async () => {
    if (!newPolicyName.trim()) {
      toast({
        title: "Policy name required",
        description: "Please enter a name for the policy",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createPolicy(newPolicyName);
      setNewPolicyName('');
      toast({
        title: "Policy created",
        description: "Your policy has been created successfully",
      });
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({
        title: "Error creating policy",
        description: "There was an error creating your policy. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle updating a policy
  const handleUpdatePolicy = async (policyId: string) => {
    if (!editedPolicyName.trim()) {
      toast({
        title: "Policy name required",
        description: "Please enter a name for the policy",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updatePolicy(policyId, editedPolicyName);
      setEditingPolicyId(null);
      toast({
        title: "Policy updated",
        description: "Your policy has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating policy:', error);
      toast({
        title: "Error updating policy",
        description: "There was an error updating your policy. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle deleting a policy
  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this policy? All associated tasks will also be deleted.")) {
      return;
    }
    
    try {
      await deletePolicy(policyId);
      if (expandedPolicyId === policyId) {
        setExpandedPolicyId(null);
      }
      toast({
        title: "Policy deleted",
        description: "Your policy has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast({
        title: "Error deleting policy",
        description: "There was an error deleting your policy. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Start editing a policy
  const handleStartEditPolicy = (policyId: string, currentName: string) => {
    setEditingPolicyId(policyId);
    setEditedPolicyName(currentName);
  };
  
  // Cancel editing a policy
  const handleCancelEditPolicy = () => {
    setEditingPolicyId(null);
  };
  
  // Handle saving a task
  const handleSaveTask = async (policyId: string, stage: string, text: string, existingTaskId?: string) => {
    if (!text.trim()) return;
    
    const taskKey = `${policyId}-${stage}${existingTaskId ? `-${existingTaskId}` : ''}`;
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
          t => t.sourceId === policyId && t.stage === stage && t.origin === 'policy'
        ) : [];
        
        // Only allow up to 3 tasks per stage per policy
        if (existingTasksForStage.length >= 3) {
          toast({
            title: "Maximum tasks reached",
            description: "You can only have up to 3 tasks per stage for each policy",
            variant: "destructive",
          });
          setSavingStatus(prev => ({ ...prev, [taskKey]: false }));
          return;
        }
        
        await createTask({
          projectId: projectId || '',
          text,
          stage: stage as 'identification' | 'definition' | 'delivery' | 'closure',
          origin: 'policy',
          sourceId: policyId,
        });
        
        toast({
          title: "Task created",
          description: "Your task has been saved successfully",
        });
        
        // Clear the input after successful creation
        setTaskInputs(prev => {
          const newInputs = { ...prev };
          if (!newInputs[policyId]) newInputs[policyId] = {};
          newInputs[policyId][`${stage}-new`] = '';
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
    policyId: string,
    stage: string,
    value: string,
    index: number
  ) => {
    setTaskInputs(prev => {
      const newInputs = { ...prev };
      if (!newInputs[policyId]) newInputs[policyId] = {};
      newInputs[policyId][`${stage}-${index}`] = value;
      return newInputs;
    });
  };
  
  // Handle task editing saving (triggered by blur or enter key)
  const handleTaskBlur = (
    policyId: string,
    stage: string,
    text: string,
    taskId?: string
  ) => {
    if (text.trim()) {
      handleSaveTask(policyId, stage, text, taskId);
    }
  };
  
  // Handle enter key for task input
  const handleTaskKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    policyId: string,
    stage: string,
    text: string,
    taskId?: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTaskBlur(policyId, stage, text, taskId);
    }
  };
  
  // Get the tasks for a specific policy and stage
  const getTasksForPolicy = (policyId: string, stage: string) => {
    if (!tasks) return [];
    
    return tasks.filter(
      task => task.sourceId === policyId && 
              task.stage === stage && 
              task.origin === 'policy'
    );
  };
  
  // When complete, update progress
  const handleComplete = async () => {
    if (projectId) {
      await updateToolProgress(projectId, 'make-a-plan', 'block-2-step-5', { completed: true });
      toast({
        title: "Progress saved",
        description: "Your progress has been saved successfully",
      });
    }
  };
  
  // Loading state
  if (loadingPolicies || loadingTasks) {
    return (
      <MakeAPlanLayout
        title="Create policy tasks"
        description="Define organizational policy groups and create tasks for each policy."
        currentStep={5}
        block={2}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg text-muted-foreground">Loading your policies and tasks...</span>
        </div>
      </MakeAPlanLayout>
    );
  }
  
  return (
    <MakeAPlanLayout
      title="Create policy tasks"
      description="Define organizational policy groups and create tasks for each policy."
      currentStep={5}
      block={2}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organizational Policy Tasks</CardTitle>
            <CardDescription>
              Create policy groups and define tasks for each stage of your project.
              You can add up to 3 tasks per stage for each policy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add new policy input */}
            <div className="flex items-end gap-2 mb-6">
              <div className="flex-1">
                <Label htmlFor="new-policy">Add new policy</Label>
                <Input
                  id="new-policy"
                  placeholder="Enter policy name"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleCreatePolicy} 
                disabled={isCreatingPolicy || !newPolicyName.trim()}
              >
                {isCreatingPolicy ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Policy
              </Button>
            </div>
            
            {/* Policies list */}
            {(!policies || policies.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-xl font-semibold">No policies found</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Add a policy group to start defining your policy tasks.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {policies.map(policy => (
                  <Card key={policy.id} className="border-tcof-blue">
                    <CardHeader 
                      className={`${editingPolicyId !== policy.id ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                      onClick={() => {
                        if (editingPolicyId !== policy.id) {
                          setExpandedPolicyId(
                            expandedPolicyId === policy.id ? null : policy.id
                          );
                        }
                      }}
                    >
                      {editingPolicyId === policy.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedPolicyName}
                            onChange={(e) => setEditedPolicyName(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdatePolicy(policy.id)}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={handleCancelEditPolicy}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{policy.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditPolicy(policy.id, policy.name);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePolicy(policy.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    
                    {expandedPolicyId === policy.id && (
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
                                policies={[policy]}
                                getTasksForPolicy={getTasksForPolicy}
                                onSaveTask={handleSaveTask}
                                onDeleteTask={handleDeleteTask}
                                isSaving={isCreating || isUpdating}
                                saveStatus={savingStatus}
                                taskInputs={taskInputs}
                                onTaskInputChange={handleTaskInputChange}
                                onTaskBlur={handleTaskBlur}
                                onTaskKeyDown={handleTaskKeyDown}
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
          prevLink={`/make-a-plan/${projectId}/block-2/step-4`}
          nextLink={`/make-a-plan/${projectId}/block-2`}
          onComplete={handleComplete}
        />
      </div>
    </MakeAPlanLayout>
  );
}

interface TasksForStageProps {
  stage: string;
  policies: Array<{
    id: string;
    name: string;
  }>;
  getTasksForPolicy: (policyId: string, stage: string) => any[];
  onSaveTask: (policyId: string, stage: string, text: string, existingTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  isSaving: boolean;
  saveStatus: Record<string, boolean>;
  taskInputs: Record<string, Record<string, string>>;
  onTaskInputChange: (policyId: string, stage: string, value: string, index: number) => void;
  onTaskBlur: (policyId: string, stage: string, text: string, taskId?: string) => void;
  onTaskKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, policyId: string, stage: string, text: string, taskId?: string) => void;
}

function TasksForStage({
  stage,
  policies,
  getTasksForPolicy,
  onSaveTask,
  onDeleteTask,
  isSaving,
  saveStatus,
  taskInputs,
  onTaskInputChange,
  onTaskBlur,
  onTaskKeyDown,
}: TasksForStageProps) {
  return (
    <div className="space-y-6">
      {policies.map(policy => (
        <div key={`${policy.id}-${stage}`} className="space-y-4">
          <h3 className="text-md font-medium">Tasks for this stage:</h3>
          
          <TaskList
            policyId={policy.id}
            stage={stage}
            tasks={getTasksForPolicy(policy.id, stage)}
            onSaveTask={onSaveTask}
            onDeleteTask={onDeleteTask}
            isSaving={isSaving}
            saveStatus={saveStatus}
            taskInputs={taskInputs}
            onTaskInputChange={onTaskInputChange}
            onTaskBlur={onTaskBlur}
            onTaskKeyDown={onTaskKeyDown}
          />
        </div>
      ))}
    </div>
  );
}

interface TaskListProps {
  policyId: string;
  stage: string;
  tasks: any[];
  onSaveTask: (policyId: string, stage: string, text: string, existingTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  isSaving: boolean;
  saveStatus: Record<string, boolean>;
  taskInputs: Record<string, Record<string, string>>;
  onTaskInputChange: (policyId: string, stage: string, value: string, index: number) => void;
  onTaskBlur: (policyId: string, stage: string, text: string, taskId?: string) => void;
  onTaskKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, policyId: string, stage: string, text: string, taskId?: string) => void;
}

function TaskList({
  policyId,
  stage,
  tasks,
  onSaveTask,
  onDeleteTask,
  isSaving,
  saveStatus,
  taskInputs,
  onTaskInputChange,
  onTaskBlur,
  onTaskKeyDown,
}: TaskListProps) {
  const [newTaskText, setNewTaskText] = useState('');
  
  // Handle saving a new task
  const handleSaveNewTask = () => {
    if (newTaskText.trim()) {
      onSaveTask(policyId, stage, newTaskText);
      setNewTaskText('');
    }
  };
  
  // Determine if we've reached the maximum number of tasks (3) for this stage
  const maxTasksReached = tasks.length >= 3;
  
  return (
    <div className="space-y-4">
      {/* Existing tasks */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <div key={task.id} className="flex items-center gap-2 group">
              <Input
                value={taskInputs[policyId]?.[`${stage}-${index}`] || task.text}
                onChange={(e) => onTaskInputChange(policyId, stage, e.target.value, index)}
                onBlur={() => onTaskBlur(policyId, stage, taskInputs[policyId]?.[`${stage}-${index}`] || task.text, task.id)}
                onKeyDown={(e) => onTaskKeyDown(e, policyId, stage, taskInputs[policyId]?.[`${stage}-${index}`] || task.text, task.id)}
                className="flex-1"
              />
              <Button 
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDeleteTask(task.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              {saveStatus[`${policyId}-${stage}-${task.id}`] && (
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tasks yet. Add up to 3 tasks for this stage.</p>
      )}
      
      {/* Add new task input */}
      {!maxTasksReached && (
        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="Add a new task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTaskText.trim()) {
                e.preventDefault();
                handleSaveNewTask();
              }
            }}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveNewTask}
            disabled={!newTaskText.trim() || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Task
          </Button>
        </div>
      )}
    </div>
  );
}