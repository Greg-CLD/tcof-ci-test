import React, { useState, useCallback } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import debounce from 'lodash.debounce';

export type StageType = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

interface Item {
  id: string;
  title: string;
}

interface TaskEditorProps {
  items: Item[];
  selectedItemId: string | null;
  title: string;
  description?: string;
  tasks: Record<StageType, string[]>;
  onAddTask: (itemId: string, stage: StageType) => void;
  onUpdateTask: (itemId: string, stage: StageType, taskIndex: number, newText: string) => void;
  onDeleteTask: (itemId: string, stage: StageType, taskIndex: number) => void;
  onSelectItem: (itemId: string) => void;
  isAutoSaving?: boolean;
}

export default function FactorTaskEditor({
  items,
  selectedItemId,
  title,
  description,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isAutoSaving = false,
  onSelectItem
}: TaskEditorProps) {
  const [activeTab, setActiveTab] = useState<StageType>('Identification');
  const { toast } = useToast();
  
  // Create a debounced task update function
  const debouncedUpdateTask = useCallback(
    debounce((itemId: string, stage: StageType, taskIndex: number, newText: string) => {
      onUpdateTask(itemId, stage, taskIndex, newText);
    }, 1000), // 1 second debounce
    [onUpdateTask]
  );

  // Get the currently selected item
  const selectedItem = selectedItemId ? items.find(item => item.id === selectedItemId) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          {isAutoSaving && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Auto-saving...
            </div>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-12 gap-4">
          {/* List of items */}
          <div className="col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Select Item</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {items.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No items available.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 border ${
                            selectedItemId === item.id
                              ? 'border-tcof-teal bg-tcof-teal/10'
                              : 'border-gray-200'
                          }`}
                          onClick={() => onSelectItem(item.id)}
                        >
                          <div className="font-medium">{item.id}</div>
                          <div className="text-sm text-gray-700">{item.title}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* Editor for tasks */}
          <div className="col-span-8">
            {selectedItem ? (
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
                    <div className="space-y-4">
                      {tasks[stage].length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                          No tasks for this stage. Add your first task below.
                        </div>
                      ) : (
                        tasks[stage].map((task: string, index: number) => (
                          <div key={index} className="flex items-start space-x-2">
                            <Input
                              value={task}
                              onChange={(e) => selectedItemId && debouncedUpdateTask(selectedItemId, stage, index, e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => selectedItemId && onDeleteTask(selectedItemId, stage, index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedItemId && onAddTask(selectedItemId, stage)}
                        disabled={!selectedItemId}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Select an item from the list to edit its tasks.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}