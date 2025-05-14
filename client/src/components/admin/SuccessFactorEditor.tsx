import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminStageTabs, { Stage, FactorTask } from './AdminStageTabs';
import FactorSidebar from './FactorSidebar';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/hooks/useAuth';
import { useAdminSuccessFactors } from '@/hooks/useAdminSuccessFactors';
import { Link } from 'wouter';

// Enhanced logging function that won't cause React rendering issues
function logData(message: string, data: any) {
  console.log(message, data);
  return null;
}

// We don't need props for a standalone page component
export default function SuccessFactorEditor() {
  // Use our custom admin hook for success factors with tasks
  const { factors = [], isLoading, error } = useAdminSuccessFactors();
  console.log("[NETWORK RESPONSE] Factors:", factors);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get user for auth check
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set selected factor when data loads
  useEffect(() => {
    if (factors && factors.length > 0 && !selectedFactorId) {
      setSelectedFactorId(factors[0].id);
      console.log('[ADMIN] Selected first factor:', factors[0].id);
    }
  }, [factors, selectedFactorId]);

  // Instead of getting the factor from the factors array, we'll fetch it individually
  // Set up a direct query for the selected factor
  const {
    data: selectedFactor,
    isLoading: selectedFactorLoading,
    error: selectedFactorError,
    refetch: refetchSelectedFactor
  } = useQuery<FactorTask>({
    queryKey: ['/api/admin/success-factors', selectedFactorId],
    enabled: !!selectedFactorId, // Only run the query if we have a factor ID
    // Disable stale time, always fetch fresh
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Fetch factor when the ID changes
  useEffect(() => {
    if (selectedFactorId) {
      console.log('[ADMIN] Selected new factor, fetching details:', selectedFactorId);
      refetchSelectedFactor();
    }
  }, [selectedFactorId, refetchSelectedFactor]);

  // Create a new factor
  const handleCreateFactor = () => {
    // Default empty factor with tasks arrays
    const newFactor: FactorTask = {
      id: `sf-${factors?.length ? factors.length + 1 : 1}`,  // Generate a default ID (will be editable)
      title: "New Success Factor",
      description: "Add a description for this success factor",
      tasks: {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      }
    };

    // Create a factor on the server
    setIsSaving(true);
    apiRequest('POST', '/api/admin/success-factors', newFactor)
      .then(response => response.json())
      .then(data => {
        // Invalidate both the list and individual factor caches
        queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
        if (selectedFactorId) {
          queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors', selectedFactorId] });
        }

        // Select the new factor
        setSelectedFactorId(data.id);

        toast({
          title: 'Success Factor Created',
          description: 'New success factor has been created.',
        });
      })
      .catch(error => {
        console.error('Error creating factor:', error);
        toast({
          title: 'Error Creating Factor',
          description: 'Could not create new success factor.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  // Update an existing task
  const handleUpdateTask = async (factorId: string, stage: Stage, taskIndex: number, newText: string) => {
    if (!selectedFactor) return;

    setIsSaving(true);

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
      await response.json();

      // Invalidate both the list and individual factor caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors', factorId] });

      console.log('[ADMIN] Updated task and invalidated cache');
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error updating task',
        description: 'Could not update task on the server.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new task to a factor
  const handleAddTask = async (factorId: string, stage: Stage) => {
    if (!selectedFactor) return;

    setIsSaving(true);

    const updatedFactor = { ...selectedFactor };
    const updatedTasks = [...(updatedFactor.tasks[stage] || []), ''];

    updatedFactor.tasks = {
      ...updatedFactor.tasks,
      [stage]: updatedTasks
    };

    try {
      // Update in the API
      const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      await response.json();

      // Invalidate both the list and individual factor caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors', factorId] });

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
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a task
  const handleDeleteTask = async (factorId: string, stage: Stage, taskIndex: number) => {
    if (!selectedFactor) return;

    setIsSaving(true);

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
      await response.json();

      // Invalidate both the list and individual factor caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors', factorId] });

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
    } finally {
      setIsSaving(false);
    }
  };

  // Update factor title
  const handleUpdateFactorTitle = async (factorId: string, newTitle: string) => {
    if (!selectedFactor) return;

    setIsSaving(true);

    const updatedFactor = { ...selectedFactor, title: newTitle };

    try {
      // Update in the API
      const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      await response.json();

      // Invalidate both the list and individual factor caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors', factorId] });
    } catch (error) {
      console.error('Error updating factor title:', error);
      toast({
        title: 'Error updating title',
        description: 'Could not update factor title on the server.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update factor description
  const handleUpdateFactorDescription = async (factorId: string, newDescription: string) => {
    if (!selectedFactor) return;

    setIsSaving(true);

    const updatedFactor = { ...selectedFactor, description: newDescription };

    try {
      // Update in the API
      const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
      await response.json();

      // Invalidate both the list and individual factor caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors', factorId] });
    } catch (error) {
      console.error('Error updating factor description:', error);
      toast({
        title: 'Error updating description',
        description: 'Could not update factor description on the server.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a factor
  const handleDeleteFactor = async () => {
    if (!selectedFactor) return;

    try {
      setIsSaving(true);

      // Delete from the API
      await apiRequest('DELETE', `/api/admin/success-factors/${selectedFactor.id}`);

      // Invalidate both the list and individual factor caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/success-factors'] });

      // Select another factor if available
      const remainingFactors = factors.filter(f => f.id !== selectedFactor.id);
      if (remainingFactors.length > 0) {
        setSelectedFactorId(remainingFactors[0].id);
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

  // If user is not authorized, show access denied
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
      </div>
    );
  }

  // Ensure task stages exist
  const ensureTaskStages = (tasks: any) => {
    if (!tasks) {
      return {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
    }
    return {
      Identification: tasks.Identification || [],
      Definition: tasks.Definition || [],
      Delivery: tasks.Delivery || [],
      Closure: tasks.Closure || []
    };
  };

  const handleFactorSelect = (factor: any) => {
    const validatedFactor = {
      ...factor,
      tasks: ensureTaskStages(factor.tasks)
    };
    setSelectedFactorId(validatedFactor.id);
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

        {isLoading || selectedFactorLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
            <span className="ml-2">Loading success factors...</span>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left sidebar with factors list - 25% width */}
            <div className="w-full md:w-1/4">
              <FactorSidebar
                factors={factors}
                selectedFactorId={selectedFactorId}
                onSelectFactor={(id) => {
                  const factor = factors.find(f => f.id === id);
                  if (factor) {
                    handleFactorSelect(factor)
                  }
                }}
                onCreateFactor={handleCreateFactor}
              />
            </div>

            {/* Main content panel with task tabs - 75% width */}
            <div className="w-full md:w-3/4">
              <Card className="h-full">
                {selectedFactor ? (
                  <>
                    <CardHeader className="pb-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <Input
                              value={selectedFactor.id}
                              className="w-24 font-mono text-sm"
                              readOnly
                            />
                            <Input
                              value={selectedFactor.title}
                              onChange={(e) => handleUpdateFactorTitle(selectedFactor.id, e.target.value)}
                              className="flex-1 text-xl font-bold"
                            />
                          </div>
                          <Textarea
                            value={selectedFactor.description}
                            onChange={(e) => handleUpdateFactorDescription(selectedFactor.id, e.target.value)}
                            className="mt-2 resize-none"
                            placeholder="Enter factor description..."
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
                      {/* Using our helper function for diagnostic logs */}
                      {logData('[ADMIN] Selected factor tasks before rendering:', selectedFactor.tasks || {})}
                      {logData('[ADMIN] Tasks by stage:', {
                        Identification: selectedFactor.tasks?.Identification?.length || 0,
                        Definition: selectedFactor.tasks?.Definition?.length || 0,
                        Delivery: selectedFactor.tasks?.Delivery?.length || 0,
                        Closure: selectedFactor.tasks?.Closure?.length || 0
                      })}

                      {/* Make sure factor has a valid tasks object */}
                      {selectedFactor && selectedFactor.tasks ? (
                        <AdminStageTabs
                          factor={{
                            ...selectedFactor,
                            tasks: {
                              Identification: selectedFactor.tasks?.Identification || [],
                              Definition: selectedFactor.tasks?.Definition || [],
                              Delivery: selectedFactor.tasks?.Delivery || [],
                              Closure: selectedFactor.tasks?.Closure || []
                            }
                          }}
                          onTaskChange={(stage, index, value) => handleUpdateTask(selectedFactor.id, stage, index, value)}
                          onAddTask={(stage) => handleAddTask(selectedFactor.id, stage)}
                          onRemoveTask={(stage, index) => handleDeleteTask(selectedFactor.id, stage, index)}
                        />
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          Tasks data is not available. Please try refreshing the page.
                        </div>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center space-y-4">
                      <p className="text-lg text-tcof-dark">No success factor selected.</p>
                      <Button onClick={handleCreateFactor} disabled={isSaving}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create new
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}