import React, { useState, KeyboardEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, CheckCircle, Edit, Save } from 'lucide-react';

export type StageType = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

export interface TaskItem {
  id: string;
  text: string;
  stage: StageType;
  completed?: boolean;
  owner?: string;
  notes?: string;
  origin?: string;
  sourceId?: string;
}

interface EditableTaskPanelProps {
  title: string;
  description?: string;
  tasks: Record<StageType, TaskItem[]>;
  onSaveTask: (stage: StageType, taskId: string, text: string) => void;
  onAddTask: (stage: StageType) => void;
  onDeleteTask: (stage: StageType, taskId: string) => void;
  isSaving?: boolean;
  saveStatus?: { taskId: string | null; status: 'saving' | 'saved' | null };
  showOwnerField?: boolean;
  showNotesField?: boolean;
  showStatusToggle?: boolean;
  onUpdateTaskOwner?: (taskId: string, owner: string) => void;
  onUpdateTaskNotes?: (taskId: string, notes: string) => void;
  onUpdateTaskStatus?: (taskId: string, completed: boolean) => void;
}

export function EditableTaskPanel({
  title,
  description,
  tasks,
  onSaveTask,
  onAddTask,
  onDeleteTask,
  isSaving = false,
  saveStatus = { taskId: null, status: null },
  showOwnerField = false,
  showNotesField = false,
  showStatusToggle = false,
  onUpdateTaskOwner,
  onUpdateTaskNotes,
  onUpdateTaskStatus,
}: EditableTaskPanelProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Handle entering edit mode
  const handleEditClick = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setEditText(task.text);
  };
  
  // Handle save on edit
  const handleSaveEdit = (stage: StageType, taskId: string) => {
    if (editText.trim()) {
      onSaveTask(stage, taskId, editText);
      setEditingTaskId(null);
    }
  };
  
  // Handle key press
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>, stage: StageType, taskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(stage, taskId);
    } else if (e.key === 'Escape') {
      setEditingTaskId(null);
    }
  };
  
  // Handle blur
  const handleBlur = (stage: StageType, taskId: string, newText: string) => {
    if (newText.trim()) {
      onSaveTask(stage, taskId, newText);
      setEditingTaskId(null);
    }
  };
  
  // Task status indicator
  const getTaskStatus = (taskId: string) => {
    if (saveStatus.taskId === taskId) {
      if (saveStatus.status === 'saving') {
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      } else if (saveStatus.status === 'saved') {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      }
    }
    return null;
  };
  
  // Render a stage's tasks
  const renderTasksForStage = (stage: StageType) => {
    const stageTasks = tasks[stage] || [];
    const maxTasksReached = stageTasks.length >= 3;
    
    return (
      <div className="space-y-4">
        {stageTasks.length > 0 ? (
          <div className="space-y-3">
            {stageTasks.map(task => (
              <div key={task.id} className="border rounded-md p-3 group relative">
                <div className="absolute right-2 top-2 flex items-center space-x-1">
                  {getTaskStatus(task.id)}
                </div>
                
                {editingTaskId === task.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleBlur(stage, task.id, editText)}
                      onKeyDown={(e) => handleKeyPress(e, stage, task.id)}
                      className="mt-1"
                      autoFocus
                    />
                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveEdit(stage, task.id)}
                        disabled={!editText.trim() || isSaving}
                      >
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-2 flex-1">
                        {showStatusToggle && (
                          <Checkbox 
                            id={`status-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={(checked) => onUpdateTaskStatus?.(task.id, checked === true)}
                            className="mt-1"
                          />
                        )}
                        <div 
                          className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => handleEditClick(task)}
                        >
                          {task.text || <span className="text-muted-foreground italic">Click to add task description</span>}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(task)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteTask(stage, task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    {showOwnerField && (
                      <div className="pt-2">
                        <Label htmlFor={`owner-${task.id}`} className="text-xs text-muted-foreground">Owner</Label>
                        <Input
                          id={`owner-${task.id}`}
                          value={task.owner || ''}
                          onChange={(e) => onUpdateTaskOwner?.(task.id, e.target.value)}
                          placeholder="Task owner"
                          className="mt-1 text-sm"
                        />
                      </div>
                    )}
                    
                    {showNotesField && (
                      <div className="pt-2">
                        <Label htmlFor={`notes-${task.id}`} className="text-xs text-muted-foreground">Notes</Label>
                        <Textarea
                          id={`notes-${task.id}`}
                          value={task.notes || ''}
                          onChange={(e) => onUpdateTaskNotes?.(task.id, e.target.value)}
                          placeholder="Add notes for this task"
                          className="mt-1 text-sm min-h-[100px]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            No tasks for this stage. Add your first task below.
          </div>
        )}
        
        {!maxTasksReached && (
          <Button 
            onClick={() => onAddTask(stage)} 
            disabled={isSaving}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Task
          </Button>
        )}
        
        {maxTasksReached && (
          <div className="text-xs text-amber-600 italic">
            Maximum of 3 tasks reached for this stage.
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="Identification">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="Identification" className="flex-1">Identification</TabsTrigger>
            <TabsTrigger value="Definition" className="flex-1">Definition</TabsTrigger>
            <TabsTrigger value="Delivery" className="flex-1">Delivery</TabsTrigger>
            <TabsTrigger value="Closure" className="flex-1">Closure</TabsTrigger>
          </TabsList>
          
          <TabsContent value="Identification">
            {renderTasksForStage('Identification')}
          </TabsContent>
          
          <TabsContent value="Definition">
            {renderTasksForStage('Definition')}
          </TabsContent>
          
          <TabsContent value="Delivery">
            {renderTasksForStage('Delivery')}
          </TabsContent>
          
          <TabsContent value="Closure">
            {renderTasksForStage('Closure')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default EditableTaskPanel;