import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ArrowLeft, ArrowRight, Plus, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProjectBanner from "@/components/ProjectBanner";
import { usePersonalHeuristics } from "@/hooks/usePersonalHeuristics";
import { useHeuristicLinks } from "@/hooks/useHeuristicLinks";
import { useProjectTasks, type ProjectTask } from "@/hooks/useProjectTasks";

export default function Block2Step4() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("identification");
  const [saveStatus, setSaveStatus] = useState<Record<string, boolean>>({});
  
  // Fetch personal heuristics
  const { data: personalHeuristics = [], isLoading: isLoadingHeuristics } = usePersonalHeuristics(projectId);
  
  // Fetch heuristic links to filter out linked heuristics
  const { heuristicLinks, getLinkedHeuristics } = useHeuristicLinks(projectId);
  
  // Fetch project tasks
  const { 
    tasks, 
    getTasksForHeuristic, 
    saveTask, 
    deleteTask, 
    isLoading: isLoadingTasks, 
    isSaving 
  } = useProjectTasks(projectId);
  
  // Get list of linked heuristic IDs
  const linkedHeuristicIds = getLinkedHeuristics();
  
  // Filter to get only unlinked heuristics
  const unlinkedHeuristics = personalHeuristics.filter(
    h => !linkedHeuristicIds.includes(h.id)
  );
  
  // Handler for saving a task
  const handleSaveTask = async (heuristicId: string, stage: string, text: string, existingTaskId?: string) => {
    if (!text.trim()) return;
    if (!projectId) return;
    
    try {
      // Set saving status for this specific task
      setSaveStatus(prev => ({ ...prev, [`${heuristicId}-${stage}-${text}`]: true }));
      
      // Prepare task data
      const taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId,
        text: text.trim(),
        stage: stage as 'identification' | 'definition' | 'delivery' | 'closure',
        origin: 'heuristic',
        sourceId: heuristicId
      };
      
      // If we have an existing task ID, include it in the request for update
      if (existingTaskId) {
        Object.assign(taskData, { id: existingTaskId });
      }
      
      // Save the task
      await saveTask(taskData);
      
      // Show saved indicator and then clear it after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [`${heuristicId}-${stage}-${text}`]: false }));
      }, 3000);
      
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error saving task",
        description: "There was a problem saving your task. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handler for deleting a task
  const handleDeleteTask = async (taskId: string) => {
    if (!taskId) return;
    
    try {
      await deleteTask(taskId);
      toast({
        title: "Task deleted",
        description: "The task has been removed successfully."
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error deleting task",
        description: "There was a problem deleting your task. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // If we don't have a project ID, show a message
  if (!projectId) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Select a Project</h2>
        <p className="mb-6">Please select a project from your organisations page first.</p>
        <Button onClick={() => navigate("/organisations")}>
          Go to Organisations
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Project Banner */}
      <ProjectBanner />
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button 
          variant="outline" 
          onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Block 2
        </Button>
        
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col mb-6">
            <h1 className="text-3xl font-bold text-tcof-dark">
              Block 2: Step 4 - Tasks for Unlinked Heuristics
            </h1>
            <p className="text-gray-600 mt-1">
              Create tasks for each project stage based on your unlinked heuristics
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Create Tasks for Unlinked Heuristics</CardTitle>
              <CardDescription>
                For each heuristic not linked to a success factor, you can create up to 3 tasks per project stage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHeuristics || isLoadingTasks ? (
                <div className="text-center py-8">
                  <div className="spinner h-8 w-8 mx-auto mb-4 border-4 border-tcof-teal border-t-transparent rounded-full animate-spin"></div>
                  <p>Loading heuristics and tasks...</p>
                </div>
              ) : unlinkedHeuristics.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-amber-50">
                  <p className="text-amber-800 font-medium">
                    All heuristics are linked. Unlink one in Step 3 to add tasks here.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/make-a-plan/${projectId}/block-2/step-3`)}
                    className="mt-4"
                  >
                    Go to Heuristic Mapping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stage tabs */}
                  <Tabs defaultValue="identification" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4 mb-4">
                      <TabsTrigger value="identification">Identification</TabsTrigger>
                      <TabsTrigger value="definition">Definition</TabsTrigger>
                      <TabsTrigger value="delivery">Delivery</TabsTrigger>
                      <TabsTrigger value="closure">Closure</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="identification">
                      <TasksForStage 
                        stage="identification"
                        heuristics={unlinkedHeuristics}
                        getTasksForHeuristic={getTasksForHeuristic}
                        onSaveTask={handleSaveTask}
                        onDeleteTask={handleDeleteTask}
                        isSaving={isSaving}
                        saveStatus={saveStatus}
                      />
                    </TabsContent>
                    
                    <TabsContent value="definition">
                      <TasksForStage 
                        stage="definition"
                        heuristics={unlinkedHeuristics}
                        getTasksForHeuristic={getTasksForHeuristic}
                        onSaveTask={handleSaveTask}
                        onDeleteTask={handleDeleteTask}
                        isSaving={isSaving}
                        saveStatus={saveStatus}
                      />
                    </TabsContent>
                    
                    <TabsContent value="delivery">
                      <TasksForStage 
                        stage="delivery"
                        heuristics={unlinkedHeuristics}
                        getTasksForHeuristic={getTasksForHeuristic}
                        onSaveTask={handleSaveTask}
                        onDeleteTask={handleDeleteTask}
                        isSaving={isSaving}
                        saveStatus={saveStatus}
                      />
                    </TabsContent>
                    
                    <TabsContent value="closure">
                      <TasksForStage 
                        stage="closure"
                        heuristics={unlinkedHeuristics}
                        getTasksForHeuristic={getTasksForHeuristic}
                        onSaveTask={handleSaveTask}
                        onDeleteTask={handleDeleteTask}
                        isSaving={isSaving}
                        saveStatus={saveStatus}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              
              <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-tcof-dark mb-2 flex items-center">
                  <Check className="h-5 w-5 text-tcof-teal mr-2" />
                  Tasks and Project Stages
                </h3>
                <p className="text-gray-700 text-sm">
                  For each unlinked heuristic, you can create specific tasks across four project stages. 
                  Tasks automatically save as you type, and you can add up to 3 tasks per stage per heuristic.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => navigate(`/make-a-plan/${projectId}/block-2/step-3`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Step 3
              </Button>
              <Button
                onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Component for tasks within a specific stage
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
  saveStatus
}: TasksForStageProps) {
  return (
    <div className="space-y-6">
      {heuristics.map((heuristic) => (
        <div 
          key={heuristic.id}
          className="p-4 border rounded-lg bg-white hover:border-tcof-teal transition-colors"
        >
          <h3 className="font-semibold text-tcof-dark mb-3">
            UH{heuristic.id.slice(-2)}: {heuristic.text}
          </h3>
          
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

// Component for task list for a specific heuristic and stage
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
  saveStatus
}: TaskListProps) {
  const [newTask, setNewTask] = useState<string>("");
  const [editingTasks, setEditingTasks] = useState<Record<string, string>>({});
  const maxTasks = 3;
  
  // Handler for task input change
  const handleTaskChange = (taskId: string, value: string) => {
    setEditingTasks(prev => ({
      ...prev,
      [taskId]: value
    }));
  };
  
  // Handler for task input blur (save on blur)
  const handleTaskBlur = (taskId: string) => {
    if (editingTasks[taskId] && editingTasks[taskId].trim()) {
      onSaveTask(heuristicId, stage, editingTasks[taskId], taskId);
    }
  };
  
  // Handler for task input key press (save on Enter)
  const handleTaskKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, taskId: string) => {
    if (e.key === 'Enter' && editingTasks[taskId] && editingTasks[taskId].trim()) {
      onSaveTask(heuristicId, stage, editingTasks[taskId], taskId);
      if (e.currentTarget) {
        e.currentTarget.blur(); // Remove focus after save
      }
    }
  };
  
  // Handler for adding a new task
  const handleAddTask = () => {
    if (newTask.trim()) {
      onSaveTask(heuristicId, stage, newTask);
      setNewTask("");
    }
  };
  
  // Initialize editing tasks when tasks change
  useEffect(() => {
    const initialEditingTasks: Record<string, string> = {};
    tasks.forEach(task => {
      initialEditingTasks[task.id] = task.text;
    });
    setEditingTasks(initialEditingTasks);
  }, [tasks]);
  
  return (
    <div className="space-y-3">
      {/* Existing tasks */}
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-2">
          <Input
            value={editingTasks[task.id] || ""}
            onChange={(e) => handleTaskChange(task.id, e.target.value)}
            onBlur={() => handleTaskBlur(task.id)}
            onKeyDown={(e) => handleTaskKeyPress(e, task.id)}
            placeholder="Enter task details..."
            className="flex-1"
          />
          
          {/* Saved indicator */}
          {saveStatus[`${heuristicId}-${stage}-${editingTasks[task.id]}`] && (
            <span className="text-green-500 flex items-center">
              <Check className="h-4 w-4 mr-1" />
              <span className="text-xs">Saved</span>
            </span>
          )}
          
          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteTask(task.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      {/* Add new task input */}
      {tasks.length < maxTasks && (
        <div className="flex items-center gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTask}
            disabled={!newTask.trim() || isSaving}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      )}
      
      {/* Task limit indicator */}
      {tasks.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No tasks created yet. Add up to 3 tasks for this heuristic in the {stage} stage.
        </p>
      )}
      
      {tasks.length === maxTasks && (
        <p className="text-sm text-amber-500">
          Maximum of 3 tasks reached for this stage.
        </p>
      )}
    </div>
  );
}