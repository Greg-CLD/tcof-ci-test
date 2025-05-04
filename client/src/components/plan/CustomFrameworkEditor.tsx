import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Stage, CustomFramework } from '@/lib/plan-db';
import { PlusCircle, Trash2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomFrameworkEditorProps {
  customFrameworks: CustomFramework[];
  onCreateFramework: (name: string) => Promise<string | null>;
  onAddTask: (frameworkId: string, stage: Stage, taskText: string) => Promise<boolean>;
  onRemoveTask: (frameworkId: string, stage: Stage, taskIndex: number) => Promise<boolean>;
  onRemoveFramework: (frameworkId: string) => Promise<boolean>;
}

export default function CustomFrameworkEditor({
  customFrameworks,
  onCreateFramework,
  onAddTask,
  onRemoveTask,
  onRemoveFramework
}: CustomFrameworkEditorProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFrameworkName, setNewFrameworkName] = useState('');
  const [expandedFrameworks, setExpandedFrameworks] = useState<string[]>([]);
  const [newTasks, setNewTasks] = useState<Record<string, Record<Stage, string>>>({});
  const [selectedTab, setSelectedTab] = useState<Stage>('Identification');
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize new tasks state whenever custom frameworks change
  useEffect(() => {
    const tasksState: Record<string, Record<Stage, string>> = {};
    
    customFrameworks.forEach(framework => {
      tasksState[framework.id] = {
        Identification: '',
        Definition: '',
        Delivery: '',
        Closure: ''
      };
    });
    
    setNewTasks(tasksState);
    
    // Auto-expand and select the first framework if available
    if (customFrameworks.length > 0) {
      const firstFrameworkId = customFrameworks[0].id;
      
      // Auto-expand the first framework
      if (expandedFrameworks.length === 0) {
        setExpandedFrameworks([firstFrameworkId]);
      }
      
      // Auto-select the first framework if none is selected
      if (!selectedFramework) {
        setSelectedFramework(firstFrameworkId);
      }
    }
  }, [customFrameworks, expandedFrameworks.length, selectedFramework]);

  const handleCreateFramework = async () => {
    if (!newFrameworkName.trim()) {
      toast({
        title: "Framework name required",
        description: "Please enter a name for your custom framework",
        variant: "destructive"
      });
      return;
    }
    
    const frameworkId = await onCreateFramework(newFrameworkName.trim());
    
    if (frameworkId) {
      toast({
        title: "Framework created",
        description: `"${newFrameworkName}" has been added to your frameworks`,
      });
      
      // Clear form and close dialog
      setNewFrameworkName('');
      setIsAddDialogOpen(false);
      
      // Auto-expand the newly created framework
      setExpandedFrameworks(prev => [...prev, frameworkId]);
    } else {
      toast({
        title: "Error creating framework",
        description: "There was a problem adding your custom framework",
        variant: "destructive"
      });
    }
  };

  const handleAddTask = async (frameworkId: string, stage: Stage) => {
    const taskText = newTasks[frameworkId][stage].trim();
    
    if (!taskText) {
      toast({
        title: "Task text required",
        description: "Please enter text for your task",
        variant: "destructive"
      });
      return;
    }
    
    const success = await onAddTask(frameworkId, stage, taskText);
    
    if (success) {
      // Clear the input field after successful add
      setNewTasks(prev => ({
        ...prev,
        [frameworkId]: {
          ...prev[frameworkId],
          [stage]: ''
        }
      }));
      
      toast({
        title: "Task added",
        description: "Task has been added to your custom framework",
      });
    } else {
      toast({
        title: "Error adding task",
        description: "There was a problem adding your task",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTask = async (frameworkId: string, stage: Stage, taskIndex: number) => {
    const success = await onRemoveTask(frameworkId, stage, taskIndex);
    
    if (success) {
      toast({
        title: "Task removed",
        description: "Task has been removed from your custom framework",
      });
    } else {
      toast({
        title: "Error removing task",
        description: "There was a problem removing the task",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFramework = async (frameworkId: string, frameworkName: string) => {
    if (confirm(`Are you sure you want to remove the "${frameworkName}" framework? This cannot be undone.`)) {
      const success = await onRemoveFramework(frameworkId);
      
      if (success) {
        toast({
          title: "Framework removed",
          description: `"${frameworkName}" has been removed from your frameworks`,
        });
        
        // Remove from expanded list
        setExpandedFrameworks(prev => prev.filter(id => id !== frameworkId));
      } else {
        toast({
          title: "Error removing framework",
          description: "There was a problem removing the framework",
          variant: "destructive"
        });
      }
    }
  };

  const handleTaskInputChange = (frameworkId: string, stage: Stage, value: string) => {
    setNewTasks(prev => ({
      ...prev,
      [frameworkId]: {
        ...prev[frameworkId],
        [stage]: value
      }
    }));
  };

  const toggleFrameworkExpansion = (frameworkId: string) => {
    setExpandedFrameworks(prev => {
      if (prev.includes(frameworkId)) {
        return prev.filter(id => id !== frameworkId);
      } else {
        return [...prev, frameworkId];
      }
    });
  };

  // Handle when a framework is selected
  const handleFrameworkSelect = (frameworkId: string) => {
    setSelectedFramework(frameworkId);
    // Ensure the selected framework is expanded
    if (!expandedFrameworks.includes(frameworkId)) {
      setExpandedFrameworks(prev => [...prev, frameworkId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Custom Frameworks</h3>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Framework</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Framework</DialogTitle>
              <DialogDescription>
                Create your own framework to include custom tasks for your project.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="framework-name">Framework Name</Label>
                <Input 
                  id="framework-name" 
                  placeholder="e.g., PRINCE2, MSP, Agile Scrum" 
                  value={newFrameworkName}
                  onChange={(e) => setNewFrameworkName(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFramework}>Create Framework</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {customFrameworks.length === 0 ? (
        <div className="p-6 text-center border rounded-lg bg-gray-50">
          <p className="text-gray-500 mb-2">No custom frameworks added yet</p>
          <p className="text-gray-500 text-sm mb-4">
            Create your own frameworks to add custom tasks specific to your project methodology.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mx-auto flex items-center gap-1"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Framework</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Framework list (left sidebar) */}
          <div className="md:col-span-1 border rounded-md p-2 bg-gray-50">
            <h4 className="text-sm font-medium mb-2 px-2">Your Frameworks</h4>
            <div className="space-y-1">
              {customFrameworks.map(framework => (
                <div 
                  key={framework.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    selectedFramework === framework.id ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleFrameworkSelect(framework.id)}
                >
                  <span className="font-medium truncate">{framework.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFramework(framework.id, framework.name);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Task editor (right content area) */}
          <div className="md:col-span-2 border rounded-md p-4">
            {selectedFramework ? (
              (() => {
                const framework = customFrameworks.find(f => f.id === selectedFramework);
                if (!framework) return <p>Select a framework to edit tasks</p>;

                return (
                  <div>
                    <h4 className="font-medium mb-4">{framework.name} Tasks</h4>
                    <Tabs defaultValue="Identification" value={selectedTab} onValueChange={(v) => setSelectedTab(v as Stage)}>
                      <TabsList className="mb-4 w-full">
                        <TabsTrigger value="Identification" className="flex-1">Identification</TabsTrigger>
                        <TabsTrigger value="Definition" className="flex-1">Definition</TabsTrigger>
                        <TabsTrigger value="Delivery" className="flex-1">Delivery</TabsTrigger>
                        <TabsTrigger value="Closure" className="flex-1">Closure</TabsTrigger>
                      </TabsList>
                      
                      {Object.keys(framework.tasks).map((stageName) => {
                        const stage = stageName as Stage;
                        const tasks = framework.tasks[stage];
                        
                        return (
                          <TabsContent key={stage} value={stage}>
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <h5 className="font-medium text-sm text-gray-500">{stage} Stage Tasks</h5>
                                <span className="text-xs text-gray-400">{tasks.length} tasks</span>
                              </div>
                              
                              {tasks.length === 0 ? (
                                <div className="p-4 text-center border rounded-lg bg-gray-50">
                                  <p className="text-sm text-gray-500">No tasks added yet for {stage} stage</p>
                                </div>
                              ) : (
                                <ul className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md bg-gray-50">
                                  {tasks.map((task, index) => (
                                    <li key={index} className="flex items-center justify-between p-2 bg-white rounded shadow-sm">
                                      <span className="flex-1 text-sm">{task}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => handleRemoveTask(framework.id, stage, index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <Input
                                placeholder={`Add ${stage} task...`}
                                value={newTasks[framework.id]?.[stage] || ''}
                                onChange={(e) => handleTaskInputChange(framework.id, stage, e.target.value)}
                                className="flex-1"
                              />
                              <Button 
                                variant="outline" 
                                onClick={() => handleAddTask(framework.id, stage)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Task
                              </Button>
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </div>
                );
              })()
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500 mb-2">Select a framework from the list</p>
                <p className="text-gray-500 text-sm">
                  Choose a framework to add or edit tasks for each project stage.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}