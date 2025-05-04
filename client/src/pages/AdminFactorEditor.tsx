import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Redirect, Link } from 'wouter';
import * as xlsx from 'xlsx';
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest } from '@/lib/queryClient';
import debounce from 'lodash.debounce';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { Filter, Loader2, Plus, Save, Trash2, Upload, RefreshCw } from 'lucide-react';
import { getFactors, saveFactors, createFactor, updateFactor, deleteFactor, FactorTask } from '@/utils/factorStore';

// Alias for type cleanliness
type SuccessFactor = FactorTask;

type StageType = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

interface SuccessFactorTask {
  [key: string]: string[];
}

// Admin page for editing success factors
export default function AdminFactorEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [factors, setFactors] = useState<SuccessFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false); // New state for auto-save indicator
  const [activeTab, setActiveTab] = useState<StageType>('Identification');
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedFactors, setImportedFactors] = useState<SuccessFactor[]>([]);
  const [isFixingFactors, setIsFixingFactors] = useState(false);
  const [showFixFactorsDialog, setShowFixFactorsDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load factors on mount
  useEffect(() => {
    async function loadFactors() {
      try {
        setIsLoading(true);
        const data = await getFactors();
        setFactors(data);
      } catch (error) {
        console.error('Error loading factors:', error);
        toast({
          title: 'Error loading success factors',
          description: 'Could not load success factors from storage.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadFactors();
  }, [toast]);

  // Create a debounced save function that will be created once and persisted
  const debouncedSave = useCallback(
    debounce(async (factorId: string, updatedFactor: SuccessFactor) => {
      try {
        setIsAutoSaving(true);
        
        // Ensure tasks property has all required stage arrays
        const validatedFactor = {
          ...updatedFactor,
          tasks: {
            Identification: Array.isArray(updatedFactor.tasks?.Identification) ? updatedFactor.tasks.Identification : [],
            Definition: Array.isArray(updatedFactor.tasks?.Definition) ? updatedFactor.tasks.Definition : [],
            Delivery: Array.isArray(updatedFactor.tasks?.Delivery) ? updatedFactor.tasks.Delivery : [],
            Closure: Array.isArray(updatedFactor.tasks?.Closure) ? updatedFactor.tasks.Closure : []
          }
        };
        
        const result = await updateFactor(factorId, validatedFactor);
        
        if (!result) {
          throw new Error('Failed to save task: server returned null');
        }
        
        // Verify all stages were saved correctly
        const stages: StageType[] = ['Identification', 'Definition', 'Delivery', 'Closure'];
        const anyMismatch = stages.some(stage => 
          Array.isArray(result.tasks[stage]) && 
          Array.isArray(validatedFactor.tasks[stage]) && 
          result.tasks[stage].length !== validatedFactor.tasks[stage].length
        );
        
        if (anyMismatch) {
          console.warn('Some tasks may not have been saved correctly', { 
            local: {
              Identification: validatedFactor.tasks.Identification.length,
              Definition: validatedFactor.tasks.Definition.length,
              Delivery: validatedFactor.tasks.Delivery.length,
              Closure: validatedFactor.tasks.Closure.length
            },
            server: {
              Identification: result.tasks.Identification?.length || 0,
              Definition: result.tasks.Definition?.length || 0,
              Delivery: result.tasks.Delivery?.length || 0,
              Closure: result.tasks.Closure?.length || 0
            }
          });
          
          // Force refresh from server
          const refreshedFactors = await getFactors(true);
          setFactors(refreshedFactors);
          
          toast({
            title: 'Warning',
            description: 'Some tasks may not have saved correctly. Please verify.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Task saved',
            description: 'Changes saved automatically',
            variant: 'default',
          });
        }
      } catch (error) {
        console.error(`Error saving task for factor ${factorId}:`, error);
        toast({
          title: 'Save error',
          description: 'Failed to save changes to the server',
          variant: 'destructive',
        });
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000), // 1 second debounce
    [toast]
  );

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

  // Handle saving all factors
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const success = await saveFactors(factors);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Success factors saved successfully.',
          variant: 'default',
        });
      } else {
        throw new Error('Failed to save factors');
      }
    } catch (error) {
      console.error('Error saving factors:', error);
      toast({
        title: 'Error saving',
        description: 'Could not save success factors to storage.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new factor
  const handleAddFactor = async () => {
    const newId = `${factors.length + 1}.1`;
    const newFactor: SuccessFactor = {
      id: newId,
      title: 'New Success Factor',
      tasks: {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      }
    };
    
    try {
      // Use the new createFactor API
      const createdFactor = await createFactor(newFactor);
      
      if (createdFactor) {
        setFactors([...factors, createdFactor]);
        setSelectedFactorId(createdFactor.id);
        
        toast({
          title: 'Success',
          description: 'New success factor created.',
          variant: 'default',
        });
      } else {
        // Fall back to local-only creation if API fails
        setFactors([...factors, newFactor]);
        setSelectedFactorId(newId);
        
        toast({
          title: 'Warning',
          description: 'Created factor locally only. Save all factors to persist.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error creating factor:', error);
      // Fall back to local-only creation
      setFactors([...factors, newFactor]);
      setSelectedFactorId(newId);
      
      toast({
        title: 'Warning',
        description: 'Could not save to server. Factor created locally only.',
        variant: 'default',
      });
    }
  };

  // Update factor title
  const handleUpdateFactorTitle = async (factorId: string, newTitle: string) => {
    // First update local state for immediate feedback
    const updatedFactor = factors.find(f => f.id === factorId);
    if (!updatedFactor) return;
    
    const newFactor = { ...updatedFactor, title: newTitle };
    
    // Update local state immediately
    setFactors(prevFactors => 
      prevFactors.map(f => 
        f.id === factorId ? newFactor : f
      )
    );
    
    // Then try to update via API (don't wait for this to complete)
    updateFactor(factorId, newFactor).catch(error => {
      console.error('Error updating factor title:', error);
      // No toast here as it would be annoying for every keystroke
    });
  };

  // Update factor ID
  const handleUpdateFactorId = async (factorId: string, newId: string) => {
    // Check if ID already exists
    if (factors.some(f => f.id === newId && f.id !== factorId)) {
      toast({
        title: 'ID already exists',
        description: `An item with ID "${newId}" already exists.`,
        variant: 'destructive',
      });
      return;
    }

    const updatedFactor = factors.find(f => f.id === factorId);
    if (!updatedFactor) return;
    
    // Create a copy with the new ID
    const newFactor = { ...updatedFactor, id: newId };
    
    try {
      // First try to create a new factor with the new ID
      const created = await createFactor(newFactor);
      
      if (created) {
        // If successful, delete the old one
        await deleteFactor(factorId);
        
        // Update local state
        setFactors(prevFactors => 
          prevFactors.map(f => f.id === factorId ? newFactor : f)
        );
        setSelectedFactorId(newId);
        
        toast({
          title: 'Success',
          description: 'Factor ID updated successfully.',
          variant: 'default',
        });
      } else {
        // Fall back to local-only update
        setFactors(prevFactors => 
          prevFactors.map(f => f.id === factorId ? newFactor : f)
        );
        setSelectedFactorId(newId);
        
        toast({
          title: 'Warning',
          description: 'ID updated locally only. Save all factors to persist changes.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error updating factor ID:', error);
      
      // Fall back to local-only update
      setFactors(prevFactors => 
        prevFactors.map(f => f.id === factorId ? newFactor : f)
      );
      setSelectedFactorId(newId);
      
      toast({
        title: 'Warning',
        description: 'Could not update ID on server. Updated locally only.',
        variant: 'default',
      });
    }
  };

  // Add a new task to a factor
  const handleAddTask = async (factorId: string, stage: StageType) => {
    const updatedFactor = factors.find(f => f.id === factorId);
    if (!updatedFactor) return;
    
    // Create a copy with the new task added
    const updatedTasks = { ...updatedFactor.tasks };
    
    // Ensure the stage array exists
    if (!Array.isArray(updatedTasks[stage])) {
      updatedTasks[stage] = [];
    }
    
    updatedTasks[stage] = [...updatedTasks[stage], 'New task'];
    const newFactor = { ...updatedFactor, tasks: updatedTasks };
    
    // Update UI immediately
    setFactors(prevFactors => 
      prevFactors.map(f => f.id === factorId ? newFactor : f)
    );
    
    // Save to server with immediate feedback
    try {
      const result = await updateFactor(factorId, newFactor);
      
      if (!result) {
        throw new Error('Failed to save task: server returned null');
      }
      
      // Verify the task was added in the returned data
      if (!Array.isArray(result.tasks[stage]) || result.tasks[stage].length !== updatedTasks[stage].length) {
        console.warn('Task may not have been saved correctly', { 
          local: updatedTasks[stage].length, 
          server: result.tasks[stage]?.length || 0 
        });
        
        // Force refresh from server
        const refreshedFactors = await getFactors(true);
        setFactors(refreshedFactors);
        
        toast({
          title: 'Warning',
          description: 'Task may not have saved correctly. Please verify.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Task added',
          description: 'New task added successfully',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error(`Error adding task for factor ${factorId}:`, error);
      toast({
        title: 'Save error',
        description: 'Failed to save new task to the server',
        variant: 'destructive',
      });
    }
  };

  // Update a task text
  const handleUpdateTask = async (factorId: string, stage: StageType, taskIndex: number, newText: string) => {
    const updatedFactor = factors.find(f => f.id === factorId);
    if (!updatedFactor) return;
    
    // Create a copy with the updated task
    const updatedTasks = { ...updatedFactor.tasks };
    
    // Ensure the stage array exists
    if (!Array.isArray(updatedTasks[stage])) {
      updatedTasks[stage] = [];
      console.warn(`Stage array ${stage} was not properly initialized when attempting to update task`);
      return;
    }
    
    // Ensure the task index is valid
    if (taskIndex < 0 || taskIndex >= updatedTasks[stage].length) {
      console.warn(`Invalid task index ${taskIndex} for stage ${stage} that has ${updatedTasks[stage].length} tasks`);
      return;
    }
    
    const tasks = [...updatedTasks[stage]];
    tasks[taskIndex] = newText;
    updatedTasks[stage] = tasks;
    
    const newFactor = { 
      ...updatedFactor, 
      tasks: {
        Identification: Array.isArray(updatedTasks.Identification) ? updatedTasks.Identification : [],
        Definition: Array.isArray(updatedTasks.Definition) ? updatedTasks.Definition : [],
        Delivery: Array.isArray(updatedTasks.Delivery) ? updatedTasks.Delivery : [],
        Closure: Array.isArray(updatedTasks.Closure) ? updatedTasks.Closure : []
      }
    };
    
    // Update UI immediately
    setFactors(prevFactors => 
      prevFactors.map(f => f.id === factorId ? newFactor : f)
    );
    
    // Save to server with debounce (won't trigger API call on every keystroke)
    debouncedSave(factorId, newFactor);
  };

  // Delete a task
  const handleDeleteTask = async (factorId: string, stage: StageType, taskIndex: number) => {
    const updatedFactor = factors.find(f => f.id === factorId);
    if (!updatedFactor) return;
    
    // Create a copy with the task deleted
    const updatedTasks = { ...updatedFactor.tasks };
    
    // Ensure the stage array exists
    if (!Array.isArray(updatedTasks[stage])) {
      updatedTasks[stage] = [];
      console.warn(`Stage array ${stage} was not properly initialized when attempting to delete task`);
      return;
    }
    
    // Ensure the task index is valid
    if (taskIndex < 0 || taskIndex >= updatedTasks[stage].length) {
      console.warn(`Invalid task index ${taskIndex} for stage ${stage} that has ${updatedTasks[stage].length} tasks`);
      return;
    }
    
    const tasks = [...updatedTasks[stage]];
    tasks.splice(taskIndex, 1);
    updatedTasks[stage] = tasks;
    
    const newFactor = { 
      ...updatedFactor, 
      tasks: {
        Identification: Array.isArray(updatedTasks.Identification) ? updatedTasks.Identification : [],
        Definition: Array.isArray(updatedTasks.Definition) ? updatedTasks.Definition : [],
        Delivery: Array.isArray(updatedTasks.Delivery) ? updatedTasks.Delivery : [],
        Closure: Array.isArray(updatedTasks.Closure) ? updatedTasks.Closure : []
      }
    };
    
    // Update UI immediately
    setFactors(prevFactors => 
      prevFactors.map(f => f.id === factorId ? newFactor : f)
    );
    
    // Save to server with immediate feedback
    try {
      const result = await updateFactor(factorId, newFactor);
      
      if (!result) {
        throw new Error('Failed to delete task: server returned null');
      }
      
      // Verify the task was deleted in the returned data
      if (Array.isArray(result.tasks[stage]) && 
          result.tasks[stage].length !== updatedTasks[stage].length) {
        console.warn('Task may not have been deleted correctly', { 
          local: updatedTasks[stage].length, 
          server: result.tasks[stage].length 
        });
        
        // Force refresh from server
        const refreshedFactors = await getFactors(true);
        setFactors(refreshedFactors);
        
        toast({
          title: 'Warning',
          description: 'Task may not have been deleted correctly. Please verify.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Task deleted',
          description: 'Task removed successfully',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error(`Error deleting task for factor ${factorId}:`, error);
      toast({
        title: 'Save error',
        description: 'Failed to delete task on the server',
        variant: 'destructive',
      });
    }
  };

  // Delete a factor
  const handleDeleteFactor = async () => {
    if (!selectedFactorId) return;
    
    try {
      // Use the deleteFactor API
      const success = await deleteFactor(selectedFactorId);
      
      if (success) {
        setFactors(prevFactors => prevFactors.filter(f => f.id !== selectedFactorId));
        setSelectedFactorId(null);
        
        toast({
          title: 'Success',
          description: 'Success factor deleted.',
          variant: 'default',
        });
      } else {
        // Fall back to local deletion if API fails
        setFactors(prevFactors => prevFactors.filter(f => f.id !== selectedFactorId));
        setSelectedFactorId(null);
        
        toast({
          title: 'Warning',
          description: 'Deleted factor locally only. Save all factors to persist changes.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error deleting factor:', error);
      // Fall back to local deletion
      setFactors(prevFactors => prevFactors.filter(f => f.id !== selectedFactorId));
      setSelectedFactorId(null);
      
      toast({
        title: 'Warning',
        description: 'Could not delete from server. Removed locally only.',
        variant: 'default',
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Deduplicate factors
  const handleDeduplicate = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/deduplicate-factors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Reload factors after deduplication
      const updatedFactors = await getFactors();
      setFactors(updatedFactors);
      
      toast({
        title: 'Deduplication Successful',
        description: result.message,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deduplicating factors:', error);
      toast({
        title: 'Deduplication Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Update to canonical factor titles and preserve tasks
  const handleFixFactors = async () => {
    try {
      setIsFixingFactors(true);
      
      const response = await apiRequest('POST', '/api/admin/update-canonical-factors');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Reload factors after update
      const updatedFactors = await getFactors();
      setFactors(updatedFactors);
      
      toast({
        title: 'Factors Updated',
        description: result.message || 'Successfully updated to the 12 official TCOF success factors',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating canonical factors:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsFixingFactors(false);
      setShowFixFactorsDialog(false);
    }
  };
  
  // Import from Excel
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<any>(worksheet, { header: 1, blankrows: false });

        // Process Excel rows
        const [header, ...dataRows] = rows;
        const [TITLE, IDN, DEF, DEL, CLO] = header;

        // Create factors from the Excel data
        const parsedFactors: SuccessFactor[] = dataRows.map(row => {
          const [title, idn, def, del, clo] = row;
          const parts = title.split(' ');
          const id = parts[0];
          const titleText = parts.slice(1).join(' ').trim();

          return {
            id,
            title: titleText,
            tasks: {
              Identification: (idn || '').split('\n').filter(Boolean),
              Definition: (def || '').split('\n').filter(Boolean),
              Delivery: (del || '').split('\n').filter(Boolean),
              Closure: (clo || '').split('\n').filter(Boolean)
            }
          };
        });

        // Show preview
        setImportedFactors(parsedFactors);
        setShowImportDialog(true);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast({
          title: 'Import error',
          description: 'Failed to parse the Excel file. Please check the format.',
          variant: 'destructive'
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: 'File read error',
        description: 'Failed to read the selected file.',
        variant: 'destructive'
      });
    };

    reader.readAsBinaryString(file);
  };

  // Confirm import
  const handleConfirmImport = async () => {
    try {
      setIsSaving(true);
      
      // First replace all local factors
      setFactors(importedFactors);
      
      // Then try to save to the server using the API
      const success = await saveFactors(importedFactors);
      
      if (success) {
        toast({
          title: 'Import successful',
          description: `Imported and saved ${importedFactors.length} success factors.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Partial import',
          description: `Imported ${importedFactors.length} factors locally, but failed to save to server.`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error saving imported factors:', error);
      toast({
        title: 'Import partial',
        description: 'Factors imported locally only. Server save failed.',
        variant: 'destructive'
      });
    } finally {
      setShowImportDialog(false);
      setImportedFactors([]);
      setIsSaving(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-tcof-dark">Success Factors Admin</h1>
          
          <div className="flex space-x-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-tcof-teal hover:bg-tcof-teal/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Factors
                </>
              )}
            </Button>
            
            <label htmlFor="excel-upload">
              <Button 
                variant="outline" 
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import from Excel
              </Button>
              <input 
                id="excel-upload"
                type="file" 
                accept=".xlsx,.xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </label>
            
            <Button
              onClick={handleDeduplicate}
              disabled={isSaving}
              variant="outline"
            >
              <Filter className="mr-2 h-4 w-4" />
              Deduplicate Factors
            </Button>
            
            <Button
              onClick={() => setShowFixFactorsDialog(true)}
              disabled={isFixingFactors}
              variant="outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFixingFactors ? 'animate-spin' : ''}`} />
              Update to Canonical Factors
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
            <span className="ml-2 text-lg">Loading success factors...</span>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Factor List */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Success Factors</CardTitle>
                <CardDescription>
                  {factors.length} success factors found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {factors.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No success factors found. Add your first one.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {factors.map((factor) => (
                        <div
                          key={factor.id}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedFactorId === factor.id
                              ? 'bg-tcof-teal/20 border-l-4 border-tcof-teal'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedFactorId(factor.id)}
                        >
                          <div className="font-medium">
                            {factor.id} - {factor.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Tasks: {
                              (factor.tasks.Identification?.length || 0) +
                              (factor.tasks.Definition?.length || 0) +
                              (factor.tasks.Delivery?.length || 0) +
                              (factor.tasks.Closure?.length || 0)
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleAddFactor}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Factor
                </Button>
              </CardFooter>
            </Card>
            
            {/* Editor for selected factor */}
            <Card className="col-span-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {selectedFactor 
                      ? `Editing: ${selectedFactor.id} - ${selectedFactor.title}` 
                      : 'Select a success factor to edit'}
                  </CardTitle>
                  {isAutoSaving && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Auto-saving...
                    </div>
                  )}
                </div>
                {selectedFactor && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="factor-id">Factor ID</Label>
                      <Input 
                        id="factor-id"
                        value={selectedFactor.id}
                        onChange={(e) => handleUpdateFactorId(selectedFactor.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="factor-title">Factor Title</Label>
                      <Input 
                        id="factor-title"
                        value={selectedFactor.title}
                        onChange={(e) => handleUpdateFactorTitle(selectedFactor.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              
              {selectedFactor ? (
                <>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StageType)}>
                    <CardContent>
                      <TabsList className="grid grid-cols-4 mb-4">
                        <TabsTrigger value="Identification">Identification</TabsTrigger>
                        <TabsTrigger value="Definition">Definition</TabsTrigger>
                        <TabsTrigger value="Delivery">Delivery</TabsTrigger>
                        <TabsTrigger value="Closure">Closure</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="Identification" className="space-y-4">
                        <h3 className="text-lg font-semibold">Identification Stage Tasks</h3>
                        <TaskList 
                          tasks={selectedFactor.tasks.Identification || []}
                          onAddTask={() => handleAddTask(selectedFactor.id, 'Identification')}
                          onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Identification', index, newText)}
                          onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Identification', index)}
                        />
                      </TabsContent>
                      
                      <TabsContent value="Definition" className="space-y-4">
                        <h3 className="text-lg font-semibold">Definition Stage Tasks</h3>
                        <TaskList 
                          tasks={selectedFactor.tasks.Definition || []}
                          onAddTask={() => handleAddTask(selectedFactor.id, 'Definition')}
                          onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Definition', index, newText)}
                          onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Definition', index)}
                        />
                      </TabsContent>
                      
                      <TabsContent value="Delivery" className="space-y-4">
                        <h3 className="text-lg font-semibold">Delivery Stage Tasks</h3>
                        <TaskList 
                          tasks={selectedFactor.tasks.Delivery || []}
                          onAddTask={() => handleAddTask(selectedFactor.id, 'Delivery')}
                          onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Delivery', index, newText)}
                          onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Delivery', index)}
                        />
                      </TabsContent>
                      
                      <TabsContent value="Closure" className="space-y-4">
                        <h3 className="text-lg font-semibold">Closure Stage Tasks</h3>
                        <TaskList 
                          tasks={selectedFactor.tasks.Closure || []}
                          onAddTask={() => handleAddTask(selectedFactor.id, 'Closure')}
                          onUpdateTask={(index, newText) => handleUpdateTask(selectedFactor.id, 'Closure', index, newText)}
                          onDeleteTask={(index) => handleDeleteTask(selectedFactor.id, 'Closure', index)}
                        />
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                  
                  <CardFooter className="border-t pt-4 justify-between">
                    <div className="text-sm text-muted-foreground">
                      Total tasks: {
                        (selectedFactor.tasks.Identification?.length || 0) +
                        (selectedFactor.tasks.Definition?.length || 0) +
                        (selectedFactor.tasks.Delivery?.length || 0) +
                        (selectedFactor.tasks.Closure?.length || 0)
                      }
                    </div>
                    <Button 
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Factor
                    </Button>
                  </CardFooter>
                </>
              ) : (
                <CardContent>
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-muted-foreground mb-4">
                      Select a success factor from the list to edit it or add a new one.
                    </p>
                    <Button onClick={handleAddFactor}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Factor
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </main>
      
      <SiteFooter />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the success factor and all its tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFactor}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import confirmation dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Success Factors</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current success factors with those from the Excel file.
              {importedFactors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Preview:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Tasks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedFactors.slice(0, 5).map((factor) => (
                        <TableRow key={factor.id}>
                          <TableCell className="font-medium">{factor.id}</TableCell>
                          <TableCell>{factor.title}</TableCell>
                          <TableCell>
                            {(factor.tasks.Identification?.length || 0) +
                             (factor.tasks.Definition?.length || 0) +
                             (factor.tasks.Delivery?.length || 0) +
                             (factor.tasks.Closure?.length || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {importedFactors.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            And {importedFactors.length - 5} more...
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} className="bg-tcof-teal hover:bg-tcof-teal/90">
              Import {importedFactors.length} Factors
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Fix factors confirmation dialog */}
      <AlertDialog open={showFixFactorsDialog} onOpenChange={setShowFixFactorsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update to Canonical Factors</AlertDialogTitle>
            <AlertDialogDescription>
              This will ensure that your success factors match the 12 official TCOF success factors with the correct titles.
              Any custom tasks will be preserved, but the titles will be updated to match the official names.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFixFactors} 
              className="bg-tcof-teal hover:bg-tcof-teal/90"
              disabled={isFixingFactors}
            >
              {isFixingFactors ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>Update Factors</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}