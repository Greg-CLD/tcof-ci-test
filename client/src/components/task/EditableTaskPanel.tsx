import React, { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Check, UserCircle2, StickyNote, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function EditableTaskPanel({
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
  onUpdateTaskStatus
}: EditableTaskPanelProps) {
  const [activeTab, setActiveTab] = useState<StageType>('Identification');
  const { toast } = useToast();
  
  // Create a reference for active input fields
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const ownerRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const notesRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  
  // Handle key press events in task inputs
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>, stage: StageType, taskId: string) => {
    if (e.key === 'Enter') {
      // Save on Enter key
      const input = e.currentTarget;
      const newText = input.value;
      
      onSaveTask(stage, taskId, newText);
      
      // Move focus to next input or blur if it's the last one
      input.blur();
    }
  };
  
  // Handle blur events to save when user clicks away
  const handleBlur = (stage: StageType, taskId: string, newText: string) => {
    if (newText.trim()) {
      onSaveTask(stage, taskId, newText);
    }
  };

  // Handle owner field changes
  const handleOwnerBlur = (taskId: string, value: string) => {
    if (onUpdateTaskOwner) {
      onUpdateTaskOwner(taskId, value);
    }
  };

  // Handle notes field changes
  const handleNotesBlur = (taskId: string, value: string) => {
    if (onUpdateTaskNotes) {
      onUpdateTaskNotes(taskId, value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          {isSaving && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </div>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <CardContent>
        <Tabs 
          defaultValue="Identification" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as StageType)}
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="Identification">Identification</TabsTrigger>
            <TabsTrigger value="Definition">Definition</TabsTrigger>
            <TabsTrigger value="Delivery">Delivery</TabsTrigger>
            <TabsTrigger value="Closure">Closure</TabsTrigger>
          </TabsList>
          
          {(["Identification", "Definition", "Delivery", "Closure"] as const).map(stage => (
            <TabsContent key={stage} value={stage}>
              <h3 className="text-lg font-medium mb-4">{stage} Tasks</h3>
              <div className="space-y-6">
                {tasks[stage].length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border border-dashed rounded-md">
                    No tasks for this stage. Add your first task below.
                  </div>
                ) : (
                  tasks[stage].map((task, index) => (
                    <div key={task.id} className="border rounded-md p-4 relative">
                      <div className="flex flex-col space-y-3">
                        {/* Task Description Input */}
                        <div className="flex items-start space-x-2">
                          <div className="flex-1 relative">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">
                              Task #{index + 1}
                            </label>
                            <Input
                              placeholder="Enter task description here..."
                              defaultValue={task.text}
                              onChange={(e) => {
                                inputRefs.current[task.id]?.setAttribute('value', e.target.value);
                              }}
                              onBlur={(e) => handleBlur(stage, task.id, e.target.value)}
                              onKeyDown={(e) => handleKeyPress(e, stage, task.id)}
                              ref={(el) => inputRefs.current[task.id] = el}
                              className="flex-1"
                            />
                            {saveStatus?.taskId === task.id && saveStatus.status === 'saving' && (
                              <div className="absolute right-2 top-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                                Saving...
                              </div>
                            )}
                            {saveStatus?.taskId === task.id && saveStatus.status === 'saved' && (
                              <div className="absolute right-2 top-2 text-sm text-tcof-teal animate-fadeOut">
                                <Check className="h-4 w-4 inline mr-1" />
                                Saved
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteTask(stage, task.id)}
                            className="mt-6"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        
                        {/* Optional Owner Field */}
                        {showOwnerField && (
                          <div className="flex items-center space-x-2">
                            <div className="flex-1">
                              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <UserCircle2 className="h-4 w-4 mr-1" />
                                Owner
                              </label>
                              <Input
                                placeholder="Who will complete this task?"
                                defaultValue={task.owner || ''}
                                onChange={(e) => {
                                  ownerRefs.current[task.id]?.setAttribute('value', e.target.value);
                                }}
                                onBlur={(e) => handleOwnerBlur(task.id, e.target.value)}
                                ref={(el) => ownerRefs.current[task.id] = el}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Optional Notes Field */}
                        {showNotesField && (
                          <div className="flex items-center space-x-2">
                            <div className="flex-1">
                              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <StickyNote className="h-4 w-4 mr-1" />
                                Notes
                              </label>
                              <Input
                                placeholder="Add notes or comments about this task"
                                defaultValue={task.notes || ''}
                                onChange={(e) => {
                                  notesRefs.current[task.id]?.setAttribute('value', e.target.value);
                                }}
                                onBlur={(e) => handleNotesBlur(task.id, e.target.value)}
                                ref={(el) => notesRefs.current[task.id] = el}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Optional Status Toggle */}
                        {showStatusToggle && onUpdateTaskStatus && (
                          <div className="flex items-center mt-2">
                            <Button
                              variant={task.completed ? "default" : "outline"}
                              size="sm"
                              className={`rounded-md ${task.completed ? 'bg-green-600 hover:bg-green-700' : ''}`}
                              onClick={() => onUpdateTaskStatus(task.id, !task.completed)}
                            >
                              <ClipboardList className="h-4 w-4 mr-2" />
                              {task.completed ? 'Completed' : 'Mark as Complete'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Only allow adding up to 3 tasks per stage */}
                {tasks[stage].length < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddTask(stage)}
                    className="mt-2"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}