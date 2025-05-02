import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Stage, TaskItem, addTask, updateTaskStatus, PolicyTask, addPolicyTask, removePolicyTask } from '@/lib/plan-db';
import styles from '@/lib/styles/tasks.module.css';
import { Plus, Trash2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TaskListProps {
  planId: string;
  tasks: TaskItem[];
  policyTasks: PolicyTask[];
  stage: Stage;
  onTasksChange: () => void;
}

export default function TaskList({
  planId,
  tasks,
  policyTasks,
  stage,
  onTasksChange
}: TaskListProps) {
  const [newPolicyTask, setNewPolicyTask] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (updateTaskStatus(planId, id, checked, stage)) {
      onTasksChange();
    }
  };

  const handleAddPolicyTask = () => {
    if (!newPolicyTask.trim()) {
      toast({
        title: "Task text required",
        description: "Please enter some text for the task.",
        variant: "destructive",
      });
      return;
    }

    if (addPolicyTask(planId, newPolicyTask.trim(), stage)) {
      setNewPolicyTask('');
      onTasksChange();
      toast({
        title: "Task added",
        description: "Your policy task has been added.",
        variant: "default",
      });
    }
  };

  const handleRemovePolicyTask = (id: string) => {
    if (removePolicyTask(planId, id, stage)) {
      onTasksChange();
      toast({
        title: "Task removed",
        description: "The policy task has been removed.",
        variant: "default",
      });
    }
  };

  // Split tasks by origin
  const factorTasks = tasks.filter(task => task.origin === 'factor');
  const heuristicTasks = tasks.filter(task => task.origin === 'heuristic');
  
  // Get displayed tasks based on active tab
  let displayedTasks: TaskItem[] = [];
  if (activeTab === 'all') {
    displayedTasks = [...tasks];
  } else if (activeTab === 'factor') {
    displayedTasks = factorTasks;
  } else if (activeTab === 'heuristic') {
    displayedTasks = heuristicTasks;
  } else if (activeTab === 'policy') {
    displayedTasks = tasks.filter(task => task.origin === 'policy');
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">Task List</CardTitle>
        <CardDescription>
          Manage your tasks for the {stage} stage. Add custom policy tasks or import them from mapped success factors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add Policy Task Form */}
        <div className={styles.policyTaskForm}>
          <h3 className="text-sm font-medium mb-2">Add Custom Policy Task</h3>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Enter a new policy task..."
              value={newPolicyTask}
              onChange={(e) => setNewPolicyTask(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddPolicyTask} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>
          
          {/* Policy Task List */}
          {policyTasks.length > 0 && (
            <div className={styles.policyTaskList}>
              <h4 className="text-xs text-muted-foreground mb-2">Custom Policy Tasks:</h4>
              {policyTasks.map(task => (
                <div key={task.id} className={styles.taskRow}>
                  <div className={styles.text}>{task.text}</div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemovePolicyTask(task.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Tabs */}
        <Tabs defaultValue="all" className="mt-6" onValueChange={setActiveTab}>
          <TabsList className={styles.stageTabs}>
            <TabsTrigger value="all">
              All Tasks {tasks.length > 0 && <span className="ml-1 text-xs">({tasks.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="factor">
              From Factors {factorTasks.length > 0 && <span className="ml-1 text-xs">({factorTasks.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="heuristic">
              From Heuristics {heuristicTasks.length > 0 && <span className="ml-1 text-xs">({heuristicTasks.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="policy">
              Custom Policy {tasks.filter(t => t.origin === 'policy').length > 0 && 
                <span className="ml-1 text-xs">({tasks.filter(t => t.origin === 'policy').length})</span>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className={styles.tabPanel}>
            {displayedTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No tasks found. Import tasks from mapped success factors or add custom policy tasks.
              </div>
            ) : (
              displayedTasks.map(task => (
                <div key={task.id} className={styles.taskRow}>
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={(checked) => handleCheckboxChange(task.id, checked === true)}
                    className={styles.checkbox}
                  />
                  <label 
                    htmlFor={`task-${task.id}`} 
                    className={`${styles.text} ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.text}
                    <span className={`${styles.badge} ${styles[task.origin]}`}>
                      {task.origin}
                    </span>
                  </label>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="factor" className={styles.tabPanel}>
            {factorTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No factor tasks found. Import tasks from mapped success factors.
              </div>
            ) : (
              factorTasks.map(task => (
                <div key={task.id} className={styles.taskRow}>
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={(checked) => handleCheckboxChange(task.id, checked === true)}
                    className={styles.checkbox}
                  />
                  <label 
                    htmlFor={`task-${task.id}`} 
                    className={`${styles.text} ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.text}
                  </label>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="heuristic" className={styles.tabPanel}>
            {heuristicTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No heuristic tasks found. Add tasks based on personal heuristics.
              </div>
            ) : (
              heuristicTasks.map(task => (
                <div key={task.id} className={styles.taskRow}>
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={(checked) => handleCheckboxChange(task.id, checked === true)}
                    className={styles.checkbox}
                  />
                  <label 
                    htmlFor={`task-${task.id}`} 
                    className={`${styles.text} ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.text}
                  </label>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="policy" className={styles.tabPanel}>
            {tasks.filter(t => t.origin === 'policy').length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No policy tasks found. Add custom policy tasks above.
              </div>
            ) : (
              tasks.filter(t => t.origin === 'policy').map(task => (
                <div key={task.id} className={styles.taskRow}>
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={(checked) => handleCheckboxChange(task.id, checked === true)}
                    className={styles.checkbox}
                  />
                  <label 
                    htmlFor={`task-${task.id}`} 
                    className={`${styles.text} ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.text}
                  </label>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}