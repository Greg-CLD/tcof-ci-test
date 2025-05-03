import React, { useState, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import * as xlsx from 'xlsx';
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
import { Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { getFactors, saveFactors } from '@/utils/factorStore';

// Types for the success factor
import { SuccessFactor } from '@/utils/factorStore';

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
  const [activeTab, setActiveTab] = useState('Identification');
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedFactors, setImportedFactors] = useState<SuccessFactor[]>([]);
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

  // Check if the user is authorized (admin)
  if (!user || user.username !== 'greg@confluity.co.uk') {
    return <Redirect to="/" />;
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
  const handleAddFactor = () => {
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
    
    setFactors([...factors, newFactor]);
    setSelectedFactorId(newId);
  };

  // Update factor title
  const handleUpdateFactorTitle = (factorId: string, newTitle: string) => {
    setFactors(prevFactors => 
      prevFactors.map(f => 
        f.id === factorId ? { ...f, title: newTitle } : f
      )
    );
  };

  // Update factor ID
  const handleUpdateFactorId = (factorId: string, newId: string) => {
    // Check if ID already exists
    if (factors.some(f => f.id === newId && f.id !== factorId)) {
      toast({
        title: 'ID already exists',
        description: `An item with ID "${newId}" already exists.`,
        variant: 'destructive',
      });
      return;
    }

    setFactors(prevFactors => 
      prevFactors.map(f => 
        f.id === factorId ? { ...f, id: newId } : f
      )
    );
    setSelectedFactorId(newId);
  };

  // Add a new task to a factor
  const handleAddTask = (factorId: string, stage: string) => {
    setFactors(prevFactors => 
      prevFactors.map(f => {
        if (f.id === factorId) {
          const updatedTasks = { ...f.tasks };
          updatedTasks[stage] = [...updatedTasks[stage], 'New task'];
          return { ...f, tasks: updatedTasks };
        }
        return f;
      })
    );
  };

  // Update a task text
  const handleUpdateTask = (factorId: string, stage: string, taskIndex: number, newText: string) => {
    setFactors(prevFactors => 
      prevFactors.map(f => {
        if (f.id === factorId) {
          const updatedTasks = { ...f.tasks };
          const tasks = [...updatedTasks[stage]];
          tasks[taskIndex] = newText;
          updatedTasks[stage] = tasks;
          return { ...f, tasks: updatedTasks };
        }
        return f;
      })
    );
  };

  // Delete a task
  const handleDeleteTask = (factorId: string, stage: string, taskIndex: number) => {
    setFactors(prevFactors => 
      prevFactors.map(f => {
        if (f.id === factorId) {
          const updatedTasks = { ...f.tasks };
          const tasks = [...updatedTasks[stage]];
          tasks.splice(taskIndex, 1);
          updatedTasks[stage] = tasks;
          return { ...f, tasks: updatedTasks };
        }
        return f;
      })
    );
  };

  // Delete a factor
  const handleDeleteFactor = () => {
    if (!selectedFactorId) return;
    
    setFactors(prevFactors => prevFactors.filter(f => f.id !== selectedFactorId));
    setSelectedFactorId(null);
    setShowDeleteDialog(false);
    
    toast({
      title: 'Factor deleted',
      description: 'The success factor has been deleted.',
      variant: 'default',
    });
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
  const handleConfirmImport = () => {
    setFactors(importedFactors);
    setShowImportDialog(false);
    setImportedFactors([]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    toast({
      title: 'Import successful',
      description: `Imported ${importedFactors.length} success factors.`,
      variant: 'default'
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-tcof-dark">Success Factor Editor</h1>
          <div className="space-x-2">
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
                  Save All
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import from Excel
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
            <span className="ml-2 text-lg">Loading success factors...</span>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* List of factors */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Success Factors</CardTitle>
                <CardDescription>
                  Select a factor to edit or add a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {factors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No success factors found. Add one or import from Excel.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {factors.map(factor => (
                        <div
                          key={factor.id}
                          className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 border ${
                            selectedFactorId === factor.id
                              ? 'border-tcof-teal bg-tcof-teal/10'
                              : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedFactorId(factor.id)}
                        >
                          <div className="font-medium">{factor.id}</div>
                          <div className="text-sm text-gray-700">{factor.title}</div>
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
                <CardTitle>
                  {selectedFactor 
                    ? `Editing: ${selectedFactor.id} - ${selectedFactor.title}` 
                    : 'Select a success factor to edit'}
                </CardTitle>
                {selectedFactor && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="factor-id">Factor ID</Label>
                      <Input 
                        id="factor-id"
                        value={selectedFactor.id}
                        onChange={(e) => handleUpdateFactorId(selectedFactor.id, e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="factor-title">Factor Title</Label>
                      <Input 
                        id="factor-title"
                        value={selectedFactor.title}
                        onChange={(e) => handleUpdateFactorTitle(selectedFactor.id, e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              
              {selectedFactor ? (
                <>
                  <CardContent>
                    <Tabs defaultValue="Identification" value={activeTab} onValueChange={setActiveTab}>
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
                            {selectedFactor.tasks[stage].length === 0 ? (
                              <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                                No tasks for this stage. Add your first task below.
                              </div>
                            ) : (
                              selectedFactor.tasks[stage].map((task, index) => (
                                <div key={index} className="flex items-start space-x-2">
                                  <Input
                                    value={task}
                                    onChange={(e) => handleUpdateTask(selectedFactor.id, stage, index, e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTask(selectedFactor.id, stage, index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              ))
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddTask(selectedFactor.id, stage)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Task
                            </Button>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                  <CardFooter className="flex justify-between">
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
                  <div className="text-center py-12 text-gray-500">
                    Select a success factor from the list or add a new one to edit.
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </main>
      
      <SiteFooter />
      
      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction onClick={handleDeleteFactor} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all existing success factors with {importedFactors.length} factors from the Excel file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-96 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedFactors.map(factor => (
                  <TableRow key={factor.id}>
                    <TableCell className="font-medium">{factor.id}</TableCell>
                    <TableCell>{factor.title}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        Identification: {factor.tasks.Identification.length} tasks<br />
                        Definition: {factor.tasks.Definition.length} tasks<br />
                        Delivery: {factor.tasks.Delivery.length} tasks<br />
                        Closure: {factor.tasks.Closure.length} tasks
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} className="bg-tcof-teal hover:bg-tcof-teal/90">
              Import {importedFactors.length} Factors
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}