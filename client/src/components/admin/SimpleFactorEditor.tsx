import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/hooks/useAuth';

// Define types
export type Stage = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

interface SuccessFactor {
  id: string;
  title: string;
  description: string;
}

interface FactorTask {
  id: string;
  factor_id: string;
  stage: Stage;
  text: string;
  order: number;
}

// Helper function to group tasks by factor ID and stage
function groupTasksByFactorAndStage(tasks: FactorTask[]): Record<string, Record<Stage, FactorTask[]>> {
  const result: Record<string, Record<Stage, FactorTask[]>> = {};
  
  tasks.forEach(task => {
    if (!result[task.factor_id]) {
      result[task.factor_id] = {
        'Identification': [],
        'Definition': [],
        'Delivery': [],
        'Closure': []
      };
    }
    
    if (task.stage === 'Identification' || 
        task.stage === 'Definition' || 
        task.stage === 'Delivery' || 
        task.stage === 'Closure') {
      // Only add if it's a valid stage
      result[task.factor_id][task.stage].push(task);
    }
  });
  
  return result;
}

export default function SimpleFactorEditor() {
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeStage, setActiveStage] = useState<Stage>('Identification');
  
  // Fetch all success factors
  const {
    data: factors,
    isLoading: factorsLoading,
    error: factorsError
  } = useQuery<SuccessFactor[]>({
    queryKey: ['/api/admin/success-factors/list'],
  });
  
  // Fetch all tasks
  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError
  } = useQuery<FactorTask[]>({
    queryKey: ['/api/admin/success-factor-tasks'],
  });
  
  // Set the first factor as selected when data loads
  useEffect(() => {
    if (factors && factors.length > 0 && !selectedFactorId) {
      setSelectedFactorId(factors[0].id);
    }
  }, [factors, selectedFactorId]);
  
  // Organize the tasks by factor ID and stage
  const tasksByFactorAndStage = tasks ? groupTasksByFactorAndStage(tasks) : {};
  
  // Get the selected factor
  const selectedFactor = factors?.find(f => f.id === selectedFactorId);
  
  // Get the tasks for the selected factor and stage
  const selectedFactorTasks = selectedFactorId && tasksByFactorAndStage[selectedFactorId] 
    ? tasksByFactorAndStage[selectedFactorId][activeStage] || []
    : [];
  
  const isLoading = factorsLoading || tasksLoading;
  const hasError = factorsError || tasksError;
  
  // Admin check logic - We'll just show the admin page here since auth is handled on server
  // and the admin APIs are already protected with the isAdmin middleware
  
  return (
    <div>
      <SiteHeader />
      
      <div className="container mt-8">
        <h1 className="text-3xl font-bold mb-6">Success Factor Task Editor</h1>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasError ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-md">
            An error occurred while loading data. Please try refreshing the page.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left panel - Factors List */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Success Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {factors && factors.map(factor => (
                      <div 
                        key={factor.id}
                        className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 ${
                          selectedFactorId === factor.id ? 'bg-gray-100 border-l-4 border-primary' : ''
                        }`}
                        onClick={() => setSelectedFactorId(factor.id)}
                      >
                        <h3 className="font-medium">{factor.title}</h3>
                        {factor.description && (
                          <p className="text-sm text-gray-500 mt-1 truncate">{factor.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right panel - Tasks for selected factor */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedFactor ? selectedFactor.title : 'Select a factor'}</CardTitle>
                  {selectedFactor?.description && (
                    <p className="text-sm text-gray-500">{selectedFactor.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedFactor ? (
                    <Tabs value={activeStage} onValueChange={(value) => setActiveStage(value as Stage)}>
                      <TabsList className="grid grid-cols-4 mb-4">
                        <TabsTrigger value="Identification">Identification</TabsTrigger>
                        <TabsTrigger value="Definition">Definition</TabsTrigger>
                        <TabsTrigger value="Delivery">Delivery</TabsTrigger>
                        <TabsTrigger value="Closure">Closure</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value={activeStage} className="mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">#</TableHead>
                              <TableHead>Task Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedFactorTasks.length > 0 ? (
                              selectedFactorTasks
                                .sort((a, b) => a.order - b.order)
                                .map((task, index) => (
                                  <TableRow key={task.id || index}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{task.text}</TableCell>
                                  </TableRow>
                                ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center py-4">
                                  No tasks for this stage
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Select a success factor from the left panel to view its tasks
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}