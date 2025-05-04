import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import TaskList from '@/components/admin/TaskList';
import { apiRequest } from '@/lib/queryClient';

// Define types
type StageType = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

interface SuccessFactor {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

// Admin page for editing success factors
export default function AdminFactorEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Simple state - reduced complexity from original implementation
  const [factors, setFactors] = useState<SuccessFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load factors on mount - just once
  useEffect(() => {
    async function loadFactors() {
      try {
        setIsLoading(true);
        console.log('Loading success factors from API...');
        
        const response = await apiRequest('GET', '/api/admin/success-factors');
        const data = await response.json();
        
        console.log(`Loaded ${data.length} success factors:`, data);
        setFactors(data);
        
        // If factors exist, select the first one
        if (data.length > 0 && !selectedFactorId) {
          setSelectedFactorId(data[0].id);
        }
      } catch (error) {
        console.error('Error loading success factors:', error);
        toast({
          title: 'Error loading success factors',
          description: 'Could not load success factors from the server.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadFactors();
  }, [toast, selectedFactorId]);

  // Check if the user is authorized (admin) - case insensitive check
  if (!user || user.username.toLowerCase() !== 'greg@confluity.co.uk') {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-3xl font-bold text-tcof-dark mb-6">Access Denied</h1>
            <p className="text-lg text-gray-600 mb-6">
              You do not have permission to access this admin area. 
              This page is restricted to authorized personnel only.
            </p>
            <Link href="/">
              <Button className="bg-tcof-teal hover:bg-tcof-teal/90">
                Return to Home
              </Button>
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Get the currently selected factor
  const selectedFactor = selectedFactorId 
    ? factors.find(f => f.id === selectedFactorId) 
    : null;
  
  // Add a new task to a factor
  const handleAddTask = async (factorId: string, stage: StageType) => {
    if (!selectedFactor) return;
    
    const updatedFactor = { ...selectedFactor };
    const updatedTasks = [...(updatedFactor.tasks[stage] || []), ''];
    
    updatedFactor.tasks = {
      ...updatedFactor.tasks,
      [stage]: updatedTasks
    };
    
    try {
      // Update in the API
      const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      const updatedFactorData = await response.json();
      
      // Update local state
      setFactors(prev => 
        prev.map(f => f.id === factorId ? updatedFactorData : f)
      );
      
      toast({
        title: 'Task added',
        description: `Added new task to ${stage} stage`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error adding task',
        description: 'Could not add task to the server.',
        variant: 'destructive',
      });
    }
  };
  
  // Update an existing task
  const handleUpdateTask = async (factorId: string, stage: StageType, taskIndex: number, newText: string) => {
    if (!selectedFactor) return;
    
    const updatedFactor = { ...selectedFactor };
    const updatedTasks = [...(updatedFactor.tasks[stage] || [])];
    
    updatedTasks[taskIndex] = newText;
    
    updatedFactor.tasks = {
      ...updatedFactor.tasks,
      [stage]: updatedTasks
    };
    
    try {
      // Update in the API
      const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      const updatedFactorData = await response.json();
      
      // Update local state
      setFactors(prev => 
        prev.map(f => f.id === factorId ? updatedFactorData : f)
      );
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error updating task',
        description: 'Could not update task on the server.',
        variant: 'destructive',
      });
    }
  };
  
  // Delete a task
  const handleDeleteTask = async (factorId: string, stage: StageType, taskIndex: number) => {
    if (!selectedFactor) return;
    
    const updatedFactor = { ...selectedFactor };
    const updatedTasks = [...(updatedFactor.tasks[stage] || [])];
    
    // Remove the task at the specified index
    updatedTasks.splice(taskIndex, 1);
    
    updatedFactor.tasks = {
      ...updatedFactor.tasks,
      [stage]: updatedTasks
    };
    
    try {
      // Update in the API
      const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      const updatedFactorData = await response.json();
      
      // Update local state
      setFactors(prev => 
        prev.map(f => f.id === factorId ? updatedFactorData : f)
      );
      
      toast({
        title: 'Task deleted',
        description: `Removed task from ${stage} stage`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error deleting task',
        description: 'Could not delete task from the server.',
        variant: 'destructive',
      });
    }
  };

  // Update factor title
  const handleUpdateFactorTitle = async (factorId: string, newTitle: string) => {
    if (!selectedFactor) return;
    
    const updatedFactor = { ...selectedFactor, title: newTitle };
    
    try {
      // Update in the API
      const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      const updatedFactorData = await response.json();
      
      // Update local state
      setFactors(prev => 
        prev.map(f => f.id === factorId ? updatedFactorData : f)
      );
    } catch (error) {
      console.error('Error updating factor title:', error);
      toast({
        title: 'Error updating title',
        description: 'Could not update factor title on the server.',
        variant: 'destructive',
      });
    }
  };

  // Delete a factor
  const handleDeleteFactor = async () => {
    if (!selectedFactor) return;
    
    try {
      setIsSaving(true);
      
      // Delete from the API
      await apiRequest('DELETE', `/api/admin/success-factors/${selectedFactor.id}`);
      
      // Update local state
      const updatedFactors = factors.filter(f => f.id !== selectedFactor.id);
      setFactors(updatedFactors);
      
      // Select another factor if available
      if (updatedFactors.length > 0) {
        setSelectedFactorId(updatedFactors[0].id);
      } else {
        setSelectedFactorId(null);
      }
      
      setShowDeleteDialog(false);
      
      toast({
        title: 'Factor deleted',
        description: 'Successfully deleted the success factor.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting factor:', error);
      toast({
        title: 'Error deleting factor',
        description: 'Could not delete factor from the server.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-tcof-dark">Success Factor Editor</h1>
          <Link href="/make-a-plan/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
            <span className="ml-2">Loading success factors...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Factor list */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Success Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {factors.map((factor) => (
                    <div
                      key={factor.id}
                      className={`p-3 mb-2 rounded cursor-pointer ${
                        selectedFactorId === factor.id
                          ? 'bg-tcof-teal/10 border-l-4 border-tcof-teal'
                          : 'hover:bg-gray-100 border-l-4 border-transparent'
                      }`}
                      onClick={() => setSelectedFactorId(factor.id)}
                    >
                      <h3 className="font-medium">{factor.title}</h3>
                      <div className="text-sm text-gray-500">ID: {factor.id}</div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Factor details */}
            <Card className="md:col-span-2">
              {selectedFactor ? (
                <>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <Input
                          value={selectedFactor.title}
                          onChange={(e) => handleUpdateFactorTitle(selectedFactor.id, e.target.value)}
                          className="text-xl font-bold"
                        />
                      </div>
                      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Success Factor</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{selectedFactor.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteFactor} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Accordion type="multiple" defaultValue={["Identification", "Definition", "Delivery", "Closure"]}>
                      <AccordionItem value="Identification">
                        <AccordionTrigger>Identification</AccordionTrigger>
                        <AccordionContent>
                          <TaskList
                            title="Identification Tasks"
                            tasks={selectedFactor.tasks.Identification || []}
                            onAddTask={() => handleAddTask(selectedFactor.id, 'Identification')}
                            onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Identification', index, newText)}
                            onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Identification', index)}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="Definition">
                        <AccordionTrigger>Definition</AccordionTrigger>
                        <AccordionContent>
                          <TaskList
                            title="Definition Tasks"
                            tasks={selectedFactor.tasks.Definition || []}
                            onAddTask={() => handleAddTask(selectedFactor.id, 'Definition')}
                            onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Definition', index, newText)}
                            onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Definition', index)}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="Delivery">
                        <AccordionTrigger>Delivery</AccordionTrigger>
                        <AccordionContent>
                          <TaskList
                            title="Delivery Tasks"
                            tasks={selectedFactor.tasks.Delivery || []}
                            onAddTask={() => handleAddTask(selectedFactor.id, 'Delivery')}
                            onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Delivery', index, newText)}
                            onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Delivery', index)}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="Closure">
                        <AccordionTrigger>Closure</AccordionTrigger>
                        <AccordionContent>
                          <TaskList
                            title="Closure Tasks"
                            tasks={selectedFactor.tasks.Closure || []}
                            onAddTask={() => handleAddTask(selectedFactor.id, 'Closure')}
                            onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Closure', index, newText)}
                            onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Closure', index)}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                  
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <div className="text-sm text-gray-500">
                      {isSaving ? (
                        <span className="flex items-center">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Saving...
                        </span>
                      ) : (
                        <span>Last changes saved automatically</span>
                      )}
                    </div>
                  </CardFooter>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <p className="text-gray-500 mb-4">No success factor selected</p>
                  <p className="text-gray-400 mb-4 text-sm">Select a factor from the list or create a new one</p>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </main>
      
      <SiteFooter />
    </div>
  );
}