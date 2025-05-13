import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Save, Trash2, Plus, Edit, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import AdminStageTabs, { Stage } from './AdminStageTabs';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/hooks/useAuth';

// Define the structure of a success factor
// Using the Stage type from AdminStageTabs
interface FactorTask {
  id: string;
  title: string;
  description: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

// We don't need props for a standalone page component
export default function SuccessFactorEditor() {
  // State for success factors and editing
  const [factors, setFactors] = useState<FactorTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<FactorTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Create editable factor state
  const [editableFactor, setEditableFactor] = useState<FactorTask>({
    id: '',
    title: '',
    description: '',
    tasks: {
      Identification: [''],
      Definition: [''],
      Delivery: [''],
      Closure: ['']
    }
  });
  
  const { toast } = useToast();

  // Load success factors on component mount
  useEffect(() => {
    loadFactors();
  }, []);

  // Load factors from the server
  const loadFactors = async () => {
    setIsLoading(true);
    try {
      // Load success factors through API
      const response = await apiRequest('GET', '/api/admin/success-factors');
      if (!response.ok) {
        throw new Error('Failed to load success factors');
      }
      
      const data = await response.json();
      setFactors(data);
      
      toast({
        title: "Success Factors Loaded",
        description: `Loaded ${data.length} success factors.`
      });
    } catch (error) {
      console.error('Error loading success factors:', error);
      toast({
        title: "Error",
        description: "Failed to load success factors. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating a new factor
  const handleCreateFactor = () => {
    // Generate a new ID based on existing factors
    let maxId = 0;
    factors.forEach(factor => {
      const idParts = factor.id.split('.');
      if (idParts.length === 2) {
        const categoryNum = parseInt(idParts[0]);
        const itemNum = parseInt(idParts[1]);
        
        if (!isNaN(categoryNum) && !isNaN(itemNum)) {
          // For simplicity, we'll just track the highest item number across all categories
          if (itemNum > maxId) {
            maxId = itemNum;
          }
        }
      }
    });
    
    // Create a new factor with a unique ID
    const newFactor: FactorTask = {
      id: `1.${maxId + 1}`, // Default to category 1, but user can change it
      title: 'New Success Factor',
      description: 'Provide a description of this success factor.',
      tasks: {
        Identification: [''],
        Definition: [''],
        Delivery: [''],
        Closure: ['']
      }
    };
    
    setEditableFactor(newFactor);
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  // Handle editing an existing factor
  const handleEditFactor = (factor: FactorTask) => {
    setSelectedFactor(factor);
    setEditableFactor({ ...factor });
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  // Handle deleting a factor
  const handleDeletePrompt = (factor: FactorTask) => {
    setSelectedFactor(factor);
    setIsDeleteDialogOpen(true);
  };

  // Execute the delete
  const handleDeleteFactor = async () => {
    if (!selectedFactor) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest('DELETE', `/api/admin/success-factors/${selectedFactor.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete success factor');
      }
      
      // Update local state
      setFactors(factors.filter(f => f.id !== selectedFactor.id));
      
      toast({
        title: "Success Factor Deleted",
        description: `Success factor "${selectedFactor.title}" was deleted.`
      });
      
      setIsDeleteDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting success factor:', error);
      toast({
        title: "Error",
        description: "Failed to delete success factor. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ID change in the form
  const handleIdChange = (value: string) => {
    setEditableFactor({ ...editableFactor, id: value });
  };

  // Handle title change in the form
  const handleTitleChange = (value: string) => {
    setEditableFactor({ ...editableFactor, title: value });
  };
  
  // Handle description change in the form
  const handleDescriptionChange = (value: string) => {
    setEditableFactor({ ...editableFactor, description: value });
  };

  // Handle task change
  const handleTaskChange = (stage: Stage, index: number, value: string) => {
    const updatedTasks = { ...editableFactor.tasks };
    
    if (index >= updatedTasks[stage].length) {
      // Extend the array if needed
      updatedTasks[stage] = [...updatedTasks[stage], value];
    } else {
      // Update existing element
      updatedTasks[stage] = updatedTasks[stage].map((task, i) => 
        i === index ? value : task
      );
    }
    
    setEditableFactor({ ...editableFactor, tasks: updatedTasks });
  };

  // Add a new task to a stage
  const handleAddTask = (stage: Stage) => {
    const updatedTasks = { ...editableFactor.tasks };
    updatedTasks[stage] = [...updatedTasks[stage], ''];
    setEditableFactor({ ...editableFactor, tasks: updatedTasks });
  };

  // Remove a task from a stage
  const handleRemoveTask = (stage: Stage, index: number) => {
    const updatedTasks = { ...editableFactor.tasks };
    updatedTasks[stage] = updatedTasks[stage].filter((_, i) => i !== index);
    
    // Ensure at least one empty task
    if (updatedTasks[stage].length === 0) {
      updatedTasks[stage] = [''];
    }
    
    setEditableFactor({ ...editableFactor, tasks: updatedTasks });
  };

  // Save the factor (create or update)
  const handleSaveFactor = async () => {
    // Validate the form data
    if (!editableFactor.id.trim()) {
      toast({
        title: "Validation Error",
        description: "Factor ID is required.",
        variant: "destructive"
      });
      return;
    }
    
    if (!editableFactor.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Factor title is required.",
        variant: "destructive"
      });
      return;
    }
    
    if (!editableFactor.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Factor description is required.",
        variant: "destructive"
      });
      return;
    }
    
    // Filter out empty task entries
    const cleanedTasks = {
      Identification: editableFactor.tasks.Identification.filter(t => t.trim()),
      Definition: editableFactor.tasks.Definition.filter(t => t.trim()),
      Delivery: editableFactor.tasks.Delivery.filter(t => t.trim()),
      Closure: editableFactor.tasks.Closure.filter(t => t.trim())
    };
    
    // Ensure at least one task in each stage
    if (Object.values(cleanedTasks).some(tasks => tasks.length === 0)) {
      toast({
        title: "Validation Error",
        description: "Each stage must have at least one task.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const factorToSave = {
        ...editableFactor,
        tasks: cleanedTasks
      };
      
      let response;
      
      if (isCreating) {
        // Create new factor
        response = await apiRequest('POST', '/api/admin/success-factors', factorToSave);
      } else {
        // Update existing factor
        response = await apiRequest('PUT', `/api/admin/success-factors/${selectedFactor?.id}`, factorToSave);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to ${isCreating ? 'create' : 'update'} success factor`);
      }
      
      const savedFactor = await response.json();
      
      // Update the local state
      if (isCreating) {
        setFactors([...factors, savedFactor]);
      } else {
        setFactors(factors.map(f => f.id === savedFactor.id ? savedFactor : f));
      }
      
      toast({
        title: isCreating ? "Success Factor Created" : "Success Factor Updated",
        description: `Success factor "${savedFactor.title}" was ${isCreating ? 'created' : 'updated'} successfully.`
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error(`Error ${isCreating ? 'creating' : 'updating'} success factor:`, error);
      toast({
        title: "Error",
        description: `Failed to ${isCreating ? 'create' : 'update'} success factor. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get user for auth check
  const { user } = useAuth();
  
  return (
    <>
      <SiteHeader />
      <main className="container py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Success Factor Editor</CardTitle>
            <CardDescription>
              Manage all TCOF success factors and their associated tasks by stage. 
              Changes made here will be used in the planning process.
            </CardDescription>
          </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Button 
              onClick={handleCreateFactor} 
              className="flex items-center gap-2 bg-tcof-teal hover:bg-tcof-teal/90"
            >
              <Plus className="h-4 w-4" />
              Add New Factor
            </Button>
            <Button 
              onClick={loadFactors} 
              variant="outline" 
              disabled={isLoading}
            >
              Refresh Factors
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>
                TCOF Success Factors and their associated tasks by stage
              </TableCaption>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-1/12">ID</TableHead>
                  <TableHead className="w-2/12">Factor Title</TableHead>
                  <TableHead className="w-3/12">Description</TableHead>
                  <TableHead className="w-4/12">Tasks</TableHead>
                  <TableHead className="w-2/12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factors.map((factor) => (
                  <TableRow key={factor.id}>
                    <TableCell className="font-medium align-top">{factor.id}</TableCell>
                    <TableCell className="align-top">{factor.title}</TableCell>
                    <TableCell className="align-top text-sm">
                      {factor.description || <span className="text-gray-400 italic">No description provided</span>}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {Object.entries(factor.tasks).map(([stage, tasks]) => (
                          <div key={stage} className="mb-2">
                            <span className="font-medium">{stage}: </span>
                            <ul className="list-disc pl-5">
                              {tasks.map((task, idx) => (
                                <li key={`${stage}-${idx}`}>{task}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditFactor(factor)}
                          className="flex items-center gap-2 justify-end"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePrompt(factor)}
                          className="flex items-center gap-2 justify-end text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {factors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No success factors found. Click "Add New Factor" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog for editing a success factor */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create New Success Factor' : 'Edit Success Factor'}</DialogTitle>
            <DialogDescription>
              {isCreating 
                ? 'Add a new success factor and its tasks for each stage.'
                : 'Update the details of this success factor and its tasks.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <Label htmlFor="factor-id">Factor ID</Label>
                <Input
                  id="factor-id"
                  value={editableFactor.id}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder="e.g., 1.1"
                  className="mt-1"
                />
              </div>
              <div className="col-span-3">
                <Label htmlFor="factor-title">Factor Title</Label>
                <Input
                  id="factor-title"
                  value={editableFactor.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Success Factor Title"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="factor-description" className="text-base font-medium">
                Description 
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <p className="text-gray-500 text-sm mb-2">
                Provide a clear, concise description of this success factor and its purpose.
              </p>
              <Textarea
                id="factor-description"
                value={editableFactor.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Describe what this success factor means and why it's important..."
                className="mt-1 h-32 focus:border-tcof-teal focus:ring-tcof-teal"
                required
              />
            </div>
            
            {/* Task management with tabbed interface */}
            <AdminStageTabs
              factor={editableFactor}
              onTaskChange={handleTaskChange}
              onAddTask={handleAddTask}
              onRemoveTask={handleRemoveTask}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFactor}
              className="bg-tcof-teal hover:bg-tcof-teal/90"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isCreating ? 'Create Factor' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for deleting a factor */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the success factor "{selectedFactor?.title}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFactor}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Factor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </>
  );
}